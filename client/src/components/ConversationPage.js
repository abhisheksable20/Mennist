import "../styles/ChatPage.css"
import sendSVG from "../assets/send_svg.svg"
import uploadFileSVG from "../assets/add_svg_icon.svg"
import { useEffect, useContext, useRef, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom';
import ChatsContext from '../context/chats/chatsContext';
import ConversationItem from './ConversationItem';
import ChatFeatureAlert from "./ChatFeatureAlert";
import RecieverChatFlagAlert from "./RecieverChatFlagAlert";
import { db } from '../internalDatabase/db';
import { generateUsername } from "unique-username-generator";
import { loadAvatar } from "./Avatar/avatarService";
import axios from "axios";
import ChatLoading from './ChatLoading';
import Avatar from "./Avatar/Avatar";
import NoContent from './NoContent';
import FilePreview from "./FilePreview";
import { scanFile } from "../utils/scanFile";
import { saveBlobToDevice } from "../utils/saveFile";
import { ACCEPT_ATTR, BIG_FILE, isImageType, isPreviewable } from "../config/attachmentConfig";

function ConversationPage() {
  const { chatId } = useParams();
  const { inputMessage, setInputMessage, chatIdRef,
    userChatServer, sendChat, userMessages, loading, sendAttachment, chatFlag, downloadAttachment } = useContext(ChatsContext);
  const userData = useRef(null);
  const fileDownloadFlag = useRef(false);
  const previewBtnRef = useRef(null);
  const [username, setUsername] = useState("");
  const [isSendBtnDisabled, setIsSendBtnDisabled] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const [attachmentDownloadStatus, setAttachmentDownloadStatus] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [attachmentError, setAttachmentError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  // If this is true sender can send messages and attachments
  // If this is false sender cannot send messages and attachments
  const [isReceiverAvail, setIsReceiverAvail] = useState(true);

  const navigate = useNavigate();

  const getUserData = useCallback(async (signal) => {
    if (!chatIdRef.current)
      return null;

    try {
      const bodyData = { chatId: chatIdRef.current };
      const userData = await db.chatUser.get(chatIdRef.current);
      if (userData)
        return userData;

      const username = generateUsername();
      const data = (await axios.post(`${process.env.REACT_APP_API_URL}/chats/get-publicKey`, bodyData, { signal })).data
      const publicKey = data.publicKey;
      const chatFlag = data.chatFlag;
      setIsReceiverAvail(chatFlag);

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
  }, [])

  const handleFilePreviewClose = useCallback(() => {
    setSelectedFile(null);
    fileDownloadFlag.current = false;
    const input = document.getElementById("fileInput");
    if (input) input.value = "";   // lets the same file be picked again
  }, []);


  useEffect(() => {
    if (!chatId) {
      return
    }

    const controller = new AbortController();

    const initializeChat = async () => {
      try {
        chatIdRef.current = chatId;

        const user = await getUserData(controller.signal);
        if (!user) {
          return;
        }

        userData.current = {
          username: user.username,
          recieverPublicKey: user.publicKey
        };

        document.title = user.username;

        setUsername(user.username);
        userChatServer(controller.signal);
        getUserAvatar();
      }
      catch (error) {
        if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
          console.error(error);
        }
        if (error.response?.status === 401) {
          navigate("/setup-user");
        }
      }
    }

    initializeChat();

    return () => {
      controller.abort();
    }

  }, [chatId, userChatServer, getUserData]);

  useEffect(() => {
    if (inputMessage.trim().length <= 0) {
      setIsSendBtnDisabled(true);
    } else {
      setIsSendBtnDisabled(false);
    }

  }, [inputMessage])


  useEffect(() => {
    if (!selectedFile)
      return;

    previewBtnRef.current.click();

  }, [selectedFile]);

  // Fetch the user avatar from the server
  const getUserAvatar = async () => {
    try {
      const avatar = await loadAvatar(chatId);
      setUserAvatar(avatar);
    }
    catch (fetchAvatarErr) {
      console.log("Failed to load the avatar: ", fetchAvatarErr)
    }
  }

  // Handling text message input change
  const handleInputOnChange = (e) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;

    setInputMessage(e.target.value)
  }

  // Confirmed in the modal: start the upload in the background so the chat stays usable.
  // Progress is shown on the message bubble itself.
  const handleAttachmentInput = () => {
    if (!selectedFile || !userData.current)
      return;

    sendAttachment(selectedFile, userData.current.recieverPublicKey)
      .catch((attachmentError) => {
        console.log("Error sending attachment: ", attachmentError);
        if (attachmentError.response?.status === 403)
          setIsReceiverAvail(false);
        else if (attachmentError.response?.status === 415)
          setAttachmentError("This file type is not allowed.");
        else
          setAttachmentError(attachmentError.message || "Couldn't send the file.");
      });
  }

  // Handle file selection: check it first, then show the confirmation modal
  const handleFileChange = async (e) => {
    const input = e.target;
    const file = input.files[0];

    if (!file) return;

    setAttachmentError("");
    setIsChecking(true);

    try {
      const scan = await scanFile(file);
      if (!scan.ok) {
        setAttachmentError(scan.reason);
        input.value = "";
        return;
      }

      // Small files: snapshot the bytes (as before). Big files: never copy 1 GB into memory.
      const parts = file.size <= BIG_FILE ? [await file.arrayBuffer()] : [file];
      const ready = new File(parts, file.name, { type: scan.type, lastModified: file.lastModified });

      fileDownloadFlag.current = false;
      setSelectedFile(ready);
    }
    catch (err) {
      console.error("Failed to read selected file:", err);
      setAttachmentError("Couldn't read that file.");
      input.value = "";
    }
    finally {
      setIsChecking(false);
    }
  }

  // Opens the preview modal in "download" mode (images only)
  const openPreview = (blob) => {
    fileDownloadFlag.current = true;
    setSelectedFile(blob);
  }

  const setStatus = (messageId, value) =>
    setAttachmentDownloadStatus(prev => {
      const next = { ...prev };
      if (value) next[messageId] = value; else delete next[messageId];
      return next;
    });

  const setProgress = (messageId, value) =>
    setDownloadProgress(prev => {
      const next = { ...prev };
      if (value == null) delete next[messageId]; else next[messageId] = value;
      return next;
    });

  // Click on an attachment (image or file card)
  const fileDownload = async (chat) => {
    const messageId = chat.firebaseId ?? chat.id;
    if (!messageId) return;

    // Already have the bytes locally
    if (chat.imageBlob) {
      if (isImageType(chat.type)) openPreview(chat.imageBlob);        // image: preview + Download button
      else saveBlobToDevice(chat.imageBlob, chat.plainMsg);          // anything else: save immediately
      return;
    }

    // Nothing local and nothing on the server to fetch
    if (!chat.firebaseId || chat.fromMe) return;

    // Prevent multiple simultaneous downloads of the same attachment.
    if (attachmentDownloadStatus[messageId] === "downloading") return;

    setStatus(messageId, "downloading");
    setProgress(messageId, 0);

    try {
      // downloadAttachment saves non-image files straight to the device by itself
      const blob = await downloadAttachment(chat, (pct) => setProgress(messageId, pct));

      setStatus(messageId, "downloaded");
      setProgress(messageId, null);

      if (blob && isPreviewable(chat.type, chat.fileSize ?? blob.size))
        openPreview(blob);
    }
    catch (error) {
      setProgress(messageId, null);

      if (error.name === "AbortError") {
        // user closed the "Save as" dialog
        setStatus(messageId, null);
        return;
      }

      console.error("Unable to download attachment:", error);
      setStatus(messageId, "failed");
      setAttachmentError(error.message || "Couldn't download the file.");
      fileDownloadFlag.current = false;
    }
  }

  // Send the message to the reciever side
  const sendMsg = async () => {
    setIsSendBtnDisabled(true);
    try {
      if (!chatIdRef || !userData.current) {
        return;
      }

      await sendChat(userData.current.recieverPublicKey);
      setIsSendBtnDisabled(false);
      setInputMessage("");
    }
    catch (error) {
      console.log(error);
      if (error.response?.status === 403)
        setIsReceiverAvail(false);
    }
    finally {
      const textarea = document.getElementById("chatInput");
      if (textarea) {
        textarea.style.height = "auto";
      }

      setIsSendBtnDisabled(false);
      setInputMessage("")
    }
  }

  return (
    <>
      {loading ? <ChatLoading /> : ""}
      {!chatFlag && (<ChatFeatureAlert />)}
      {!isReceiverAvail && (<RecieverChatFlagAlert />)}
      <div className='conversation-page'>
        <div className='content-wrapper'>
          {/* Conversation Header */}
          <div className="conversation-header mb-4">
            <div className="mennist-avatar-preview">
              {userAvatar ? <Avatar avatar={userAvatar} size={64} className="conversation-avatar" /> : ""}
            </div>
            <div className="conversation-user-info">
              <h2 className="card-text mb-2">
                {username}
              </h2>
              <h6 className="text-body-secondary mb-3">
                Hope it's the opposite of your gender.
              </h6>
            </div>
          </div>
          <div>
            {userMessages.length === 0 ? <NoContent svgType={3} title={"NO MESSAGES YET"} text={"Every great conversation starts with a single awkward message."} /> : ""}
          </div>
          {
            userMessages.map((chat) => {
              const key = chat.firebaseId ?? chat.id;
              return <ConversationItem
                key={chat.id}
                chat={chat}
                fileDownload={fileDownload}
                downloadStatus={attachmentDownloadStatus[key]}
                downloadProgress={downloadProgress[key]} />
            })
          }
        </div>

        <FilePreview
          previewBtnRef={previewBtnRef}
          selectedFile={selectedFile}
          sendAttachment={handleAttachmentInput}
          fileDownloadFlag={fileDownloadFlag}
          onClose={handleFilePreviewClose} />

        {attachmentError && (
          <div className="alert alert-danger alert-dismissible fade show mx-3 mb-2" role="alert">
            {attachmentError}
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setAttachmentError("")}></button>
          </div>
        )}

        {/* Input component to take msg from the user */}
        <div className={`chat-input-wrapper ${!chatFlag ? "d-none" : ""}`}>
          <div className="chat-input-box">

            {/* Attach a file button */}
            <button
              className="send-btn"
              style={{ backgroundColor: "#262626" }}
              disabled={isChecking}
              onClick={() => {
                document.getElementById("fileInput").click()
              }}>
              <img src={uploadFileSVG} alt="Attach file" width="22" height="22" />
            </button>
            <input
              type="file"
              id='fileInput' accept={ACCEPT_ATTR} hidden
              onChange={handleFileChange} />

            <textarea
              className="form-control chat-textarea"
              id='chatInput'
              name='chatInput'
              value={inputMessage}
              rows={1}
              placeholder="Type something..."
              onChange={handleInputOnChange} />

            <button className="send-btn" onClick={sendMsg} disabled={isSendBtnDisabled}>
              <img src={sendSVG} alt="submitButton" width="24px" height="24px" />
            </button>

          </div>
          <small className="e2ee-notice">
            {isChecking ? "Checking file…" : "Messages are protected with end-to-end encryption."}
          </small>
        </div>
      </div>
    </>
  )
}

export default ConversationPage