const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {onTaskDispatched} = require("firebase-functions/tasks");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const {ValidationError} = require("express-validation");

require("dotenv").config();

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

app.use(cors(corsOptions));

app.use(express.json());
app.options("*", cors(corsOptions));

// Cookie parser
app.use(cookieParser());

// Handle validation error
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(err.details);
  }
  return res.status(500).json({
    message: "Internal server error",
  });
});

// Post CRUD operation route
app.use("/api", require("./routes/posts"));

// Post CRUD operation route for user
app.use("/api/user", require("./routes/userPosts"));

// Chats operation route
app.use("/api/chats", require("./routes/chats"));

// Post tracking operations route
app.use("/api/actions", require("./routes/postTracking"));

exports.api = functions.https.onRequest(app);

/*
  Delete the user data when the users session expires
  But keeping the global posts as it is
  But removing access to the posts from the user
  Also deleting the chats of the user
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
  await Promise.all([
    db.ref(`sessions/${sessionId}`).remove(),
    db.ref(`users/${userId}`).remove(),
    db.ref(`chats/${userId}`).remove(),
  ]);
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
