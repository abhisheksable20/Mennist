import ChatsContext from "./chatsContext";
import axios from "axios";
import { db } from "../../internalDatabase/db"
import { generateUsername } from "unique-username-generator";
import { useState, useRef, useCallback } from "react";
import { encryptMessage } from "../../crypto/encryptMessage";
import { decryptMessage, decryptFile } from "../../crypto/decryptMessage";
import { startFileEncryption, encryptChunks, startFileDecryption, decryptChunks, encryptedSize } from "../../crypto/chunkCrypto";
import { uploadChunk } from "../../utils/chunkUpload";
import { scanFile, checkHeader, validateIncomingMeta } from "../../utils/scanFile";
import { saveBlobToDevice, safeFileName } from "../../utils/saveFile";
import { BIG_FILE, MAX_FILE_SIZE, EXT_TO_TYPE, getExt, isAttachmentType, isImageType, isPreviewable } from "../../config/attachmentConfig";

const API = process.env.REACT_APP_API_URL;

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
            await axios.post(`${API}/user/chatFlag`, serverBody, { withCredentials: true });
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

            const rawData = (await axios.get(`${API}/chats/my-chats`, { withCredentials: true })).data;
            if (!rawData) {
                return;
            }

            const privateKey = (await db.keys.get("user-keypair")).privateKey;

            await Promise.all(
                rawData.map(async (chat) => {
                    let decryptedMsg = "";
                    // For attachments the "message" is just the file name (not encrypted)
                    if (isAttachmentType(chat.type))
                        decryptedMsg = chat.encryptedMsg;
                    else
                        decryptedMsg = await decryptMessage(chat.encryptedMsg, chat.nounce, chat.senderPublicKey, privateKey);

                    const DBData = {
                        chatId: chat.chatId,
                        plainMsg: decryptedMsg,
                        senderPublicKey: chat.senderPublicKey,
                        type: chat.type,
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

            const rawData = (await axios.get(`${API}/chats/user-chat`, { params: { chatId }, signal })).data;

            if (!rawData || !rawData.messages || rawData.messages.length === 0)
                return;

            const keys = (await db.keys.get("user-keypair"));

            const newChats = await Promise.all(
                rawData.messages.map(async (chat) => {
                    const isAttachment = !!chat.hasAttachment;

                    const data = {
                        firebaseId: chat.id,
                        chatId: rawData.chatId,
                        timestamp: chat.timestamp,
                        type: chat.type,
                        fromMe: false,
                        hasAttachment: isAttachment,
                        attachmentId: chat.attachmentId || null,
                        plainMsg: ""
                    };

                    if (isAttachment) {
                        // Only metadata is stored. The actual file is fetched on demand.
                        data.plainMsg = chat.name;
                        data.fileSize = chat.size;
                    } else {
                        data.plainMsg = await decryptMessage(
                            chat.encryptedMsg,
                            chat.nounce,
                            rawData.senderPublicKey,
                            keys.privateKey
                        );
                    }

                    return data;
                })
            );

            // Save messages locally before deleting fetched text messages from server.
            for (const chat of newChats) {
                const existing = await db.chats
                    .where("firebaseId")
                    .equals(chat.firebaseId)
                    .first();

                if (existing) {
                    await db.chats.put({
                        ...existing,
                        ...chat,
                        id: existing.id,
                        imageBlob: existing.imageBlob || chat.imageBlob
                    });
                } else {
                    await db.chats.add(chat);
                }
            }

            // Only text messages are deleted by this endpoint.
            const textMessageIds = rawData.messages.filter(chat => !chat.hasAttachment).map(chat => chat.id);

            if (textMessageIds.length > 0) {
                await axios.delete(`${API}/chats/user-chat`, {
                    data: {
                        chatId: rawData.chatId,
                        messagesKeys: textMessageIds
                    },
                    withCredentials: true
                });
            }

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

    }, []);

    /**
     * Download ONE attachment when the user clicks it.
     *  - previewable image  -> returns the Blob (the page shows the preview modal)
     *  - everything else    -> decrypted and saved straight to the user's device, returns null
     *                          (or the Blob for the in-memory fallback, which the page ignores)
     * NOTE: when a "Save as" dialog is needed, it is the very first await so the click's user
     * activation is still valid. Don't put awaits above it.
     */
    const downloadAttachment = async (chat) => {
        if (!chat || !chat.firebaseId || !chat.chatId)
            return null;

        if (chat.imageBlob)
            return chat.imageBlob;

        // Big files on Chromium: stream straight to disk (no memory, no IndexedDB)
        let fileHandle = null;
        if (chat.fileSize > BIG_FILE && typeof window.showSaveFilePicker === "function") {
            fileHandle = await window.showSaveFilePicker({ suggestedName: safeFileName(chat.plainMsg) });
        }

        const keys = await db.keys.get("user-keypair");

        const { data: att } = await axios.get(`${API}/chats/user-chat/attachment`, {
            params: { chatId: chat.chatId, messageId: chat.firebaseId },
            withCredentials: true
        });

        // The sender is the untrusted party: re-validate everything they supplied
        const metaError = validateIncomingMeta(att.name, att.type, att.size);
        if (metaError)
            throw new Error(metaError);

        let blob = null;

        if (!att.downloadUrl) {
            // Legacy record: base64 ciphertext stored in RTDB
            const bytes = await decryptFile(att.encryptedFile, att.encryptedFileKey, att.nounce, keys.publicKey, keys.privateKey);
            blob = new File([bytes], att.name, { type: att.type });
        }
        else {
            const state = await startFileDecryption(att.encryptedFileKey, att.nounce, keys.publicKey, keys.privateKey);
            const chunks = decryptChunks(att.downloadUrl, att.size, state);
            let received = 0;

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                try {
                    let first = true;
                    for await (const part of chunks) {
                        if (first) {
                            first = false;
                            const headerError = await checkHeader(new Blob([part]), att.type);
                            if (headerError) throw new Error(headerError);
                        }
                        received += part.length;
                        await writable.write(part);
                    }
                    if (received !== att.size) throw new Error("Downloaded size mismatch");
                    await writable.close();
                }
                catch (e) {
                    await writable.abort().catch(() => { });
                    throw e;
                }
            }
            else {
                const parts = [];
                for await (const part of chunks) {
                    received += part.length;
                    parts.push(new Blob([part])); // lets the browser page chunks out of RAM
                }
                if (received !== att.size) throw new Error("Downloaded size mismatch");
                blob = new File(parts, att.name, { type: att.type });
            }
        }

        // Full content scan of the decrypted file before we hand it to the user
        if (blob) {
            const scan = await scanFile(blob, { name: att.name });
            if (!scan.ok)
                throw new Error(scan.reason);
        }

        const keepLocal = !!blob && att.size <= BIG_FILE;   // small: keep a copy in Dexie
        const savedToDisk = !!fileHandle;                   // big + picker: it's on disk now
        const patch = keepLocal
            ? { imageBlob: blob, downloaded: true }
            : { downloaded: true, ...(savedToDisk ? { savedToDisk: true } : {}) };

        // 1) local save first
        if (chat.id !== undefined)
            await db.chats.update(chat.id, patch);

        setUserMessages(prev =>
            prev.map(message => message.firebaseId === chat.firebaseId ? { ...message, ...patch } : message)
        );

        // 2) non-previewable files go straight to the device
        if (blob && !isPreviewable(att.type, att.size))
            saveBlobToDevice(blob, att.name);

        // 3) delete the server copy only when we're sure we have a safe local copy.
        //    A big file saved through the in-memory fallback keeps its server copy (the browser
        //    download can't be confirmed), so the user can retry.
        if (keepLocal || savedToDisk) {
            try {
                await axios.delete(`${API}/chats/user-chat/attachment`, {
                    data: { chatId: chat.chatId, messageId: chat.firebaseId },
                    withCredentials: true
                });
            }
            catch (deleteError) {
                console.error("Failed to delete downloaded attachment from server:", deleteError);
            }
        }

        return blob;
    };

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

            await axios.post(`${API}/chats/send-chat`, chatBody, { withCredentials: true });

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

    // Encrypt + upload a file of any allowed type (images included)
    // The file is expected to have passed scanFile() already (ConversationPage does that on selection).
    const sendAttachment = async (file, receiverPublicKey) => {
        const chatId = chatIdRef.current;
        if (!chatId || !file || !receiverPublicKey)
            return false;

        const type = EXT_TO_TYPE[getExt(file.name)];
        if (!type || file.size < 1 || file.size > MAX_FILE_SIZE)
            throw new Error("This file can't be sent.");

        const keepLocal = file.size <= BIG_FILE;
        const localFile = file.type === type ? file : new File([file], file.name, { type });

        const tempMessage = {
            chatId,
            timestamp: Date.now(),
            plainMsg: file.name,
            type,
            fromMe: true,
            status: "sending",
            hasAttachment: true,
            fileSize: file.size,
            ...(keepLocal ? { imageBlob: localFile } : {})
        };

        const id = await db.chats.add(tempMessage);
        setUserMessages(prev => [...prev, { id, ...tempMessage }]);

        const patchMessage = (patch) =>
            setUserMessages(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));

        try {
            const keys = await db.keys.get("user-keypair");
            const { state, nounce, encryptedFileKey } = await startFileEncryption(receiverPublicKey);

            const fileName = `Mennist_${Date.now()}.${getExt(file.name)}`;

            // 1) metadata -> server validates and returns a resumable upload session
            const { data: init } = await axios.post(`${API}/chats/attachment/init`, {
                chatId,
                senderPublicKey: keys.publicKey,
                encryptedFileKey,
                nounce,
                name: fileName,
                type,
                size: file.size
            }, { withCredentials: true });

            // 2) encrypt and upload chunk by chunk straight to Cloud Storage
            const total = encryptedSize(file.size);
            let offset = 0;
            let lastPct = -1;

            for await (const chunk of encryptChunks(file, state)) {
                await uploadChunk(init.uploadUrl, chunk, offset, total);
                offset += chunk.length;

                const pct = Math.floor((offset / total) * 100);
                if (pct !== lastPct) {
                    lastPct = pct;
                    patchMessage({ progress: pct });
                }
            }

            // 3) server verifies the stored size and publishes the message
            await axios.post(`${API}/chats/attachment/complete`, { messageId: init.messageId }, { withCredentials: true });

            const patch = { plainMsg: fileName, status: "sent", firebaseId: init.messageId, attachmentId: init.messageId };
            await db.chats.update(id, patch);
            patchMessage({ ...patch, progress: undefined });

            await saveAndUpdateDBV2({
                chatId,
                plainMsg: fileName,
                senderPublicKey: receiverPublicKey,
                timestamp: tempMessage.timestamp,
                type
            });

            return true;
        }
        catch (error) {
            await db.chats.update(id, { status: "failed" });
            patchMessage({ status: "failed", progress: undefined });
            throw error;
        }
    }

    // Delete single user chats from the server then from local database
    const deleteUserChats = async (chatId) => {
        if (!chatId)
            return false;

        try {
            const delChatId = { chatId: chatId };

            await axios.delete(`${API}/chats/my-chats`, {
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
            const data = (await axios.post(`${API}/chats/get-publicKey`, bodyData)).data
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
            chatFlag, changeChatFlag, setChatFlag, downloadAttachment
        }}>
            {props.children}
        </ChatsContext.Provider>
    )
}

export default ChatsState