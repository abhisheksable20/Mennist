export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB
export const BIG_FILE = 25 * 1024 * 1024; // above this we never keep the file in IndexedDB / never preview

export const ALLOWED_TYPES = {
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

export const BLOCKED_EXT = new Set([
  "exe", "msi", "dll", "scr", "com", "bat", "cmd", "ps1", "vbs", "vbe", "js", "jse", "wsf",
  "jar", "apk", "app", "dmg", "sh", "bin", "lnk", "reg", "hta", "cpl", "docm", "xlsm", "pptm",
]);

// The browser's file.type is unreliable (Windows reports .csv as ms-excel, .zip as x-zip-compressed...),
// so we derive the canonical type from the extension and then verify it against the real bytes.
export const EXT_TO_TYPE = Object.fromEntries(
  Object.entries(ALLOWED_TYPES).flatMap(([type, exts]) => exts.map((ext) => [ext, type]))
);

export const ACCEPT_ATTR = Object.keys(EXT_TO_TYPE).map((e) => `.${e}`).join(",");

export const getExt = (name = "") => (name.includes(".") ? name.split(".").pop().toLowerCase() : "");
export const isImageType = (type) => !!type && type.startsWith("image/");
export const isAttachmentType = (type) => !!type && type !== "plain/text";

// Only images up to BIG_FILE are ever previewed. Everything else is a direct download.
export const isPreviewable = (type, size) => isImageType(type) && Number(size) <= BIG_FILE;