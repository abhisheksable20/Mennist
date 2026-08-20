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
  const sessionId = req.cookies.__session;
  if (!sessionId) {
    return res.status(401).send({error: `Session expired`});
  }

  const snap = await db.ref(`sessions/${sessionId}`).once("value");
  const data = snap.val();

  if (!data) {
    res.clearCookie("__session");
    return res.status(401).send({error: "Session expired"});
  }

  if (Date.now() > data.expiresAt) {
    await deleteUserData(data.userId);
    await db.ref(`sessions/${sessionId}`).remove();
    res.clearCookie("__session");
    return res.status(401).send({error: "Session expired"});
  }

  const chatId = jwt.sign(data.userId, process.env.JWT_SECRET_KEY);

  req.user = {uid: data.userId, chatId};
  next();
};

// Authenticating the user
// This functions will be only used to create new account
const authUser = async (req, res, next) => {
  const sessionId = req.cookies.__session;
  const {publicKey, deviceFingerprint} = req.body;

  if (!publicKey) {
    return res.status(400).send({error: "Public key not found"});
  }

  // Create a new user
  if (!sessionId) {
    const session = await createSession(req, res, publicKey, deviceFingerprint);

    const chatId = jwt.sign(session.userId, process.env.JWT_SECRET_KEY);
    req.user = {
      uid: session.userId,
      isNew: true,
      chatId,
    };
    return next();
  }

  const snap = await db.ref(`sessions/${sessionId}`).once("value");

  // This will trigger if we delete the session manually
  if (!snap.exists()) {
    res.clearCookie("__session", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    const session = await createSession(req, res, publicKey, deviceFingerprint);

    const chatId = jwt.sign(session.userId, process.env.JWT_SECRET_KEY);
    req.user = {
      uid: session.userId,
      isNew: true,
      chatId,
    };
    return next();
  }

  const data = snap.val();

  // check expiry if expired then delete the user
  if (Date.now() > data.expiresAt) {
    await deleteUserData(data.userId);
    await db.ref(`sessions/${sessionId}`).remove();
    res.clearCookie("__session");
    return res.status(401).send({error: "Session expired"});
  }

  const chatId = jwt.sign(data.userId, process.env.JWT_SECRET_KEY);
  req.user = {
    uid: data.userId,
    isNew: false,
    chatId,
  };
  next();
};

// Delete the user data when the session is expired
const deleteUserData = async (userId) => {
  if (!userId) {
    return;
  }

  await db.ref(`users/${userId}`).remove();
};

const createSession = async (req, res, publicKey, deviceFingerprint) => {
  const userId = generateUserId(publicKey);
  const sessionId = crypto.randomBytes(8).toString("hex");

  const expiresAt = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;

  await db.ref(`sessions/${sessionId}`).set({
    userId,
    expiresAt,
  });

  // Creating storage to store user basic details
  await db.ref(`users/${userId}/userDetail`).set({
    publicKey: publicKey,
    deviceFingerprint: deviceFingerprint,
    chatFlag: false,
  });

  // Make it Secure: true in production
  res.cookie("__session", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
  });

  return {userId, sessionId};
};

module.exports = {authUser, isLoggedIn};


