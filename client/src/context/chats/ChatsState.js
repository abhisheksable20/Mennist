import ChatsContext from "./chatsContext";
import axios from "axios";
import { db } from "../../internalDatabase/db"
import { generateUsername } from "unique-username-generator";
import { useState, useRef, useCallback } from "react";
import { encryptMessage, encryptedFile } from "../../crypto/encryptMessage";
import { decryptMessage, decryptFile } from "../../crypto/decryptMessage";

const ChatsState = (props) => {
    const [chatFlag, setChatFlag] = useState(false);
    const [inputMessage, setInputMessage] = useState("");
    const [userMessages, setUserMessages] = useState([]);
    const [allMessages, setAllMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    const chatIdRef = useRef(null);

    // Set chat flag
    const changeChatFlag = async (flag) => {
        const isChecked = flag;
        setChatFlag(flag);

        localStorage.setItem("chatEnableStatus", JSON.stringify(isChecked));

        // enable or disable chat feature on server side
        try {
            const serverBody = { chatFlag: isChecked };
            await axios.post(`${process.env.REACT_APP_API_URL}/user/chatFlag`, serverBody, { withCredentials: true });
        }
        catch (chatFlagError) {
            console.log(chatFlagError);
        }
    }

    // Fetch all the chats from the server
    const fetchAllChats = async () => {
        try {
            setLoading(true);
            await allChatsFromLocalStorage();

            const rawData = (await axios.get(`${process.env.REACT_APP_API_URL}/chats/my-chats`, { withCredentials: true })).data;
            if (!rawData) {
                return;
            }

            const privateKey = (await db.keys.get("user-keypair")).privateKey;

            await Promise.all(
                rawData.map(async (chat) => {
                    let decryptedMsg = "";
                    if (chat.type.startsWith("image"))
                        decryptedMsg = chat.encryptedMsg;
                    else
                        decryptedMsg = await decryptMessage(chat.encryptedMsg, chat.nounce, chat.senderPublicKey, privateKey);

                    const DBData = {
                        chatId: chat.chatId,
                        plainMsg: decryptedMsg,
                        senderPublicKey: chat.senderPublicKey,
                        timestamp: chat.timestamp
                    }

                    await saveAndUpdateDBV2(DBData);
                })
            )

            await allChatsFromLocalStorage();
        }
        catch (error) {
            console.log(error);
            throw error;
        }
        finally {
            setLoading(false);
        }

    }

    // Fetch all the chats from local storage IndexDatabase to show all the chats in ChatsPage.js
    const allChatsFromLocalStorage = async () => {
        try {
            const data = await db.chatUser
                .orderBy("timestamp")
                .reverse()
                .toArray();

            if (data)
                setAllMessages(data);

            setLoading(false);
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
            const type = chat.type;
            const chatUser = await db.chatUser.get(chatId);

            if (!chatUser) {
                const username = generateUsername();
                const data = {
                    chatId,
                    username,
                    publicKey: chat.senderPublicKey,
                    lastMsg: plainMsg,
                    type,
                    timestamp: chat.timestamp
                }

                await db.chatUser.add(data);
                return;
            }

            if (chatUser.timestamp < chat.timestamp) {
                const updatedData = {
                    lastMsg: plainMsg,
                    timestamp: chat.timestamp,
                    type: chat.type
                }

                await db.chatUser.update(chatId, updatedData);
            }

        }
        catch (error) {
            throw error
        }

    }

    // Fetch Single user chats from the server database in firebase
    const userChatServer = useCallback(async (signal) => {
        if (!chatIdRef.current)
            return;

        const chatId = chatIdRef.current;
        setLoading(true);

        try {
            await userChatIndexDB(chatId);
            const rawData = (await axios.get(`${process.env.REACT_APP_API_URL}/chats/user-chat`, { params: { chatId }, signal })).data;
            if (!rawData.messages) {
                return;
            }

            const delChatsKeys = [];

            const keys = (await db.keys.get("user-keypair"));

            /*
                Structure from server
                {
                    chatId: "",
                    senderPublicKey: "",
                    messages: [{
                    encryptedFile,
                    encryptedKey,
                    name,
                    size,
                    type
                    encryptedMsg,
                    timestamp,
                    nounce
                }]
                } 
            **/
            const newChats = await Promise.all(
                rawData.messages.map(async (chat) => {
                    const data = {
                        firebaseId: chat.id,
                        chatId: rawData.chatId,
                        timestamp: chat.timestamp,
                        type: chat.type,
                        fromMe: false
                    };

                    if (chat.type.startsWith("image")) {
                        const decryptedMsg = await decryptFile(
                            chat.encryptedFile,
                            chat.encryptedFileKey,
                            chat.nounce,
                            keys.publicKey,
                            keys.privateKey
                        );

                        data.imageBlob = new Blob([decryptedMsg], { type: chat.type });
                        data.plainMsg = chat.name;
                    } else {
                        data.plainMsg = await decryptMessage(
                            chat.encryptedMsg,
                            chat.nounce,
                            rawData.senderPublicKey,
                            keys.privateKey);
                    }

                    return data;
                })
            );


            delChatsKeys.push(...rawData.messages.map(chat => chat.id));
            await db.chats.bulkPut(newChats);

            const delData = {
                chatId: rawData.chatId,
                messagesKeys: delChatsKeys
            };

            await axios.delete(`${process.env.REACT_APP_API_URL}/chats/user-chat`, {
                data: delData,
                withCredentials: true
            });

            await userChatIndexDB(chatId);
        }
        catch (fetchError) {
            if (fetchError.code === "ERR_CANCELED") {
                return;
            }

            throw fetchError;
        }
        finally {
            setLoading(false);
        }

    }, [])

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
            throw error
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

            // Storing chat blob on client side in chats Table in dexie
            const indexDBData = {
                chatId: chatIdRef.current,
                plainMsg: inputMessage,
                timestamp,
                type: "plain/text",
                fromMe: true
            }
            const id = await db.chats.add(indexDBData);
            setUserMessages(prev => [...prev, { id, ...indexDBData }])

            // Updating last msg in chatsUser table in dexie
            const DBData = {
                chatId: chatIdRef.current,
                plainMsg: inputMessage,
                senderPublicKey: receiverPublicKey,
                type: "plain/text",
                timestamp
            }

            await saveAndUpdateDBV2(DBData)
        }
        catch (sendChatErr) {
            throw sendChatErr
        }
    }

    // Sending the attachement to server 
    const sendAttachment = async (file, receiverPublicKey) => {
        try {
            if (!chatIdRef.current)
                return false

            if (!file) {
                return false;
            }

            /**
             * Data recieved from the encryption process
             * {
             *  encryptedFile
             *  encryptedKey
             *  nounce
             *  fileName
             *  fileType
             * }
             */

            const keys = await db.keys.get("user-keypair");

            const buffer = await file.arrayBuffer();
            const imageByte = new Uint8Array(buffer);
            const fileExtension = file.name.split(".").pop();
            const fileName = `Mennist_${Date.now()}.${fileExtension}`

            const encryptedFileData = await encryptedFile(imageByte, receiverPublicKey);

            const chatBody = {
                ...encryptedFileData,
                chatId: chatIdRef.current,
                senderPublicKey: keys.publicKey,
                name: fileName,
                type: file.type,
                size: file.size
            }

            await axios.post(`${process.env.REACT_APP_API_URL}/chats/send-attachment`, chatBody, { withCredentials: true });

            const timestamp = Date.now();

            // Storing the data in index DB in chats database
            const indexDBData = {
                chatId: chatIdRef.current,
                timestamp,
                imageBlob: file,
                plainMsg: fileName,
                type: file.type,
                fromMe: true,
            }

            const id = await db.chats.add(indexDBData);
            setUserMessages(prev => [...prev, { id, ...indexDBData }]);

            // Updating last msg in chatUser table in dexie
            const DBData = {
                chatId: chatIdRef.current,
                plainMsg: fileName,
                senderPublicKey: receiverPublicKey,
                timestamp,
                type: file.type
            }

            await saveAndUpdateDBV2(DBData);
        }
        catch (error) {
            throw error;
        }

    }

    // Delete single user chats from the server then from local database
    const deleteUserChats = async (chatId) => {
        if (!chatId)
            return false;

        try {
            const delChatId = { chatId: chatId };

            await axios.delete(`${process.env.REACT_APP_API_URL}/chats/my-chats`, {
                data: delChatId,
                withCredentials: true
            });

            await delChatsFromLocal(chatId);
        }
        catch (error) {
            console.log("Failed to delete chats please contact support team.");
            throw error;
        }
    }

    // Delete chats from local storage 
    const delChatsFromLocal = async (chatId) => {
        try {
            await Promise.all([
                db.chats.where("chatId").equals(chatId).delete(),
                db.chatUser.delete(chatId)
            ]);

            const updatedChatList = allMessages.filter(chat => chat.chatId !== chatId);
            setAllMessages(updatedChatList);

            return true;
        }
        catch (error) {
            console.log("Failed to delete chats contact support team.")
            throw error
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
            setInputMessage, userChatServer, userMessages, loading, deleteUserChats, sendAttachment,
            chatFlag, changeChatFlag, setChatFlag
        }}>
            {props.children}
        </ChatsContext.Provider>
    )
}

export default ChatsState