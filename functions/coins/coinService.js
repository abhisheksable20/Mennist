// =====================================================================
// Sakesnake Coins: all wallet, streak, shop and transfer logic.
//
// Data layout (Realtime Database, only Cloud Functions can write it):
//   coins/{uid}                 the wallet (balances, streak, pending transfers)
//   coinLedger/{uid}/{entryId}  history of every coin movement
//   coinTransfers/{transferId}  one record per transfer (server-side record)
//   pendingTransfers/{id}       expiresAt of transfers that are still pending
//
// Every balance change runs inside a Realtime Database transaction on
// coins/{uid}, so two requests at the same moment can't spend the same coins.
// =====================================================================

const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const {getFunctions} = require("firebase-admin/functions");
const cfg = require("../config/coins");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.database();

let notificationQueue = null;
const getNotificationQueue = () => {
  if (!notificationQueue) {
    notificationQueue = getFunctions().taskQueue("processNotification");
  }
  return notificationQueue;
};

class CoinError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------

// "YYYY-MM-DD" in the configured timezone
const dayKey = (ts) => new Date(ts + cfg.TIMEZONE_OFFSET_MINUTES * 60 * 1000).toISOString().slice(0, 10);

// Whole days from day string a to day string b
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / cfg.DAY);

const verifyChatId = (chatId) => {
  try {
    const id = jwt.verify(chatId, process.env.JWT_SECRET_KEY);
    return typeof id === "string" && id ? id : null;
  } catch (e) {
    return null;
  }
};

const signChatId = (uid) => jwt.sign(uid, process.env.JWT_SECRET_KEY);

const newWallet = (now) => ({
  bonus: cfg.WELCOME_BONUS,
  earned: 0,
  createdAt: now,
  streak: {current: 0, longest: 0, lastDay: ""},
});

// Fill in missing fields (Realtime Database drops empty objects)
const normalize = (w) => {
  const wallet = w || {};
  wallet.bonus = wallet.bonus || 0;
  wallet.earned = wallet.earned || 0;
  wallet.streak = wallet.streak || {current: 0, longest: 0, lastDay: ""};
  wallet.streak.current = wallet.streak.current || 0;
  wallet.streak.longest = wallet.streak.longest || 0;
  wallet.streak.lastDay = wallet.streak.lastDay || "";
  wallet.inventory = wallet.inventory || {};
  wallet.unlocks = wallet.unlocks || {};
  wallet.outgoing = wallet.outgoing || {};
  wallet.incoming = wallet.incoming || {};
  wallet.pairs = wallet.pairs || {};
  wallet.blocked = wallet.blocked || {};
  wallet.settings = wallet.settings || {};
  wallet.daily = wallet.daily || {};
  return wallet;
};

// Reset the daily counters when the day has changed
const freshDaily = (wallet, today) => {
  if (wallet.daily.day !== today) {
    wallet.daily = {day: today, sent: 0, received: 0};
  }
  wallet.daily.sent = wallet.daily.sent || 0;
  wallet.daily.received = wallet.daily.received || 0;
  return wallet.daily;
};

const milestoneReward = (streak) => {
  if (cfg.STREAK_MILESTONES[streak]) {
    return cfg.STREAK_MILESTONES[streak];
  }
  const every = cfg.REPEATING_MILESTONE_EVERY;
  if (streak > every && streak % every === 0) {
    return cfg.REPEATING_MILESTONE_REWARD;
  }
  return 0;
};

const nextMilestone = (streak) => {
  const fixed = Object.keys(cfg.STREAK_MILESTONES).map(Number).sort((a, b) => a - b);
  for (const day of fixed) {
    if (day > streak) {
      return {day, reward: cfg.STREAK_MILESTONES[day]};
    }
  }
  const every = cfg.REPEATING_MILESTONE_EVERY;
  return {day: (Math.floor(streak / every) + 1) * every, reward: cfg.REPEATING_MILESTONE_REWARD};
};

const cutRateFor = (previousTransfers) => {
  const rates = cfg.TRANSFER_CUT_RATES;
  return rates[Math.min(previousTransfers, rates.length - 1)];
};

const calcCut = (amount, previousTransfers) => {
  const rate = cutRateFor(previousTransfers);
  const cut = Math.max(cfg.TRANSFER_MIN_CUT, Math.round(amount * rate));
  return {rate, cut, receives: amount - cut};
};

// Count transfers to `toUid` still inside the cut window, removing old ones
const recentPairCount = (wallet, toUid, now) => {
  const entries = wallet.pairs[toUid] || {};
  let count = 0;
  Object.keys(entries).forEach((id) => {
    if (now - entries[id] > cfg.TRANSFER_PAIR_WINDOW_MS) {
      delete entries[id];
    } else {
      count++;
    }
  });
  if (Object.keys(entries).length === 0) {
    delete wallet.pairs[toUid];
  } else {
    wallet.pairs[toUid] = entries;
  }
  return count;
};

/*
  Run a transaction on coins/{uid}.
  fn(current) returns {value, out} to commit, or {error} to stop.
  On error we return the current value unchanged instead of aborting: Realtime
  Database may first call the function with stale/empty data, and only a
  commit attempt makes it retry with the real server value.
*/
const walletTx = async (uid, fn) => {
  let error = null;
  let out = null;
  const ref = db.ref(`coins/${uid}`);

  const result = await ref.transaction((current) => {
    error = null;
    out = null;
    const r = fn(current);
    if (r.error) {
      error = r.error;
      return current;
    }
    out = r.out;
    return r.value;
  });

  if (error) {
    throw error;
  }
  if (!result.committed) {
    throw new CoinError(409, "CONFLICT", "Please try again.");
  }
  return out;
};

const addLedger = async (uid, entries) => {
  const now = Date.now();
  const updates = {};
  entries.forEach((e) => {
    const key = db.ref(`coinLedger/${uid}`).push().key;
    updates[`coinLedger/${uid}/${key}`] = {timestamp: now, ...e};
  });
  try {
    await db.ref().update(updates);
  } catch (ledgerErr) {
    // History is informational; never fail the coin operation because of it
    console.error("Coin ledger write failed:", ledgerErr);
  }
};

const notify = async (data) => {
  try {
    await getNotificationQueue().enqueue(data);
  } catch (notifyErr) {
    console.error("Coin notification failed:", notifyErr);
  }
};

// ---------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------

// Create the wallet (with the welcome bonus) if the user doesn't have one yet.
const ensureWallet = async (uid) => {
  const now = Date.now();
  const out = await walletTx(uid, (current) => {
    if (current) {
      return {value: current, out: {created: false}};
    }
    return {value: newWallet(now), out: {created: true}};
  });

  if (out.created) {
    await addLedger(uid, [{type: "welcome", amount: cfg.WELCOME_BONUS, balance: "bonus"}]);
  }
  return out;
};

const streakView = (wallet, now) => {
  const today = dayKey(now);
  const s = wallet.streak;
  const freezes = wallet.inventory.streak_freeze || 0;
  let current = s.current;

  if (s.lastDay) {
    const gap = daysBetween(s.lastDay, today);
    // Missed more days than the freezes can cover: the streak is already lost
    if (gap > 1 && gap - 1 > freezes) {
      current = 0;
    }
  }

  const postedToday = s.lastDay === today;
  return {
    current,
    longest: s.longest,
    lastDay: s.lastDay || null,
    postedToday,
    freezes,
    next: nextMilestone(current),
  };
};

const getWallet = async (uid) => {
  await ensureWallet(uid);
  const snap = await db.ref(`coins/${uid}`).get();
  const w = normalize(snap.val());
  const now = Date.now();
  const daily = freshDaily(w, dayKey(now));

  const incoming = Object.keys(w.incoming)
      .map((id) => ({id, ...w.incoming[id]}))
      .filter((t) => t.status === "pending" && t.expiresAt > now)
      .map((t) => ({
        id: t.id, fromChatId: t.fromChatId, amount: t.amount, cut: t.cut,
        receives: t.receives, createdAt: t.createdAt, expiresAt: t.expiresAt,
      }));

  const outgoing = Object.keys(w.outgoing).map((id) => {
    const t = w.outgoing[id];
    return {
      id, toChatId: t.toChatId, amount: t.amount, cut: t.cut,
      receives: t.receives, createdAt: t.createdAt, expiresAt: t.expiresAt,
    };
  });

  return {
    balance: w.bonus + w.earned,
    bonus: w.bonus,
    earned: w.earned,
    streak: streakView(w, now),
    inventory: w.inventory,
    unlocks: Object.keys(w.unlocks),
    mythicEdition: w.mythicEdition || null,
    transfers: {
      canSend: w.streak.longest >= cfg.TRANSFER_MIN_LONGEST_STREAK,
      sentToday: daily.sent,
      sendLimit: cfg.TRANSFER_DAILY_SEND_LIMIT,
      receivedToday: daily.received,
      receiveLimit: cfg.TRANSFER_DAILY_RECEIVE_LIMIT,
      allowTransfers: w.settings.allowTransfers !== false,
      incoming,
      outgoing,
    },
  };
};

const getHistory = async (uid, endAt, limit = 20) => {
  let query = db.ref(`coinLedger/${uid}`).orderByChild("timestamp");
  if (endAt) {
    query = query.endAt(endAt - 1);
  }
  const snap = await query.limitToLast(limit).get();
  const items = [];
  snap.forEach((child) => {
    items.push({id: child.key, ...child.val()});
  });
  return items.reverse();
};

// ---------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------

/*
  Call after a post is saved. Updates the streak and gives the daily reward
  plus any milestone bonus. Only the first qualifying post of a day counts.
*/
const recordDailyPost = async (uid, content) => {
  const length = (content || "").trim().length;
  if (length < cfg.STREAK_MIN_CONTENT_LENGTH) {
    return {counted: false, reason: `Posts need at least ${cfg.STREAK_MIN_CONTENT_LENGTH} characters to count for your streak.`};
  }

  const now = Date.now();
  const today = dayKey(now);

  const out = await walletTx(uid, (current) => {
    const created = !current;
    const w = normalize(current || newWallet(now));
    const s = w.streak;

    if (s.lastDay === today) {
      return {value: current, out: {counted: false, alreadyCounted: true, streak: s.current}};
    }

    let freezesUsed = 0;
    const gap = s.lastDay ? daysBetween(s.lastDay, today) : null;
    const freezes = w.inventory.streak_freeze || 0;

    if (gap === 1) {
      s.current += 1;
    } else if (gap !== null && gap > 1 && gap - 1 <= freezes) {
      freezesUsed = gap - 1;
      w.inventory.streak_freeze = freezes - freezesUsed;
      s.current += 1;
    } else {
      s.current = 1;
    }

    s.longest = Math.max(s.longest, s.current);
    s.lastDay = today;

    const milestone = milestoneReward(s.current);
    const reward = cfg.DAILY_POST_REWARD + milestone;
    w.earned += reward;

    return {
      value: w,
      out: {counted: true, created, streak: s.current, longest: s.longest, dailyReward: cfg.DAILY_POST_REWARD, milestone, freezesUsed},
    };
  });

  if (out.counted) {
    const entries = [];
    if (out.created) {
      entries.push({type: "welcome", amount: cfg.WELCOME_BONUS, balance: "bonus"});
    }
    entries.push({type: "daily_post", amount: out.dailyReward, balance: "earned", streak: out.streak});
    if (out.milestone) {
      entries.push({type: "streak_milestone", amount: out.milestone, balance: "earned", streak: out.streak});
    }
    if (out.freezesUsed) {
      entries.push({type: "streak_freeze_used", amount: 0, count: out.freezesUsed});
    }
    await addLedger(uid, entries);
  }

  delete out.created;
  return out;
};

// ---------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------

const VIBE_ITEMS = Object.keys(cfg.SHOP_ITEMS).filter((id) => cfg.SHOP_ITEMS[id].category === "vibe");

// Price of the "unlock all remaining vibes" pack for this many missing vibes
const vibePackPrice = (missing) => {
  if (missing < 2) {
    return null;
  }
  return Math.min(cfg.VIBE_PACK_MAX, (missing - 1) * cfg.SHOP_ITEMS[VIBE_ITEMS[0]].price);
};

const getUnlocks = async (uid) => {
  const snap = await db.ref(`coins/${uid}/unlocks`).get();
  return snap.val() || {};
};

// The whole catalogue, marked with what this user owns
const getShop = async (uid) => {
  const snap = await db.ref(`coins/${uid}`).get();
  const w = normalize(snap.val());

  const items = Object.keys(cfg.SHOP_ITEMS).map((id) => {
    const item = cfg.SHOP_ITEMS[id];
    const out = {id, ...item};
    if (item.category === "boost") {
      out.owned = w.inventory[id] || 0;
    } else {
      out.owned = w.unlocks[id] === true;
    }
    return out;
  });

  const missing = VIBE_ITEMS.filter((id) => !w.unlocks[id]).length;
  let mythicSold = 0;
  try {
    mythicSold = (await db.ref("coinStats/mythicSold").get()).val() || 0;
  } catch (statErr) {
    console.error("Mythic stat read failed:", statErr);
  }

  return {
    items,
    vibePack: {id: cfg.VIBE_PACK_ID, price: vibePackPrice(missing), missing},
    mythic: {sold: mythicSold, limit: cfg.SHOP_ITEMS.avatar_set_mythic.limit, edition: w.mythicEdition || null},
    longestStreak: w.streak.longest,
  };
};

const ownsUnlock = async (uid, itemId) => {
  const snap = await db.ref(`coins/${uid}/unlocks/${itemId}`).get();
  return snap.val() === true;
};

// Reserve one of the limited Mythic editions. Returns the edition number.
const reserveEdition = async (limit) => {
  let edition = null;
  const result = await db.ref("coinStats/mythicSold").transaction((current) => {
    const sold = current || 0;
    if (sold >= limit) {
      edition = null;
      return sold;
    }
    edition = sold + 1;
    return sold + 1;
  });
  return result.committed ? edition : null;
};

const releaseEdition = async () => {
  await db.ref("coinStats/mythicSold").transaction((current) => Math.max(0, (current || 0) - 1));
};

const spend = async (uid, itemId) => {
  const isPack = itemId === cfg.VIBE_PACK_ID;
  const item = isPack ? {category: "vibe_pack", name: "All vibes"} : cfg.SHOP_ITEMS[itemId];
  if (!item) {
    throw new CoinError(404, "UNKNOWN_ITEM", "This item does not exist.");
  }

  await ensureWallet(uid);

  // Limited items: hold an edition before taking coins, give it back on failure
  let edition = null;
  if (item.limit) {
    const pre = normalize((await db.ref(`coins/${uid}`).get()).val());
    if (pre.unlocks[itemId]) {
      throw new CoinError(409, "ALREADY_OWNED", "You already own this item.");
    }
    if (item.requiresStreak && pre.streak.longest < item.requiresStreak) {
      throw new CoinError(403, "STREAK_REQUIRED", `Reach a ${item.requiresStreak}-day streak to unlock this.`);
    }
    if (pre.bonus + pre.earned < item.price) {
      throw new CoinError(402, "INSUFFICIENT_COINS", `You need ${item.price - pre.bonus - pre.earned} more coins.`);
    }
    edition = await reserveEdition(item.limit);
    if (!edition) {
      throw new CoinError(410, "SOLD_OUT", "All editions of this item are gone.");
    }
  }

  let out;
  try {
    out = await walletTx(uid, (current) => {
      const w = normalize(current);
      let price = item.price;
      let unlockIds = [itemId];

      if (isPack) {
        unlockIds = VIBE_ITEMS.filter((id) => !w.unlocks[id]);
        price = vibePackPrice(unlockIds.length);
        if (price === null) {
          return {error: new CoinError(409, "PACK_NOT_AVAILABLE", "Unlock the last vibe on its own.")};
        }
      } else if (item.category !== "boost" && w.unlocks[itemId]) {
        return {error: new CoinError(409, "ALREADY_OWNED", "You already own this item.")};
      }

      if (item.max && (w.inventory[itemId] || 0) >= item.max) {
        return {error: new CoinError(409, "MAX_REACHED", `You can hold at most ${item.max}.`)};
      }
      if (item.requiresStreak && w.streak.longest < item.requiresStreak) {
        return {error: new CoinError(403, "STREAK_REQUIRED", `Reach a ${item.requiresStreak}-day streak to unlock this.`)};
      }

      const total = w.bonus + w.earned;
      if (total < price) {
        return {error: new CoinError(402, "INSUFFICIENT_COINS", `You need ${price - total} more coins.`)};
      }

      // Spend bonus coins first, then earned coins
      const fromBonus = Math.min(w.bonus, price);
      w.bonus -= fromBonus;
      w.earned -= price - fromBonus;

      if (item.category === "boost") {
        w.inventory[itemId] = (w.inventory[itemId] || 0) + 1;
      } else {
        unlockIds.forEach((id) => {
          w.unlocks[id] = true;
        });
      }
      if (edition) {
        w.mythicEdition = edition;
      }

      return {value: w, out: {balance: w.bonus + w.earned, price, fromBonus, fromEarned: price - fromBonus, unlocked: unlockIds}};
    });
  } catch (spendErr) {
    if (edition) {
      await releaseEdition();
    }
    throw spendErr;
  }

  await addLedger(uid, [{type: "spend", amount: -out.price, item: itemId, fromBonus: out.fromBonus, fromEarned: out.fromEarned}]);
  return {item: itemId, price: out.price, balance: out.balance, unlocked: item.category === "boost" ? [] : out.unlocked, edition};
};

// ---------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------

const checkReceiver = async (fromUid, toChatId) => {
  const toUid = verifyChatId(toChatId);
  if (!toUid) {
    throw new CoinError(404, "USER_NOT_FOUND", "User not found.");
  }
  if (toUid === fromUid) {
    throw new CoinError(400, "SELF_TRANSFER", "You can't send coins to yourself.");
  }

  const [userSnap, blockedSnap, allowSnap] = await Promise.all([
    db.ref(`users/${toUid}/userDetail/createdAt`).get(),
    db.ref(`coins/${toUid}/blocked/${fromUid}`).get(),
    db.ref(`coins/${toUid}/settings/allowTransfers`).get(),
  ]);

  if (!userSnap.exists()) {
    throw new CoinError(404, "USER_NOT_FOUND", "User not found.");
  }
  if (blockedSnap.val() === true || allowSnap.val() === false) {
    throw new CoinError(403, "TRANSFERS_DISABLED", "This user is not accepting coins.");
  }
  return toUid;
};

const checkSenderAge = async (fromUid, now) => {
  const snap = await db.ref(`users/${fromUid}/userDetail/createdAt`).get();
  const createdAt = snap.val() || now;
  if (now - createdAt < cfg.TRANSFER_MIN_ACCOUNT_AGE_MS) {
    const days = Math.ceil(cfg.TRANSFER_MIN_ACCOUNT_AGE_MS / cfg.DAY);
    throw new CoinError(403, "ACCOUNT_TOO_NEW", `Your account must be at least ${days} days old to send coins.`);
  }
};

// Show what the receiver would get, without sending anything
const previewTransfer = async (fromUid, toChatId, amount) => {
  const toUid = await checkReceiver(fromUid, toChatId);
  const snap = await db.ref(`coins/${fromUid}`).get();
  const w = normalize(snap.val());
  const n = recentPairCount(w, toUid, Date.now());
  const {rate, cut, receives} = calcCut(amount, n);
  return {amount, cut, receives, cutPercent: Math.round(rate * 100), transferNumber: n + 1, available: w.earned};
};

const createTransfer = async (fromUid, toChatId, amount) => {
  const now = Date.now();
  const today = dayKey(now);

  if (!Number.isInteger(amount) || amount < cfg.TRANSFER_MIN_AMOUNT) {
    throw new CoinError(400, "INVALID_AMOUNT", `You can send at least ${cfg.TRANSFER_MIN_AMOUNT} coins.`);
  }

  const toUid = await checkReceiver(fromUid, toChatId);
  await checkSenderAge(fromUid, now);
  await ensureWallet(fromUid);
  await ensureWallet(toUid);

  const transferId = db.ref("coinTransfers").push().key;
  const expiresAt = now + cfg.TRANSFER_EXPIRY_MS;

  // 1. Take the coins from the sender and hold them
  const out = await walletTx(fromUid, (current) => {
    const w = normalize(current);

    if (w.streak.longest < cfg.TRANSFER_MIN_LONGEST_STREAK) {
      return {error: new CoinError(403, "STREAK_REQUIRED", `Complete a ${cfg.TRANSFER_MIN_LONGEST_STREAK}-day streak to unlock transfers.`)};
    }
    if (Object.keys(w.outgoing).length >= cfg.TRANSFER_MAX_PENDING) {
      return {error: new CoinError(429, "TOO_MANY_PENDING", `You can have at most ${cfg.TRANSFER_MAX_PENDING} pending transfers.`)};
    }

    const daily = freshDaily(w, today);
    if (daily.sent + amount > cfg.TRANSFER_DAILY_SEND_LIMIT) {
      const left = Math.max(0, cfg.TRANSFER_DAILY_SEND_LIMIT - daily.sent);
      return {error: new CoinError(429, "DAILY_SEND_LIMIT", `You can send ${left} more coins today.`)};
    }
    if (w.earned < amount) {
      return {error: new CoinError(402, "INSUFFICIENT_COINS", `You have ${w.earned} transferable coins. Welcome bonus coins can't be sent.`)};
    }

    const previous = recentPairCount(w, toUid, now);
    const {rate, cut, receives} = calcCut(amount, previous);

    w.earned -= amount;
    daily.sent += amount;
    w.outgoing[transferId] = {to: toUid, toChatId, amount, cut, receives, createdAt: now, expiresAt};
    w.pairs[toUid] = w.pairs[toUid] || {};
    w.pairs[toUid][transferId] = now;

    return {value: w, out: {cut, receives, cutPercent: Math.round(rate * 100), transferNumber: previous + 1}};
  });

  const fromChatId = signChatId(fromUid);
  const record = {from: fromUid, to: toUid, amount, cut: out.cut, receives: out.receives, status: "pending", createdAt: now, expiresAt};

  // 2. Put it in the receiver's inbox
  try {
    await db.ref().update({
      [`coins/${toUid}/incoming/${transferId}`]: {
        from: fromUid, fromChatId, amount, cut: out.cut, receives: out.receives,
        status: "pending", createdAt: now, expiresAt,
      },
      [`coinTransfers/${transferId}`]: record,
      [`pendingTransfers/${transferId}`]: expiresAt,
    });
  } catch (inboxErr) {
    console.error("Transfer inbox write failed, refunding:", inboxErr);
    await settleSender(fromUid, transferId, "failed");
    throw new CoinError(500, "TRANSFER_FAILED", "Transfer failed. Your coins were returned.");
  }

  await addLedger(fromUid, [{type: "transfer_out", amount: -amount, balance: "earned", transferId, toChatId, status: "pending"}]);

  await notify({
    eventId: `coinTransfer_${transferId}`,
    userId: toUid,
    actorId: fromUid,
    type: "coinTransfer",
    chatId: fromChatId,
    amount: out.receives,
    transferId,
  });

  return {transferId, amount, cut: out.cut, receives: out.receives, cutPercent: out.cutPercent, transferNumber: out.transferNumber, expiresAt};
};

/*
  Close the sender's side of a transfer. Removes the held transfer and, unless
  it was accepted, gives the full amount back. Safe to call more than once.
*/
const settleSender = async (fromUid, transferId, status) => {
  const out = await walletTx(fromUid, (current) => {
    if (!current) {
      // Sender's account was deleted; nothing to settle
      return {value: null, out: {settled: false}};
    }
    const w = normalize(current);
    const held = w.outgoing[transferId];
    if (!held) {
      return {value: current, out: {settled: false}};
    }

    delete w.outgoing[transferId];
    let refund = 0;
    if (status !== "accepted") {
      refund = held.amount;
      w.earned += refund;
      // A transfer that never went through doesn't raise the next cut
      if (w.pairs[held.to]) {
        delete w.pairs[held.to][transferId];
      }
    }
    return {value: w, out: {settled: true, refund}};
  });

  if (out.refund) {
    await addLedger(fromUid, [{type: "transfer_refund", amount: out.refund, balance: "earned", transferId, reason: status}]);
  }
  return out;
};

// Last step: remove from inbox / pending list and record the outcome
const finalizeTransfer = async (toUid, transferId, status) => {
  await db.ref(`coinTransfers/${transferId}`).transaction((current) => {
    if (current && current.status === "pending") {
      current.status = status;
      current.settledAt = Date.now();
    }
    return current;
  });

  await db.ref().update({
    [`coins/${toUid}/incoming/${transferId}`]: null,
    [`pendingTransfers/${transferId}`]: null,
  });
};

/*
  Close the receiver's side with the given outcome (accept / decline / block /
  expire / cancel). Returns the resulting status.
*/
const closeIncoming = async (toUid, transferId, action, now) => {
  return walletTx(toUid, (current) => {
    if (!current) {
      // Receiver's account was deleted
      return {value: null, out: {status: "expired", missing: true}};
    }
    const w = normalize(current);
    const t = w.incoming[transferId];

    if (!t) {
      return {value: current, out: {status: "expired", missing: true}};
    }
    if (t.status !== "pending") {
      // Already decided earlier; finish settling with that outcome
      return {value: current, out: {status: t.status, from: t.from, receives: t.receives}};
    }

    if (now > t.expiresAt && action === "accept") {
      t.status = "expired";
      return {value: w, out: {status: "expired", from: t.from, receives: t.receives}};
    }

    if (action === "accept") {
      const daily = freshDaily(w, dayKey(now));
      if (daily.received + t.receives > cfg.TRANSFER_DAILY_RECEIVE_LIMIT) {
        return {error: new CoinError(429, "DAILY_RECEIVE_LIMIT", "You've reached today's receive limit. Try again tomorrow.")};
      }
      daily.received += t.receives;
      w.earned += t.receives;
      t.status = "accepted";
    } else if (action === "decline" || action === "block") {
      t.status = "declined";
      if (action === "block") {
        w.blocked[t.from] = true;
      }
    } else if (action === "cancel") {
      t.status = "cancelled";
    } else {
      t.status = "expired";
    }

    return {value: w, out: {status: t.status, from: t.from, receives: t.receives, newlyClosed: true}};
  });
};

// Receiver accepts / declines / blocks
const respondToTransfer = async (uid, transferId, action) => {
  const now = Date.now();
  const recSnap = await db.ref(`coinTransfers/${transferId}`).get();
  const record = recSnap.val();
  if (!record || record.to !== uid) {
    throw new CoinError(404, "TRANSFER_NOT_FOUND", "Transfer not found.");
  }

  const out = await closeIncoming(uid, transferId, action, now);
  if (out.missing) {
    throw new CoinError(404, "TRANSFER_NOT_FOUND", "Transfer not found.");
  }

  await settleSender(record.from, transferId, out.status);
  await finalizeTransfer(uid, transferId, out.status);

  if (out.newlyClosed && out.status === "accepted") {
    await addLedger(uid, [{type: "transfer_in", amount: out.receives, balance: "earned", transferId, fromChatId: signChatId(record.from)}]);
  }

  if (out.status === "expired") {
    throw new CoinError(410, "TRANSFER_EXPIRED", "This transfer has expired.");
  }
  return {transferId, status: out.status, received: out.status === "accepted" ? out.receives : 0};
};

// Sender cancels a pending transfer
const cancelTransfer = async (uid, transferId) => {
  const recSnap = await db.ref(`coinTransfers/${transferId}`).get();
  const record = recSnap.val();
  if (!record || record.from !== uid) {
    throw new CoinError(404, "TRANSFER_NOT_FOUND", "Transfer not found.");
  }

  const out = await closeIncoming(record.to, transferId, "cancel", Date.now());
  // If the receiver was deleted, the transfer is simply refunded
  const status = out.missing ? "cancelled" : out.status;
  await settleSender(uid, transferId, status);
  await finalizeTransfer(record.to, transferId, status);

  if (status === "accepted") {
    throw new CoinError(409, "ALREADY_ACCEPTED", "This transfer was already accepted.");
  }
  return {transferId, status, refunded: status !== "accepted" ? record.amount : 0};
};

// Called by the scheduler: expire old pending transfers and refund senders
const expireTransfers = async (batchSize = 100) => {
  const now = Date.now();
  const snap = await db.ref("pendingTransfers").orderByValue().endAt(now).limitToFirst(batchSize).get();
  const ids = [];
  snap.forEach((child) => {
    ids.push(child.key);
  });

  let done = 0;
  for (const transferId of ids) {
    try {
      const record = (await db.ref(`coinTransfers/${transferId}`).get()).val();
      if (!record) {
        await db.ref(`pendingTransfers/${transferId}`).remove();
        continue;
      }
      const out = await closeIncoming(record.to, transferId, "expire", now);
      await settleSender(record.from, transferId, out.status);
      await finalizeTransfer(record.to, transferId, out.status);
      if (out.newlyClosed && out.status === "accepted") {
        await addLedger(record.to, [{type: "transfer_in", amount: out.receives, balance: "earned", transferId}]);
      }
      done++;
    } catch (expireErr) {
      console.error(`Failed to expire transfer ${transferId}:`, expireErr);
    }
  }
  return done;
};

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------

const setAllowTransfers = async (uid, allow) => {
  await ensureWallet(uid);
  await db.ref(`coins/${uid}/settings/allowTransfers`).set(allow);
  return {allowTransfers: allow};
};

const unblockSender = async (uid, chatId) => {
  const otherUid = verifyChatId(chatId);
  if (!otherUid) {
    throw new CoinError(404, "USER_NOT_FOUND", "User not found.");
  }
  await db.ref(`coins/${uid}/blocked/${otherUid}`).remove();
  return {unblocked: true};
};

// ---------------------------------------------------------------------
// Streak reminders: users who posted yesterday but not yet today
// ---------------------------------------------------------------------

const sendStreakReminders = async () => {
  const now = Date.now();
  const today = dayKey(now);
  const yesterday = dayKey(now - cfg.DAY);

  const snap = await db.ref("coins").orderByChild("streak/lastDay").equalTo(yesterday).get();
  const jobs = [];
  snap.forEach((child) => {
    const streak = (child.val().streak || {}).current || 0;
    if (streak >= 2) {
      jobs.push(notify({
        eventId: `streakReminder_${today}`,
        userId: child.key,
        type: "streakReminder",
        streak,
      }));
    }
  });
  await Promise.all(jobs);
  return jobs.length;
};

module.exports = {
  CoinError,
  dayKey,
  calcCut,
  milestoneReward,
  ensureWallet,
  getWallet,
  getHistory,
  recordDailyPost,
  getShop,
  getUnlocks,
  ownsUnlock,
  spend,
  previewTransfer,
  createTransfer,
  respondToTransfer,
  cancelTransfer,
  expireTransfers,
  setAllowTransfers,
  unblockSender,
  sendStreakReminders,
};
