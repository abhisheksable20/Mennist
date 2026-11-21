// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
const P = ROOT + "/node_modules/";
const admin = require(P + "firebase-admin");
const jwt = require(P + "jsonwebtoken");
admin.initializeApp({projectId: "demo-coins", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const assert = require("assert"); const coins = require(ROOT + "/coins/coinService");
const cfg = require(ROOT + "/config/coins");
const db = admin.database(); console.error = () => {};
const bal = async (u) => { const w = (await db.ref(`coins/${u}`).get()).val(); return w.bonus + w.earned; };
const expectErr = async (p, code) => { try { await p; assert.fail("expected " + code); } catch (e) { assert.strictEqual(e.code, code, e.message); } };
const cid = (u) => jwt.sign(u, "test-secret");
(async () => {
  await db.ref().set(null);
  const A = "aman";
  // 3 free starts
  for (const to of ["r1", "r2", "r3"]) {
    const r = await coins.allowChatMessage(A, to);
    assert.strictEqual(r.free, true);
  }
  assert.strictEqual((await coins.getWallet(A)).chats.freeLeft, 0);
  assert.strictEqual(await bal(A), 50);
  // existing pairs stay free, both directions
  assert.strictEqual((await coins.allowChatMessage(A, "r1")).started, false);
  assert.strictEqual((await coins.allowChatMessage("r1", A)).started, false);
  // 4th costs 5, receiver side waits for a reply
  let r = await coins.allowChatMessage(A, "riya");
  assert.strictEqual(r.free, false); assert.strictEqual(await bal(A), 45);
  const pend = (await db.ref(`chatOpen/riya/${A}`).get()).val();
  assert.strictEqual(typeof pend, "string");
  assert.strictEqual(await coins.isChatOpen("riya", cid(A)), true);
  // Aman's further messages free
  assert.strictEqual((await coins.allowChatMessage(A, "riya")).started, false);
  assert.strictEqual(await bal(A), 45);
  // Riya replies: free, pending cleared, no refund later
  assert.strictEqual((await coins.allowChatMessage("riya", A)).started, false);
  assert.strictEqual((await db.ref(`chatOpen/riya/${A}`).get()).val(), true);
  assert.strictEqual((await db.ref("pendingChatStarts").get()).exists(), false);
  // Riya starting with someone new uses her own free starts
  r = await coins.allowChatMessage("riya", "karan");
  assert.strictEqual(r.free, true);
  assert.strictEqual((await coins.getWallet("riya")).chats.freeLeft, 2);
  // unanswered paid start refunded after 48h, chat stays open
  r = await coins.allowChatMessage(A, "neha");
  assert.strictEqual(await bal(A), 40);
  const ps = (await db.ref("pendingChatStarts").get()).val(); const sid = Object.keys(ps)[0];
  await db.ref(`pendingChatStarts/${sid}/at`).set(Date.now() - cfg.CHAT_START_REFUND_MS - 1000);
  assert.strictEqual(await coins.expireChatStarts(), 1);
  assert.strictEqual(await coins.expireChatStarts(), 0);
  assert.strictEqual(await bal(A), 45);
  assert.strictEqual((await db.ref(`chatOpen/neha/${A}`).get()).val(), true);
  assert.strictEqual((await coins.allowChatMessage("neha", A)).started, false);
  // not enough coins: locked, no change, not opened
  await db.ref(`coins/${A}`).update({bonus: 0, earned: 4});
  await expectErr(coins.allowChatMessage(A, "zoya"), "CHAT_LOCKED");
  assert.strictEqual(await bal(A), 4);
  assert.strictEqual(await coins.isChatOpen(A, cid("zoya")), false);
  // grandfathered: old conversation from before the feature is free
  await db.ref(`chats/oldA/oldB`).set({timestamp: 1, senderChatId: "x"});
  await db.ref(`coins/oldB`).set(null);
  assert.strictEqual(await coins.isChatOpen("oldB", cid("oldA")), true);
  const g = await coins.allowChatMessage("oldB", "oldA");
  assert.strictEqual(g.started, false);
  // concurrent first messages charge once
  await db.ref(`coins/${A}`).update({earned: 30});
  const both = await Promise.all([coins.allowChatMessage(A, "dup"), coins.allowChatMessage(A, "dup")]);
  assert.ok(both.every((x) => x.started));
  assert.strictEqual(await bal(A), 25);
  // ledger
  const led = Object.values((await db.ref(`coinLedger/${A}`).get()).val());
  assert.strictEqual(led.filter((e) => e.type === "chat_start").length, 3);
  assert.strictEqual(led.filter((e) => e.type === "chat_start_refund").length, 1);
  console.log("ALL PASSED"); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
