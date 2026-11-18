import { useEffect, useState } from "react";
import { db } from "../../internalDatabase/db";
import { loadAvatar } from "../Avatar/avatarService";
import { DEFAULT_AVATAR } from "../Avatar/avatarOptions";

// The signed-in user's saved avatar, used to preview shop items on yourself
export default function useMyAvatar() {
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const keys = await db.keys.get("user-keypair");
        const saved = keys && keys.chatId ? await loadAvatar(keys.chatId) : { ...DEFAULT_AVATAR };
        if (active) setAvatar(saved);
      } catch (err) {
        if (active) setAvatar({ ...DEFAULT_AVATAR });
      }
    })();
    return () => { active = false; };
  }, []);

  return [avatar, setAvatar];
}
