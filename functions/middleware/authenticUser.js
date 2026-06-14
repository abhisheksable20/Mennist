const admin = require("firebase-admin");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const db = admin.database();

// Generate user id using ip and user agent
function generateUserId(publicKey) {
  return crypto
      .createHmac("sha256", process.env.JWT_SECRET_KEY)
      .update(publicKey)
      .digest("hex");
}

// Check wheather the user has sessionId or not
const isLoggedIn = async (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) {
    return res.status(401).send({error: `Session expired`});
  }

  const snap = await db.ref(`sessions/${sessionId}`).once("value");
  const data = snap.val();

  if (!data) {
    res.clearCookie("sessionId");
    return res.status(401).send({error: "Session expired"});
  }

  if (Date.now() > data.expiresAt) {
    res.clearCookie("sessionId");
    return res.status(401).send({error: "Session expired"});
  }

  const chatId = jwt.sign(data.userId, process.env.JWT_SECRET_KEY);

  req.user = {uid: data.userId, chatId};
  next();
};


// Authenticating the user
// This functions will be only used to create new account
const authUser = async (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  const publicKey = req.body.publicKey;

  if (!publicKey) {
    return res.status(400).send({error: "Public key not found"});
  }

  // Create a new user
  if (!sessionId) {
    const session = await createSession(req, res, publicKey);

    req.user = {uid: session.userId};
    return next();
  }

  const snap = await db.ref(`sessions/${sessionId}`).once("value");

  // This will trigger if we delete the session manually
  if (!snap.exists()) {
    res.clearCookie("sessionId", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    const session = await createSession(req, res, publicKey);
    req.user = {uid: session.userId};
    return next();
  }

  const data = snap.val();

  // check expiry if expired then delete the user
  if (Date.now() > data.expiresAt) {
    await db.ref(`sessions/${sessionId}`).remove();
    res.clearCookie("sessionId");
    return res.status(401).send({error: "Session expired"});
  }

  req.user = {uid: data.userId};
  next();
};

const createSession = async (req, res, publicKey) => {
  const userId = generateUserId(publicKey);
  const sessionId = crypto.randomBytes(8).toString("hex");

  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  await db.ref(`sessions/${sessionId}`).set({
    userId,
    expiresAt,
  });

  // Creating user database for storing publicKey
  await db.ref(`users/${userId}`).set({
    publicKey: publicKey,
  });

  // Make it Secure: true in production
  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return {userId, sessionId};
};

module.exports = {authUser, isLoggedIn};


