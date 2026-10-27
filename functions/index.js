require("dotenv").config();

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {onTaskDispatched} = require("firebase-functions/tasks");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const {ValidationError} = require("express-validation");
const {findEchoMatches} = require("./dataProcessing/geminiProcessing");
const {ipLimiter} = require("./middleware/rateLimiter");

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
const db = admin.database();

const allowedOrigins = [
  "https://mennist-4dda7.web.app",
  "https://mennist.com",
  "https://www.mennist.com"];
const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};


// 1. The app runs behind Google's proxy, so trust it to get the real user IP.
//    Without this, every user looks like the same IP and shares one rate limit.
app.set("trust proxy", 1);

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// 3. Parsers
app.use(express.json());
app.use(cookieParser());

// 4. App-wide IP rate limit.
//    After CORS/OPTIONS (preflight requests don't count), before any route or DB read.
app.use(ipLimiter);

// Post CRUD operation route
app.use("/api", require("./routes/posts"));

// Echoes operation route
app.use("/api/echoes", require("./routes/echoes"));

// Post CRUD operation route for user
app.use("/api/user", require("./routes/userOperation"));

// Chats operation route
app.use("/api/chats", require("./routes/chats"));

// Post tracking operations route
app.use("/api/actions", require("./routes/postTracking"));

// Handle validation error
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(err.details);
  }
  return res.status(500).json({
    message: "Internal server error",
  });
});

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


exports.api = functions.https.onRequest(app);

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
    const userPostsSnapshot = await db.ref(`users/${userId}/posts`).get();

    const updates = {
      [`sessions/${sessionId}`]: null,
      [`users/${userId}`]: null,
      [`chats/${userId}`]: null,
      [`echoMatches/${userId}`]: null,
      [`echoes/${userId}`]: null,
      [`postActions/${userId}`]: null,
    };

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
exports.postVibeCheck = onTaskDispatched({
  retryConfig: {
    maxAttempts: 3,
  },
},
async (request) => {
  const {postId, userId, postVibe} = request.data;
  try {
    const vibeChecksRef = db.ref(`postVibeChecks/${postId}/${userId}`);
    const snapshot = await vibeChecksRef.get();
    if (snapshot.exists() && snapshot.val() === postVibe) {
      return;
    }

    await vibeChecksRef.set(postVibe);
    await db.ref(`posts/${postId}/vibeCheck/${postVibe}`).transaction((current) => (current || 0) + 1);
  } catch (error) {
    console.error("Error processing post vibe check:", error);
    throw error;
  }
},
);

// background work for checking echo similarities
exports.matchEchoes = onTaskDispatched({
  retryConfig: {
    maxAttempts: 1,
  },
  rateLimits: {
    maxConcurrentDispatches: 5,
  },
}, async (req) => {
  const {userId, echoId, echo} = req.data;

  try {
    const snapshot = await db.ref("echoes").once("value");

    if (!snapshot.exists()) {
      await markEchoCompleted(userId, echoId, []);
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
      return;
    }

    const matches = await findEchoMatches(
        echo,
        candidates,
    );

    matches.sort(
        (a, b) => b.similarityScore - a.similarityScore,
    );

    const top10 = matches.slice(0, 10);

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

    throw error;
  }
});

