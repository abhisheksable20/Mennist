import axios from "axios";
import { db } from "../internalDatabase/db";

const API = `${process.env.REACT_APP_API_URL}/chats`;

// Saved on this device too, so a blocked chat opens as blocked without asking the server
const remember = (chatId, blocked) => db.chatUser.update(chatId, { blocked }).catch(() => {});

export const blockUser = async (chatId) => {
  await axios.post(`${API}/block`, { chatId });
  await remember(chatId, true);
};

export const unblockUser = async (chatId) => {
  await axios.delete(`${API}/block`, { data: { chatId } });
  await remember(chatId, false);
};

// [{ chatId, at }], newest first
export const fetchBlockedUsers = async () => (await axios.get(`${API}/blocked`)).data;
