// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
const path = ROOT + "/node_modules/";
const admin = require(path + "firebase-admin");
const jwt = require(path + "jsonwebtoken");
admin.initializeApp({projectId: "demo-coins", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const assert = require("assert");
const coins = require(ROOT + "/coins/coinService");
const cfg = require(ROOT + "/config/coins");
const db = admin.database();
console.error = () => {}; // silence expected notification-queue errors

const realNow = Date.now;
let offset = 0;
Date.now = () => realNow() + offset;
const day = (n) => { offset += n * cfg.DAY; };
const chat = (u) => jwt.sign(u, "test-secret");
const bal = async (u) => (await db.ref(`coins/${u}`).get()).val();
const expectErr = async (p, code) => {
  try { await p; } catch (e) { assert.strictEqual(e.code, code, e.message); return; }
  throw new Error("expected " + code);
};
const long = "this is a long enough post for the streak";

(async () => {
  await db.ref().set(null);
  const old = realNow() - 30 * cfg.DAY;
  for (const u of ["A", "B", "C"]) await db.ref(`users/${u}/userDetail`).set({createdAt: old});

  // welcome
  await coins.ensureWallet("A"); await coins.ensureWallet("A");
  let w = await bal("A"); assert.strictEqual(w.bonus, 50);
  console.log("ok welcome once");

  // short post doesn't count
  let r = await coins.recordDailyPost("A", "short"); assert.strictEqual(r.counted, false);
  // streak 1..7
  let total = 0;
  for (let i = 1; i <= 7; i++) {
    r = await coins.recordDailyPost("A", long);
    assert.strictEqual(r.streak, i); total += 2 + r.milestone;
    const again = await coins.recordDailyPost("A", long); assert.strictEqual(again.alreadyCounted, true);
    if (i < 7) day(1);
  }
  w = await bal("A"); assert.strictEqual(w.earned, total); assert.strictEqual(total, 14 + 5 + 20);
  console.log("ok 7-day streak earned", total);

  // concurrency: 5 posts at once same day on new user B -> counted once
  const rs = await Promise.all([1, 2, 3, 4, 5].map(() => coins.recordDailyPost("B", long)));
  assert.strictEqual(rs.filter((x) => x.counted).length, 1);
  w = await bal("B"); assert.strictEqual(w.earned, 2); assert.strictEqual(w.bonus, 50);
  console.log("ok concurrent posts counted once");

  // freeze: buy (bonus first), skip a day, streak continues
  r = await coins.spend("A", "streak_freeze"); assert.strictEqual(r.price, 30);
  w = await bal("A"); assert.strictEqual(w.bonus, 20); assert.strictEqual(w.inventory.streak_freeze, 1);
  day(2); r = await coins.recordDailyPost("A", long);
  assert.strictEqual(r.streak, 8); assert.strictEqual(r.freezesUsed, 1);
  day(3); r = await coins.recordDailyPost("A", long); assert.strictEqual(r.streak, 1);
  console.log("ok freeze + reset");
  await expectErr(coins.spend("A", "nope"), "UNKNOWN_ITEM");

  // concurrent spends can't overspend: give C 50 bonus only, buy freeze twice at once
  await coins.ensureWallet("C");
  const sp = await Promise.allSettled([coins.spend("C", "streak_freeze"), coins.spend("C", "streak_freeze")]);
  assert.strictEqual(sp.filter((x) => x.status === "fulfilled").length, 1);
  w = await bal("C"); assert.strictEqual(w.bonus, 20);
  console.log("ok no double spend");

  // transfers: B has no 7-day streak
  await expectErr(coins.createTransfer("B", chat("A"), 5), "STREAK_REQUIRED");
  await expectErr(coins.createTransfer("A", chat("A"), 5), "SELF_TRANSFER");
  // A earned: 39 + 2 + 2 = 43
  w = await bal("A"); const earned = w.earned; assert.strictEqual(earned, 43);
  await expectErr(coins.createTransfer("A", chat("B"), 60), "INSUFFICIENT_COINS");

  let t1 = await coins.createTransfer("A", chat("B"), 20);
  assert.deepStrictEqual([t1.cut, t1.receives, t1.cutPercent], [1, 19, 5]);
  w = await bal("A"); assert.strictEqual(w.earned, earned - 20);
  const pv = await coins.previewTransfer("A", chat("B"), 20); assert.strictEqual(pv.cut, 2);
  r = await coins.respondToTransfer("B", t1.transferId, "accept"); assert.strictEqual(r.received, 19);
  w = await bal("B"); assert.strictEqual(w.earned, 21); assert.ok(!w.incoming);
  await expectErr(coins.respondToTransfer("B", t1.transferId, "accept"), "TRANSFER_NOT_FOUND");
  w = await bal("A"); assert.ok(!w.outgoing);
  console.log("ok transfer accepted, 5% cut");

  // 2nd: decline -> full refund, and declined one doesn't raise next cut
  let t2 = await coins.createTransfer("A", chat("B"), 10);
  assert.strictEqual(t2.cutPercent, 10);
  r = await coins.respondToTransfer("B", t2.transferId, "decline"); assert.strictEqual(r.status, "declined");
  w = await bal("A"); assert.strictEqual(w.earned, earned - 20);
  let t3 = await coins.createTransfer("A", chat("B"), 10); assert.strictEqual(t3.cutPercent, 10);
  // A cancels
  r = await coins.cancelTransfer("A", t3.transferId); assert.strictEqual(r.refunded, 10);
  await expectErr(coins.cancelTransfer("B", t3.transferId), "TRANSFER_NOT_FOUND");
  w = await bal("A"); assert.strictEqual(w.earned, earned - 20);
  console.log("ok decline/cancel refunds");

  // daily send limit: already sent 20+10+10 = 40 today
  await db.ref("coins/A/earned").set(500);
  await coins.createTransfer("A", chat("C"), 50);
  await expectErr(coins.createTransfer("A", chat("C"), 20), "DAILY_SEND_LIMIT");
  console.log("ok daily send limit");

  // block: B blocks A
  let t4 = await coins.createTransfer("A", chat("B"), 11).catch((e) => e);
  assert.strictEqual(t4.code, "DAILY_SEND_LIMIT"); // still limited today
  day(1);
  t4 = await coins.createTransfer("A", chat("B"), 10);
  await coins.respondToTransfer("B", t4.transferId, "block");
  await expectErr(coins.createTransfer("A", chat("B"), 10), "TRANSFERS_DISABLED");
  await coins.unblockSender("B", chat("A"));
  console.log("ok block/unblock");

  // expiry: pending A->C from yesterday (50). jump past 48h, run expiry
  let beforeA = (await bal("A")).earned;
  const t5 = await coins.createTransfer("A", chat("B"), 10);
  day(3);
  await expectErr(coins.respondToTransfer("B", t5.transferId, "accept"), "TRANSFER_EXPIRED");
  const n = await coins.expireTransfers();
  assert.ok(n >= 1);
  w = await bal("A"); assert.strictEqual(w.earned, beforeA + 50); assert.ok(!w.outgoing);
  assert.strictEqual((await db.ref("pendingTransfers").get()).exists(), false);
  console.log("ok expiry refunds");

  // receiver deleted -> expiry refunds sender
  const t6 = await coins.createTransfer("A", chat("C"), 10);
  beforeA = (await bal("A")).earned;
  await db.ref("coins/C").remove();
  day(3); await coins.expireTransfers();
  w = await bal("A"); assert.strictEqual(w.earned, beforeA + 10);
  console.log("ok deleted receiver refunded", t6.transferId.length > 0);

  // concurrent transfers can't exceed balance
  await db.ref("coins/A/earned").set(30);
  await db.ref("coins/A/outgoing").remove();
  const cs = await Promise.allSettled([1, 2, 3].map(() => coins.createTransfer("A", chat("B"), 20)));
  assert.strictEqual(cs.filter((x) => x.status === "fulfilled").length, 1);
  console.log("ok no double send");

  const h = await coins.getHistory("A"); assert.ok(h.length > 5);
  const view = await coins.getWallet("A"); assert.ok(view.transfers.canSend);
  console.log("ok wallet view", JSON.stringify(view.streak));
  console.log("ALL PASSED");
  process.exit(0);
})().catch((e) => { process.stdout.write("FAIL " + e.stack + "\n"); process.exit(1); });
