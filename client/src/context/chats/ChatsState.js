import ChatsContext from "./chatsContext";
import axios from "axios";
import { db } from "../../internalDatabase/db"
import { generateUsername } from "unique-username-generator";
import { useState } from "react";
import { encryptMessage } from "../../crypto/encryptMessage";

const ChatsState = (props) => {
    const [inputMessage, setInputMessage] = useState({message: ""})

    const fetchAllChats = async () => {

    }

    // Send message to the server
    const sendChat = async (receiverPublicKey) => {
        try {
            const cleanMessage = inputMessage.message.trim();
            if(!cleanMessage || !receiverPublicKey)
                return false;

            const senderPrivateKey = (await db.keys.get("user-keypair")).privateKey;
            const encryptedData = await encryptInputMessage(receiverPublicKey, senderPrivateKey);

            

        } 
        catch (sendChatErr) {
            throw sendChatErr
        }
    }

    // Encrypt the input message from the user
    const encryptInputMessage = async (receiverPublicKey, senderPrivateKey) => {
        const encrypted = await encryptMessage(inputMessage, receiverPublicKey, senderPrivateKey);
        return encrypted;
    }

    // Generate new username and set user to start conversation
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