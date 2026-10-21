const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const {chatBlobValidation, fileBlobValidation} = require("../validators/chatValidator");
const {chatLimiter} = require("../middleware/rateLimiter");
const {isLoggedIn} = require("../middleware/authenticUser");
const {validate} = require("express-validation");

const db = admin.database();

// Get Post Owner PublicKey
router.post("/get-publicKey", chatLimiter, isLoggedIn, async (req, res) => {
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
router.post("/send-chat", chatLimiter, isLoggedIn, validate(chatBlobValidation), async (req, res) => {
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
    return res.status(200).send({message: "Message send successfully"});
  } catch (sendChatError) {
    console.log("sendChatError: ", sendChatError);
    res.status(500).send({error: "Something went wrong"});
  }
});

// Router to handle attachment coming from the client side
router.post("/send-attachment", chatLimiter, isLoggedIn, validate(fileBlobValidation), async (req, res) => {
  const {chatId, senderPublicKey, encryptedFile, encryptedFileKey, nounce, name, type, size} = req.body;
  const recieverUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
  const senderUserId = req.user.uid;

  if (!recieverUserId) {
    return res.status(404).send({error: "User not found!"});
  }

  if (senderUserId === recieverUserId) {
    return res.status(406).send({error: "Cannot chat with yourself"});
  }

  const senderChatId = jwt.sign(senderUserId, process.env.JWT_SECRET_KEY);
  const timestamp = Date.now();

  // This is message blob
  const chatBlob = {
    encryptedFile,
    encryptedFileKey,
    nounce,
    name,
    type,
    size,
    timestamp,
    encryptedMsg: name,
  };

  // This is last message chat blob
  const chatMetaData = {
    senderChatId,
    senderPublicKey,
    type,
    timestamp,
    nounce,
    encryptedMsg: name,
  };

  // Updating firebase realtime database
  try {
    await db.ref(`chats/${recieverUserId}/${senderUserId}/messages`).push(chatBlob);
    await db.ref(`chats/${recieverUserId}/${senderUserId}`).update(chatMetaData);
    return res.status(200).send({message: "Message send successfully"});
  } catch (sendChatError) {
    console.log("sendChatError: ", sendChatError);
    res.status(500).send({error: "Something went wrong"});
  }
});

// Delete all chats and its meta data from the server for all the user
router.delete("/my-chats", chatLimiter, isLoggedIn, async (req, res) => {
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
router.delete("/user-chat", chatLimiter, isLoggedIn, async (req, res) => {
  /**
   * The delete data body structure should be
   *    {
   *        chatId: "Chat Id of the post", String Data
   *        messagesKeys: "This are messages firebase generated keys", Array Data []
   *    }
   */

  const {chatId, messagesKeys} = req.body;
  const userId = req.user.uid;

  if (!chatId || !messagesKeys) {
    return res.status(406).send({error: "Cannot process your request!"});
  }

  try {
    const delChatUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);

    const updates = {};

    // Messages firebase generated keys
    messagesKeys.forEach((keys) => {
      updates[`chats/${userId}/${delChatUserId}/messages/${keys}`] = null;
    });

    await db.ref().update(updates);

    return res.status(200).send("Deleted Successfully!");
  } catch (delError) {
    console.log("Error: ", delError);
    return res.status(500).send({error: "Something went wrong!"});
  }
});


// Get user chat from database - specific user chat
router.get("/user-chat", chatLimiter, isLoggedIn, async (req, res) => {
  const {chatId} = req.query;
  if (!chatId) {
    return res.status(406).send({error: "Cannot process your request."});
  }

  const senderUserId = req.user.uid;

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

    let chatData = [];

    if (!rawData.messages) {
      return res.status(200).send([]);
    }

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
    return res.status(500).send(
        {
          error: "Internal Server Error!",
          success: false,
        });
  }
});

// Get user all chats
router.get("/my-chats", chatLimiter, isLoggedIn, async (req, res) => {
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
