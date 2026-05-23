import { initSodium } from "./sodium";

export async function generateKeyPair() {
    const sodium = await initSodium();
    const keyPair = sodium.crypto_box_keypair();

    return {
        privateKey: sodium.to_base64(keyPair.privateKey),
        publicKey: sodium.to_base64(keyPair.publicKey)
    }
}