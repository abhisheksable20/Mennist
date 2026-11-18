// =====================================================================
// Sakesnake Coins configuration
// Change the numbers here; the rest of the coin code reads from this file.
// =====================================================================

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

module.exports = {
  // Every "day" (streaks, daily limits) is counted in this timezone.
  // 330 = UTC+5:30 (IST). Days reset at midnight in this timezone.
  TIMEZONE_OFFSET_MINUTES: 330,

  // Coins given once when a wallet is created. These are "bonus" coins:
  // they can be spent but never transferred.
  WELCOME_BONUS: 50,

  // ---------------- Streaks ----------------
  // A post only counts for the streak if its content has at least this many characters.
  STREAK_MIN_CONTENT_LENGTH: 20,

  // Coins for the first qualifying post of each day.
  DAILY_POST_REWARD: 2,

  // Bonus coins when the streak reaches exactly this many days.
  STREAK_MILESTONES: {
    3: 5,
    7: 20,
    15: 50,
    30: 120,
  },
  // After 30 days, every further multiple of 30 days (60, 90, ...) gives this bonus.
  REPEATING_MILESTONE_EVERY: 30,
  REPEATING_MILESTONE_REWARD: 120,

  // Most streak freezes a user can hold at once.
  MAX_STREAK_FREEZES: 2,

  // ---------------- Shop ----------------
  // type "consumable": can be bought many times (stored as a count).
  // type "unlock":     bought once, unlocked forever.
  // Add exclusive avatars / vibe packs here once you decide which ones are premium.
  SHOP_ITEMS: {
    streak_freeze: {type: "consumable", price: 30, name: "Streak freeze"},
    // Examples (uncomment / edit when the frontend is ready):
    // vibe_pack_premium: {type: "unlock", price: 30, name: "Premium vibe pack"},
    // avatar_crown: {type: "unlock", price: 80, name: "Crown accessory"},
  },

  // ---------------- Transfers ----------------
  TRANSFER_MIN_AMOUNT: 5,
  TRANSFER_DAILY_SEND_LIMIT: 100,
  TRANSFER_DAILY_RECEIVE_LIMIT: 200,
  TRANSFER_MAX_PENDING: 5,
  TRANSFER_EXPIRY_MS: 48 * HOUR,

  // Who may send: account at least this old, and has reached this streak at least once.
  TRANSFER_MIN_ACCOUNT_AGE_MS: 7 * DAY,
  TRANSFER_MIN_LONGEST_STREAK: 7,

  // Cut grows with each transfer from the same sender to the same receiver
  // inside this window. Index 0 = 1st transfer, 1 = 2nd, ... last value repeats.
  TRANSFER_PAIR_WINDOW_MS: 7 * DAY,
  TRANSFER_CUT_RATES: [0.05, 0.10, 0.20, 0.30],
  TRANSFER_MIN_CUT: 1,

  HOUR,
  DAY,
};
