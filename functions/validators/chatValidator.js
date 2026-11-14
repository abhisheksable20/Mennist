const {Joi} = require("express-validation");
const {ALLOWED_TYPES, MAX_FILE_SIZE} = require("../config/attachments");

// Validating chat before processing and saving it to the database
const chatBlobValidation = {
  body: Joi.object({
    chatId: Joi.string().required(),
    nounce: Joi.string().required(),
    senderPublicKey: Joi.string().required(),
    encryptedMsg: Joi.string().required(),
  }),
};

// Step 1 of an attachment upload: metadata only, no file bytes
const attachmentInitValidation = {
  body: Joi.object({
    chatId: Joi.string().required(),
    senderPublicKey: Joi.string().required(),
    encryptedFileKey: Joi.string().max(512).required(),
    nounce: Joi.string().max(128).required(), // secretstream header
    name: Joi.string().max(255).pattern(/^[^\\/\0]+$/).required(),
    type: Joi.string().valid(...Object.keys(ALLOWED_TYPES)).required(),
    size: Joi.number().integer().min(1).max(MAX_FILE_SIZE).required(),
  }),
};

// Step 3: tell the server the upload finished
const attachmentCompleteValidation = {
  body: Joi.object({
    messageId: Joi.string().pattern(/^[A-Za-z0-9_-]{1,64}$/).required(),
  }),
};

// Validating file attachements before processing and saving it to the database
const fileBlobValidation = {
  body: Joi.object({
    chatId: Joi.string().required(),
    senderPublicKey: Joi.string().required(),
    encryptedFile: Joi.string().required(),
    encryptedFileKey: Joi.string().required(),
    nounce: Joi.string().required(),
    name: Joi.string().required(),
    type: Joi.string().valid("image/jpeg", "image/png", "image/webp", "image/gif").required(),
    size: Joi.number().integer().max(10 * 1024 * 1024).required(),
  }),
};

module.exports = {chatBlobValidation, fileBlobValidation, attachmentInitValidation, attachmentCompleteValidation};


