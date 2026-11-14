const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fatal = (msg) => Object.assign(new Error(msg), { fatal: true });

// Asks GCS how many bytes of the session it has already persisted
async function committedBytes(url, total) {
    const res = await fetch(url, { method: "PUT", headers: { "Content-Range": `bytes */${total}` } });
    if (res.status === 200 || res.status === 201) return total;
    if (res.status === 308) {
        const range = res.headers.get("Range"); // "bytes=0-N" (inclusive)
        return range ? Number(range.split("-")[1]) + 1 : 0;
    }
    throw new Error(`Upload status check failed (${res.status})`);
}

// Uploads one encrypted chunk. On a network error it asks GCS where it got to and resumes from there.
export async function uploadChunk(url, chunk, offset, total) {
    const chunkEnd = offset + chunk.length;
    let start = offset;
    let lastError = new Error("Upload failed");

    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            if (attempt > 0) {
                await sleep(1000 * 2 ** (attempt - 1));
                start = Math.max(offset, await committedBytes(url, total));
                if (start >= chunkEnd) return; // it actually made it
            }

            const res = await fetch(url, {
                method: "PUT",
                headers: { "Content-Range": `bytes ${start}-${chunkEnd - 1}/${total}` },
                body: chunk.subarray(start - offset),
            });

            // 308 = chunk accepted, more expected. 200/201 = upload complete.
            if (res.ok || (res.status === 308 && chunkEnd < total)) return;

            if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
                throw fatal(`Upload rejected (${res.status})`);
            }
            lastError = new Error(`Upload failed (${res.status})`);
        } catch (err) {
            if (err.fatal) throw err;
            lastError = err;
        }
    }
    throw lastError;
}