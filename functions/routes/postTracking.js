const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const {isLoggedIn} = require("../middleware/authenticUser");
const {postTrackLimiter} = require("../middleware/rateLimiter");

const db = admin.database();

const counterMap = {
  viewed: "postViews",
  saved: "postSaved",
  shared: "postShared",
  chat: "postChats",
};

// Handle all the post actions
router.post("/postAction", isLoggedIn, postTrackLimiter, async (req, res) => {
  const userId = req.user.uid;
  const {postId, action} = req.body;

  if (typeof postId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(postId) || !counterMap[action]) {
    return res.status(400).json({success: false});
  }

  try {
    // Don't create counters for posts that don't exist
    if (!(await db.ref(`posts/${postId}/timestamp`).get()).exists()) {
      return res.status(404).json({success: false});
    }

    const actionRef = db.ref(`postActions/${userId}/${postId}/${counterMap[action]}`);
    const snapshot = await actionRef.get();
    if (snapshot.exists() && snapshot.val() === true) {
      return res.status(200).json({success: false});
    }

    await actionRef.set(true);
    await db.ref(`posts/${postId}/postActions/${counterMap[action]}`)
        .transaction((current) => (current || 0) + 1);

    return res.status(200).json({success: true});
  } catch (postActionError) {
    console.log("Post Action Error: ", postActionError);
    return res.status(500).json({success: false});
  }
});


module.exports = router;
