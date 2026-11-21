const admin = require("firebase-admin");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {getFunctions} = require("firebase-admin/functions");
const {keyHash, decodePublicKey, resolveAccount, issueChallenge} = require("../auth/keyLogin");

const taskQueue = getFunctions().taskQueue("deleteUserData");

const db = admin.database();


/*
  Every API call checks the session. Valid sessions are remembered in memory
  for a short time, so most requests skip the database read. A session that
  was signed out elsewhere (recovery, account deletion on another instance)
  stops working within SESSION_CACHE_MS at most.
*/
const SESSION_CACHE_MS = 30 * 1000;
const SESSION_CACHE_MAX = 5000;
const sessionCache = new Map(); // sessionId -> {uid, chatId, expiresAt, until}
const chatIds = new Map(); // uid -> signed chatId (jwt.sign of a string is deterministic)

const chatIdFor = (uid) => {
  let id = chatIds.get(uid);
  if (!id) {
    if (chatIds.size >= SESSION_CACHE_MAX) chatIds.clear();
    id = jwt.sign(uid, process.env.JWT_SECRET_KEY);
    chatIds.set(uid, id);
  }
  return id;
};

const forgetSession = (sessionId) => sessionCache.delete(sessionId);

// Forget every cached session of a user on this instance (recovery, deletion)
const forgetUserSessions = (uid) => {
  sessionCache.forEach((entry, id) => {
    if (entry.uid === uid) sessionCache.delete(id);
  });
};

// Check wheather the user has sessionId or not
const isLoggedIn = async (req, res, next) => {
  const sessionId = req.cookies.__session;
  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 128) {
    return res.status(401).send({error: `Session expired`});
  }

  const now = Date.now();
  const cached = sessionCache.get(sessionId);
  if (cached && cached.until > now && now <= cached.expiresAt) {
    req.user = {uid: cached.uid, chatId: cached.chatId};
    return next();
  }

  let data;
  try {
    data = (await db.ref(`sessions/${sessionId}`).get()).val();
  } catch (sessionErr) {
    console.error("Session read failed:", sessionErr);
    return res.status(503).send({error: "Please try again."});
  }

  if (!data) {
    forgetSession(sessionId);
    res.clearCookie("__session");
    return res.status(401).send({error: "Session expired"});
  }

  if (now > data.expiresAt) {
    forgetSession(sessionId);
    await deleteUserData(data.userId, sessionId);
    res.clearCookie("__session");
    return res.status(401).send({error: "Session expired"});
  }

  const chatId = chatIdFor(data.userId);
  if (sessionCache.size >= SESSION_CACHE_MAX) sessionCache.clear();
  sessionCache.set(sessionId, {uid: data.userId, chatId, expiresAt: data.expiresAt, until: now + SESSION_CACHE_MS});

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

  if (!decodePublicKey(publicKey)) {
    return res.status(400).send({error: "Invalid public key"});
  }

  // No session in this browser: new account, or prove you own an existing one
  if (!sessionId) {
    return startLogin(req, res, next, publicKey, deviceFingerprint);
  }

  const snap = await db.ref(`sessions/${sessionId}`).once("value");

  // This will trigger if we delete the session manually
  if (!snap.exists()) {
    res.clearCookie("__session", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return startLogin(req, res, next, publicKey, deviceFingerprint);
  }

  const data = snap.val();

  // check expiry if expired then delete the user
  if (Date.now() > data.expiresAt) {
    await deleteUserData(data.userId, sessionId);
    res.clearCookie("__session");
    return res.status(401).send({error: "Session expired"});
  }

  const chatId = chatIdFor(data.userId);
  req.user = {
    uid: data.userId,
    isNew: false,
    chatId,
  };
  next();
};

// Delete the user data when the session is expired
const deleteUserData = async (userId, sessionId) => {
  if (!userId || !sessionId) {
    return;
  }

  // Background task
  await taskQueue.enqueue({userId, sessionId});
};

const SESSION_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000;

// Create a login session for an account and set the cookie
const issueSession = async (res, userId) => {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const createdAt = Date.now();

  await db.ref(`sessions/${sessionId}`).set({
    userId,
    expiresAt: createdAt + SESSION_TTL_MS,
    createdAt,
  });

  res.cookie("__session", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });

  return sessionId;
};

/*
  No session: create a new account for a key nobody uses yet. For a key that
  belongs to an existing account, send a challenge instead; the browser answers
  it at POST /user/login. A public key alone never logs anyone in.
*/
const startLogin = async (req, res, next, publicKey, deviceFingerprint) => {
  try {
    return await startLoginInner(req, res, next, publicKey, deviceFingerprint);
  } catch (loginErr) {
    console.error("Login start failed:", loginErr);
    return res.status(500).send({error: "Something went wrong. Please try again."});
  }
};

const startLoginInner = async (req, res, next, publicKey, deviceFingerprint) => {
  const account = await resolveAccount(publicKey);

  if (account.status === "replaced") {
    return res.status(403).send({
      error: "This key was replaced. Use your recovery key to sign in.",
      code: "KEY_REPLACED",
    });
  }

  if (account.status === "existing") {
    const challenge = await issueChallenge(account.uid, publicKey);
    return res.status(200).send({challenge});
  }

  // New account
  const userId = account.uid;
  const createdAt = Date.now();
  await db.ref().update({
    [`users/${userId}/userDetail`]: {
      publicKey,
      deviceFingerprint: deviceFingerprint || null,
      chatFlag: true,
      createdAt,
    },
    [`keyIndex/${keyHash(publicKey)}`]: userId,
  });
  await issueSession(res, userId);

  req.user = {
    uid: userId,
    isNew: true,
    chatId: chatIdFor(userId),
  };
  return next();
};

module.exports = {authUser, isLoggedIn, issueSession, chatIdFor, forgetSession, forgetUserSessions};


