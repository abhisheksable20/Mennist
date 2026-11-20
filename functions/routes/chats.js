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

// Storage object path: chat-attachments/<receiver>/<sender>/<messageId>
const objectPath = (receiverId, senderId, messageId) =>
  `chat-attachments/${receiverId}/${senderId}/${messageId}`;

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
    const snapshot = await db.ref(`users/${receiverUserId}/userDetail`).once("value");

    if (snapshot.exists()) {
      const userDetail = snapshot.val();
      return res.status(200).json({publicKey: userDetail.publicKey, chatFlag: userDetail.chatFlag});
    }

    return res.status(401).send({error: "Public key not found."});
  } catch (error) {
    return res.status(500).send({error: "Something went wrong"});
  }
});

// Check whether the receiver is available for chat or not
const isUserChatAvail = async (receiverUserId) => {
  if (!receiverUserId) {
    return false;
  }

  try {
    const snapshot = await db.ref(`users/${receiverUserId}/userDetail`).once("value");
    if (snapshot.exists()) {
      const snapshotVal = snapshot.val();
      if (snapshotVal.chatFlag) {
        return snapshotVal.chatFlag;
      }
    }

    return false;
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

  const isReceiverChatAvail = await isUserChatAvail(recieverUserId);
  if (!isReceiverChatAvail) {
    return res.status(403).send({error: "Reciever chat is disabled!"});
  }

  if (!(await passChatGate(res, senderUserId, recieverUserId))) {
    return;
  }

  const senderChatId = jwt.sign(senderUserId, process.env.JWT_SECRET_KEY);
  const timestamp = Date.now();

  const chatBlob = {encryptedMsg, timestamp, nounce, type: "plain/text"};
  const chatMetaData = {senderChatId, senderPublicKey, encryptedMsg, timestamp, nounce, type: "plain/text"};

  try {
    await db.ref(`chats/${recieverUserId}/${senderUserId}/messages`).push(chatBlob);
    await db.ref(`chats/${recieverUserId}/${senderUserId}`).update(chatMetaData);

    await notificationQueue.enqueue({
      eventId: `message_${senderUserId}_${recieverUserId}`,
      userId: recieverUserId,
      actorId: senderUserId,
      type: "message",
      chatId: senderChatId,
    });
    return res.status(200).send({message: "Message send successfully"});
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

    if (!(await isUserChatAvail(receiverId))) {
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

    const senderChatId = jwt.sign(senderId, process.env.JWT_SECRET_KEY);
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
    await db.ref().update(updates);

    await notificationQueue.enqueue({
      eventId: `attachement_${senderId}_${pending.receiverId}`,
      userId: pending.receiverId,
      actorId: senderId,
      type: "attachment",
      chatId: senderChatId,
    });

    return res.status(200).send({message: "Message send successfully"});
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
    const snapshot = await db.ref(`chats/${senderUserId}/${recieverUserId}`).once("value");
    if (!snapshot.exists()) return res.status(200).send([]);

    const rawData = snapshot.val();
    if (!rawData.messages) return res.status(200).send([]);

    const chatData = Object.entries(rawData.messages).map(([messageId, chat]) => ({
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
      const [downloadUrl] = await getBucket().file(objectPath(userId, otherUserId, attachmentId)).getSignedUrl({
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

    const chatsData = Object.values(chatSnapshot.val()).map((chat) => ({
      chatId: chat.senderChatId,
      senderPublicKey: chat.senderPublicKey,
      encryptedMsg: chat.encryptedMsg,
      timestamp: chat.timestamp,
      nounce: chat.nounce,
      type: chat.type,
    }));

    return res.status(200).send(chatsData);
  } catch (error) {
    return res.status(500).send({error: "Internal Server Error!", success: false});
  }
});

module.exports = router;
