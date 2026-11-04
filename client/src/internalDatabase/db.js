import Dexie from "dexie";

export const db = new Dexie("MennistEncryptionDB");

db.version(1).stores({
  keys: "id",
  chatUser: "chatId, username, publicKey, lastMsg, timestamp",
  chats: "++id, chatId, plainMsg, timestamp, fromMe"
});

db.version(2).stores({
  keys: "id",
  chatUser: "chatId, username, publicKey, lastMsg, timestamp",
  chats: "++id, &firebaseId, chatId, plainMsg, timestamp, fromMe"
});

db.version(3).stores({
  keys: "id",
  chatUser: "chatId, username, publicKey, lastMsg, type, timestamp",
  chats: "++id, &firebaseId, chatId, plainMsg, timestamp, imageByte, type, fromMe"
});

db.version(4).stores({
  keys: "id",
  chatUser: "chatId, username, publicKey, lastMsg, type, timestamp",
  chats: "++id, &firebaseId, chatId, plainMsg, timestamp, imageBlob, type, fromMe"
});

db.version(5).stores({
  keys: "id",
  chatUser: "chatId, username, publicKey, lastMsg, type, timestamp",
  chats: "++id, &firebaseId, chatId, plainMsg, timestamp, imageBlob, type, fromMe",
  postActions: "&postId, viewed, saved, shared, chat, postWatchTime"
});

db.version(6).stores({
  keys: "id",
  chatUser: "chatId, username, publicKey, lastMsg, type, timestamp",
  chats: "++id, &firebaseId, chatId, plainMsg, timestamp, imageBlob, type, fromMe",
  postActions: "&postId, viewed, saved, shared, chat, postWatchTime",
  notifications: "&eventId, timestamp, type, read"
});

db.version(7).stores({
  keys: "id",
  chatUser: "chatId, username, publicKey, lastMsg, type, timestamp",
  chats: "++id, firebaseId, chatId, plainMsg, timestamp, imageBlob, type, fromMe",
  postActions: "&postId, viewed, saved, shared, chat, postWatchTime",
  notifications: "&eventId, timestamp, type, read"
});