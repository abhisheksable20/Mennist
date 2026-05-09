const admin = require("firebase-admin");
const crypto = require("crypto");

const db = admin.database();

// Generate user id using ip and user agent
function generateUserId(req) {
  const ip = req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        "0.0.0.0";
  const userAgent = req.headers["user-agent"] || "unknown";
  const rawId = `${ip}_${userAgent}`;
  const uniqueId = crypto.createHash("sha256")
      .update(rawId).digest("hex").slice(0, 16);

  return uniqueId;
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

  req.user = {uid: data.userId};
  next();
};


// Authenticating the user
// This functions will be only used to create new account
const authUser = async (req, res, next) => {
  let sessionId = req.cookies.sessionId;

  // Create a new user
  if (!sessionId) {
    const userId = generateUserId(req);
    sessionId = crypto.randomBytes(8).toString("hex");

    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    await db.ref(`sessions/${sessionId}`).set({
      userId,
      expiresAt,
    });

    // Make it Secure: true in production
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    req.user = {uid: userId};
    return next();
  }

  const snap = await db.ref(`sessions/${sessionId}`).once("value");

  // This will trigger if we delete the session manually
  if (!snap.exists()) {
    res.clearCookie("sessionId");
    res.status(401).send({error: "Session expired"});
    return;
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

module.exports = {authUser, isLoggedIn};


