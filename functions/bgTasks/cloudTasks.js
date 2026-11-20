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

const markEchoCompleted = async (userId, echoId, matches) => {
  await db.ref(
      `echoMatches/${userId}/${echoId}`,
  ).set({
    status: "completed",
    completedAt: Date.now(),
    matches,
  });

  await db.ref(
      `echoes/${userId}/${echoId}/status`,
  ).set("completed");
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
    const [userPostsSnapshot, keySnapshot] = await Promise.all([
      db.ref(`users/${userId}/posts`).get(),
      db.ref(`users/${userId}/userDetail/publicKey`).get(),
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

    if (userPostsSnapshot.exists()) {
      userPostsSnapshot.forEach((postSnapshot) => {
        const postId = postSnapshot.key;
        updates[`posts/${postId}`] = null;
      });
    }

    await db.ref().update(updates);
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
  const {postId, actorId, postVibe, userChatId} = request.data;
  try {
    const vibeChecksRef = db.ref(`postVibeChecks/${postId}/${actorId}`);
    const snapshot = await vibeChecksRef.get();
    if (snapshot.exists()) {
      return;
    }

    await vibeChecksRef.set(postVibe);
    await db.ref(`posts/${postId}/vibeCheck/${postVibe}`).transaction((current) => (current || 0) + 1);

    const userId = jwt.verify(userChatId, process.env.JWT_SECRET_KEY);

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
    const snapshot = await db.ref("echoes").once("value");

    if (!snapshot.exists()) {
      await markEchoCompleted(userId, echoId, []);
      await settleRematchSafely(userId, rematchId, true);
      return;
    }

    const candidates = [];

    snapshot.forEach((userSnapshot) => {
      const candidateUserId = userSnapshot.key;
      if (candidateUserId === userId) {
        return;
      }

      userSnapshot.forEach((echoSnapshot) => {
        const candidateEcho = echoSnapshot.val();
        if (!candidateEcho || !candidateEcho.echo) {
          return;
        }

        candidates.push({
          echoId: echoSnapshot.key,
          echo: candidateEcho.echo,
          timestamp: candidateEcho.timestamp,
          chatId: candidateEcho.chatId,
        });
      });
    });

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

    await db.ref(
        `echoMatches/${userId}/${echoId}`,
    ).set({
      status: "completed",
      completedAt: Date.now(),
      matches: top10,
    });

    await db.ref(
        `echoes/${userId}/${echoId}/status`,
    ).set("completed");

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
    await db.ref(
        `echoMatches/${userId}/${echoId}`,
    ).update({
      status: "failed",
      error: "Echo matching failed",
      updatedAt: Date.now(),
    });

    await db.ref(
        `echoes/${userId}/${echoId}/status`,
    ).set("failed");

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
      title: "Keep your streak alive",
      message: streak ?
        `Your ${streak}-day streak ends at midnight. Post today to keep it!` :
        "Post today to keep your streak!",
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

