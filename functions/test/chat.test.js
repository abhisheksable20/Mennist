// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
const P = ROOT + "/node_modules/";
const admin = require(P + "firebase-admin"); const jwt = require(P + "jsonwebtoken");
admin.initializeApp({projectId: "demo-coins", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const assert = require("assert"); const coins = require(ROOT + "/coins/coinService");
const db = admin.database(); console.error = () => {};
const chat = (u) => jwt.sign(u, "test-secret");
(async () => {
  await db.ref().set(null);
  for (const u of ["A", "B"]) await db.ref(`users/${u}/userDetail`).set({createdAt: Date.now() - 30 * 864e5});
  await coins.ensureWallet("A"); await coins.ensureWallet("B");
  await db.ref("coins/A").update({earned: 200, streak: {current: 7, longest: 7, lastDay: ""}});
  const t1 = await coins.createTransfer("A", chat("B"), 20);
  let a = await coins.getChatTransfers("A", chat("B")); let b = await coins.getChatTransfers("B", chat("A"));
  assert.deepStrictEqual([a[0].dir, a[0].amount, a[0].receives, a[0].status], ["out", 20, 19, "pending"]);
  assert.deepStrictEqual([b[0].dir, b[0].amount, b[0].status], ["in", 19, "pending"]);
  await coins.respondToTransfer("B", t1.transferId, "accept");
  const t2 = await coins.createTransfer("A", chat("B"), 10);
  await coins.respondToTransfer("B", t2.transferId, "decline");
  const t3 = await coins.createTransfer("A", chat("B"), 10);
  await coins.cancelTransfer("A", t3.transferId);
  a = await coins.getChatTransfers("A", chat("B")); b = await coins.getChatTransfers("B", chat("A"));
  assert.deepStrictEqual(a.map((x) => x.status), ["accepted", "declined", "cancelled"]);
  assert.deepStrictEqual(b.map((x) => x.status), ["accepted", "declined", "cancelled"]);
  console.log("ALL PASSED"); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
