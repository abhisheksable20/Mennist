// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
process.env.FUNCTIONS_EMULATOR = "true";
const P = ROOT + "/node_modules/";
const admin = require(P + "firebase-admin");
admin.initializeApp({projectId: "demo-coins", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const express = require(P + "express");
const cookieParser = require(P + "cookie-parser");
const sodium = require(ROOT + "/../client/node_modules/libsodium-wrappers");
const assert = require("assert");
const crypto = require("crypto");
const db = admin.database();
console.error = () => {};

// same code as client/src/crypto/keyManager.js answerLoginChallenge
async function answer(privateKey, challenge) {
  const shared = sodium.crypto_scalarmult(sodium.from_base64(privateKey), sodium.from_base64(challenge.serverKey));
  const idBytes = sodium.from_string(challenge.id);
  const data = new Uint8Array(shared.length + idBytes.length); data.set(shared); data.set(idBytes, shared.length);
  return sodium.to_base64(new Uint8Array(await crypto.subtle.digest("SHA-256", data)));
}
const newKeys = () => { const k = sodium.crypto_box_keypair(); return {privateKey: sodium.to_base64(k.privateKey), publicKey: sodium.to_base64(k.publicKey)}; };
const hmac = (pk) => crypto.createHmac("sha256", "test-secret").update(pk).digest("hex");

(async () => {
  await sodium.ready;
  await db.ref().set(null);
  const app = express(); app.set("trust proxy", true); app.use(express.json()); app.use(cookieParser());
  app.use("/user", require(ROOT + "/routes/userOperation"));
  const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}/user`;
  const post = async (path, body, cookie) => {
    const r = await fetch(base + path, {method: "POST", headers: {"content-type": "application/json", "x-forwarded-for": `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...(cookie ? {cookie} : {})}, body: JSON.stringify(body)});
    const sc = r.headers.get("set-cookie"); const m = sc && sc.match(/__session=([^;]*)/);
    return {status: r.status, body: await r.json().catch(() => null), cookie: m && m[1] ? `__session=${m[1]}` : null};
  };

  // 1. new account works as before
  const riya = newKeys();
  let r = await post("/create-user", {publicKey: riya.publicKey, deviceFingerprint: "fp"});
  assert.strictEqual(r.status, 200); assert.strictEqual(r.body.isNew, true); assert.ok(r.cookie);
  const riyaId = hmac(riya.publicKey);
  assert.strictEqual((await db.ref(`keyIndex/${riyaId}`).get()).val(), riyaId);
  const riyaCookie = r.cookie;
  // with her cookie: same account, no challenge
  r = await post("/create-user", {publicKey: riya.publicKey}, riyaCookie);
  assert.strictEqual(r.body.isNew, false); assert.ok(!r.body.challenge);
  console.log("ok new account + existing session");
  // 7. bad input
  assert.strictEqual((await post("/create-user", {publicKey: "abc"})).status, 400);
  assert.strictEqual((await post("/login", {challengeId: "x", answer: "y"})).status, 401);
  console.log("ok bad input");

  // 2. ATTACK: someone with only Riya's public key gets a challenge, no session
  r = await post("/create-user", {publicKey: riya.publicKey, deviceFingerprint: "evil"});
  assert.strictEqual(r.status, 200); assert.ok(r.body.challenge); assert.ok(!r.cookie, "no session cookie for public key alone");
  assert.strictEqual((await db.ref(`users/${riyaId}/userDetail/deviceFingerprint`).get()).val(), "fp", "details not overwritten");
  // attacker answers with their own key
  const evil = newKeys();
  r = await post("/login", {challengeId: r.body.challenge.id, answer: await answer(evil.privateKey, r.body.challenge)});
  assert.strictEqual(r.status, 401); assert.ok(!r.cookie);
  // random answer
  r = await post("/create-user", {publicKey: riya.publicKey});
  const ch = r.body.challenge;
  assert.strictEqual((await post("/login", {challengeId: ch.id, answer: sodium.to_base64(sodium.randombytes_buf(32))})).status, 401);
  // the challenge is one-time: even the right answer fails after a wrong try
  assert.strictEqual((await post("/login", {challengeId: ch.id, answer: await answer(riya.privateKey, ch)})).status, 401);
  console.log("ok public key alone is refused");

  // 3. real owner (lost cookie, has keys) logs back in
  r = await post("/create-user", {publicKey: riya.publicKey});
  r = await post("/login", {challengeId: r.body.challenge.id, answer: await answer(riya.privateKey, r.body.challenge)});
  assert.strictEqual(r.status, 200); assert.ok(r.cookie);
  assert.strictEqual(r.body.chatId, require(P + "jsonwebtoken").sign(riyaId, "test-secret"));
  console.log("ok owner proves key and logs in");

  // 4. expired challenge
  r = await post("/create-user", {publicKey: riya.publicKey});
  await db.ref(`loginChallenges/${r.body.challenge.id}/expiresAt`).set(Date.now() - 1);
  assert.strictEqual((await post("/login", {challengeId: r.body.challenge.id, answer: await answer(riya.privateKey, r.body.challenge)})).status, 401);
  const {purgeExpiredChallenges} = require(ROOT + "/auth/keyLogin");
  r = await post("/create-user", {publicKey: riya.publicKey});
  await db.ref(`loginChallenges/${r.body.challenge.id}/expiresAt`).set(Date.now() - 1);
  assert.strictEqual(await purgeExpiredChallenges(), 1);
  console.log("ok expiry + purge");

  // 5. old account without an index entry (made before this change)
  const old = newKeys(); const oldId = hmac(old.publicKey);
  await db.ref(`users/${oldId}/userDetail`).set({publicKey: old.publicKey, chatFlag: true, createdAt: 1});
  r = await post("/create-user", {publicKey: old.publicKey});
  assert.ok(r.body.challenge);
  assert.strictEqual((await db.ref(`keyIndex/${oldId}`).get()).val(), oldId, "backfilled");
  r = await post("/login", {challengeId: r.body.challenge.id, answer: await answer(old.privateKey, r.body.challenge)});
  assert.strictEqual(r.status, 200);
  console.log("ok pre-existing account backfilled");

  // 6. replaced key (as after a recovery): old key refused, new key logs into same account
  const fresh = newKeys();
  await db.ref().update({[`users/${oldId}/userDetail/publicKey`]: fresh.publicKey, [`keyIndex/${oldId}`]: null, [`keyIndex/${hmac(fresh.publicKey)}`]: oldId});
  r = await post("/create-user", {publicKey: old.publicKey});
  assert.strictEqual(r.status, 403); assert.strictEqual(r.body.code, "KEY_REPLACED");
  r = await post("/create-user", {publicKey: fresh.publicKey});
  r = await post("/login", {challengeId: r.body.challenge.id, answer: await answer(fresh.privateKey, r.body.challenge)});
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.chatId, require(P + "jsonwebtoken").sign(oldId, "test-secret"));
  console.log("ok replaced key refused, new key -> same account");

  console.log("ALL PASSED"); server.close(); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
