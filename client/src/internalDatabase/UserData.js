import { db } from "./db";

export async function deleteUserInternalData(whole = false) {
    try {
        if (whole) {
            await db.keys.clear();
        }

        await db.transaction("rw", db.chatUser, db.chats, db.postActions, db.notifications, async () => {
            await db.chatUser.clear();
            await db.chats.clear();
            await db.postActions.clear();
            await db.notifications.clear();
        });

        localStorage.removeItem("postsVibeCheck");
        localStorage.removeItem("savedPosts");
        localStorage.removeItem("mennist-avatar");
        localStorage.removeItem("vibes");
        localStorage.removeItem("chatEnableStatus");
        localStorage.removeItem("deviceFingerprint");
    }
    catch (error) {
        console.log("Failed to delete the internal database: ", error)
        throw error
    }
}