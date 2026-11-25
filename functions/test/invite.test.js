// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
const admin = require(ROOT + "/node_modules/firebase-admin");
admin.initializeApp({projectId: "demo-coins", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const assert = require("assert");
const coins = require(ROOT + "/coins/coinService");
const cfg = require(ROOT + "/config/coins");
const db = admin.database();
console.error = () => {}; // silence expected notification-queue errors

const realNow = Date.now;
let offset = 0;
Date.now = () => realNow() + offset;
const day = () => { offset += cfg.DAY; };
const wallet = async (u) => (await db.ref(`coins/${u}`).get()).val();
const long = "this is a long enough post for the streak";

(async () => {
  await db.ref().set(null);
  await db.ref("users/A/userDetail").set({deviceFingerprint: "device-A"});

  // A's code: made once, then the same every time
  const first = await coins.getInvites("A");
  assert.match(first.code, /^[A-Z2-9]{6}$/);
  assert.strictEqual((await coins.getInvites("A")).code, first.code);
  assert.strictEqual((await db.ref(`inviteCodes/${first.code}`).get()).val(), "A");
  assert.deepStrictEqual(first.friends, []);
  console.log("ok invite code is stable");

  assert.deepStrictEqual(await coins.getInviteOffer(first.code.toLowerCase()),
      {valid: true, welcomeBonus: cfg.WELCOME_BONUS, friendBonus: cfg.INVITE_FRIEND_BONUS});
  assert.strictEqual((await coins.getInviteOffer("ZZZZZZ")).valid, false);
  assert.strictEqual((await coins.getInviteOffer("../x")).valid, false);
  console.log("ok invite offer");

  // Bad codes, your own code and the inviter's device give nothing
  assert.strictEqual((await coins.acceptInvite("X", "ZZZZZZ")).applied, false);
  assert.strictEqual((await coins.acceptInvite("A", first.code)).applied, false);
  assert.strictEqual((await coins.acceptInvite("Y", first.code, "device-A")).applied, false);
  assert.strictEqual(await wallet("Y"), null);
  console.log("ok bad code, own code and same device refused");

  // Friend F joins: welcome + invite bonus, once
  let r = await coins.acceptInvite("F", first.code.toLowerCase(), "device-F");
  assert.strictEqual(r.applied, true);
  assert.strictEqual((await coins.acceptInvite("F", first.code, "device-F")).applied, false);
  let f = await wallet("F");
  assert.strictEqual(f.bonus, cfg.WELCOME_BONUS + cfg.INVITE_FRIEND_BONUS);
  let inv = await coins.getInvites("A");
  assert.strictEqual(inv.friends.length, 1);
  assert.strictEqual(inv.friends[0].days, 0);
  assert.ok(!JSON.stringify(inv).includes("\"F\""), "friend id must not be shown");
  console.log("ok friend gets bonus once, inviter sees an anonymous entry");

  // F's Ritzz: days show up, reward on day 3 only
  const before = (await wallet("A") || {}).bonus || 0;
  for (let d = 1; d <= cfg.INVITE_REWARD_STREAK; d++) {
    if (d > 1) day();
    await coins.recordDailyPost("F", long);
    inv = await coins.getInvites("A");
    assert.strictEqual(inv.friends[0].days, d);
    if (d < cfg.INVITE_REWARD_STREAK) assert.strictEqual(inv.friends[0].rewarded, 0);
  }
  let a = await wallet("A");
  assert.strictEqual(a.bonus, before + cfg.INVITE_REWARD);
  assert.strictEqual(inv.friends[0].rewarded, cfg.INVITE_REWARD);
  assert.strictEqual(inv.earned, cfg.INVITE_REWARD);
  assert.strictEqual(inv.rewardsUsed, 1);
  assert.strictEqual((await coins.getWallet("A")).inviteReward, cfg.INVITE_REWARD);
  await coins.clearInviteReward("A");
  assert.strictEqual((await coins.getWallet("A")).inviteReward, 0);
  console.log("ok inviter rewarded once the friend keeps a", cfg.INVITE_REWARD_STREAK, "day Ritzz");

  // Later posts don't pay again
  day(); await coins.recordDailyPost("F", long);
  assert.strictEqual((await wallet("A")).bonus, before + cfg.INVITE_REWARD);
  console.log("ok reward paid only once");

  // Monthly limit: the next friend is marked capped and pays nothing
  // (the month the reward will land in, so the test works near a month's end too)
  const month = coins.dayKey(Date.now() + (cfg.INVITE_REWARD_STREAK - 1) * cfg.DAY).slice(0, 7);
  await db.ref("coins/A/inviteRewards").set({month, count: cfg.INVITE_MONTHLY_LIMIT});
  assert.strictEqual((await coins.acceptInvite("G", first.code, "device-G")).applied, true);
  for (let d = 1; d <= cfg.INVITE_REWARD_STREAK; d++) {
    if (d > 1) day();
    await coins.recordDailyPost("G", long);
  }
  a = await wallet("A");
  inv = await coins.getInvites("A");
  const g = inv.friends.find((x) => x.capped);
  assert.ok(g, "capped friend listed");
  assert.strictEqual(g.rewarded, 0);
  assert.strictEqual(a.bonus, before + cfg.INVITE_REWARD);
  console.log("ok monthly limit respected");

  console.log("ALL PASSED");
  process.exit(0);
})().catch((e) => {
  console.log("FAILED", e);
  process.exit(1);
});
