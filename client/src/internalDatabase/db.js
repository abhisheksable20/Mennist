import Dexie from "dexie";

export const db = new Dexie("MennistEncryptionDB");

db.version(1).stores({
  keys: "id"
});
