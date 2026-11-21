// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
const P = ROOT + "/node_modules/";
const admin = require(P + "firebase-admin");
admin.initializeApp({projectId: "demo-coins", storageBucket: "demo-coins.appspot.com", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const express = require(P + "express"); const cookieParser = require(P + "cookie-parser"); const jwt = require(P + "jsonwebtoken");
const assert = require("assert"); const db = admin.database(); const bucket = admin.storage().bucket(); console.error = () => {};
const fns = require(require.resolve("firebase-admin/functions", {paths: [ROOT]}));
fns.getFunctions = () => ({taskQueue: () => ({enqueue: async () => {}})});
const cfg = require(ROOT + "/config/attachments");
(async () => {
  await db.ref().set(null);
  await bucket.deleteFiles({prefix: "chat-attachments/", force: true});
  const exists = async (p) => (await bucket.file(p).exists())[0];
  const put = (p) => bucket.file(p).save(Buffer.alloc(cfg.encryptedSize(10), 1));

  // Files that were in Storage before the index existed (like the two in the screenshot)
  await put("chat-attachments/B/A/oldDownloaded");
  await put("chat-attachments/B/A/oldPending");
  await db.ref("pendingUploads/oldPending").set({senderId: "A", receiverId: "B", createdAt: Date.now() - 2 * cfg.PENDING_UPLOAD_TTL_MS});

  const app = express(); app.use(express.json()); app.use(cookieParser());
  app.use("/api/chats", require(ROOT + "/routes/chats"));
  const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, body, uid) => {
    const r = await fetch(base + path, {method, headers: {"content-type": "application/json", cookie: `__session=s_${uid}`}, body: body ? JSON.stringify(body) : undefined});
    return {status: r.status, body: await r.json().catch(() => null)};
  };
  for (const u of ["A", "B"]) {
    await db.ref(`sessions/s_${u}`).set({userId: u, expiresAt: Date.now() + 1e9});
    await db.ref(`users/${u}/userDetail`).set({publicKey: "pk" + u, chatFlag: true});
    await db.ref(`chatOpen/${u}/${u === "A" ? "B" : "A"}`).set(true);
  }
  const chat = (u) => jwt.sign(u, "test-secret");

  // Normal upload -> indexed -> receiver downloads -> file + index gone
  const sendFile = async (from = "A", to = "B") => {
    const init = await call("POST", "/chats/attachment/init", {chatId: chat(to), senderPublicKey: "pk" + from, encryptedFileKey: "a2V5", nounce: "bm9u", name: "photo.jpg", type: "image/jpeg", size: 10}, from);
    assert.strictEqual(init.status, 200, JSON.stringify(init.body));
    const id = init.body.messageId;
    await put(`chat-attachments/${to}/${from}/${id}`);
    const done = await call("POST", "/chats/attachment/complete", {messageId: id}, from);
    assert.strictEqual(done.status, 200, JSON.stringify(done.body));
    return id;
  };
  const id1 = await sendFile();
  assert.strictEqual((await db.ref(`attachmentIndex/${id1}/r`).get()).val(), "B", "indexed on complete");
  let r = await call("DELETE", "/chats/user-chat/attachment", {chatId: chat("A"), messageId: id1}, "B");
  assert.strictEqual(r.status, 200);
  assert.ok(!(await exists(`chat-attachments/B/A/${id1}`)), "file deleted after download");
  assert.ok(!(await db.ref(`attachmentIndex/${id1}`).get()).exists(), "index entry removed");
  console.log("ok downloaded file removed");

  // Cleanup: backfill old files, expire abandoned upload and undelivered files
  const id2 = await sendFile("A", "B"); // fresh, must stay
  const id3 = await sendFile("B", "A"); // will be made old
  await db.ref(`attachmentIndex/${id3}/at`).set(Date.now() - cfg.ATTACHMENT_TTL_MS - 1000);
  const cleanup = require(ROOT + "/chats/attachmentCleanup");
  let out = await cleanup.cleanupAttachments();
  assert.strictEqual(out.indexed, 1, "old files indexed once (" + JSON.stringify(out) + ")");
  assert.strictEqual(out.abandoned, 1);
  assert.ok(!(await exists("chat-attachments/B/A/oldPending")), "abandoned upload deleted");
  assert.ok(!(await db.ref("pendingUploads/oldPending").get()).exists());
  assert.ok(!(await exists(`chat-attachments/A/B/${id3}`)), "30-day-old undelivered file deleted");
  assert.ok(!(await db.ref(`chats/A/B/messages/${id3}`).get()).exists(), "its message removed too");
  assert.ok(await exists(`chat-attachments/B/A/${id2}`), "fresh file kept");
  assert.ok(await exists("chat-attachments/B/A/oldDownloaded"), "old file kept until it expires");
  // An old pre-index file expires by its upload time
  await db.ref("attachmentIndex/oldDownloaded/at").set(1);
  out = await cleanup.cleanupAttachments();
  assert.strictEqual(out.indexed, 0, "backfill runs once");
  assert.ok(!(await exists("chat-attachments/B/A/oldDownloaded")));
  console.log("ok hourly cleanup", JSON.stringify(out));

  // File removed from Storage by hand: download says it's gone and the message is cleaned up
  await bucket.file(`chat-attachments/B/A/${id2}`).delete();
  r = await call("GET", `/chats/user-chat/attachment?chatId=${encodeURIComponent(chat("A"))}&messageId=${id2}`, null, "B");
  assert.strictEqual(r.status, 404); assert.strictEqual(r.body.code, "ATTACHMENT_GONE");
  assert.ok(!(await db.ref(`chats/B/A/messages/${id2}`).get()).exists());
  assert.ok(!(await db.ref(`attachmentIndex/${id2}`).get()).exists());
  r = await call("GET", `/chats/user-chat/attachment?chatId=${encodeURIComponent(chat("A"))}&messageId=${id2}`, null, "B");
  assert.strictEqual(r.status, 404, "second try also 404");
  await put(`chat-attachments/B/A/${id2}`); // for the account deletion check below
  console.log("ok missing file reported as gone");

  // Account deletion removes files sent to that user
  const tasks = require(ROOT + "/bgTasks/cloudTasks");
  await tasks.deleteUserData.run({data: {userId: "B", sessionId: "s_B"}});
  assert.ok(!(await exists(`chat-attachments/B/A/${id2}`)), "files removed with the account");
  console.log("ok account deletion");
  console.log("ALL PASSED"); server.close(); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
