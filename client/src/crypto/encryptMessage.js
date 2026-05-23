import { initSodium } from "./sodium";

export async function encryptMessage(message, receiverPublicKey, senderPrivateKey) {
    const sodium = await initSodium();

    const nounce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
    const encrypted = sodium.crypto_box_easy(
        message, 
        nounce, 
        sodium.from_base64(receiverPublicKey),
        sodium.from_base64(senderPrivateKey)
    );

    return {
        encryptedMessage: sodium.to_base64(encrypted),
        nounce: sodium.to_base64(nounce)
    }
}

