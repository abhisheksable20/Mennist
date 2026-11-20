import { initSodium } from "./sodium";

export async function generateKeyPair() {
    const sodium = await initSodium();
    const keyPair = sodium.crypto_box_keypair();

    return {
        privateKey: sodium.to_base64(keyPair.privateKey),
        publicKey: sodium.to_base64(keyPair.publicKey)
    }
}
/*
  Prove this browser holds the private key of an existing account.
  The server sent a one-time public key; X25519(our private key, its key)
  gives a secret only the real owner can compute. We send its SHA-256 hash.
*/
export async function answerLoginChallenge(privateKey, challenge) {
    const sodium = await initSodium();
    const shared = sodium.crypto_scalarmult(
        sodium.from_base64(privateKey),
        sodium.from_base64(challenge.serverKey)
    );
    const idBytes = sodium.from_string(challenge.id);
    const data = new Uint8Array(shared.length + idBytes.length);
    data.set(shared);
    data.set(idBytes, shared.length);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
    return sodium.to_base64(digest);
}
