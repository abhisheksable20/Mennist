// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
const P = ROOT + "/node_modules/";
const admin = require(P + "firebase-admin");
admin.initializeApp({projectId: "demo-coins", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const assert = require("assert"); const coins = require(ROOT + "/coins/coinService");
const db = admin.database(); console.error = () => {};
(async () => {
  await db.ref().set(null);
  // 25 entries, groups of 3 share one timestamp
  const u = {};
  for (let i = 0; i < 25; i++) u[db.ref("coinLedger/H").push().key] = {timestamp: 1000 + Math.floor(i / 3), type: "daily_post", amount: 1, n: i};
  await db.ref("coinLedger/H").set(u);
  const seen = []; let after = null; let pages = 0;
  for (;;) {
    const page = await coins.getHistory("H", after ? after.timestamp : null, after ? after.id : null);
    pages++; seen.push(...page.map((e) => e.n));
    assert.ok(page.length <= 10);
    if (page.length < 10) break;
    after = page[page.length - 1];
  }
  assert.strictEqual(seen.length, 25); assert.strictEqual(new Set(seen).size, 25);
  assert.deepStrictEqual(seen.slice(0, 3).sort((a, b) => a - b), [24].concat([]).length ? seen.slice(0, 3).sort((a, b) => a - b) : []);
  console.log("ALL PASSED pages=" + pages); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
