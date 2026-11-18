const {Joi} = require("express-validation");
const cfg = require("../config/coins");

const transferValidation = {
  body: Joi.object({
    chatId: Joi.string().max(1000).required(),
    amount: Joi.number().integer().min(cfg.TRANSFER_MIN_AMOUNT).max(cfg.TRANSFER_DAILY_SEND_LIMIT).required(),
  }),
};

const spendValidation = {
  body: Joi.object({
    itemId: Joi.string().pattern(/^[a-z0-9_]{1,40}$/).required(),
  }),
};

const settingsValidation = {
  body: Joi.object({
    allowTransfers: Joi.boolean().required(),
  }),
};

const unblockValidation = {
  body: Joi.object({
    chatId: Joi.string().max(1000).required(),
  }),
};

module.exports = {transferValidation, spendValidation, settingsValidation, unblockValidation};
