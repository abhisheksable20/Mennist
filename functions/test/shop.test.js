// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
const path = ROOT + "/node_modules/";
const admin = require(path + "firebase-admin");
admin.initializeApp({projectId: "demo-coins", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const assert = require("assert");
const coins = require(ROOT + "/coins/coinService");
const {validateAvatar, avatarTier} = require(ROOT + "/validators/avatarValidator");
const db = admin.database();
console.error = () => {};
const expectErr = async (p, code) => { try { await p; } catch (e) { assert.strictEqual(e.code, code, e.message); return; } throw new Error("expected " + code); };
(async () => {
  await db.ref().set(null);
  await coins.ensureWallet("U");
  // 50 bonus: buy 3 vibes = 45
  for (const v of ["funny", "relatable", "emotional"]) await coins.spend("U", "vibe_" + v);
  await expectErr(coins.spend("U", "vibe_funny"), "ALREADY_OWNED");
  let shop = await coins.getShop("U");
  assert.strictEqual(shop.vibePack.missing, 4); assert.strictEqual(shop.vibePack.price, 45);
  await expectErr(coins.spend("U", "vibe_pack"), "INSUFFICIENT_COINS");
  await db.ref("coins/U/earned").set(1000);
  let r = await coins.spend("U", "vibe_pack"); assert.strictEqual(r.price, 45); assert.strictEqual(r.unlocked.length, 4);
  assert.ok(await coins.ownsUnlock("U", "vibe_racist"));
  shop = await coins.getShop("U"); assert.strictEqual(shop.vibePack.price, null);
  console.log("ok vibes + pack");
  // mythic needs 30-day streak
  await expectErr(coins.spend("U", "avatar_set_mythic"), "STREAK_REQUIRED");
  await db.ref("coins/U/streak/longest").set(30);
  await db.ref("coinStats/mythicSold").set(99);
  r = await coins.spend("U", "avatar_set_mythic"); assert.strictEqual(r.edition, 100);
  await coins.ensureWallet("V"); await db.ref("coins/V").update({earned: 1000, streak: {longest: 31, current: 1, lastDay: ""}});
  await expectErr(coins.spend("V", "avatar_set_mythic"), "SOLD_OUT");
  console.log("ok mythic edition + sold out");
  // freeze max
  await coins.spend("U", "streak_freeze"); await coins.spend("U", "streak_freeze");
  await expectErr(coins.spend("U", "streak_freeze"), "MAX_REACHED");
  // avatar validation
  let v = validateAvatar({skin: "skin-02", eyes: "eyes-galaxy", aura: "fire", set: "", tier: "x"});
  assert.ok(v.valid); assert.deepStrictEqual(v.premiumItems.sort(), ["avatar_aura_fire", "avatar_eyes_galaxy"]);
  assert.strictEqual(avatarTier(v.premiumItems), "epic");
  assert.ok(!validateAvatar({aura: "lava"}).valid);
  assert.ok(!validateAvatar({eyes: "eyes-99"}).valid);
  console.log("ALL PASSED"); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
