// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
const P = ROOT + "/node_modules/";
const admin = require(P + "firebase-admin");
admin.initializeApp({projectId: "demo-coins", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const assert = require("assert"); const coins = require(ROOT + "/coins/coinService");
const cfg = require(ROOT + "/config/coins");
const db = admin.database(); console.error = () => {};
const bal = async (u) => { const w = (await db.ref(`coins/${u}`).get()).val(); return w.bonus + w.earned; };
const expectErr = async (p, code) => { try { await p; assert.fail("expected " + code); } catch (e) { assert.strictEqual(e.code, code, e.message); } };
(async () => {
  await db.ref().set(null);
  const U = "userR";
  await db.ref(`echoes/${U}/e1`).set({echo: "hello world echo", timestamp: Date.now() - 3600e3, status: "completed"});
  await db.ref(`echoMatches/${U}/e1`).set({status: "completed", matches: [{a: 1}]});
  const queued = [];
  const enqueue = async (p) => { queued.push(p); };
  const finish = async (ok) => { const p = queued[queued.length - 1];
    await db.ref(`echoes/${U}/e1/status`).set(ok ? "completed" : "failed"); await db.ref(`echoMatches/${U}/e1/status`).set(ok ? "completed" : "failed");
    await coins.settleRematch(U, p.rematchId, ok); };

  // 3 free rematches
  for (let i = 0; i < 3; i++) {
    const r = await coins.startEchoRematch(U, "e1", enqueue);
    assert.strictEqual(r.free, true); assert.strictEqual(r.freeLeft, 2 - i);
    // double tap blocked while processing
    if (i === 0) await expectErr(coins.startEchoRematch(U, "e1", enqueue), "ALREADY_MATCHING");
    await finish(true);
  }
  assert.strictEqual(queued.length, 3);
  assert.strictEqual(await bal(U), 50);
  // 4th costs 5
  let r = await coins.startEchoRematch(U, "e1", enqueue);
  assert.strictEqual(r.free, false); assert.strictEqual(r.price, 5); assert.strictEqual(await bal(U), 45);
  await finish(true);
  assert.strictEqual(await bal(U), 45);
  // failed paid rematch refunded, settle twice = refund once
  r = await coins.startEchoRematch(U, "e1", enqueue);
  assert.strictEqual(await bal(U), 40);
  await finish(false); await coins.settleRematch(U, queued[queued.length - 1].rematchId, false);
  assert.strictEqual(await bal(U), 45);
  // failed free rematch gives the free one back
  const V = "userV";
  await db.ref(`echoes/${V}/e9`).set({echo: "x echo text", timestamp: 1, status: "failed"});
  const q2 = []; const r2 = await coins.startEchoRematch(V, "e9", async (p) => q2.push(p));
  assert.strictEqual(r2.freeLeft, 2);
  await coins.settleRematch(V, q2[0].rematchId, false);
  assert.strictEqual((await coins.getWallet(V)).rematch.freeLeft, 3);
  // enqueue failure: refunded and echo unlocked with previous status
  const before = await bal(U);
  await expectErr(coins.startEchoRematch(U, "e1", async () => { throw new Error("queue down"); }), "REMATCH_NOT_STARTED");
  assert.strictEqual(await bal(U), before);
  const e1 = (await db.ref(`echoes/${U}/e1`).get()).val();
  assert.strictEqual(e1.status, "failed"); assert.ok(!e1.rematchId);
  assert.strictEqual((await db.ref(`echoMatches/${U}/e1/status`).get()).val(), "failed");
  // not enough coins: echo unlocked, nothing taken
  await db.ref(`coins/${U}`).update({bonus: 0, earned: 3});
  await expectErr(coins.startEchoRematch(U, "e1", enqueue), "INSUFFICIENT_COINS");
  assert.strictEqual(await bal(U), 3);
  assert.strictEqual((await db.ref(`echoes/${U}/e1/status`).get()).val(), "failed");
  // missing echo
  await expectErr(coins.startEchoRematch(U, "nope", enqueue), "ECHO_NOT_FOUND");
  // stale: task never reports back
  await db.ref(`coins/${U}`).update({earned: 20});
  r = await coins.startEchoRematch(U, "e1", enqueue);
  assert.strictEqual(await bal(U), 15);
  const rid = queued[queued.length - 1].rematchId;
  await db.ref(`pendingRematches/${rid}/at`).set(Date.now() - cfg.ECHO_REMATCH_STALE_MS - 1000);
  assert.strictEqual(await coins.refundStaleRematches(), 1);
  assert.strictEqual(await bal(U), 20);
  assert.strictEqual((await db.ref(`echoes/${U}/e1/status`).get()).val(), "failed");
  assert.strictEqual((await db.ref("pendingRematches").get()).exists(), false);
  // ledger: 3 paid spends, 3 refunds
  const led = Object.values((await db.ref(`coinLedger/${U}`).get()).val());
  assert.strictEqual(led.filter((e) => e.type === "echo_rematch").length, 4);
  assert.strictEqual(led.filter((e) => e.type === "echo_rematch_refund").length, 3);
  // initial-submit echo still processing (no processingSince) is blocked
  await db.ref(`echoes/${U}/e2`).set({echo: "new echo here", timestamp: Date.now(), status: "processing"});
  await expectErr(coins.startEchoRematch(U, "e2", enqueue), "ALREADY_MATCHING");
  // settle without rematchId is a no-op
  assert.strictEqual(await coins.settleRematch(U, undefined, false), null);
  console.log("ALL PASSED"); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
