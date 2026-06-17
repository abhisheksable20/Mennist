const express = require("express");
const admin = require("firebase-admin");
const {authUser, isLoggedIn} = require("../middleware/authenticUser");
const fetchPosts = require("../dataProcessing/postsProcessing");
const {globalLimiter} = require("../middleware/rateLimiter");

const router = express.Router();
const db = admin.database();

const retrieveLimit = 10;

router.post("/create-user", authUser, globalLimiter, async (req, res) => {
  const payload = {chatId: req.user.chatId};
  return res.status(200).send(payload);
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
