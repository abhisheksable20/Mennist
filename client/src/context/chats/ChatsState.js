import ChatsContext from "./chatsContext";
import axios from "axios";
import { db } from "../../internalDatabase/db"
import { generateUsername } from "unique-username-generator";
import { useState } from "react";
import { encryptMessage } from "../../crypto/encryptMessage";
import { decryptMessage } from "../../crypto/decryptMessage";

const ChatsState = (props) => {
    const [inputMessage, setInputMessage] = useState({ message: "" });
    const [messages, setMessages] = useState([]);
    const [userMessages, setUserMessages] = useState([]);
    const[allMessages, setAllMessages] = useState([]);

    // Fetch all the chats from the server
    const fetchAllChats = async (chatId) => {
        try {
            if(!chatId)
                throw "Cannot process this request";

            const rawData = (await axios.get(`${process.env.REACT_APP_API_URL}/chats/my-chats`, {withCredentials:true})).data;
            if(!rawData)
                return

            const privateKey = (await db.keys.get("user-keypair")).privateKey;
            
            rawData.forEach(async (chat) => {
                const chatId = chat.chatId;
                const decryptedMsg = await decryptMessage(chat.encryptedMsg, chat.nounce, chat.senderPublicKey, privateKey);
                const chatUser = await db.chatUser.get(chatId);
                if(!chatUser){
                    const username = generateUsername();
                    const data = {
                        chatId: chat.chatId,
                        username: username,
                        publicKey: chat.senderPublicKey,
                        lastMsg: decryptedMsg,
                        timestamp: chat.timestamp
                    }

                    await db.chatUser.add(data);
                    return;
                }

                const updatedData = {
                    lastMsg: decryptMessage,
                    timestamp: chat.timestamp
                }

                await db.chatUser.update(chatId, updatedData); 

            });

        } 
        catch (error) {
            throw error
        }
    }

    // Only fetch single user chat from local Index Database Using Dexie
    const userChatIndexDB = async (chatId) => {
        try {
            const chats = await db.chats
                .where("chatId")
                .equals(chatId)
                .sortBy("timestamp");

            if (chats) {
                setUserMessages((prev) => [...prev, ...chats]);
            }
        }
        catch (error) {
            throw "Something went wrong!"
        }

    }

    // Fetch Single user chats from the server database in firebase
    const userChatServer = async (chatId) => {
        if (!chatId)
            return;

        try {
            const rawData = (await axios.get(`${process.env.REACT_APP_API_URL}/chats/user-chat`, { params: { chatId } })).data
            if (rawData.chats) {
                const chatsToDel = [];
                rawData.chats.forEach(async (chat) => {
                    chatsToDel.push(chat.id);
                    decryptedMsg = decryptMessage()
                })
            }

        }
        catch (fetchError) {
            throw "Somthing went wrong!"
        }

    }

    const saveChatsToLocalDB = async () => {
        
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
                plainMsg: inputMessage,
                timestamp: Date.now(),
                fromMe: true
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
                return userData;

            const username = generateUsername();
            const data = (await axios.post(`${process.env.REACT_APP_API_URL}/chats/get-publicKey`, bodyData)).data
            const publicKey = data.publicKey;

            const chatMetaData = {
                chatId,
                username,
                publicKey,
                lastMsg: null
            }

            await db.chatUser.add(chatMetaData);
            return chatMetaData;
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