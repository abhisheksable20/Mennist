// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
process.env.RECOVERY_PEPPER = "test-pepper";
process.env.FUNCTIONS_EMULATOR = "true";
const P = ROOT + "/node_modules/";
const admin = require(P + "firebase-admin");
admin.initializeApp({projectId: "demo-coins", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const express = require(P + "express");
const cookieParser = require(P + "cookie-parser");
const jwt = require(P + "jsonwebtoken");
const sodium = require(ROOT + "/../client/node_modules/libsodium-wrappers");
const assert = require("assert");
const crypto = require("crypto");
const db = admin.database();
console.error = () => {};
async function answer(privateKey, ch) {
  const shared = sodium.crypto_scalarmult(sodium.from_base64(privateKey), sodium.from_base64(ch.serverKey));
  const id = sodium.from_string(ch.id); const d = new Uint8Array(shared.length + id.length); d.set(shared); d.set(id, shared.length);
  return sodium.to_base64(new Uint8Array(await crypto.subtle.digest("SHA-256", d)));
}
const newKeys = () => { const k = sodium.crypto_box_keypair(); return {privateKey: sodium.to_base64(k.privateKey), publicKey: sodium.to_base64(k.publicKey)}; };

(async () => {
  await sodium.ready; await db.ref().set(null);
  const app = express(); app.set("trust proxy", true); app.use(express.json()); app.use(cookieParser());
  app.use("/user", require(ROOT + "/routes/userOperation"));
  app.use("/user", require(ROOT + "/routes/recovery"));
  const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}/user`;
  const call = async (method, path, body, cookie) => {
    const r = await fetch(base + path, {method, headers: {"content-type": "application/json", "x-forwarded-for": `10.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...(cookie ? {cookie} : {})}, body: body ? JSON.stringify(body) : undefined});
    const sc = r.headers.get("set-cookie"); const m = sc && sc.match(/__session=([^;]*)/);
    return {status: r.status, body: await r.json().catch(() => null), cookie: m && m[1] ? `__session=${m[1]}` : null};
  };

  // Account on device A
  const a = newKeys();
  let r = await call("POST", "/create-user", {publicKey: a.publicKey});
  const cookieA = r.cookie; const uid = jwt.verify(r.body.chatId, "test-secret");
  await db.ref(`coins/${uid}/earned`).set(100);

  r = await call("GET", "/recovery/status", null, cookieA);
  assert.deepStrictEqual([r.body.enabled, r.body.confirmed, r.body.rewarded], [false, false, false]);
  r = await call("POST", "/recovery/confirm", null, cookieA);
  assert.strictEqual(r.status, 409);

  r = await call("POST", "/recovery/create", null, cookieA);
  const key1 = r.body.recoveryCode;
  assert.match(key1, /^([A-HJ-NP-Z2-9]{4}-){5}[A-HJ-NP-Z2-9]{4}$/);
  r = await call("GET", "/recovery/status", null, cookieA);
  assert.deepStrictEqual([r.body.enabled, r.body.confirmed], [true, false]);
  r = await call("POST", "/recovery/confirm", null, cookieA);
  assert.strictEqual(r.body.reward, 15);
  r = await call("POST", "/recovery/confirm", null, cookieA);
  assert.strictEqual(r.body.reward, 0, "reward only once");
  assert.strictEqual((await db.ref(`coins/${uid}/earned`).get()).val(), 115);
  console.log("ok setup + confirm + reward once");

  // Make a new key: old one stops working
  r = await call("POST", "/recovery/create", null, cookieA);
  const key2 = r.body.recoveryCode;
  r = await call("POST", "/recover", {recoveryCode: key1, publicKey: newKeys().publicKey});
  assert.strictEqual(r.status, 401);
  console.log("ok replaced key refused");

  // Recover on device B (lowercase, no dashes still works)
  const b = newKeys();
  r = await call("POST", "/recover", {recoveryCode: key2.replace(/-/g, "").toLowerCase(), publicKey: b.publicKey, deviceFingerprint: "fpB"});
  assert.strictEqual(r.status, 200); assert.ok(r.cookie);
  assert.strictEqual(jwt.verify(r.body.chatId, "test-secret"), uid, "same account");
  const key3 = r.body.recoveryCode; assert.notStrictEqual(key3, key2);
  const cookieB = r.cookie;
  // old session signed out, new one works
  r = await call("GET", "/recovery/status", null, cookieA); assert.strictEqual(r.status, 401);
  r = await call("GET", "/recovery/status", null, cookieB); assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.enabled, true); assert.strictEqual(r.body.confirmed, false);
  assert.strictEqual((await db.ref(`coins/${uid}/earned`).get()).val(), 115, "coins kept");
  // used key can't be used again
  r = await call("POST", "/recover", {recoveryCode: key2, publicKey: newKeys().publicKey});
  assert.strictEqual(r.status, 401);
  console.log("ok recover: same account, old sessions out, key one-time");

  // Old device key A is refused; new key B logs in to same account
  r = await call("POST", "/create-user", {publicKey: a.publicKey});
  assert.strictEqual(r.status, 403); assert.strictEqual(r.body.code, "KEY_REPLACED");
  r = await call("POST", "/create-user", {publicKey: b.publicKey});
  r = await call("POST", "/login", {challengeId: r.body.challenge.id, answer: await answer(b.privateKey, r.body.challenge)});
  assert.strictEqual(r.status, 200); assert.strictEqual(jwt.verify(r.body.chatId, "test-secret"), uid);
  console.log("ok old device key refused, new key logs in");
  r = await call("POST", "/key-status", {publicKey: a.publicKey}); assert.strictEqual(r.body.status, "replaced");
  r = await call("POST", "/key-status", {publicKey: b.publicKey}); assert.strictEqual(r.body.status, "ok");
  r = await call("POST", "/key-status", {publicKey: newKeys().publicKey}); assert.strictEqual(r.body.status, "ok");
  r = await call("POST", "/key-status", {publicKey: "junk"}); assert.strictEqual(r.status, 400);
  console.log("ok key-status: old device sees replaced");

  // bad input
  r = await call("POST", "/recover", {recoveryCode: "ABCD", publicKey: b.publicKey}); assert.strictEqual(r.status, 401);
  r = await call("POST", "/recover", {recoveryCode: key3, publicKey: "junk"}); assert.strictEqual(r.status, 401);
  assert.ok((await db.ref("recoveryIndex").get()).val(), "key3 not consumed by bad request");
  // pepper missing -> refuses
  delete process.env.RECOVERY_PEPPER;
  r = await call("POST", "/recover", {recoveryCode: key3, publicKey: b.publicKey}); assert.strictEqual(r.status, 500);
  console.log("ALL PASSED"); server.close(); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
