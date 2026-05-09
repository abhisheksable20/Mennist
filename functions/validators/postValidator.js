const {Joi} = require("express-validation");

const postValidation = {
  body: Joi.object({
    title: Joi.string().min(3).max(70).required(),
    content: Joi.string().min(3).max(5000).required(),
  }),
};

module.exports = {postValidation};
