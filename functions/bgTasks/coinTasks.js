const {onSchedule} = require("firebase-functions/v2/scheduler");
const {expireTransfers, sendStreakReminders, refundStaleRematches} = require("../coins/coinService");
const cfg = require("../config/coins");

// Timezone name matching cfg.TIMEZONE_OFFSET_MINUTES (330 = IST)
const TIME_ZONE = "Asia/Kolkata";

// Every hour: expire transfers nobody answered within 48 hours and refund the senders,
// and refund echo rematches that got stuck
exports.expireCoinTransfers = onSchedule({
  schedule: "every 60 minutes",
  region: "us-central1",
  timeoutSeconds: 300,
}, async () => {
  let total = 0;
  // Work through the backlog in batches
  for (let i = 0; i < 10; i++) {
    const done = await expireTransfers(100);
    total += done;
    if (done < 100) {
      break;
    }
  }
  console.log(`Expired ${total} coin transfers`);

  // Same hourly run: refund echo rematches whose matching never finished
  const refunded = await refundStaleRematches(200);
  if (refunded) {
    console.log(`Refunded ${refunded} stuck echo rematches`);
  }
});

// Every day at 8 PM: remind users whose streak ends at midnight
exports.coinStreakReminders = onSchedule({
  schedule: "0 20 * * *",
  timeZone: TIME_ZONE,
  region: "us-central1",
  timeoutSeconds: 300,
}, async () => {
  const sent = await sendStreakReminders();
  console.log(`Sent ${sent} streak reminders (day offset ${cfg.TIMEZONE_OFFSET_MINUTES} min)`);
});
