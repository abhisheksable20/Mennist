const admin = require("firebase-admin");
const {onTaskDispatched} = require("firebase-functions/tasks");
const {findEchoMatches} = require("../dataProcessing/geminiProcessing");
const jwt = require("jsonwebtoken");
const {getFunctions} = require("firebase-admin/functions");
const {settleRematch} = require("../coins/coinService");
const {keyHash} = require("../auth/keyLogin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.database();
const processNotification = getFunctions().taskQueue("processNotification");

// Save the matches and mark the echo done, in one write
const markEchoCompleted = async (userId, echoId, matches) => {
  await db.ref().update({
    [`echoMatches/${userId}/${echoId}`]: {status: "completed", completedAt: Date.now(), matches},
    [`echoes/${userId}/${echoId}/status`]: "completed",
  });
};


/*
  Delete the user data when the users session expires
  Also when user wants to delete its own data
*/
exports.deleteUserData = onTaskDispatched({
  retryConfig: {
    maxAttempts: 3,
  },
  rateLimits: {
    maxConcurrentDispatches: 10,
  },
},
async (request) => {
  const {userId, sessionId} = request.data;

  try {
    const [userPostsSnapshot, keySnapshot, recoverySnapshot, echoesSnapshot] = await Promise.all([
      db.ref(`users/${userId}/posts`).get(),
      db.ref(`users/${userId}/userDetail/publicKey`).get(),
      db.ref(`users/${userId}/recovery/hash`).get(),
      db.ref(`echoes/${userId}`).get(),
    ]);

    const updates = {
      [`sessions/${sessionId}`]: null,
      [`users/${userId}`]: null,
      [`chats/${userId}`]: null,
      [`echoMatches/${userId}`]: null,
      [`echoes/${userId}`]: null,
      [`postActions/${userId}`]: null,
      [`coins/${userId}`]: null,
      [`coinLedger/${userId}`]: null,
      [`coinChat/${userId}`]: null,
      [`chatOpen/${userId}`]: null,
    };

    // The public key -> account entry, so the key can't point at a deleted account
    if (keySnapshot.exists()) {
      updates[`keyIndex/${keyHash(keySnapshot.val())}`] = null;
    }
    // A deleted account's recovery key must not lead anywhere
    if (recoverySnapshot.exists()) {
      updates[`recoveryIndex/${recoverySnapshot.val()}`] = null;
    }

    // Their posts (with vibe data) and their echoes in the shared match list
    userPostsSnapshot.forEach((postSnapshot) => {
      const postId = postSnapshot.key;
      updates[`posts/${postId}`] = null;
      updates[`vibes/${postId}`] = null;
      updates[`postVibeChecks/${postId}`] = null;
    });
    echoesSnapshot.forEach((echoSnapshot) => {
      updates[`echoFeed/${echoSnapshot.key}`] = null;
    });

    await db.ref().update(updates);

    // Files people sent to this user (Storage isn't part of the database update)
    await admin.storage().bucket().deleteFiles({prefix: `chat-attachments/${userId}/`, force: true});
  } catch (deleteError) {
    console.log("Failed to delete user data: ", deleteError);
    throw deleteError;
  }
},
);


// background work for vibe check for the post
// userId: Is the one to whom the notification will be send
// actorId: Is the person who trigger the notification for the receiver
exports.postVibeCheck = onTaskDispatched({
  retryConfig: {
    maxAttempts: 3,
  },
},
async (request) => {
  const {postId, actorId, postVibe} = request.data;
  try {
    // The notification goes to the post's real owner, read from the post (not the request)
    const [snapshot, ownerSnap] = await Promise.all([
      db.ref(`postVibeChecks/${postId}/${actorId}`).get(),
      db.ref(`posts/${postId}/chatId`).get(),
    ]);
    if (snapshot.exists() || !ownerSnap.exists()) {
      return;
    }

    // Record it and count it in one write
    await db.ref().update({
      [`postVibeChecks/${postId}/${actorId}`]: postVibe,
      [`posts/${postId}/vibeCheck/${postVibe}`]: admin.database.ServerValue.increment(1),
    });

    const userId = jwt.verify(ownerSnap.val(), process.env.JWT_SECRET_KEY);

    // eventId, userId, actorId, type, postId, echoId, chatId, vibe
    const notificationData = {
      eventId: `vibeCheck_${postId}_${userId}`,
      userId,
      actorId,
      type: "vibeCheck",
      postId,
      vibe: postVibe,
    };

    await processNotification.enqueue(notificationData);
  } catch (error) {
    console.error("Error processing post vibe check:", error);
    throw error;
  }
},
);

// Settle the rematch charge without letting a coin error break matching
const settleRematchSafely = async (userId, rematchId, success) => {
  if (!rematchId) {
    return;
  }
  try {
    await settleRematch(userId, rematchId, success);
  } catch (settleErr) {
    // The hourly job refunds anything left behind
    console.error(`Rematch settle failed: ${rematchId}`, settleErr);
  }
};

// How many recent echoes from other people each match compares against.
// Keeps the database read and the Gemini prompt the same size as the site grows.
const ECHO_CANDIDATES = 150;
let echoFeedReady = false;

/*
  echoFeed/{echoId} = {uid, echo, timestamp, chatId}: every echo in one flat,
  indexed list, so matching reads only the newest ones. Echoes saved before the
  feed existed are copied in once, the first time matching runs.
*/
const ensureEchoFeed = async () => {
  if (echoFeedReady) return;
  if ((await db.ref("echoFeedMeta/ready").get()).val() === true) {
    echoFeedReady = true;
    return;
  }
  const all = await db.ref("echoes").get();
  const updates = {};
  all.forEach((userSnap) => {
    userSnap.forEach((echoSnap) => {
      const e = echoSnap.val();
      if (e && e.echo) {
        updates[`echoFeed/${echoSnap.key}`] = {
          uid: userSnap.key, echo: e.echo, timestamp: e.timestamp || 0, chatId: e.chatId || null,
        };
      }
    });
  });
  updates["echoFeedMeta/ready"] = true;
  await db.ref().update(updates);
  echoFeedReady = true;
};

const loadEchoCandidates = async (userId) => {
  await ensureEchoFeed();
  // A little extra, since the user's own echoes are skipped
  const snap = await db.ref("echoFeed").orderByChild("timestamp").limitToLast(ECHO_CANDIDATES + 25).get();
  const candidates = [];
  snap.forEach((child) => {
    const e = child.val();
    if (!e || !e.echo || e.uid === userId) return;
    candidates.push({echoId: child.key, echo: e.echo, timestamp: e.timestamp, chatId: e.chatId});
  });
  return candidates.slice(-ECHO_CANDIDATES);
};

// background work for checking echo similarities
exports.matchEchoes = onTaskDispatched({
  retryConfig: {
    maxAttempts: 1,
  },
  rateLimits: {
    maxConcurrentDispatches: 5,
  },
}, async (req) => {
  const {userId, echoId, echo, rematchId} = req.data;

  try {
    const candidates = await loadEchoCandidates(userId);

    if (candidates.length === 0) {
      await markEchoCompleted(userId, echoId, []);
      await settleRematchSafely(userId, rematchId, true);
      return;
    }

    const matches = await findEchoMatches(
        echo,
        candidates,
    );

    const filteredMatches = matches
        .filter((match) => match.similarityScore > 49)
        .sort((a, b) => b.similarityScore - a.similarityScore);


    const top10 = filteredMatches.slice(0, 10);

    await markEchoCompleted(userId, echoId, top10);

    // Paid/free rematch went through: the charge stays
    await settleRematchSafely(userId, rematchId, true);


    if (top10.length > 0) {
      // eventId, userId, actorId, type, postId, echoId, chatId, vibe
      const notificationData = {
        eventId: `echoMatch_${echoId}`,
        userId,
        type: "echoMatch",
        echoId,
      };

      await processNotification.enqueue(notificationData);
    }
  } catch (error) {
    console.error(`Echo matching failed: ${echoId}`, error);
    await db.ref().update({
      [`echoMatches/${userId}/${echoId}/status`]: "failed",
      [`echoMatches/${userId}/${echoId}/error`]: "Echo matching failed",
      [`echoMatches/${userId}/${echoId}/updatedAt`]: Date.now(),
      [`echoes/${userId}/${echoId}/status`]: "failed",
    });

    // Matching failed: give the coins (or the free rematch) back
    await settleRematchSafely(userId, rematchId, false);

    throw error;
  }
});


// userId: Is the one to whom the notification will be send
// actorId: Is the person who trigger the notification for the receiver
exports.processNotification = onTaskDispatched({
  retryConfig: {
    maxAttempts: 5,
    minBackoffSeconds: 10,
    maxBackoffSeconds: 300,
  },
  rateLimits: {
    maxConcurrentDispatches: 10,
  },

}, async (request) => {
  const {eventId, userId, actorId, type, postId, echoId, chatId, vibe, amount, streak, transferId} = request.data;

  if (!eventId || !userId) {
    return;
  }

  // System notifications have no actor
  const systemTypes = ["echoMatch", "streakReminder"];
  if (!systemTypes.includes(type) && (!actorId || userId === actorId)) {
    return;
  }

  const messages = {
    vibe: {
      title: "New vibe on your post",
      message: "Someone vibed with your post.",
    },
    vibeCheck: {
      title: "New vibe check",
      message: vibe ?
        `Someone marked your post as ${vibe}.` :
        "Someone vibe-checked your post.",
    },
    echoMatch: {
      title: "New Echo match",
      message: "Someone has an Echo similar to yours.",
    },
    message: {
      title: "New message",
      message: "Someone sent you a message.",
    },
    attachment: {
      title: "New attachment",
      message: "Someone sent you an attachment.",
    },
    coinTransfer: {
      title: "Coins received",
      message: amount ?
        `Someone sent you ${amount} Sakesnake Coins. Accept or decline within 48 hours.` :
        "Someone sent you Sakesnake Coins.",
    },
    streakReminder: {
      title: "Keep your Ritzz alive",
      message: streak ?
        `Your ${streak}-day Ritzz ends at midnight. Post today to keep it!` :
        "Post today to keep your Ritzz!",
    },
  };

  const content = messages[type];

  if (!content) {
    throw new Error("Unsupported notification type");
  }

  const notification = {
    ...content,
    type,
    timestamp: Date.now(),
    ...(postId && {postId}),
    ...(echoId && {echoId}),
    ...(chatId && {chatId}),
    ...(vibe && {vibe}),
    ...(amount && {amount}),
    ...(streak && {streak}),
    ...(transferId && {transferId}),
  };

  const ref = db.ref(`users/${userId}/notification/${eventId}`);

  await ref.transaction((current) => current || notification);
});

