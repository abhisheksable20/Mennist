import axios from "axios";

const API = () => `${process.env.REACT_APP_API_URL}/user`;

export const fetchRecoveryStatus = async () => (await axios.get(`${API()}/recovery/status`)).data;
export const createRecoveryKey = async () => (await axios.post(`${API()}/recovery/create`)).data.recoveryCode;
export const confirmRecoveryKey = async () => (await axios.post(`${API()}/recovery/confirm`)).data;
// "replaced" when this browser's key was moved to another device by a recovery
export const fetchKeyStatus = async (publicKey) => (await axios.post(`${API()}/key-status`, { publicKey })).data.status;
export const recoverAccount = async (recoveryCode, publicKey, deviceFingerprint) =>
  (await axios.post(`${API()}/recover`, { recoveryCode, publicKey, deviceFingerprint })).data;

// Same alphabet as the server: no 0, O, 1 or I
const KEY_CHARS = /[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]/g;
export const KEY_LENGTH = 24;

// Whatever the user typed or pasted -> "K7F2-9QXM-4T" (uppercase, dashes every 4)
export const formatKeyInput = (value) => {
  const chars = (String(value).toUpperCase().match(KEY_CHARS) || []).join("").slice(0, KEY_LENGTH);
  return (chars.match(/.{1,4}/g) || []).join("-");
};

export const keyCharCount = (formatted) => formatted.replace(/-/g, "").length;

// Find a recovery key inside any text (a downloaded file, a pasted note)
export const findKeyInText = (text) => {
  const match = String(text).toUpperCase().match(/[A-Z2-9]{4}(?:[-\s]?[A-Z2-9]{4}){5}/);
  if (!match) return null;
  const formatted = formatKeyInput(match[0]);
  return keyCharCount(formatted) === KEY_LENGTH ? formatted : null;
};

// The key's groups, e.g. group(key, 2) -> "9QXM"
export const keyGroup = (key, n) => key.split("-")[n - 1] || "";

export const downloadKeyFile = (key) => {
  const text = [
    "Mennist recovery key",
    "",
    key,
    "",
    "Use it on the Mennist home page: \"I have a recovery key\".",
    "Anyone with this key can open your account. Keep it private.",
    "",
  ].join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mennist-recovery-key.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (copyErr) {
    return false;
  }
};
