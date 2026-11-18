const express = require("express");
const {validate} = require("express-validation");
const {isLoggedIn} = require("../middleware/authenticUser");
const {globalLimiter, coinLimiter} = require("../middleware/rateLimiter");
const {transferValidation, spendValidation, settingsValidation, unblockValidation} = require("../validators/coinValidator");
const coins = require("../coins/coinService");

const router = express.Router();

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

// Wrap a handler: send CoinErrors to the client, hide everything else
const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    return res.status(200).json({success: true, ...data});
  } catch (err) {
    if (err instanceof coins.CoinError) {
      return res.status(err.status).json({success: false, code: err.code, message: err.message});
    }
    console.error("Coin route error:", err);
    return res.status(500).json({success: false, message: "Internal server error"});
  }
};

const transferId = (req) => {
  const id = req.params.transferId;
  if (!SAFE_ID.test(id || "")) {
    throw new coins.CoinError(400, "INVALID_TRANSFER", "Invalid transfer.");
  }
  return id;
};

// Balance, streak, pending transfers
router.get("/wallet", isLoggedIn, globalLimiter, handle(async (req) => {
  return {wallet: await coins.getWallet(req.user.uid)};
}));

// Coin history (newest first). Pass ?endAt=<timestamp of last item> for the next page.
router.get("/history", isLoggedIn, globalLimiter, handle(async (req) => {
  const endAt = req.query.endAt ? Number(req.query.endAt) : null;
  return {history: await coins.getHistory(req.user.uid, Number.isFinite(endAt) ? endAt : null)};
}));

// Items that can be bought
router.get("/shop", isLoggedIn, globalLimiter, handle(async () => {
  return {items: coins.getShop()};
}));

// Buy an item
router.post("/spend", isLoggedIn, coinLimiter, validate(spendValidation), handle(async (req) => {
  return coins.spend(req.user.uid, req.body.itemId);
}));

// Show the cut before sending
router.post("/transfer/preview", isLoggedIn, globalLimiter, validate(transferValidation), handle(async (req) => {
  return {preview: await coins.previewTransfer(req.user.uid, req.body.chatId, req.body.amount)};
}));

// Send coins (they are held until the receiver accepts)
router.post("/transfer", isLoggedIn, coinLimiter, validate(transferValidation), handle(async (req) => {
  return {transfer: await coins.createTransfer(req.user.uid, req.body.chatId, req.body.amount)};
}));

// Receiver: accept / decline / block sender
["accept", "decline", "block"].forEach((action) => {
  router.post(`/transfer/:transferId/${action}`, isLoggedIn, coinLimiter, handle(async (req) => {
    return {transfer: await coins.respondToTransfer(req.user.uid, transferId(req), action)};
  }));
});

// Sender: cancel a pending transfer
router.post("/transfer/:transferId/cancel", isLoggedIn, coinLimiter, handle(async (req) => {
  return {transfer: await coins.cancelTransfer(req.user.uid, transferId(req))};
}));

// Allow or refuse coin transfers from everyone
router.post("/settings", isLoggedIn, globalLimiter, validate(settingsValidation), handle(async (req) => {
  return coins.setAllowTransfers(req.user.uid, req.body.allowTransfers);
}));

// Unblock a sender that was blocked from a transfer
router.post("/unblock", isLoggedIn, globalLimiter, validate(unblockValidation), handle(async (req) => {
  return coins.unblockSender(req.user.uid, req.body.chatId);
}));

module.exports = router;
