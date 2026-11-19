import axios from "axios";

// All Sakesnake Coins requests. Every function returns the response body.
const API = () => `${process.env.REACT_APP_API_URL}/coins`;

export const fetchWallet = async (signal) => (await axios.get(`${API()}/wallet`, { signal })).data.wallet;
export const fetchShop = async (signal) => (await axios.get(`${API()}/shop`, { signal })).data;
export const fetchHistory = async (endAt) =>
  (await axios.get(`${API()}/history`, { params: endAt ? { endAt } : {} })).data.history;

export const buyItem = async (itemId) => (await axios.post(`${API()}/spend`, { itemId })).data;

export const previewTransfer = async (chatId, amount) =>
  (await axios.post(`${API()}/transfer/preview`, { chatId, amount })).data.preview;
export const sendTransfer = async (chatId, amount) =>
  (await axios.post(`${API()}/transfer`, { chatId, amount })).data.transfer;
export const answerTransfer = async (transferId, action) =>
  (await axios.post(`${API()}/transfer/${transferId}/${action}`)).data.transfer;

export const setAllowTransfers = async (allowTransfers) =>
  (await axios.post(`${API()}/settings`, { allowTransfers })).data;

// A readable message from a failed coin request
export const coinError = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err && err.response && err.response.data;
  if (data && data.message) return data.message;
  if (err && err.response && err.response.status === 429) return "Too many requests. Wait a moment and try again.";
  return fallback;
};

export const TIER_LABELS = { rare: "Rare", epic: "Epic", legendary: "Legendary", mythic: "Mythic" };

export const fetchChatTransfers = async (chatId) =>
  (await axios.get(`${API()}/chat/${encodeURIComponent(chatId)}`)).data.transfers;
