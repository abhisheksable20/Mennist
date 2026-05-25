const rateLimit = require("express-rate-limit");

// This global limiter all all the api request 100 requests are allowed in 1 min
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (res, req) => {
    res.status(429).json({
      success: false,
      message: "Too many request,try after some time.",
    });
  },
});

// This limiter is post limiter only 3 posts are allowed in 1 min for an user
const postLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many request,try after some time.",
    });
  },
});

// This is chat limiter only 50 request are allowed per user per minute
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many request,try after some time.",
    });
  },
})

module.exports = { globalLimiter, postLimiter, chatLimiter };
