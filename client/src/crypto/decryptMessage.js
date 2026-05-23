import { initSodium } from "./sodium";

export async function decryptMessage(encryptedMessage, nounce, senderPublicKey, recieverPrivateKey) {
    const sodium = await initSodium();

    const decrypted = sodium.crypto_box_easy(
        sodium.from_base64(encryptedMessage),
        sodium.from_base64(nounce),
        sodium.from_base64(senderPublicKey),
        sodium.from_base64(recieverPrivateKey),
    );

    return sodium.to_string(decrypted)
}