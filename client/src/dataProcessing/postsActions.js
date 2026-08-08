import axios from "axios";
import { db } from '../internalDatabase/db'

// Submit post actions to server and also store in browser
export async function postActions(action, postId) {
    if (!action)
        return false;

    try {
        const postActionsData = await db.postActions.get(postId);
        if (postActionsData) {
            if (postActionsData[action])
                return false;

            await db.postActions.update(postId, {
                [action]: true
            });
        }
        else {
            await db.postActions.put({
                postId: postId,
                [action]: true
            });
        }

        const body = {
            postId: postId,
            action: action
        }

        await axios.post(`${process.env.REACT_APP_API_URL}/actions/postAction`, body, { withCredentials: true });
        return true;
    }
    catch (error) {
        console.log("Post action error: ", error);
        return false
    }
}