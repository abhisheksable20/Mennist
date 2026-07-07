const { Joi } = require("express-validation");

// Validating chat before processing and saving it to the database
const chatBlobValidation = {
  body: Joi.object({
    chatId: Joi.string().required(),
    nounce: Joi.string().required(),
    senderPublicKey: Joi.string().required(),
    encryptedMsg: Joi.string().required(),
  }),
};

// Validating file attachements before processing and saving it to the database
const fileBlobValidation = {
  body: Joi.object({
    chatId: Joi.string().required(),
    senderPublicKey:Joi.string().required(),
    encryptedFile: Joi.string().required(),
    encryptedFileKey: Joi.string().required(),
    name: Joi.string().required(),
    type: Joi.string().valid("image/jpeg","image/png","image/webp","image/gif").required(),
    size: Joi.number().integer().max(10 * 1024 * 1024).required()
  })
}

module.exports = { chatBlobValidation, fileBlobValidation };


