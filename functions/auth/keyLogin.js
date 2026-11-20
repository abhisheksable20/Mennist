// =====================================================================
// Logging in to an EXISTING account with the chat key pair.
//
// A public key is not a secret (anyone you chat with can fetch it), so it
// must never be enough to log in. When a public key belongs to an account
// that already exists, the browser has to prove it holds the matching
// private key:
//
//   1. Server makes a one-time X25519 key pair and sends its public half.
//   2. Browser computes X25519(its private key, server key) -> shared secret.
//      Only the real owner can get the same secret the server computed.
//   3. Browser sends SHA-256(shared secret || challenge id); server compares.
//
// keyIndex/{HMAC(publicKey)} -> userId maps the CURRENT public key of each
// account to the account. Recovery (a new key on a new device) updates it, so
// the account id stays the same and an old, replaced key is refused.
// Accounts made before the index existed are added to it on their next login.
// =====================================================================

const admin = require("firebase-admin");
const crypto = require("crypto");

const db = admin.database();

const CHALLENGE_TTL_MS = 2 * 60 * 1000;
// DER header that wraps a raw 32-byte X25519 public key (SPKI)
const X25519_SPKI_PREFIX = Buffer.from("302a300506032b656e032100", "hex");

// Same HMAC that has always produced user ids, so existing ids keep working
const keyHash = (publicKey) => crypto
    .createHmac("sha256", process.env.JWT_SECRET_KEY)
    .update(publicKey)
    .digest("hex");

// libsodium base64 (url-safe or standard) of exactly 32 bytes
const decodePublicKey = (publicKey) => {
  if (typeof publicKey !== "string" || publicKey.length < 40 || publicKey.length > 64) {
    return null;
  }
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(publicKey)) {
    return null;
  }
  const raw = Buffer.from(publicKey, "base64");
  return raw.length === 32 ? raw : null;
};

/*
  Which account does this public key belong to?
    {status: "new", uid}       no account yet: create one with this id
    {status: "existing", uid}  account exists: the browser must prove the key
    {status: "replaced"}       an old key of an account that got a new one
*/
const resolveAccount = async (publicKey) => {
  const hash = keyHash(publicKey);
  const indexed = (await db.ref(`keyIndex/${hash}`).get()).val();
  const uid = indexed || hash;
  const current = (await db.ref(`users/${uid}/userDetail/publicKey`).get()).val();

  if (current === publicKey) {
    if (!indexed) {
      await db.ref(`keyIndex/${hash}`).set(uid);
    }
    return {status: "existing", uid};
  }
  if (current === null || current === undefined) {
    if (uid === hash) {
      return {status: "new", uid: hash};
    }
    // The index points at an account that was deleted
    await db.ref(`keyIndex/${hash}`).remove();
    const own = (await db.ref(`users/${hash}/userDetail/publicKey`).get()).val();
    return own === null || own === undefined ? {status: "new", uid: hash} : {status: "replaced"};
  }
  return {status: "replaced"};
};

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest();

// Step 1: a one-time challenge only the private key's owner can answer
const issueChallenge = async (uid, publicKey) => {
  const raw = decodePublicKey(publicKey);
  const userKey = crypto.createPublicKey({
    key: Buffer.concat([X25519_SPKI_PREFIX, raw]), format: "der", type: "spki",
  });
  const server = crypto.generateKeyPairSync("x25519");
  const shared = crypto.diffieHellman({privateKey: server.privateKey, publicKey: userKey});

  const id = crypto.randomBytes(16).toString("hex");
  const expected = sha256(Buffer.concat([shared, Buffer.from(id, "utf8")]));

  // Only a hash of the expected answer is stored
  await db.ref(`loginChallenges/${id}`).set({
    uid,
    answer: sha256(expected).toString("hex"),
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });

  const serverKey = server.publicKey.export({format: "der", type: "spki"}).subarray(-32);
  return {id, serverKey: serverKey.toString("base64url")};
};

// Step 3: check the answer. One try per challenge. Returns the user id or null.
const verifyChallenge = async (challengeId, answer) => {
  if (typeof challengeId !== "string" || !/^[a-f0-9]{32}$/.test(challengeId)) {
    return null;
  }
  if (typeof answer !== "string" || answer.length > 64) {
    return null;
  }

  let challenge = null;
  await db.ref(`loginChallenges/${challengeId}`).transaction((current) => {
    challenge = current;
    return null;
  });
  if (!challenge || challenge.expiresAt < Date.now()) {
    return null;
  }

  // The browser sends `expected`; we stored sha256(expected)
  const got = sha256(Buffer.from(answer, "base64"));
  const want = Buffer.from(challenge.answer, "hex");
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
    return null;
  }
  return challenge.uid;
};

// Hourly: drop challenges nobody answered
const purgeExpiredChallenges = async (limit = 500) => {
  const snap = await db.ref("loginChallenges").orderByChild("expiresAt").endAt(Date.now()).limitToFirst(limit).get();
  const updates = {};
  snap.forEach((child) => {
    updates[child.key] = null;
  });
  if (Object.keys(updates).length) {
    await db.ref("loginChallenges").update(updates);
  }
  return Object.keys(updates).length;
};

module.exports = {
  keyHash,
  decodePublicKey,
  resolveAccount,
  issueChallenge,
  verifyChallenge,
  purgeExpiredChallenges,
};
