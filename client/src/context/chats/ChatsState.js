import ChatsContext from "./chatsContext";
import axios from "axios";
import { db } from "../../internalDatabase/db"
import { generateUsername } from "unique-username-generator";
import { useState, useRef } from "react";
import { encryptMessage } from "../../crypto/encryptMessage";
import { decryptMessage } from "../../crypto/decryptMessage";

const ChatsState = (props) => {
    const [inputMessage, setInputMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [userMessages, setUserMessages] = useState([]);
    const [allMessages, setAllMessages] = useState([]);

    const chatIdRef = useRef(null);

    // Fetch all the chats from the server
    const fetchAllChats = async () => {
        try {
            await allChatsFromLocalStorage();

            const rawData = (await axios.get(`${process.env.REACT_APP_API_URL}/chats/my-chats`, { withCredentials: true })).data;
            if (!rawData)
                return;

            console.log("Raw Data: ", rawData)
            const privateKey = (await db.keys.get("user-keypair")).privateKey;

            await Promise.all(
                rawData.map(async (chat) => {
                    const decryptedMsg = await decryptMessage(chat.encryptedMsg, chat.nounce, chat.senderPublicKey, privateKey);
                    const DBData = {
                        chatId: chat.chatId,
                        plainMsg: decryptedMsg,
                        senderPublicKey: chat.senderPublicKey,
                        timestamp: chat.timestamp
                    }

                    await saveAndUpdateDBV2(DBData);
                })
            )

            allChatsFromLocalStorage();
        }
        catch (error) {
            throw error
        }
    }

    // Fetch all the chats from local storage IndexDatabase to show all the chats in ChatsPage.js
    const allChatsFromLocalStorage = async () => {
        try {
            const data = await db.chatUser
                .orderBy("timestamp")
                .toArray();

            if (data)
                setAllMessages(data);
        }
        catch (error) {
            throw error
        }
    }

    // Update the index database to show it all messages in allChats pages
    const saveAndUpdateDBV2 = async (chat) => {
        try {
            const chatId = chat.chatId;
            const plainMsg = chat.plainMsg
            const chatUser = await db.chatUser.get(chatId);

            if (!chatUser) {
                const username = generateUsername();
                const data = {
                    chatId,
                    username,
                    publicKey: chat.senderPublicKey,
                    lastMsg: plainMsg,
                    timestamp: chat.timestamp
                }

                await db.chatUser.add(data);
                return;
            }

            if (chatUser.timestamp < chat.timestamp) {
                const updatedData = {
                    lastMsg: plainMsg,
                    timestamp: chat.timestamp
                }

                await db.chatUser.update(chatId, updatedData);
            }

        }
        catch (error) {
            throw error
        }

    }


    // Update the index database to show it all messages in allChats pages
    // Function is deprecated will be deleted later
    const saveAndUpdateDB = async (chat) => {
        try {
            const chatId = chat.chatId;
            const privateKey = (await db.keys.get("user-keypair")).privateKey;
            const decryptedMsg = await decryptMessage(chat.encryptedMsg, chat.nounce, chat.senderPublicKey, privateKey);
            const chatUser = await db.chatUser.get(chatId);

            if (!chatUser) {
                const username = generateUsername();
                const data = {
                    chatId,
                    username: username,
                    publicKey: chat.senderPublicKey,
                    lastMsg: decryptedMsg,
                    timestamp: chat.timestamp
                }

                await db.chatUser.add(data);
                return;
            }

            if (chatUser.timestamp < chat.timestamp) {
                const updatedData = {
                    lastMsg: decryptedMsg,
                    timestamp: chat.timestamp
                }

                await db.chatUser.update(chatId, updatedData);
            }

        }
        catch (error) {
            throw error;
        }
    }

    // Fetch Single user chats from the server database in firebase
    const userChatServer = async () => {
        if (!chatIdRef.current)
            return;

        const chatId = chatIdRef.current;

        try {
            await userChatIndexDB(chatId);

            const rawData = (await axios.get(`${process.env.REACT_APP_API_URL}/chats/user-chat`, { params: { chatId } })).data;
            if(!rawData.messages)
                return;

            const delChatsKeys = [];
            const newChats = [];

            const privateKey = (await db.keys.get("user-keypair")).privateKey;

            /*
                Structure from server
                {
                    chatId: "",
                    senderPublicKey: "",
                    messages: [{
                                encryptedMsg,
                                timestamp,
                                nounce
                              }]
                } 
            **/
            console.log(rawData);
            rawData.messages.forEach(async (chat) => {
                const decryptedMsg = await decryptMessage(chat.encryptedMsg, chat.nounce, chat.senderPublicKey, privateKey)
                const data = {
                    chatId: rawData.chatId,
                    plainMsg: decryptedMsg,
                    timestamp: chat.timestamp,
                    fromMe: false
                }

                newChats.push(data);
                delChatsKeys.push(chat.id);
            });

            await db.chats.bulkAdd(newChats);
            const delData = {
                chatId: rawData.chatId,
                messagesKeys: delChatsKeys
            }

            axios.delete(`${process.env.REACT_APP_API_URL}/chats/user-chat`, delData);
            userChatIndexDB(chatId);
        }
        catch (fetchError) {
            throw fetchError
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
                setUserMessages(chats);
            }
        }
        catch (error) {
            throw "Something went wrong!"
        }

    }

    // Send message to the server
    const sendChat = async (receiverPublicKey) => {
        try {
            if (!chatIdRef.current)
                return false;

            const cleanMessage = inputMessage.trim();
            if (!cleanMessage || !receiverPublicKey)
                return false;

            const keys = await db.keys.get("user-keypair");
            const senderPrivateKey = keys.privateKey;
            const encryptedData = await encryptInputMessage(receiverPublicKey, senderPrivateKey);

            // This is chat body which will be sent to the server
            const chatBody = {
                chatId: chatIdRef.current,
                encryptedMsg: encryptedData.encryptedMessage,
                senderPublicKey: keys.publicKey,
                nounce: encryptedData.nounce
            }

            await axios.post(`${process.env.REACT_APP_API_URL}/chats/send-chat`, chatBody, { withCredentials: true });

            const timestamp = Date.now();

            // Storing chat blob on client side in ChatUser Table in dexie
            const indexDBData = {
                chatId: chatIdRef.current,
                plainMsg: inputMessage,
                timestamp,
                fromMe: true
            }
            const id = await db.chats.add(indexDBData);
            setUserMessages(prev => [...prev, { id, ...indexDBData }])

            // Updating last msg in chats table in dexie
            const DBData = {
                chatId: chatIdRef.current,
                plainMsg: inputMessage,
                senderPublicKey: receiverPublicKey,
                timestamp
            }

            await saveAndUpdateDBV2(DBData)
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
    const createNewUser = async () => {
        if (!chatIdRef.current)
            return null;

        try {
            const bodyData = { chatId: chatIdRef.current };
            const userData = await db.chatUser.get(chatIdRef.current);
            if (userData)
                return userData;

            const username = generateUsername();
            const data = (await axios.post(`${process.env.REACT_APP_API_URL}/chats/get-publicKey`, bodyData)).data
            const publicKey = data.publicKey;

            const chatMetaData = {
                chatId: chatIdRef.current,
                username,
                publicKey,
                lastMsg: null,
                timestamp: null
            }

            await db.chatUser.add(chatMetaData);
            return chatMetaData;
        }
        catch (error) {
            throw error
        }
    }

    return (
        <ChatsContext.Provider value={{
            createNewUser, sendChat, fetchAllChats, chatIdRef, allMessages, inputMessage,
            setInputMessage, userChatServer, sendChat, userMessages
        }}>
            {props.children}
        </ChatsContext.Provider>
    )
}

export default ChatsState