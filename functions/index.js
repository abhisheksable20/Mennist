require("dotenv").config();
const {onRequest} = require("firebase-functions/v2/https");
const {defineInt} = require("firebase-functions/params");
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

// Per-environment config comes from functions/.env.<projectId>
// (.env.drumkit-5b886 for dev, .env.mennist-4dda7 for prod).
// If a variable is missing, fall back to the strict PROD values (fail closed).
const list = (value, fallback) =>
  value ?
    value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) :
    fallback;

const allowedOrigins = list(process.env.ALLOWED_ORIGINS, [
  "https://mennist.com",
  "https://www.mennist.com",
]);

const ALLOWED_HOSTS = new Set(list(process.env.ALLOWED_HOSTS, [
  "mennist.com",
  "www.mennist.com",
  "mennist-4dda7.web.app",
]));

// Cap scaling so a flood of requests can't run up your bill.
const maxInst = defineInt("MAX_INSTANCES", {default: 5});

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

// 2. Host check: only accept requests that arrive through allowed hosts.
//    Scanners hitting the raw run.app URL get an instant empty 403.
//    (Noise reduction, not authentication: headers can be spoofed.)
app.use((req, res, next) => {
  if (process.env.FUNCTIONS_EMULATOR) return next(); // keep local dev working
  const host = (req.get("x-forwarded-host") || req.hostname || "")
      .split(",")[0].trim().toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return res.status(403).end();
  next();
});

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
app.use("/api/user", require("./routes/recovery"));

// Chats operation route
app.use("/api/chats", require("./routes/chats"));

// Post tracking operations route
app.use("/api/actions", require("./routes/postTracking"));

// Sakesnake Coins: wallet, streak, shop and transfers
app.use("/api/coins", require("./routes/coins"));

// Handle validation error
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(err.details);
  }
  return res.status(500).json({
    message: "Internal server error",
  });
});


// Cap scaling so a flood of requests can't run up your bill.
exports.api = onRequest({region: "us-central1", maxInstances: maxInst}, app);
const {deleteUserData, postVibeCheck, matchEchoes, processNotification} = require("./bgTasks/cloudTasks");

exports.processNotification = processNotification;
exports.deleteUserData = deleteUserData;
exports.postVibeCheck = postVibeCheck;
exports.matchEchoes = matchEchoes;

// Sakesnake Coins scheduled jobs
const {expireCoinTransfers, coinStreakReminders} = require("./bgTasks/coinTasks");

exports.expireCoinTransfers = expireCoinTransfers;
exports.coinStreakReminders = coinStreakReminders;

