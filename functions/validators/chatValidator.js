const {Joi} = require("express-validation");

const chatBlobValidation = {
  body: Joi.object({
    chatId: Joi.string().required(),
    nounce: Joi.string().required(),
    senderPublicKey: Joi.string().required(),
    encryptedMsg: Joi.string().required(),
  }),
};


module.exports = {chatBlobValidation};


