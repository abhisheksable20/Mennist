const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const {chatBlobValidation, fileBlobValidation} = require("../validators/chatValidator");
const {chatSendLimiter, attachmentLimiter, chatReadLimiter} = require("../middleware/rateLimiter");
const {isLoggedIn} = require("../middleware/authenticUser");
const {validate} = require("express-validation");
const {getFunctions} = require("firebase-admin/functions");

const db = admin.database();

const notificationQueue = getFunctions().taskQueue("processNotification");

// Get Post Owner PublicKey
router.post("/get-publicKey", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId} = req.body;
  const userUniqueId = req.user.uid;

  if (!chatId) {
    return res.status(400).send({error: "You cannot chat with this person."});
  }

  const receiverUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
  if (userUniqueId === receiverUserId) {
    return res.status(406).send({error: "You have your own public key"});
  }

  try {
    const snapshot = await db.ref(`users/${receiverUserId}/userDetail`).once("value");

    if (snapshot.exists()) {
      const userDetail = snapshot.val();
      const publicKey = userDetail.publicKey;
      const chatFlag = userDetail.chatFlag;

      return res.status(200).json({publicKey: publicKey, chatFlag: chatFlag});
    }

    return res.status(401).send({error: "Public key not found."});
  } catch (error) {
    return res.status(500).send({error: "Something went wrong"});
  }
});

// Check wheather the receiver is available for chat or not
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
  const recieverUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
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

  const senderChatId = jwt.sign(senderUserId, process.env.JWT_SECRET_KEY);
  const timestamp = Date.now();

  const chatBlob = {
    encryptedMsg,
    timestamp,
    nounce,
    type: "plain/text",
  };

  const chatMetaData = {
    senderChatId,
    senderPublicKey,
    encryptedMsg,
    timestamp,
    nounce,
    type: "plain/text",
  };

  try {
    await db.ref(`chats/${recieverUserId}/${senderUserId}/messages`).push(chatBlob);
    await db.ref(`chats/${recieverUserId}/${senderUserId}`).update(chatMetaData);

    // Send notification to the receiverID
    // eventId, userId, actorId, type, postId, echoId, chatId, vibe
    const notificationData = {
      eventId: `message_${senderUserId}_${recieverUserId}`,
      userId: recieverUserId,
      actorId: senderUserId,
      type: "message",
      chatId: senderChatId,
    };

    await notificationQueue.enqueue(notificationData);
    return res.status(200).send({message: "Message send successfully"});
  } catch (sendChatError) {
    console.log("sendChatError: ", sendChatError);
    res.status(500).send({error: "Something went wrong"});
  }
});

// Router to handle attachment coming from the client side
router.post("/send-attachment", isLoggedIn, attachmentLimiter, validate(fileBlobValidation), async (req, res) => {
  const {chatId, senderPublicKey, encryptedFile, encryptedFileKey, nounce, name, type, size} = req.body;
  const senderUserId = req.user.uid;

  try {
    if (!chatId) {
      return res.status(400).send({error: "Chat ID is required."});
    }

    const recieverUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);

    if (!recieverUserId) {
      return res.status(404).send({error: "User not found!"});
    }

    if (senderUserId === recieverUserId) {
      return res.status(406).send({error: "Cannot chat with yourself"});
    }

    const senderChatId = jwt.sign(senderUserId, process.env.JWT_SECRET_KEY);
    const timestamp = Date.now();

    const conversationPath = `chats/${recieverUserId}/${senderUserId}`;

    // Generate message ID
    const messageRef = db.ref(`${conversationPath}/messages`).push();

    const messageId = messageRef.key;

    // Individual message metadata
    const messageData = {
      timestamp,
      name,
      type,
      size,
      encryptedMsg: name,
      attachmentId: messageId,
    };

    // Encrypted attachment data
    const attachmentData = {
      encryptedFile,
      encryptedFileKey,
      nounce,
      name,
      type,
      size,
      timestamp,
    };

    // Save message and attachment separately
    const updates = {};

    updates[`${conversationPath}/messages/${messageId}`] = messageData;

    updates[`${conversationPath}/attachments/${messageId}`] = attachmentData;

    await db.ref().update(updates);

    // This is last message chat blob
    const chatMetaData = {
      senderChatId,
      senderPublicKey,
      type,
      timestamp,
      nounce,
      encryptedMsg: name,
    };

    await db.ref(conversationPath).update(chatMetaData);

    // Send notification to the receiverID
    // eventId, userId, actorId, type, postId, echoId, chatId, vibe
    const notificationData = {
      eventId: `attachement_${senderUserId}_${recieverUserId}`,
      userId: recieverUserId,
      actorId: senderUserId,
      type: "attachment",
      chatId: senderChatId,
    };

    await notificationQueue.enqueue(notificationData);

    return res.status(200).send({message: "Message send successfully"});
  } catch (sendChatError) {
    console.log("sendChatError: ", sendChatError);
    res.status(500).send({error: "Something went wrong"});
  }
});

// Delete all chats and its meta data from the server for all the user
router.delete("/my-chats", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId} = req.body;
  const userId = req.user.uid;

  if (!chatId) {
    return res.status(406).send({error: "Cannot process your request!"});
  }

  try {
    const recieverUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
    await db.ref(`chats/${userId}/${recieverUserId}`).remove();
    return res.status(200).send({message: "Messages deleted successfully!"});
  } catch (error) {
    console.log("Failed to delete chats data: ", error);
    return res.status(500).send({error: "Something went wrong!"});
  }
});

// Delete the fetched chats
router.delete("/user-chat", isLoggedIn, chatReadLimiter, async (req, res) => {
  /**
   * The delete data body structure should be
   *    {
   *        chatId: "Chat Id of the post", String Data
   *        messagesKeys: "This are messages firebase generated keys", Array Data []
   *    }
   */

  const {chatId, messagesKeys} = req.body;
  const userId = req.user.uid;

  if (!chatId || !Array.isArray(messagesKeys)) {
    return res.status(406).send({
      error: "Cannot process your request!",
    });
  }

  try {
    const otherUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);

    const conversationPath =
      `chats/${userId}/${otherUserId}`;

    const updates = {};

    for (const messageId of messagesKeys) {
      const messageSnapshot = await db.ref(`${conversationPath}/messages/${messageId}`).once("value");
      if (!messageSnapshot.exists()) {
        continue;
      }

      const message = messageSnapshot.val();

      // Keep attachment metadata until the attachment is downloaded
      if (message.type && message.type.startsWith("image")) {
        continue;
      }

      updates[`${conversationPath}/messages/${messageId}`] = null;
    }

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }

    return res.status(200).send({
      message: "Fetched messages processed successfully.",
    });
  } catch (delError) {
    console.log("Error: ", delError);
    return res.status(500).send({error: "Something went wrong!"});
  }
});

router.delete("/user-chat/attachment", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId, messageId} = req.body;
  const userId = req.user.uid;

  if (!chatId || !messageId) {
    return res.status(400).send({
      error: "Chat ID and message ID are required.",
    });
  }

  try {
    const otherUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);

    const conversationPath = `chats/${userId}/${otherUserId}`;

    const messageSnapshot = await db.ref(`${conversationPath}/messages/${messageId}`).once("value");

    if (!messageSnapshot.exists()) {
      return res.status(404).send({
        error: "Message not found.",
      });
    }

    const message = messageSnapshot.val();

    if (!message.type || !message.type.startsWith("image")) {
      return res.status(400).send({
        error: "This message is not an attachment.",
      });
    }

    const attachmentId = message.attachmentId || messageId;

    const updates = {};

    updates[`${conversationPath}/attachments/${attachmentId}`] = null;
    updates[`${conversationPath}/messages/${messageId}`] = null;

    // Also remove embedded data from older records
    if (message.encryptedFile) {
      updates[`${conversationPath}/messages/${messageId}/encryptedFile`] = null;
      updates[`${conversationPath}/messages/${messageId}/encryptedFileKey`] = null;
    }

    await db.ref().update(updates);

    return res.status(200).send({
      message: "Attachment deleted successfully.",
    });
  } catch (error) {
    console.log("deleteAttachmentError:", error);
    return res.status(500).send({
      error: "Something went wrong.",
    });
  }
});


// Get user chat from database - specific user chat
router.get("/user-chat", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId} = req.query;
  const senderUserId = req.user.uid;

  if (!chatId) {
    return res.status(406).send({error: "Cannot process your request."});
  }

  try {
    const recieverUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
    if (!recieverUserId) {
      return res.status(406).send({error: "Token not matched!"});
    }

    const snapshot = await db.ref(`chats/${senderUserId}/${recieverUserId}`).once("value");

    if (!snapshot.exists()) {
      return res.status(200).send([]);
    }

    const rawData = snapshot.val();

    if (!rawData.messages) {
      return res.status(200).send([]);
    }

    const chatData = Object.entries(rawData.messages).map(
        ([messageId, chat]) => {
          return {
            id: messageId,
            timestamp: chat.timestamp,
            type: chat.type,
            encryptedMsg: chat.encryptedMsg,
            nounce: chat.nounce,
            name: chat.name,
            size: chat.size,
            hasAttachment: chat.type && chat.type.startsWith("image") || false,
            attachmentId: chat.attachmentId || (chat.encryptedFile ? messageId : null),
          };
        },
    );


    const data = {
      chatId: rawData.senderChatId,
      senderPublicKey: rawData.senderPublicKey,
      messages: chatData,
    };

    return res.status(200).send(data);
  } catch (fetchError) {
    return res.status(500).send(
        {
          error: "Internal Server Error!",
          success: false,
        });
  }
});

router.get("/user-chat/attachment", isLoggedIn, chatReadLimiter, async (req, res) => {
  const {chatId, messageId} = req.query;
  const userId = req.user.uid;

  if (!chatId || !messageId) {
    return res.status(400).send({
      error: "Chat ID and message ID are required.",
    });
  }

  try {
    const otherUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);

    const conversationPath = `chats/${userId}/${otherUserId}`;

    // Verify requested message belongs to this conversation
    const messageSnapshot = await db.ref(`${conversationPath}/messages/${messageId}`).once("value");

    if (!messageSnapshot.exists()) {
      return res.status(404).send({
        error: "Attachment message not found.",
      });
    }

    const message = messageSnapshot.val();

    if (!message.type || !message.type.startsWith("image")) {
      return res.status(400).send({
        error: "This message is not an attachment.",
      });
    }

    // Fetch only the requested encrypted attachment
    const attachmentSnapshot = await db.ref(`${conversationPath}/attachments/${message.attachmentId || messageId}`).once("value");

    let attachment;

    if (attachmentSnapshot.exists()) {
      attachment = attachmentSnapshot.val();
    } else {
      // Backward compatibility with old records
      if (!message.encryptedFile || !message.encryptedFileKey) {
        return res.status(404).send({
          error: "Attachment data not found.",
        });
      }

      attachment = message;
    }

    return res.status(200).send({
      messageId,
      encryptedFile: attachment.encryptedFile,
      encryptedFileKey: attachment.encryptedFileKey,
      nounce: attachment.nounce,
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
    });
  } catch (error) {
    console.log("fetchAttachmentError:", error);

    return res.status(500).send({
      error: "Something went wrong.",
    });
  }
});

// Get user all chats
router.get("/my-chats", isLoggedIn, chatReadLimiter, async (req, res) => {
  const userId = req.user.uid;

  try {
    const chatSnapshot = await db.ref(`chats/${userId}`).once("value");
    if (!chatSnapshot.exists()) {
      return res.status(200).send([]);
    }

    const data = chatSnapshot.val();
    let chatsData = [];

    chatsData = Object.values(data).map((chat) => {
      return {
        chatId: chat.senderChatId,
        senderPublicKey: chat.senderPublicKey,
        encryptedMsg: chat.encryptedMsg,
        timestamp: chat.timestamp,
        nounce: chat.nounce,
        type: chat.type,
      };
    });


    return res.status(200).send(chatsData);
  } catch (error) {
    return res.status(500).send(
        {
          error: "Internal Server Error!",
          success: false,
        });
  }
});


module.exports = router;
