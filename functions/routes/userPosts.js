const express = require("express");
const admin = require("firebase-admin");
const {authUser, isLoggedIn} = require("../middleware/authenticUser");
const {postFetching: fetchPosts} = require("../dataProcessing/postsProcessing");
const {globalLimiter} = require("../middleware/rateLimiter");
const {DEFAULT_AVATAR, validateAvatar} = require("../validators/avatarValidator");
const jwt = require("jsonwebtoken");

const router = express.Router();
const db = admin.database();

const retrieveLimit = 10;

router.post("/create-user", authUser, globalLimiter, async (req, res) => {
  const payload = {chatId: req.user.chatId, isNew: req.user.isNew};
  return res.status(200).send(payload);
});

// Get the user avatar
router.get("/avatar/:chatId", isLoggedIn, globalLimiter, async (req, res) => {
  const chatId = req.params.chatId;
  if (!chatId) {
    return res.status(400).send({
      success: "false",
      message: "Failed to load your avatar",
    });
  }

  const userId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);

  try {
    const snapshot = await db.ref(`users/${userId}/userDetail/avatar`).get();
    if (!snapshot.exists()) {
      return res.status(200).json({
        success: true,
        avatar: {...DEFAULT_AVATAR},
      });
    }

    const result = validateAvatar(snapshot.val());

    // Return defaults if previously stored data is invalid.
    return res.status(200).json({
      success: true,
      avatar: result.valid ?
        result.avatar :
        {...DEFAULT_AVATAR},
    });
  } catch (avatarFetchErr) {
    console.error("Get avatar error:", avatarFetchErr);
    return res.status(500).json({
      success: false,
      message: "Unable to load avatar.",
    });
  }
});

// Set the user avatar
router.post("/set-avatar", globalLimiter, isLoggedIn, async (req, res) => {
  const userId = req.user.uid;
  const {avatar} = req.body || {};

  const result = validateAvatar(avatar);

  if (!result.valid) {
    return res.status(400).json({
      success: false,
      message: result.message,
    });
  }

  try {
    await db.ref(`users/${userId}/userDetail`).update(
        {avatar: result.avatar},
    );

    return res.status(200).json({
      success: true,
      message: "Avatar saved successfully.",
      avatar: result.avatar,
    });
  } catch (avatarSetErr) {
    console.error("Save avatar error:", avatarSetErr);
    return res.status(500).json({
      success: false,
      message: "Unable to save avatar.",
    });
  }
});


// Enable or Disable chat flag
router.post("/chatFlag", isLoggedIn, globalLimiter, async (req, res) => {
  const userId = req.user.uid;
  const {chatFlag} = req.body;

  if (typeof chatFlag !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "chatFlag must be a boolean.",
    });
  }

  try {
    await db.ref(`users/${userId}/userDetail`).update({
      chatFlag: chatFlag,
    });

    return res.status(200).send({message: "Flag changed successfully!"});
  } catch (chatFlagError) {
    console.log("User post fetching error: ", chatFlagError);
    return res.status(500).send({error: "Internal server error!"});
  }
});

// Fetch user specific posts
router.get("/posts", isLoggedIn, globalLimiter, async (req, res) => {
  const userId = req.user.uid;
  const endAt = req.query.endAt ? Number(req.query.endAt) : Date.now();

  console.log("Session ID: ", userId);

  try {
    const ref = db.ref(`/users/${userId}/posts`);
    const data = await fetchPosts(ref, endAt, retrieveLimit);

    return res.status(200).send(data);
  } catch (userPostError) {
    console.log("User post fetching error: ", userPostError);
    return res.status(500).send({error: "Internal server error!"});
  }
});


// Delete user specific posts
router.delete("/posts/:postId", isLoggedIn, async (req, res) => {
  const userId = req.user.uid;
  const postId = req.params.postId;

  if (!postId) {
    return res.status(400).send({error: "Failed to delete your post!"});
  }

  try {
    const updates = {};
    updates[`posts/${postId}`] = null;
    updates[`userPosts/${userId}/${postId}`] = null;

    await db.ref().update(updates);
    return res.status(200).send({success: "Post deleted successfully!"});
  } catch (delError) {
    console.log("Post deletion error: ", delError);
    return res.status(500).send({error: "Internal server error!"});
  }
});

module.exports = router;
