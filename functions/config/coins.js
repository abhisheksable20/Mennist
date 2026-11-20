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

  // Coins for setting up account recovery (once per account).
  RECOVERY_REWARD: 15,

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
  // category "boost":  consumable, stored as a count (max = most you can hold)
  // category "vibe":   unlocks one Vibe Check option forever
  // category "avatar": unlocks one premium avatar item forever.
  //                    slot/value say where it goes on the avatar.
  SHOP_ITEMS: {
    streak_freeze: {category: "boost", price: 30, name: "Streak freeze", max: 2,
      description: "Saves your streak if you miss a day."},

    vibe_funny: {category: "vibe", price: 15, name: "Funny", vibe: "funny"},
    vibe_relatable: {category: "vibe", price: 15, name: "Relatable", vibe: "relatable"},
    vibe_emotional: {category: "vibe", price: 15, name: "Emotional", vibe: "emotional"},
    vibe_wholesome: {category: "vibe", price: 15, name: "Wholesome", vibe: "wholesome"},
    vibe_sad: {category: "vibe", price: 15, name: "Sad", vibe: "sad"},
    vibe_toxic: {category: "vibe", price: 15, name: "Toxic", vibe: "toxic"},
    vibe_racist: {category: "vibe", price: 15, name: "Racist", vibe: "racist"},

    // Rare
    avatar_hair_electric: {category: "avatar", tier: "rare", price: 60, name: "Electric Blue Hair", slot: "hairFx", value: "electric_blue"},
    avatar_hair_toxic: {category: "avatar", tier: "rare", price: 60, name: "Toxic Green Hair", slot: "hairFx", value: "toxic_green"},
    avatar_hair_sunset: {category: "avatar", tier: "rare", price: 80, name: "Sunset Fade Hair", slot: "hairFx", value: "sunset_fade"},
    avatar_eyes_blood: {category: "avatar", tier: "rare", price: 80, name: "Blood Moon Eyes", slot: "eyes", value: "eyes-blood"},
    avatar_eyes_galaxy: {category: "avatar", tier: "rare", price: 80, name: "Galaxy Eyes", slot: "eyes", value: "eyes-galaxy"},
    avatar_eyes_snake: {category: "avatar", tier: "rare", price: 90, name: "Snake Eyes", slot: "eyes", value: "eyes-snake"},
    avatar_acc_crown: {category: "avatar", tier: "rare", price: 100, name: "Pixel Crown", slot: "accessories", value: "acc-crown"},
    avatar_acc_halo: {category: "avatar", tier: "rare", price: 100, name: "Floating Halo", slot: "accessories", value: "acc-halo"},
    avatar_acc_horns: {category: "avatar", tier: "rare", price: 90, name: "Devil Horns", slot: "accessories", value: "acc-horns"},
    avatar_acc_visor: {category: "avatar", tier: "rare", price: 100, name: "VR Visor", slot: "accessories", value: "acc-visor"},
    // Epic
    avatar_aura_fire: {category: "avatar", tier: "epic", price: 200, name: "Fire Aura", slot: "aura", value: "fire"},
    avatar_aura_frost: {category: "avatar", tier: "epic", price: 200, name: "Frost Aura", slot: "aura", value: "frost"},
    avatar_aura_shadow: {category: "avatar", tier: "epic", price: 180, name: "Shadow Aura", slot: "aura", value: "shadow"},
    avatar_eyes_blink: {category: "avatar", tier: "epic", price: 150, name: "Blinking Eyes", slot: "eyes", value: "eyes-blink"},
    avatar_eyes_glitch: {category: "avatar", tier: "epic", price: 150, name: "Glitch Eyes", slot: "eyes", value: "eyes-glitch"},
    avatar_bg_night: {category: "avatar", tier: "epic", price: 180, name: "Starry Night", slot: "background", value: "night"},
    avatar_bg_code: {category: "avatar", tier: "epic", price: 220, name: "Code Rain", slot: "background", value: "code"},
    avatar_frame_gold: {category: "avatar", tier: "epic", price: 150, name: "Gold Frame", slot: "frame", value: "gold"},
    avatar_frame_holo: {category: "avatar", tier: "epic", price: 200, name: "Holo Frame", slot: "frame", value: "holo"},
    avatar_frame_snake: {category: "avatar", tier: "epic", price: 200, name: "Snakeskin Frame", slot: "frame", value: "snake"},
    // Legendary (full sets that change the whole look)
    avatar_set_sakesnake: {category: "avatar", tier: "legendary", price: 600, name: "The Sakesnake", slot: "set", value: "sakesnake"},
    avatar_set_ghost: {category: "avatar", tier: "legendary", price: 450, name: "Ghost", slot: "set", value: "ghost"},
    avatar_set_glitch: {category: "avatar", tier: "legendary", price: 500, name: "Glitch", slot: "set", value: "glitch"},
    avatar_set_cosmic: {category: "avatar", tier: "legendary", price: 550, name: "Cosmic", slot: "set", value: "cosmic"},
    // Mythic: generated from the owner's account, one of one
    avatar_set_mythic: {category: "avatar", tier: "mythic", price: 800, name: "Mythic", slot: "set", value: "mythic",
      requiresStreak: 30, limit: 100},
  },

  // Unlock every Vibe Check option you don't have yet.
  // Price = 15 per missing vibe minus one free, capped at VIBE_PACK_MAX.
  VIBE_PACK_ID: "vibe_pack",
  VIBE_PACK_MAX: 60,

  // ---------------- Echo rematch ----------------
  // Free rematches per day (all echoes together), then each one costs coins.
  // A rematch that fails gives the coins (or the free rematch) back.
  ECHO_REMATCH_FREE_PER_DAY: 3,
  ECHO_REMATCH_PRICE: 5,
  // A rematch still "processing" after this long is treated as dead:
  // the button unlocks and its coins are refunded.
  ECHO_REMATCH_STALE_MS: 30 * 60 * 1000,

  // ---------------- New chats ----------------
  // Starting a conversation with someone new: free this many times a day,
  // then it costs coins. Replying and continuing a chat are always free.
  CHAT_START_FREE_PER_DAY: 3,
  CHAT_START_PRICE: 5,
  // A paid start the other person never replies to is refunded after this.
  CHAT_START_REFUND_MS: 48 * HOUR,

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
