import Dexie from "dexie";

export const db = new Dexie("MennistEncryptionDB");

db.version(1).stores({
  keys: "id",
  chatUser: "++chatId, username, publicKey, lastMsg, timestamp",
  chats: "++id, chatId, plainMsg, timestamp, fromMe"
});