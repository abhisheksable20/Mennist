const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const path = require("path");
const {chatBlobValidation, attachmentInitValidation, attachmentCompleteValidation} = require("../validators/chatValidator");
const {chatSendLimiter, attachmentLimiter, chatReadLimiter} = require("../middleware/rateLimiter");
const {isLoggedIn} = require("../middleware/authenticUser");
const {validate} = require("express-validation");
const {getFunctions} = require("firebase-admin/functions");
const cfg = require("../config/attachments");
const {allowChatMessage, CoinError} = require("../coins/coinService");
const {objectPath} = require("../chats/attachmentCleanup");

const db = admin.database();
const getBucket = () => admin.storage().bucket();

const notificationQueue = getFunctions().taskQueue("processNotification");

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

// jwt.verify throws on a tampered token; never let that escape the handler
const verifyChatId = (chatId) => {
  try {
    const id = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
    return typeof id === "string" && id ? id : null;
  } catch (e) {
    return null;
  }
};


// New chats cost coins after the daily free ones. Sends the error and returns
// false when the sender can't start this chat.
const passChatGate = async (res, senderId, receiverId) => {
  try {
    await allowChatMessage(senderId, receiverId);
    return true;
  } catch (gateErr) {
    if (gateErr instanceof CoinError) {
      res.status(gateErr.status).send({error: gateErr.message, code: gateErr.code, message: gateErr.message});
    } else {
      console.log("Chat gate error:", gateErr);
      res.status(500).send({error: "Something went wrong"});
    }
    return false;
  }
};

// blocks/{blocker}/{blocked} = when they were blocked
const blockRef = (blockerId, blockedId) => db.ref(`blocks/${blockerId}/${blockedId}`);

const isAttachmentMessage = (m) => !!m && (!!m.attachmentId || !!m.encryptedFile);

// Get Post Owner PublicKey
router.post("/get-publicKey", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId} = req.body;
  const userUniqueId = req.user.uid;

  if (!chatId) {
    return res.status(400).send({error: "You cannot chat with this person."});
  }

  const receiverUserId = verifyChatId(chatId);
  if (!receiverUserId) {
    return res.status(400).send({error: "You cannot chat with this person."});
  }
  if (userUniqueId === receiverUserId) {
    return res.status(406).send({error: "You have your own public key"});
  }

  try {
    // Only the fields needed, not the whole profile
    const [keySnap, flagSnap, iBlockedSnap, theyBlockedSnap] = await Promise.all([
      db.ref(`users/${receiverUserId}/userDetail/publicKey`).get(),
      db.ref(`users/${receiverUserId}/userDetail/chatFlag`).get(),
      blockRef(userUniqueId, receiverUserId).get(),
      blockRef(receiverUserId, userUniqueId).get(),
    ]);

    if (keySnap.exists()) {
      // Someone who blocked you just looks unavailable, the same as chat turned off
      return res.status(200).json({
        publicKey: keySnap.val(),
        chatFlag: theyBlockedSnap.exists() ? false : flagSnap.val(),
        blocked: iBlockedSnap.exists(),
      });
    }

    return res.status(401).send({error: "Public key not found."});
  } catch (error) {
    return res.status(500).send({error: "Something went wrong"});
  }
});

// The receiver has chat turned on and neither person has blocked the other
const canMessage = async (senderUserId, receiverUserId) => {
  if (!receiverUserId) {
    return false;
  }

  try {
    const [flagSnap, sentBlock, receivedBlock] = await Promise.all([
      db.ref(`users/${receiverUserId}/userDetail/chatFlag`).get(),
      blockRef(senderUserId, receiverUserId).get(),
      blockRef(receiverUserId, senderUserId).get(),
    ]);
    return flagSnap.val() === true && !sentBlock.exists() && !receivedBlock.exists();
  } catch (flagFetchErr) {
    console.log("Flag Fetching Error: ", flagFetchErr);
    return false;
  }
};

// save encrypted chat to the server
router.post("/send-chat", isLoggedIn, chatSendLimiter, validate(chatBlobValidation), async (req, res) => {
  const {chatId, encryptedMsg, senderPublicKey, nounce} = req.body;
  const recieverUserId = verifyChatId(chatId);
  const senderUserId = req.user.uid;

  if (!recieverUserId) {
    return res.status(404).send({error: "User not found!"});
  }

  if (senderUserId === recieverUserId) {
    return res.status(406).send({error: "Cannot chat with yourself"});
  }

  if (!(await canMessage(senderUserId, recieverUserId))) {
    return res.status(403).send({error: "Reciever chat is disabled!"});
  }

  if (!(await passChatGate(res, senderUserId, recieverUserId))) {
    return;
  }

  const senderChatId = req.user.chatId;
  const timestamp = Date.now();
  const base = `chats/${recieverUserId}/${senderUserId}`;
  const messageId = db.ref(`${base}/messages`).push().key;

  try {
    // The message and the chat-list preview, in one write
    await db.ref().update({
      [`${base}/messages/${messageId}`]: {encryptedMsg, timestamp, nounce, type: "plain/text"},
      [`${base}/senderChatId`]: senderChatId,
      [`${base}/senderPublicKey`]: senderPublicKey,
      [`${base}/encryptedMsg`]: encryptedMsg,
      [`${base}/timestamp`]: timestamp,
      [`${base}/nounce`]: nounce,
      [`${base}/type`]: "plain/text",
    });

    await notificationQueue.enqueue({
      eventId: `message_${senderUserId}_${recieverUserId}`,
      userId: recieverUserId,
      actorId: senderUserId,
      type: "message",
      chatId: senderChatId,
    });
    return res.status(200).send({message: "Message send successfully", timestamp});
  } catch (sendChatError) {
    console.log("sendChatError: ", sendChatError);
    res.status(500).send({error: "Something went wrong"});
  }
});

/* ------------------------------------------------------------------ */
/*  Attachments (files live in Cloud Storage, only metadata is in RTDB) */
/* ------------------------------------------------------------------ */

// Step 1: validate metadata, hand the sender a resumable upload session
router.post("/attachment/init", isLoggedIn, attachmentLimiter, validate(attachmentInitValidation), async (req, res) => {
  const {chatId, senderPublicKey, encryptedFileKey, nounce, name, type, size} = req.body;
  const senderId = req.user.uid;

  try {
    const receiverId = verifyChatId(chatId);
    if (!receiverId) return res.status(404).send({error: "User not found!"});
    if (receiverId === senderId) return res.status(406).send({error: "Cannot chat with yourself"});

    if (!(await canMessage(senderId, receiverId))) {
      return res.status(403).send({error: "Reciever chat is disabled!"});
    }

    const ext = path.extname(name).slice(1).toLowerCase();
    if (cfg.BLOCKED_EXT.has(ext) || !cfg.ALLOWED_TYPES[type].includes(ext)) {
      return res.status(415).send({error: "This file type is not allowed."});
    }

    if (!(await passChatGate(res, senderId, receiverId))) {
      return;
    }

    const messageId = db.ref(`chats/${receiverId}/${senderId}/messages`).push().key;
    const [uploadUrl] = await getBucket().file(objectPath(receiverId, senderId, messageId)).createResumableUpload({
      origin: req.get("origin") || undefined, // CORS already limited this to allowed origins
      metadata: {contentType: "application/octet-stream"}, // it's ciphertext
    });

    await db.ref(`pendingUploads/${messageId}`).set({
      senderId, receiverId, name, type, size, senderPublicKey, encryptedFileKey, nounce,
      expectedBytes: cfg.encryptedSize(size),
      createdAt: Date.now(),
    });

    return res.status(200).send({messageId, uploadUrl});
  } catch (err) {
    console.log("attachmentInitError:", err);
    return res.status(500).send({error: "Something went wrong"});
  }
});

// Step 3: verify what landed in Storage, then publish the message
router.post("/attachment/complete", isLoggedIn, attachmentLimiter, validate(attachmentCompleteValidation), async (req, res) => {
  const {messageId} = req.body;
  const senderId = req.user.uid;

  try {
    const pendingRef = db.ref(`pendingUploads/${messageId}`);
    const pending = (await pendingRef.once("value")).val();
    if (!pending || pending.senderId !== senderId) {
      return res.status(404).send({error: "Upload not found"});
    }

    const file = getBucket().file(objectPath(pending.receiverId, senderId, messageId));
    const [exists] = await file.exists();
    if (!exists) return res.status(409).send({error: "Upload incomplete"});

    const [meta] = await file.getMetadata();
    if (Number(meta.size) !== pending.expectedBytes) {
      await file.delete({ignoreNotFound: true}).catch(() => {});
      await pendingRef.remove();
      return res.status(422).send({error: "File size mismatch"});
    }

    const senderChatId = req.user.chatId;
    const timestamp = Date.now();
    const base = `chats/${pending.receiverId}/${senderId}`;

    const updates = {};
    updates[`${base}/messages/${messageId}`] = {
      timestamp, name: pending.name, type: pending.type, size: pending.size,
      encryptedMsg: pending.name, attachmentId: messageId, storage: true,
    };
    updates[`${base}/attachments/${messageId}`] = {
      encryptedFileKey: pending.encryptedFileKey, nounce: pending.nounce,
      name: pending.name, type: pending.type, size: pending.size, timestamp, storage: true,
    };
    // last-message metadata for the chat list
    updates[`${base}/senderChatId`] = senderChatId;
    updates[`${base}/senderPublicKey`] = pending.senderPublicKey;
    updates[`${base}/type`] = pending.type;
    updates[`${base}/timestamp`] = timestamp;
    updates[`${base}/nounce`] = pending.nounce;
    updates[`${base}/encryptedMsg`] = pending.name;
    updates[`pendingUploads/${messageId}`] = null;
    // So the hourly cleanup can remove it if it's never downloaded
    updates[`attachmentIndex/${messageId}`] = {r: pending.receiverId, s: senderId, at: timestamp};
    await db.ref().update(updates);

    await notificationQueue.enqueue({
      eventId: `attachement_${senderId}_${pending.receiverId}`,
      userId: pending.receiverId,
      actorId: senderId,
      type: "attachment",
      chatId: senderChatId,
    });

    return res.status(200).send({message: "Message send successfully", timestamp});
  } catch (err) {
    console.log("attachmentCompleteError:", err);
    return res.status(500).send({error: "Something went wrong"});
  }
});

// Delete all chats (and stored files) of one conversation
router.delete("/my-chats", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId} = req.body;
  const userId = req.user.uid;

  if (!chatId) {
    return res.status(406).send({error: "Cannot process your request!"});
  }

  const recieverUserId = verifyChatId(chatId);
  if (!recieverUserId) {
    return res.status(406).send({error: "Cannot process your request!"});
  }

  try {
    await db.ref(`chats/${userId}/${recieverUserId}`).remove();
    await getBucket().deleteFiles({prefix: `chat-attachments/${userId}/${recieverUserId}/`, force: true});
    return res.status(200).send({message: "Messages deleted successfully!"});
  } catch (error) {
    console.log("Failed to delete chats data: ", error);
    return res.status(500).send({error: "Something went wrong!"});
  }
});

// Delete fetched TEXT messages. Attachments are removed only after they are downloaded.
router.delete("/user-chat", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId, messagesKeys} = req.body;
  const userId = req.user.uid;

  if (!chatId || !Array.isArray(messagesKeys) || messagesKeys.length > 1000) {
    return res.status(406).send({error: "Cannot process your request!"});
  }

  const otherUserId = verifyChatId(chatId);
  if (!otherUserId) {
    return res.status(406).send({error: "Cannot process your request!"});
  }

  try {
    const conversationPath = `chats/${userId}/${otherUserId}`;
    const all = (await db.ref(`${conversationPath}/messages`).once("value")).val() || {};

    const updates = {};
    for (const messageId of messagesKeys) {
      if (typeof messageId !== "string" || !SAFE_ID.test(messageId)) continue;
      const message = all[messageId];
      if (!message || isAttachmentMessage(message)) continue;
      updates[`${conversationPath}/messages/${messageId}`] = null;
    }

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }

    return res.status(200).send({message: "Fetched messages processed successfully."});
  } catch (delError) {
    console.log("Error: ", delError);
    return res.status(500).send({error: "Something went wrong!"});
  }
});

// Delete one attachment (message + metadata + stored file) after the receiver has saved it
router.delete("/user-chat/attachment", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId, messageId} = req.body;
  const userId = req.user.uid;

  if (!chatId || !messageId || !SAFE_ID.test(messageId)) {
    return res.status(400).send({error: "Chat ID and message ID are required."});
  }

  const otherUserId = verifyChatId(chatId);
  if (!otherUserId) {
    return res.status(400).send({error: "Chat ID and message ID are required."});
  }

  try {
    const conversationPath = `chats/${userId}/${otherUserId}`;
    const message = (await db.ref(`${conversationPath}/messages/${messageId}`).once("value")).val();

    if (!message) return res.status(404).send({error: "Message not found."});
    if (!isAttachmentMessage(message)) {
      return res.status(400).send({error: "This message is not an attachment."});
    }

    const attachmentId = message.attachmentId || messageId;

    await db.ref().update({
      [`${conversationPath}/attachments/${attachmentId}`]: null,
      [`${conversationPath}/messages/${messageId}`]: null,
      ...(SAFE_ID.test(attachmentId) ? {[`attachmentIndex/${attachmentId}`]: null} : {}),
    });

    if (message.storage && SAFE_ID.test(attachmentId)) {
      await getBucket().file(objectPath(userId, otherUserId, attachmentId)).delete({ignoreNotFound: true})
          .catch((e) => console.log("Storage delete failed:", e.message));
    }

    return res.status(200).send({message: "Attachment deleted successfully."});
  } catch (error) {
    console.log("deleteAttachmentError:", error);
    return res.status(500).send({error: "Something went wrong."});
  }
});

// Get user chat from database - specific user chat
router.get("/user-chat", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId} = req.query;
  const senderUserId = req.user.uid;

  if (!chatId) {
    return res.status(406).send({error: "Cannot process your request."});
  }

  const recieverUserId = verifyChatId(chatId);
  if (!recieverUserId) {
    return res.status(406).send({error: "Token not matched!"});
  }

  try {
    const conversationPath = `chats/${senderUserId}/${recieverUserId}`;
    const [snapshot, receiptSnap, receiptsOffSnap] = await Promise.all([
      db.ref(conversationPath).once("value"),
      db.ref(`receipts/${senderUserId}/${recieverUserId}`).get(), // how far they got through my messages
      db.ref(`users/${senderUserId}/userDetail/readReceiptsOff`).get(),
    ]);

    const rawData = snapshot.val() || {};
    const receiptsOff = receiptsOffSnap.val() === true;
    const seen = receiptSnap.val() || {};
    // Read receipts work both ways: with them off you don't see theirs either
    const receipt = {d: seen.d || 0, r: receiptsOff ? 0 : seen.r || 0};

    // Opening the chat delivers and reads everything in it. Written once per new message, not per fetch.
    if (rawData.timestamp > (rawData.rAck || 0)) {
      const updates = {
        [`receipts/${recieverUserId}/${senderUserId}/d`]: rawData.timestamp,
        [`${conversationPath}/dAck`]: rawData.timestamp,
        [`${conversationPath}/rAck`]: rawData.timestamp,
      };
      if (!receiptsOff) updates[`receipts/${recieverUserId}/${senderUserId}/r`] = rawData.timestamp;
      await db.ref().update(updates);
    }

    const chatData = Object.entries(rawData.messages || {}).map(([messageId, chat]) => ({
      id: messageId,
      timestamp: chat.timestamp,
      type: chat.type,
      encryptedMsg: chat.encryptedMsg,
      nounce: chat.nounce,
      name: chat.name,
      size: chat.size,
      hasAttachment: isAttachmentMessage(chat),
      attachmentId: chat.attachmentId || (chat.encryptedFile ? messageId : null),
    }));

    return res.status(200).send({
      chatId: rawData.senderChatId,
      senderPublicKey: rawData.senderPublicKey,
      messages: chatData,
      receipt,
    });
  } catch (fetchError) {
    return res.status(500).send({error: "Internal Server Error!", success: false});
  }
});

// Receiver asks for ONE attachment: gets a short-lived read URL + key material
router.get("/user-chat/attachment", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId, messageId} = req.query;
  const userId = req.user.uid;

  if (!chatId || !messageId || !SAFE_ID.test(messageId)) {
    return res.status(400).send({error: "Chat ID and message ID are required."});
  }

  const otherUserId = verifyChatId(chatId);
  if (!otherUserId) {
    return res.status(400).send({error: "Chat ID and message ID are required."});
  }

  try {
    const conversationPath = `chats/${userId}/${otherUserId}`;
    const message = (await db.ref(`${conversationPath}/messages/${messageId}`).once("value")).val();

    if (!isAttachmentMessage(message)) {
      return res.status(404).send({error: "Attachment message not found."});
    }

    const attachmentId = message.attachmentId || messageId;
    let attachment = SAFE_ID.test(attachmentId) ?
      (await db.ref(`${conversationPath}/attachments/${attachmentId}`).once("value")).val() :
      null;

    if (!attachment && message.encryptedFile) attachment = message; // very old embedded records
    if (!attachment) return res.status(404).send({error: "Attachment data not found."});

    // New style: file is in Cloud Storage
    if (attachment.storage) {
      const file = getBucket().file(objectPath(userId, otherUserId, attachmentId));
      // File already removed from Storage: clean up the message and say it's gone,
      // instead of handing out a link that fails halfway through the download
      const [fileExists] = await file.exists();
      if (!fileExists) {
        await db.ref().update({
          [`${conversationPath}/messages/${messageId}`]: null,
          [`${conversationPath}/attachments/${attachmentId}`]: null,
          [`attachmentIndex/${attachmentId}`]: null,
        });
        return res.status(404).send({error: "This file is no longer available.", code: "ATTACHMENT_GONE"});
      }

      const [downloadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 2 * 60 * 60 * 1000, // a 1 GB download can take a while
      });

      return res.status(200).send({
        messageId, downloadUrl,
        encryptedFileKey: attachment.encryptedFileKey,
        nounce: attachment.nounce,
        name: attachment.name, type: attachment.type, size: attachment.size,
      });
    }

    // Legacy: base64 ciphertext stored in RTDB
    return res.status(200).send({
      messageId,
      encryptedFile: attachment.encryptedFile,
      encryptedFileKey: attachment.encryptedFileKey,
      nounce: attachment.nounce,
      name: attachment.name, type: attachment.type, size: attachment.size,
    });
  } catch (error) {
    console.log("fetchAttachmentError:", error);
    return res.status(500).send({error: "Something went wrong."});
  }
});

// Get user all chats
router.get("/my-chats", isLoggedIn, chatReadLimiter, async (req, res) => {
  const userId = req.user.uid;

  try {
    const chatSnapshot = await db.ref(`chats/${userId}`).once("value");
    if (!chatSnapshot.exists()) return res.status(200).send([]);

    const chatsData = [];
    const delivered = {};
    for (const [otherId, chat] of Object.entries(chatSnapshot.val())) {
      if (!chat.senderChatId) continue;
      // New messages reached this device: mark them delivered, once
      if (chat.timestamp > (chat.dAck || 0)) {
        delivered[`receipts/${otherId}/${userId}/d`] = chat.timestamp;
        delivered[`chats/${userId}/${otherId}/dAck`] = chat.timestamp;
      }
      chatsData.push({
        chatId: chat.senderChatId,
        senderPublicKey: chat.senderPublicKey,
        encryptedMsg: chat.encryptedMsg,
        timestamp: chat.timestamp,
        nounce: chat.nounce,
        type: chat.type,
      });
    }
    if (Object.keys(delivered).length > 0) await db.ref().update(delivered);

    return res.status(200).send(chatsData);
  } catch (error) {
    return res.status(500).send({error: "Internal Server Error!", success: false});
  }
});

/* ------------------------------------------------------------------ */
/*  Blocking: a blocked person can't message, send files or coins       */
/* ------------------------------------------------------------------ */

// The other person in the chat, or null after sending the error
const otherPerson = (req, res) => {
  const otherUserId = verifyChatId(req.body.chatId);
  if (!otherUserId) {
    res.status(400).send({error: "Cannot process your request!"});
    return null;
  }
  if (otherUserId === req.user.uid) {
    res.status(406).send({error: "You can't block yourself."});
    return null;
  }
  return otherUserId;
};

router.post("/block", isLoggedIn, chatReadLimiter, async (req, res) => {
  const otherUserId = otherPerson(req, res);
  if (!otherUserId) return;

  try {
    await blockRef(req.user.uid, otherUserId).set(Date.now());
    return res.status(200).send({blocked: true});
  } catch (blockErr) {
    console.log("blockError:", blockErr);
    return res.status(500).send({error: "Something went wrong!"});
  }
});

router.delete("/block", isLoggedIn, chatReadLimiter, async (req, res) => {
  const otherUserId = otherPerson(req, res);
  if (!otherUserId) return;

  try {
    await blockRef(req.user.uid, otherUserId).remove();
    return res.status(200).send({blocked: false});
  } catch (unblockErr) {
    console.log("unblockError:", unblockErr);
    return res.status(500).send({error: "Something went wrong!"});
  }
});

// People this user blocked, newest first
router.get("/blocked", isLoggedIn, chatReadLimiter, async (req, res) => {
  try {
    const blocked = (await db.ref(`blocks/${req.user.uid}`).get()).val() || {};
    const list = Object.entries(blocked)
        .sort((a, b) => b[1] - a[1])
        .map(([uid, at]) => ({chatId: jwt.sign(uid, process.env.JWT_SECRET_KEY), at}));
    return res.status(200).send(list);
  } catch (listErr) {
    console.log("blockedListError:", listErr);
    return res.status(500).send({error: "Something went wrong!"});
  }
});

module.exports = router;
