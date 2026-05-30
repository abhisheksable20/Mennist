const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const { chatBlobValidation } = require("../validators/chatValidator")
const { chatLimiter } = require("../middleware/rateLimiter");
const { isLoggedIn } = require("../middleware/authenticUser");
const { validate } = require("express-validation");

const db = admin.database();

// Get Post Owner PublicKey
router.post("/get-publicKey", isLoggedIn, chatLimiter, async (req, res) => {
  const { chatId } = req.body;
  const userUniqueId = req.user.uid;

  if (!chatId) {
    return res.status(400).send({ error: "You cannot chat with this person." });
  }

  const receiverUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
  if (userUniqueId === receiverUserId) {
    return res.status(406).send({ error: "You have your own public key" });
  }

  try {
    const snapshot = await db.ref(`users/${receiverUserId}/publicKey`).once("value");

    if (snapshot.exists()) {
      return res.status(200).json({ publicKey: snapshot.val() });
    }

    return res.status(401).send({ error: "Public key not found." });
  } catch (error) {
    return res.status(500).send({ error: "Something went wrong" });
  }
});

// save encrypted chat to the server
router.post("/send-chat", isLoggedIn, chatLimiter, validate(chatBlobValidation), async (req, res) => {
  const { chatId, encryptedMsg, senderPublicKey, nounce } = req.body;
  const recieverUserId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
  const senderUserId = req.user.uid;

  if (!recieverUserId) {
    return res.status(404).send({ error: "User not found!" });
  }

  if (senderUserId === recieverUserId) {
    return res.status(406).send({ error: "Cannot chat with yourself" });
  }

  const senderChatId = jwt.sign(req.user.uid, process.env.JWT_SECRET_KEY)
  console.log("senderID: ", senderChatId)
  const chatBlob = {
    encryptedMsg,
    timeStamp: Date.now(),
    nounce
  }

  const chatMetaData = {
    senderChatId,
    senderPublicKey
  }

  try {
    await db.ref(`chats/${recieverUserId}/${senderUserId}/messages`).push(chatBlob);
    await db.ref(`chats/${recieverUserId}/${senderUserId}`).update(chatMetaData);
    return res.status(200).send({ message: "Message send successfully" });
  }
  catch (sendChatError) {
    console.log("sendChatError: ", sendChatError)
    res.status(500).send({ error: "Something went wrong" });
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
      let messages = [];

      if (chat.messages) {
        messages = Object.entries(chat.messages).map(([messageId, msg]) => ({
          id: messageId,
          ...msg
        }));
      }

      return {
        chatId: chat.senderChatId,
        senderPublicKey: chat.senderPublicKey,
        messages: messages
      };
    });

    return res.status(200).send(chatsData);
    
  }
  catch (error) {
    return res.status(500).send({ error: "Something went wrong!" });
  }

})


module.exports = router;
