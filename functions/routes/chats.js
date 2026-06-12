const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const {chatBlobValidation} = require("../validators/chatValidator");
const {chatLimiter} = require("../middleware/rateLimiter");
const {isLoggedIn} = require("../middleware/authenticUser");
const {validate} = require("express-validation");

const db = admin.database();

// Get Post Owner PublicKey
router.post("/get-publicKey", isLoggedIn, chatLimiter, async (req, res) => {
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
    const snapshot = await db.ref(`users/${receiverUserId}/publicKey`).once("value");

    if (snapshot.exists()) {
      return res.status(200).json({publicKey: snapshot.val()});
    }

    return res.status(401).send({error: "Public key not found."});
  } catch (error) {
    return res.status(500).send({error: "Something went wrong"});
  }
});

// save encrypted chat to the server
router.post("/send-chat", isLoggedIn, chatLimiter, validate(chatBlobValidation), async (req, res) => {
  const {chatId, encryptedMsg, senderPublicKey, nounce} = req.body;
  const recieverUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
  const senderUserId = req.user.uid;

  if (!recieverUserId) {
    return res.status(404).send({error: "User not found!"});
  }

  if (senderUserId === recieverUserId) {
    return res.status(406).send({error: "Cannot chat with yourself"});
  }

  const senderChatId = jwt.sign(req.user.uid, process.env.JWT_SECRET_KEY);
  const timestamp = Date.now();

  const chatBlob = {
    encryptedMsg,
    timestamp,
    nounce,
  };

  const chatMetaData = {
    senderChatId,
    senderPublicKey,
    encryptedMsg,
    timestamp,
    nounce,
  };

  try {
    await db.ref(`chats/${recieverUserId}/${senderUserId}/messages`).push(chatBlob);
    await db.ref(`chats/${recieverUserId}/${senderUserId}`).update(chatMetaData);
    return res.status(200).send({message: "Message send successfully"});
  } catch (sendChatError) {
    console.log("sendChatError: ", sendChatError);
    res.status(500).send({error: "Something went wrong"});
  }
});

// Delete the fetched chats
router.delete("/user-chat", isLoggedIn, async (req, res) => {
  /**
   * The delete data body structure should be
   * [
   *    {
   *        chatId: "Chat Id of the post", String Data
   *        messagesKeys: "This are messages firebase generated keys", Array Data
   *    }
   * ]
   */

  const {delData} = req.body;
  const userId = req.user.uid;

  if (!delData) {
    return res.status(406).send({error: "Cannot process your request!"});
  }

  try {
    delData.forEach(async (data) => {
      const chatId = data.chatId;
      const messagesKeys = data.messagesKeys; // This is an array data structure

      const delChatUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);

      const updates = {};

      // Messages firebase generated keys
      messagesKeys.forEach((keys) => {
        updates[`chats/${userId}/${delChatUserId}/messages/${keys}`] = null;
      });

      await db.ref().update(updates);
      return res.status(200).send("Deleted Successfully!");
    });
  } catch (delError) {
    console.log("Error: ", delError);
    return res.status(500).send({error: "Something went wrong!"});
  }
});


// Get user chat from database - specific user chat
router.get("/user-chat", isLoggedIn, async (req, res) => {
  const {chatId} = req.query;
  if (!chatId) {
    return res.status(406).send({error: "Cannot process request."});
  }

  const senderUserId = req.user.uid;

  try {
    const recieverUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
    const snapshot = await db.ref(`chats/${senderUserId}/${recieverUserId}`).once("value");

    if (!snapshot.exists()) {
      return res.status(200).send([]);
    }

    const rawData = snapshot.val();

    let chatData = [];

    chatData = Object.entries(rawData.messages).map(([messageId, chat]) => ({
      id: messageId,
      ...chat,
    }
    ));

    const data = {
      chatId: rawData.senderChatId,
      senderPublicKey: rawData.senderPublicKey,
      messages: chatData,
    };

    return res.status(200).send(data);
  } catch (fetchError) {
    return res.status(500).send({error: "Something went wrong!"});
  }
});

// Get user all chats
router.get("/my-chats", isLoggedIn, async (req, res) => {
  const userId = req.user.uid;

  try {
    const chatSnapshot = await db.ref(`chats/${userId}`).once("value");
    if (!chatSnapshot.exists()) {
      return res.status(200).send([]);
    }

    const data = chatSnapshot.val();
    let chatsData = [];

    chatsData = Object.entries(data).map((chat) => {
      return {
        chatId: chat.senderChatId,
        senderPublicKey: chat.senderPublicKey,
        encryptedMsg: chat.encryptedMsg,
        timestamp: chat.timestamp,
        nounce: chat.nounce,
      };
    });

    return res.status(200).send(chatsData);
  } catch (error) {
    return res.status(500).send({error: "Something went wrong!"});
  }
});


module.exports = router;
