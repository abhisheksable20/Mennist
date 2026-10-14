import { AVATAR_OPTIONS, DEFAULT_AVATAR, HAIR_COLORS } from "./avatarOptions";
import axios from "axios";

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

// Load avatar function is used to load avatar for all the user
export async function loadAvatar(chatId) {
  if (typeof chatId !== "string" || !chatId.trim()) {
    throw new Error("A valid chat ID is required.");
  }

  try {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/user/avatar/${chatId}`);
    return response.data.avatar || { ...DEFAULT_AVATAR };
  }
  catch (loadAvatarErr) {
    const message = loadAvatarErr.response?.data?.message || "Couldn't load your avatar. Please try again.";
    throw new Error(message);
  }
}

// This function will only save the current active user avatar
export async function saveAvatar(avatar) {
  if (!avatar || typeof avatar !== "object" || Array.isArray(avatar)) {
    throw new Error("Invalid avatar data.");
  }

  try {
    const response = await axios.post(`${process.env.REACT_APP_API_URL}/user/set-avatar`, { avatar });
    localStorage.setItem("mennist-avatar", JSON.stringify(response.data.avatar));
    return response.data.avatar;
  }
  catch (saveAvatarErr) {
    const message = saveAvatarErr.response?.data?.message || "Couldn't save your avatar. Please try again.";
    throw new Error(message);
  }
}
