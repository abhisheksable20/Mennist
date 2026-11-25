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

(async () => {
  await db.ref().set(null);
  const today = coins.dayKey(Date.now());
  const yesterday = coins.dayKey(Date.now() - cfg.DAY);
  await db.ref("coins").set({
    oneDay: {streak: {current: 1, longest: 1, lastDay: yesterday}},
    fiveDays: {streak: {current: 5, longest: 5, lastDay: yesterday}},
    postedToday: {streak: {current: 3, longest: 3, lastDay: today}},
  });

  // Both Ritzz that end at midnight get a reminder, a 1-day one too
  assert.strictEqual(await coins.sendStreakReminders(), 2);
  console.log("ok reminders for every Ritzz that ends tonight");

  console.log("ALL PASSED");
  process.exit(0);
})().catch((e) => {
  console.log("FAILED", e);
  process.exit(1);
});
