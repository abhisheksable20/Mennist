const {Joi} = require("express-validation");

const postValidation = {
  body: Joi.object({
    title: Joi.string().min(3).max(70).required(),
    content: Joi.string().min(3).max(2000).required(),
  }),
};

const echoValidation = {
  body: Joi.object({
    echo: Joi.string().min(3).max(2000).required(),
  }),
};

// Database keys only: letters, digits, - and _ (no "/" to reach other paths)
const POST_ID = Joi.string().pattern(/^[A-Za-z0-9_-]{1,64}$/).required();

const reportValidation = {
  body: Joi.object({
    postId: POST_ID,
    postOwnerChatId: Joi.string().required(),
    reason: Joi.string().min(3).max(500).required(),
  }),
};

const vibeCheckValidation = {
  body: Joi.object({
    postId: POST_ID,
    chatId: Joi.string().required(),
    postVibe: Joi.string().valid("funny", "relatable", "emotional", "wholesome", "sad", "toxic", "racist").required(),
  }),
};

module.exports = {postValidation, echoValidation, reportValidation, vibeCheckValidation};
