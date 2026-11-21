import { AVATAR_OPTIONS, DEFAULT_AVATAR, HAIR_COLORS } from "./avatarOptions";
import axios from "axios";
import { db } from "../../internalDatabase/db";

const allowedIds = Object.fromEntries(
  Object.entries(AVATAR_OPTIONS).map(([category, options]) => [
    category,
    new Set(options.map((option) => option.id)),
  ])
);

function normalizeAvatar(value) {
  const input = value && typeof value === "object" ? value : {};
  const result = { ...DEFAULT_AVATAR };

  Object.keys(allowedIds).forEach((category) => {
    if (typeof input[category] === "string" && allowedIds[category].has(input[category])) {
      result[category] = input[category];
    }
  });

  if (HAIR_COLORS.some((item) => item.color === input.hairColor)) {
    result.hairColor = input.hairColor;
  }
  result.version = 1;
  return result;
}

// Avatars seen recently, so opening the same chat or post again doesn't re-fetch.
// Holds the promise, so two components asking at once share one request.
const AVATAR_CACHE_MS = 5 * 60 * 1000;
const avatarCache = new Map(); // chatId -> { at, promise }

// Load avatar function is used to load avatar for all the user
export async function loadAvatar(chatId) {
  if (typeof chatId !== "string" || !chatId.trim()) {
    throw new Error("A valid chat ID is required.");
  }

  const hit = avatarCache.get(chatId);
  if (hit && Date.now() - hit.at < AVATAR_CACHE_MS) {
    return { ...(await hit.promise) };
  }

  const promise = axios
    .get(`${process.env.REACT_APP_API_URL}/user/avatar/${chatId}`)
    .then((response) => response.data.avatar || { ...DEFAULT_AVATAR });
  if (avatarCache.size > 200) avatarCache.clear();
  avatarCache.set(chatId, { at: Date.now(), promise });

  try {
    return { ...(await promise) };
  }
  catch (loadAvatarErr) {
    avatarCache.delete(chatId); // don't remember failures
    throw loadAvatarErr;
  }
}

// After saving your own avatar, everything that shows it gets the new one
const rememberOwnAvatar = async (avatar) => {
  try {
    const chatId = (await db.keys.get("user-keypair"))?.chatId;
    if (chatId) avatarCache.set(chatId, { at: Date.now(), promise: Promise.resolve(avatar) });
  } catch (cacheErr) {
    // Cache only; nothing to do
  }
};

// This function will only save the current active user avatar
export async function saveAvatar(avatar) {
  if (!avatar || typeof avatar !== "object" || Array.isArray(avatar)) {
    throw new Error("Invalid avatar data.");
  }

  try {
    const response = await axios.post(`${process.env.REACT_APP_API_URL}/user/set-avatar`, { avatar });
    localStorage.setItem("mennist-avatar", JSON.stringify(response.data.avatar));
    await rememberOwnAvatar(response.data.avatar);
    return response.data.avatar;
  }
  catch (saveAvatarErr) {
    const message = saveAvatarErr.response?.data?.message || "Couldn't save your avatar. Please try again.";
    throw new Error(message);
  }
}
