require("dotenv").config();

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const {ValidationError} = require("express-validation");
const {ipLimiter} = require("./middleware/rateLimiter");

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

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

exports.api = functions.https.onRequest(app);

const {deleteUserData, postVibeCheck, matchEchoes, processNotification} = require("./bgTasks/cloudTasks");

exports.processNotification = processNotification;
exports.deleteUserData = deleteUserData;
exports.postVibeCheck = postVibeCheck;
exports.matchEchoes = matchEchoes;

