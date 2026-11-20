import { initSodium } from "./sodium";

// Decrypting plain message
export async function decryptMessage(encryptedMessage, nounce, senderPublicKey, recieverPrivateKey) {
    const sodium = await initSodium();

    const decrypted = sodium.crypto_box_open_easy(
        sodium.from_base64(encryptedMessage),
        sodium.from_base64(nounce),
        sodium.from_base64(senderPublicKey),
        sodium.from_base64(recieverPrivateKey),
    );

    return sodium.to_string(decrypted)
}

// Decrypting file
export async function decryptFile(encryptedFile, encryptedFileKey, nounce, recieverPublicKey, recieverPrivateKey){
    const sodium = await initSodium();

    const fileKey = sodium.crypto_box_seal_open(
        sodium.from_base64(encryptedFileKey),
        sodium.from_base64(recieverPublicKey),
        sodium.from_base64(recieverPrivateKey)
    );

    const imageByte = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(encryptedFile),
        sodium.from_base64(nounce),
        fileKey
    );

    return imageByte;
}
// Shown instead of a message this device can't decrypt (for example one sent
// to the old key before the account was recovered on a new device)
export const UNREADABLE_MESSAGE = "This message can't be opened on this device.";

// Like decryptMessage, but never throws: one bad message must not stop the
// whole chat list from loading
export async function decryptMessageOrPlaceholder(encryptedMessage, nounce, senderPublicKey, recieverPrivateKey) {
    try {
        return await decryptMessage(encryptedMessage, nounce, senderPublicKey, recieverPrivateKey);
    } catch (decryptErr) {
        return UNREADABLE_MESSAGE;
    }
}
