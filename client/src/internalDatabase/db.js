import Dexie from "dexie";

export const db = new Dexie("MennistEncryptionDB");

db.version(1).stores({
  keys: "id"
});

db.version(2).stores({
  keys: "id",
  chatUser: "++chatId, username, publicKey",
  chats: "++id, chatId, encryptedMsg, timestamp, status"
});
