import { initSodium } from "./sodium";

export const ENC_CHUNK = 8 * 1024 * 1024; // must match the server
export const ABYTES = 17;
export const PLAIN_CHUNK = ENC_CHUNK - ABYTES;
export const encryptedSize = (size) => size + Math.ceil(size / PLAIN_CHUNK) * ABYTES;

/* ---------------- sender ---------------- */

// Random file key -> sealed for the receiver (same crypto_box_seal you already use).
// The stream header is stored in the "nounce" field.
export async function startFileEncryption(receiverPublicKey) {
    const sodium = await initSodium();

    const fileKey = sodium.crypto_secretstream_xchacha20poly1305_keygen();
    const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(fileKey);
    const sealedKey = sodium.crypto_box_seal(fileKey, sodium.from_base64(receiverPublicKey));
    sodium.memzero(fileKey);

    return {
        state,
        nounce: sodium.to_base64(header),
        encryptedFileKey: sodium.to_base64(sealedKey),
    };
}

// Yields encrypted chunks of exactly ENC_CHUNK bytes (the last one is shorter).
// Only one chunk of the file is in memory at a time.
export async function* encryptChunks(file, state) {
    const sodium = await initSodium();
    const total = Math.ceil(file.size / PLAIN_CHUNK);

    for (let i = 0; i < total; i++) {
        const plain = new Uint8Array(
            await file.slice(i * PLAIN_CHUNK, (i + 1) * PLAIN_CHUNK).arrayBuffer()
        );
        const tag = i === total - 1
            ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
            : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;

        yield sodium.crypto_secretstream_xchacha20poly1305_push(state, plain, null, tag);
    }
}

/* ---------------- receiver ---------------- */

export async function startFileDecryption(encryptedFileKey, nounce, receiverPublicKey, receiverPrivateKey) {
    const sodium = await initSodium();

    const fileKey = sodium.crypto_box_seal_open(
        sodium.from_base64(encryptedFileKey),
        sodium.from_base64(receiverPublicKey),
        sodium.from_base64(receiverPrivateKey)
    );
    const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(sodium.from_base64(nounce), fileKey);
    sodium.memzero(fileKey);
    return state;
}

// Downloads and decrypts one chunk at a time using Range requests.
export async function* decryptChunks(downloadUrl, plainSize, state) {
    const sodium = await initSodium();
    const encSize = encryptedSize(plainSize);
    const total = Math.ceil(encSize / ENC_CHUNK);
    const FINAL = sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL;

    for (let i = 0; i < total; i++) {
        const start = i * ENC_CHUNK;
        const end = Math.min(start + ENC_CHUNK, encSize) - 1;

        const res = await fetch(downloadUrl, { headers: { Range: `bytes=${start}-${end}` } });
        if (res.status !== 206 && res.status !== 200) throw new Error("Download failed");

        const box = new Uint8Array(await res.arrayBuffer());

        let result = null;
        try {
            result = sodium.crypto_secretstream_xchacha20poly1305_pull(state, box);
        } catch (e) {
            result = null;
        }
        if (!result) throw new Error("File is corrupted or was tampered with");

        // The FINAL tag must appear on the last chunk and only there (detects truncation)
        if ((i === total - 1) !== (result.tag === FINAL)) throw new Error("File is truncated or malformed");

        yield result.message;
    }
}