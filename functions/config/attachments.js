const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB
const ENC_CHUNK = 8 * 1024 * 1024; // must be a multiple of 256 KiB (GCS rule)
const ABYTES = 17; // libsodium secretstream overhead per chunk
const PLAIN_CHUNK = ENC_CHUNK - ABYTES;

const encryptedSize = (size) => size + Math.ceil(size / PLAIN_CHUNK) * ABYTES;

const ALLOWED_TYPES = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "video/mp4": ["mp4"],
  "video/3gpp": ["3gp"],
  "video/quicktime": ["mov"],
  "audio/mpeg": ["mp3"],
  "audio/mp4": ["m4a"],
  "audio/aac": ["aac"],
  "audio/ogg": ["ogg"],
  "audio/opus": ["opus"],
  "audio/wav": ["wav"],
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "text/plain": ["txt"],
  "text/csv": ["csv"],
  "application/zip": ["zip"],
};

// Defense in depth: none of these are in ALLOWED_TYPES anyway.
const BLOCKED_EXT = new Set([
  "exe", "msi", "dll", "scr", "com", "bat", "cmd", "ps1", "vbs", "vbe", "js", "jse", "wsf",
  "jar", "apk", "app", "dmg", "sh", "bin", "lnk", "reg", "hta", "cpl", "docm", "xlsm", "pptm",
]);

module.exports = {MAX_FILE_SIZE, ENC_CHUNK, PLAIN_CHUNK, ABYTES, ALLOWED_TYPES, BLOCKED_EXT, encryptedSize};
