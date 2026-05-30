import ChatsContext from "./chatsContext";
import axios from "axios";
import { db } from "../../internalDatabase/db"
import { generateUsername } from "unique-username-generator";

const ChatsState = (props) => {

    const fetchAllChats = async () => {

    }

    // Generate new username for start conversation
    const createNewUser = async (chatId) => {
        if (!chatId) 
            return false;

        try {
            const bodyData = {chatId};
            const userData = await db.chatUser.get(chatId);
            if(userData)
                return true;

            const username = generateUsername();
            const data = (await axios.post(`${process.env.REACT_APP_API_URL}/chats/get-publicKey`, bodyData)).data
            const publicKey = data.publicKey;

            const chatMetaData = {
                chatId,
                username,
                publicKey
            }

            await db.chatUser.add(chatMetaData);
            return true;
        }
        catch (error) {
            throw error
        }
    }

    return (
        <ChatsContext.Provider value={{createNewUser}}>
            {props.children}
        </ChatsContext.Provider>
    )
}