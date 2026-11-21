// =====================================================================
// Chat attachment cleanup (Cloud Storage).
//
// A file is normally deleted as soon as the receiver downloads it. This
// hourly cleanup removes what is left behind otherwise:
//   - uploads that were started but never finished (tab closed mid-upload)
//   - attachments nobody downloaded within ATTACHMENT_TTL_MS
//
// attachmentIndex/{messageId} = {r: receiverId, s: senderId, at}
// is written when an upload completes and removed when the file is deleted,
// so the job reads only the expired entries (indexed by `at`).
// =====================================================================

const admin = require("firebase-admin");
const cfg = require("../config/attachments");

const db = admin.database();
const getBucket = () => admin.storage().bucket();

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const PREFIX = "chat-attachments/";

// Storage object path: chat-attachments/<receiver>/<sender>/<messageId>
const objectPath = (receiverId, senderId, messageId) =>
  `${PREFIX}${receiverId}/${senderId}/${messageId}`;

// Delete one attachment everywhere: the file, the chat message and its metadata
const removeAttachment = async (receiverId, senderId, messageId) => {
  await getBucket().file(objectPath(receiverId, senderId, messageId)).delete({ignoreNotFound: true});
  const base = `chats/${receiverId}/${senderId}`;
  await db.ref().update({
    [`${base}/messages/${messageId}`]: null,
    [`${base}/attachments/${messageId}`]: null,
    [`attachmentIndex/${messageId}`]: null,
  });
};

// Files that were in Storage before attachmentIndex existed get indexed once,
// with the time they were uploaded, so the same expiry applies to them.
const ensureIndex = async () => {
  if ((await db.ref("attachmentIndexMeta/ready").get()).val() === true) {
    return 0;
  }
  const [[files], pendingSnap, indexSnap] = await Promise.all([
    getBucket().getFiles({prefix: PREFIX}),
    db.ref("pendingUploads").get(),
    db.ref("attachmentIndex").get(),
  ]);
  const pending = pendingSnap.val() || {};
  const indexed = indexSnap.val() || {};
  const updates = {};
  let count = 0;
  files.forEach((file) => {
    const [, r, s, id] = file.name.split("/");
    if (!SAFE_ID.test(r || "") || !SAFE_ID.test(s || "") || !SAFE_ID.test(id || "") || pending[id] || indexed[id]) {
      return;
    }
    updates[`attachmentIndex/${id}`] = {r, s, at: Date.parse(file.metadata.timeCreated) || Date.now()};
    count++;
  });
  updates["attachmentIndexMeta/ready"] = true;
  await db.ref().update(updates);
  return count;
};

// Attachments nobody downloaded in time
const expireUndelivered = async (limit = 100) => {
  const cutoff = Date.now() - cfg.ATTACHMENT_TTL_MS;
  const snap = await db.ref("attachmentIndex").orderByChild("at").endAt(cutoff).limitToFirst(limit).get();
  const jobs = [];
  snap.forEach((child) => {
    const {r, s} = child.val() || {};
    if (SAFE_ID.test(r || "") && SAFE_ID.test(s || "")) {
      jobs.push(removeAttachment(r, s, child.key));
    } else {
      jobs.push(db.ref(`attachmentIndex/${child.key}`).remove());
    }
  });
  await Promise.all(jobs);
  return jobs.length;
};

// Uploads that were started but never completed
const expireAbandonedUploads = async (limit = 100) => {
  const cutoff = Date.now() - cfg.PENDING_UPLOAD_TTL_MS;
  const snap = await db.ref("pendingUploads").orderByChild("createdAt").endAt(cutoff).limitToFirst(limit).get();
  const jobs = [];
  snap.forEach((child) => {
    const {receiverId, senderId} = child.val() || {};
    jobs.push((async () => {
      if (SAFE_ID.test(receiverId || "") && SAFE_ID.test(senderId || "")) {
        await getBucket().file(objectPath(receiverId, senderId, child.key)).delete({ignoreNotFound: true});
      }
      await db.ref(`pendingUploads/${child.key}`).remove();
    })());
  });
  await Promise.all(jobs);
  return jobs.length;
};

// Hourly: everything above, in batches
const cleanupAttachments = async () => {
  const indexed = await ensureIndex();
  let abandoned = 0;
  let expired = 0;
  for (let i = 0; i < 10; i++) {
    const done = await expireAbandonedUploads(100);
    abandoned += done;
    if (done < 100) break;
  }
  for (let i = 0; i < 10; i++) {
    const done = await expireUndelivered(100);
    expired += done;
    if (done < 100) break;
  }
  return {indexed, abandoned, expired};
};

module.exports = {objectPath, removeAttachment, cleanupAttachments, expireUndelivered, expireAbandonedUploads, ensureIndex};
