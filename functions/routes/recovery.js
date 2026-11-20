// =====================================================================
// Account recovery with a recovery key (K7F2-9QXM-4TPD-W8HN-3BCE-RA6Y).
//
// The server creates the key and stores only an HMAC of it. On a new device
// the browser makes a NEW chat key pair; the recovery key moves the SAME
// account (same user id, coins, Veil, posts) to that new public key.
// The private chat key never leaves any device.
//
// Mounted at /api/user:
//   GET  /recovery/status    is recovery set up for this account?
//   POST /recovery/create    make a key (or a new one, replacing the old)
//   POST /recovery/confirm   user proved they saved it -> one-time coin reward
//   POST /recover            use a key on a new device
// =====================================================================

const express = require("express");
const admin = require("firebase-admin");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {isLoggedIn, issueSession} = require("../middleware/authenticUser");
const {sensitiveLimiter, globalLimiter, recoveryLimiter, publicReadLimiter} = require("../middleware/rateLimiter");
const {keyHash, decodePublicKey, resolveAccount} = require("../auth/keyLogin");
const {grantRecoveryReward} = require("../coins/coinService");

const router = express.Router();
const db = admin.database();

// 32 characters, no 0/O/1/I, so it is easy to read and type.
// 256 is divisible by 32, so (byte & 31) is perfectly uniform (no bias).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 24; // 24 chars * 5 bits = 120 bits

// Example output: "K7F2-9QXM-4TPD-W8HN-3BCE-RA6Y"
function generateRecoveryCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    raw += ALPHABET[bytes[i] & 31];
  }
  return raw.match(/.{4}/g).join("-");
}

// Remove spaces and dashes, uppercase. Returns null if the shape is wrong.
function normalizeCode(input) {
  if (typeof input !== "string" || input.length > 64) return null;
  const clean = input.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{24}$/.test(clean)) return null;
  return clean;
}

// Only this hash is stored. RECOVERY_PEPPER must differ from JWT_SECRET_KEY.
// The code has 120 bits of randomness, so a fast HMAC is enough.
function hashRecoveryCode(normalizedCode) {
  const pepper = process.env.RECOVERY_PEPPER;
  if (!pepper || pepper === process.env.JWT_SECRET_KEY) {
    throw new Error("RECOVERY_PEPPER is not set (or equals JWT_SECRET_KEY)");
  }
  return crypto.createHmac("sha256", pepper).update(normalizedCode).digest("hex");
}

// Create a new code for the user, replacing the previous one (if any).
// Returns the plain code. This is the ONLY time it exists in plain text.
async function saveNewRecoveryCode(userId) {
  const code = generateRecoveryCode();
  const hash = hashRecoveryCode(normalizeCode(code));

  const oldSnap = await db.ref(`users/${userId}/recovery/hash`).get();

  const updates = {};
  if (oldSnap.exists()) {
    updates[`recoveryIndex/${oldSnap.val()}`] = null;
  }
  updates[`recoveryIndex/${hash}`] = userId;
  updates[`users/${userId}/recovery`] = {hash, createdAt: Date.now()};

  await db.ref().update(updates);
  return code;
}

// ---------------------------------------------------------------------------
// Is this browser's key still the account's key? After the account is
// recovered on another device the old browser asks this, and on "replaced"
// it deletes its local copy (keys, chats). Reveals nothing beyond that.
// ---------------------------------------------------------------------------
router.post("/key-status", publicReadLimiter, async (req, res) => {
  const {publicKey} = req.body || {};
  if (!decodePublicKey(publicKey)) {
    return res.status(400).send({error: "Invalid public key"});
  }
  try {
    const account = await resolveAccount(publicKey);
    return res.status(200).send({status: account.status === "replaced" ? "replaced" : "ok"});
  } catch (err) {
    console.error("Key status error:", err);
    return res.status(500).send({error: "Internal server error!"});
  }
});

// ---------------------------------------------------------------------------
// Status for the Veil page
// ---------------------------------------------------------------------------
router.get("/recovery/status", isLoggedIn, globalLimiter, async (req, res) => {
  try {
    const [recovery, rewarded] = await Promise.all([
      db.ref(`users/${req.user.uid}/recovery`).get(),
      db.ref(`coins/${req.user.uid}/rewards/recovery`).get(),
    ]);
    const r = recovery.val() || {};
    return res.status(200).send({
      enabled: !!r.hash,
      confirmed: !!r.confirmedAt,
      createdAt: r.createdAt || null,
      rewarded: rewarded.exists(),
    });
  } catch (err) {
    console.error("Recovery status error:", err);
    return res.status(500).send({error: "Internal server error!"});
  }
});

// ---------------------------------------------------------------------------
// CREATE / REGENERATE a recovery key (user must be logged in)
// ---------------------------------------------------------------------------
router.post("/recovery/create", isLoggedIn, sensitiveLimiter, async (req, res) => {
  try {
    const recoveryCode = await saveNewRecoveryCode(req.user.uid);
    // Shown once. The client must tell the user to save it now.
    return res.status(200).send({success: true, recoveryCode});
  } catch (err) {
    console.error("Recovery create error:", err);
    return res.status(500).send({error: "Internal server error!"});
  }
});

// ---------------------------------------------------------------------------
// The user typed back part of the key: mark it confirmed, give the one-time reward
// ---------------------------------------------------------------------------
router.post("/recovery/confirm", isLoggedIn, globalLimiter, async (req, res) => {
  try {
    const exists = (await db.ref(`users/${req.user.uid}/recovery/hash`).get()).exists();
    if (!exists) {
      return res.status(409).send({error: "Set up recovery first."});
    }
    await db.ref(`users/${req.user.uid}/recovery/confirmedAt`).set(Date.now());
    const reward = await grantRecoveryReward(req.user.uid);
    return res.status(200).send({success: true, reward: reward.granted, balance: reward.balance});
  } catch (err) {
    console.error("Recovery confirm error:", err);
    return res.status(500).send({error: "Internal server error!"});
  }
});

// ---------------------------------------------------------------------------
// RECOVER an account on a new device (public endpoint, strict rate limit)
// ---------------------------------------------------------------------------
router.post("/recover", recoveryLimiter, async (req, res) => {
  const {recoveryCode, publicKey, deviceFingerprint} = req.body || {};

  const normalized = normalizeCode(recoveryCode);
  if (!normalized || !decodePublicKey(publicKey)) {
    // Same generic error as every other failure
    return res.status(401).send({error: "Invalid recovery key"});
  }

  let hash;
  try {
    hash = hashRecoveryCode(normalized);
  } catch (pepperErr) {
    console.error("Recovery error:", pepperErr);
    return res.status(500).send({error: "Internal server error!"});
  }
  const indexRef = db.ref(`recoveryIndex/${hash}`);

  // Atomically CONSUME the code, so two requests can't both use it.
  // (The callback may run more than once; the last run holds the real value.)
  let userId = null;
  try {
    await indexRef.transaction((current) => {
      userId = current;
      return null;
    });
  } catch (err) {
    console.error("Recovery lookup error:", err);
    return res.status(500).send({error: "Internal server error!"});
  }

  if (!userId) {
    return res.status(401).send({error: "Invalid recovery key"});
  }

  try {
    const updates = {};

    // Sign out every old session of this user (the old device may be stolen)
    const oldSessions = await db.ref("sessions").orderByChild("userId").equalTo(userId).get();
    oldSessions.forEach((child) => {
      updates[`sessions/${child.key}`] = null;
    });

    // Move the account to the new device's key: the old key stops working,
    // the new key logs in to the SAME account from now on
    const oldKey = (await db.ref(`users/${userId}/userDetail/publicKey`).get()).val();
    if (oldKey && oldKey !== publicKey) {
      updates[`keyIndex/${keyHash(oldKey)}`] = null;
    }
    updates[`keyIndex/${keyHash(publicKey)}`] = userId;
    updates[`users/${userId}/userDetail/publicKey`] = publicKey;
    updates[`users/${userId}/userDetail/deviceFingerprint`] = deviceFingerprint || null;
    // The used key is gone; a fresh one is saved below
    updates[`users/${userId}/recovery`] = null;

    await db.ref().update(updates);

    // Old key is already consumed, so issue a fresh one
    const newRecoveryCode = await saveNewRecoveryCode(userId);
    await issueSession(res, userId);

    return res.status(200).send({
      success: true,
      chatId: jwt.sign(userId, process.env.JWT_SECRET_KEY),
      recoveryCode: newRecoveryCode, // show once, user must save it
    });
  } catch (err) {
    console.error("Recovery error:", err);

    // Put the code back so the user is not locked out by our failure
    try {
      await db.ref().update({
        [`recoveryIndex/${hash}`]: userId,
        [`users/${userId}/recovery`]: {hash, createdAt: Date.now()},
      });
    } catch (restoreErr) {
      console.error("Failed to restore recovery code:", restoreErr);
    }

    return res.status(500).send({error: "Internal server error!"});
  }
});

module.exports = router;
