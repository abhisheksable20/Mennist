// file-type and zip.js are big, and only needed when a file is sent or opened,
// so they load on first use instead of with the site.
import { ALLOWED_TYPES, BLOCKED_EXT, EXT_TO_TYPE, MAX_FILE_SIZE, getExt } from "../config/attachmentConfig";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const OOXML_EXT = ["docx", "xlsx", "pptx", "zip"];

// What `file-type` reports from the real bytes, per declared type
const MAGIC_OK = {
    "image/jpeg": ["jpg"], "image/png": ["png"], "image/webp": ["webp"], "image/gif": ["gif"],
    "video/mp4": ["mp4", "m4v"], "video/3gpp": ["3gp", "3g2", "mp4"], "video/quicktime": ["mov"],
    "audio/mpeg": ["mp3"], "audio/mp4": ["m4a", "mp4", "m4b"], "audio/aac": ["aac"],
    "audio/ogg": ["ogg", "opus", "oga"], "audio/opus": ["opus", "ogg", "oga"], "audio/wav": ["wav"],
    "application/pdf": ["pdf"],
    "application/msword": ["cfb"], "application/vnd.ms-excel": ["cfb"], "application/vnd.ms-powerpoint": ["cfb"],
    [DOCX]: OOXML_EXT, [XLSX]: OOXML_EXT, [PPTX]: OOXML_EXT,
    "application/zip": ["zip"],
};

const TEXT_TYPES = new Set(["text/plain", "text/csv"]);
const OLE_TYPES = new Set(["application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint"]);
const OOXML_TYPES = new Set([DOCX, XLSX, PPTX]);

// Heuristic tokens (cheap, not bulletproof)
const PDF_TOKENS = ["/JavaScript", "/JS", "/Launch", "/RichMedia"];
const OLE_MACRO_TOKENS = ["V\0B\0A\0_\0P\0R\0O\0J\0E\0C\0T"]; // "VBA_PROJECT" in UTF-16LE

const fail = (reason) => ({ ok: false, reason });

// Scans the whole file in windows for byte tokens (latin1 keeps bytes 1:1 for ASCII/NUL)
async function containsToken(file, tokens) {
    const WINDOW = 8 * 1024 * 1024;
    const overlap = Math.max(...tokens.map((t) => t.length));
    const decoder = new TextDecoder("latin1");

    for (let pos = 0; pos < file.size; pos += WINDOW) {
        const buf = await file.slice(pos, Math.min(pos + WINDOW + overlap, file.size)).arrayBuffer();
        const text = decoder.decode(buf);
        if (tokens.some((t) => text.includes(t))) return true;
    }
    return false;
}

async function inspectZip(file, isOffice) {
    const { ZipReader, BlobReader } = await import("@zip.js/zip.js");
    const reader = new ZipReader(new BlobReader(file));
    try {
        const entries = await reader.getEntries(); // reads only the central directory
        if (entries.length > 10000) return "Archive has too many files.";

        let total = 0;
        for (const e of entries) {
            const name = e.filename.toLowerCase();
            if (e.encrypted) return "Password-protected archives can't be checked.";
            if (name.startsWith("/") || name.split(/[\\/]/).includes("..")) return "Unsafe path in archive.";
            if (BLOCKED_EXT.has(getExt(name))) return "Archive contains a blocked file type.";
            if (name.endsWith("vbaproject.bin")) return "Documents with macros are not allowed.";
            total += e.uncompressedSize;
        }
        if (total > 4 * 1024 ** 3 || total / file.size > 200) return "Suspicious archive (possible zip bomb).";
        if (isOffice && !entries.some((e) => e.filename === "[Content_Types].xml")) return "Not a valid Office document.";
        return null;
    } catch (e) {
        return "Archive is corrupted or unreadable.";
    } finally {
        await reader.close();
    }
}

// Cheap check of the first bytes. Used on the full file AND on the first decrypted chunk of big downloads.
// Returns an error string or null.
export async function checkHeader(blob, type) {
    if (TEXT_TYPES.has(type)) {
        const head = new Uint8Array(await blob.slice(0, 8192).arrayBuffer());
        const sig = String.fromCharCode(...head.slice(0, 4));
        if (head.includes(0) || sig.startsWith("MZ") || sig.startsWith("\x7fELF") || sig.startsWith("#!")) {
            return "File doesn't look like plain text.";
        }
        return null;
    }

    const { fileTypeFromBlob } = await import("file-type");
    const detected = await fileTypeFromBlob(blob);
    if (!detected) return "Could not verify file content.";
    if (!MAGIC_OK[type]?.includes(detected.ext)) return "File content doesn't match its type.";
    return null;
}

// Full check. Returns { ok: true, type } with the canonical MIME type, or { ok: false, reason }.
export async function scanFile(file, { name = file.name } = {}) {
    const ext = getExt(name);

    if (!file.size) return fail("File is empty.");
    if (file.size > MAX_FILE_SIZE) return fail("Files larger than 1 GB are not allowed.");
    if (BLOCKED_EXT.has(ext)) return fail("This file type is blocked for safety.");

    const type = EXT_TO_TYPE[ext];
    if (!type) return fail("This file type is not supported.");

    try {
        const headerError = await checkHeader(file, type);
        if (headerError) return fail(headerError);

        if (type === "application/pdf" && (await containsToken(file, PDF_TOKENS))) {
            return fail("PDFs with scripts or active content are not allowed.");
        }
        if (OLE_TYPES.has(type) && (await containsToken(file, OLE_MACRO_TOKENS))) {
            return fail("Documents with macros are not allowed.");
        }
        if (type === "application/zip" || OOXML_TYPES.has(type)) {
            const zipError = await inspectZip(file, OOXML_TYPES.has(type));
            if (zipError) return fail(zipError);
        }
    } catch (e) {
        return fail("File could not be verified.");
    }

    return { ok: true, type };
}

// Re-check metadata that came from the sender (the untrusted side). Returns an error string or null.
export function validateIncomingMeta(name, type, size) {
    const ext = getExt(name);
    if (!Number.isInteger(size) || size < 1 || size > MAX_FILE_SIZE) return "Invalid file size.";
    if (BLOCKED_EXT.has(ext) || !ALLOWED_TYPES[type]?.includes(ext)) return "Blocked file type.";
    return null;
}