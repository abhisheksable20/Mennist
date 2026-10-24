const rateLimit = require("express-rate-limit");
const {ipKeyGenerator} = require("express-rate-limit"); // needs express-rate-limit v8+
const {RedisStore} = require("rate-limit-redis");
const {createClient} = require("redis");

// ===============================================================
// STEP 1: Connect to Redis (one connection, shared by all limiters)
// ===============================================================
// REDIS_URL comes from your .env file, for example:
//   REDIS_URL=rediss://default:YOUR_PASSWORD@your-db.upstash.io:6379
// (Upstash gives you this URL on the database page. "rediss" with two s = secure.)

let redisClient = null;

if (process.env.REDIS_URL) {
  redisClient = createClient({url: process.env.REDIS_URL});

  // Without this handler, a Redis error can crash the whole function
  redisClient.on("error", (err) => {
    console.error("Redis error:", err.message);
  });

  // Start connecting. Commands sent before it finishes are queued automatically.
  redisClient.connect().catch((err) => {
    console.error("Redis failed to connect:", err.message);
  });
} else {
  console.warn("REDIS_URL not set: rate limiter is using in-memory counters (fine for local development only).");
}

// ===============================================================
// STEP 2: Build the "store" for a limiter
// ===============================================================
// The store is where the counters live. Redis = shared by every instance.
// Each limiter gets its own prefix, so the "post" counter never mixes with the "chat" counter.
const createStore = (name) => {
  if (!redisClient) {
    return undefined; // undefined = use the default in-memory store
  }

  return new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: `rl:${name}:`,
  });
};

// ===============================================================
// STEP 3: Shared handler (what the client gets when the limit is hit)
// ===============================================================
// The argument order must be (req, res)
const limitHandler = (req, res) => {
  return res.status(429).json({
    success: false,
    message: "Too many requests, please try again after some time.",
  });
};

// ===============================================================
// STEP 4: Key generators (whose counter is this request added to?)
// ===============================================================

// By IP address: use BEFORE isLoggedIn
const byIp = (req) => ipKeyGenerator(req.ip);

// By logged-in user id: use AFTER isLoggedIn. Falls back to IP if req.user is missing.
const byUser = (req) => (req.user && req.user.uid) ? req.user.uid : ipKeyGenerator(req.ip);

// ===============================================================
// STEP 5: Helper that builds a limiter
//   name     : unique name, used as the Redis prefix (every limiter needs a different one)
//   max      : requests allowed in the window
//   windowMs : window length in milliseconds (default 1 minute)
//   perUser  : true  -> counted per user (route must run isLoggedIn first)
//              false -> counted per IP
// ===============================================================
const createLimiter = ({name, max, windowMs = 60 * 1000, perUser = false}) => {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: perUser ? byUser : byIp,
    handler: limitHandler,
    store: createStore(name),
    // If Redis is down, let requests through instead of blocking every user.
    passOnStoreError: true,
  });
};

// ===============================================================
// LAYER 1: BY IP, runs before isLoggedIn
// ===============================================================

// Whole app, added once in index.js: app.use(ipLimiter)
const ipLimiter = createLimiter({name: "ip", max: 200});

// Account creation: 10 new accounts per IP per hour
const signupLimiter = createLimiter({name: "signup", max: 10, windowMs: 60 * 60 * 1000});

// ===============================================================
// LAYER 2: BY USER, runs after isLoggedIn
// ===============================================================

// Normal reads and small writes
const globalLimiter = createLimiter({name: "global", max: 100, perUser: true});

// Creating content: post, echo, rematch (3 per minute)
const postLimiter = createLimiter({name: "post", max: 3, perUser: true});

// Daily cap on routes that call Gemini (30 per 24 hours)
const dailyAiLimiter = createLimiter({name: "dailyai", max: 30, perUser: true, windowMs: 24 * 60 * 60 * 1000});

// Cheap actions: vibe match, vibe check
const vibeLimiter = createLimiter({name: "vibe", max: 30, perUser: true});

// Chat: sending text messages
const chatSendLimiter = createLimiter({name: "chatsend", max: 30, perUser: true});

// Chat: sending files (stricter)
const attachmentLimiter = createLimiter({name: "attachment", max: 5, perUser: true});

// Chat: reading chats, public key, deleting chats
const chatReadLimiter = createLimiter({name: "chatread", max: 100, perUser: true});

// Post tracking (viewed / saved / shared / chat)
const postTrackLimiter = createLimiter({name: "posttrack", max: 60, perUser: true});

// Reporting posts
const reportLimiter = createLimiter({name: "report", max: 5, perUser: true});

// Very sensitive actions, like delete-account (3 per hour)
const sensitiveLimiter = createLimiter({name: "sensitive", max: 3, perUser: true, windowMs: 60 * 60 * 1000});

module.exports = {
  ipLimiter,
  signupLimiter,
  globalLimiter,
  postLimiter,
  dailyAiLimiter,
  vibeLimiter,
  chatSendLimiter,
  attachmentLimiter,
  chatReadLimiter,
  postTrackLimiter,
  reportLimiter,
  sensitiveLimiter,
};
