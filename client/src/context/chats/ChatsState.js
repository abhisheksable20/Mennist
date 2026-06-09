import ChatsContext from "./chatsContext";
import axios from "axios";
import { db } from "../../internalDatabase/db"
import { generateUsername } from "unique-username-generator";
import { useState } from "react";
import { encryptMessage } from "../../crypto/encryptMessage";

const ChatsState = (props) => {
    const [inputMessage, setInputMessage] = useState({ message: "" });
    const [messages, setMessages] = useState([]);

    const fetchAllChats = async () => {
        
    }

    // Send message to the server
    const sendChat = async (receiverPublicKey, chatId) => {
        try {
            if (!chatId)
                return false;

            const cleanMessage = inputMessage.message.trim();
            if (!cleanMessage || !receiverPublicKey)
                return false;

            const keys = await db.keys.get("user-keypair");
            const senderPrivateKey = keys.privateKey;
            const encryptedData = await encryptInputMessage(receiverPublicKey, senderPrivateKey);

            // This is chat body which will be sent to the server
            const chatBody = {
                chatId,
                encryptedMsg: encryptedData.encryptedMessage,
                senderPublicKey: keys.publicKey,
                nounce: encryptedData.nounce
            }

            await axios.post(`${process.env.REACT_APP_API_URL}/chats/send-chat`, chatBody, { withCredentials: true });

            // Storing chat blob on client side
            const indexDBData = {
                chatId,
                encryptedMsg: encryptedData,
                timestamp:Date.now(),
                fromMe:true
            }

            await db.chats.add(indexDBData);
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
            const bodyData = { chatId };
            const userData = await db.chatUser.get(chatId);
            if (userData)
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
        <ChatsContext.Provider value={{ createNewUser, sendChat }}>
            {props.children}
        </ChatsContext.Provider>
    )
}