const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const {ValidationError} = require("express-validation");

require("dotenv").config();

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

const allowedOrigins = [
  "https://mennist-4dda7.web.app",
  "https://mennist.com",
  "https://www.mennist.com",
  "http://localhost:3000"];
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
app.use("api/actions", require("./routes/postTracking"));

exports.api = functions.https.onRequest(app);
