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

// Encrypting the file to send it to the server
export async function encrypteFile(file, receiverPublicKey, senderPrivateKey) {
    const sodium = await initSodium();
    
    const buffer = await file.arrayBuffer();
    const imageByte = new Uint8Array(buffer);
    
    const nounce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

    const imageKey = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);

    const encryptedFile = sodium.crypto_secretbox_easy(
        imageByte,
        nounce,
        imageKey
    );

    const encryptedImageKey = sodium.crypto_box_seal(imageKey, receiverPublicKey);

    return {
        encryptedFile,
        nounce:nounce,
        encryptedImageKey:encryptedImageKey,
        name:file.name,
        type:file.type
    }

}

