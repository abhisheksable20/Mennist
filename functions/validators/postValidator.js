const {Joi} = require("express-validation");

const postValidation = {
  body: Joi.object({
    title: Joi.string().min(3).max(70).required(),
    content: Joi.string().min(3).max(2000).required(),
  }),
};

const reportValidation = {
  body: Joi.object({
    postId: Joi.string().max(100).required(),
    reason: Joi.string().min(3).max(500).required(),
  }),
};

module.exports = {postValidation, reportValidation};
