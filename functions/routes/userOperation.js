const express = require("express");
const admin = require("firebase-admin");
const {authUser, isLoggedIn} = require("../middleware/authenticUser");
const {postFetching: fetchPosts} = require("../dataProcessing/postsProcessing");
const {signupLimiter, globalLimiter, sensitiveLimiter, publicReadLimiter} = require("../middleware/rateLimiter");
const {DEFAULT_AVATAR, validateAvatar, avatarTier} = require("../validators/avatarValidator");
const jwt = require("jsonwebtoken");
const {getFunctions} = require("firebase-admin/functions");
const crypto = require("crypto");
const {ensureWallet, getUnlocks} = require("../coins/coinService");

// Stable per-user seed for the Mythic avatar look (never reveals the user id)
const mythicSeed = (userId) => crypto
    .createHmac("sha256", process.env.JWT_SECRET_KEY)
    .update(`mythic:${userId}`)
    .digest("hex")
    .slice(0, 16);

// Add tier, and the Mythic seed/edition, to an avatar that is being sent out
const withPremiumInfo = async (userId, result) => {
  const avatar = {...result.avatar};
  avatar.tier = avatarTier(result.premiumItems);
  if (avatar.set === "mythic") {
    avatar.mythicSeed = mythicSeed(userId);
    const edition = (await db.ref(`coins/${userId}/mythicEdition`).get()).val();
    avatar.mythicEdition = edition || null;
  }
  return avatar;
};


const router = express.Router();
const db = admin.database();

const taskQueue = getFunctions().taskQueue("deleteUserData");

const retrieveLimit = 10;

router.post("/create-user", signupLimiter, authUser, async (req, res) => {
  // New users get their wallet with the welcome bonus right away
  if (req.user.isNew) {
    try {
      await ensureWallet(req.user.uid);
    } catch (walletError) {
      // Not fatal: the wallet is also created on first use
      console.error("Wallet creation failed:", walletError);
    }
  }

  const payload = {chatId: req.user.chatId, isNew: req.user.isNew};
  return res.status(200).send(payload);
});

// Get the user avatar
router.get("/avatar/:chatId", publicReadLimiter, async (req, res) => {
  const chatId = req.params.chatId;
  if (!chatId) {
    return res.status(400).send({
      success: "false",
      message: "Failed to load your avatar",
    });
  }

  let userId;
  try {
    userId = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
  } catch (tokenErr) {
    return res.status(404).json({success: false, message: "User not found."});
  }

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
        await withPremiumInfo(userId, result) :
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
router.post("/set-avatar", isLoggedIn, globalLimiter, async (req, res) => {
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
    // Premium items must be unlocked in the coin shop
    if (result.premiumItems.length > 0) {
      const unlocks = await getUnlocks(userId);
      const missing = result.premiumItems.find((id) => unlocks[id] !== true);
      if (missing) {
        return res.status(403).json({
          success: false,
          code: "ITEM_LOCKED",
          item: missing,
          message: "Unlock this item in the shop first.",
        });
      }
    }

    await db.ref(`users/${userId}/userDetail`).update(
        {avatar: result.avatar},
    );

    return res.status(200).json({
      success: true,
      message: "Avatar saved successfully.",
      avatar: await withPremiumInfo(userId, result),
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
router.delete("/posts/:postId", isLoggedIn, globalLimiter, async (req, res) => {
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

// Delete user related whole data
router.delete("/delete-account", isLoggedIn, sensitiveLimiter, async (req, res) => {
  const sessionId = req.cookies.__session;
  const userId = req.user.uid;

  try {
    await taskQueue.enqueue({userId, sessionId});
    res.clearCookie("__session");
    return res.status(200).send({
      message: "Your data deletion has been initiated.",
      success: true,
    });
  } catch (userDataDeleteError) {
    console.log("Failed to delete the user data: ", userDataDeleteError);
    return res.status(500).send({
      success: false,
      error: "Internal server error!",
    });
  }
});

const createNotificationId = (eventId) => {
  return crypto
      .createHmac("sha256", process.env.NOTIFICATION_SECRET)
      .update(eventId)
      .digest("hex");
};

// How many notifications are waiting on the server (for the bell badge, without opening it)
router.get("/notification-count", isLoggedIn, globalLimiter, async (req, res) => {
  try {
    const snapshot = await db.ref(`users/${req.user.uid}/notification`)
        .orderByChild("timestamp").limitToLast(100).get();
    return res.status(200).json({count: snapshot.numChildren()});
  } catch (countErr) {
    console.log("Failed to count notifications: ", countErr);
    return res.status(500).json({success: false, error: "Internal server error!"});
  }
});

// Fetch user notifications
router.get("/fetch-notifications", isLoggedIn, globalLimiter, async (req, res) => {
  const userId = req.user.uid;
  const notificationLimit = 20;

  try {
    const snapshot = await db.ref(`users/${userId}/notification`).orderByChild("timestamp").limitToLast(notificationLimit).get();
    const notifications = [];

    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        notifications.push({
          ...child.val(),
          eventId: createNotificationId(child.key),
        });
      });
    }

    // Latest notifications first
    notifications.reverse();

    return res.status(200).json({notifications});
  } catch (notificationErr) {
    console.log(`Failed to fetch notification for ${userId}: `, notificationErr);
    return res.status(500).send({
      success: false,
      error: "Internal server error!",
    });
  }
});

// Delete the notifications from the server
router.delete("/delete-notifications", isLoggedIn, globalLimiter, async (req, res) => {
  const userId = req.user.uid;

  try {
    await db.ref(`users/${userId}/notification`).remove();
    return res.status(200).json({
      success: true,
      message: "Notifications deleted successfully.",
    });
  } catch (deleteErr) {
    console.error("Notification deletion error:", deleteErr);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notifications.",
    });
  }
});

module.exports = router;
