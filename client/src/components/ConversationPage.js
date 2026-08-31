import "../styles/ChatPage.css"
import sendSVG from "../assets/send_svg.svg"
import uploadFileSVG from "../assets/add_svg_icon.svg"
import { useEffect, useContext, useRef, useCallback, useState } from 'react'
import { useParams } from 'react-router-dom';
import ChatsContext from '../context/chats/chatsContext';
import ConversationItem from './ConversationItem';
import ChatFeatureAlert from "./ChatFeatureAlert";
import RecieverChatFlagAlert from "./RecieverChatFlagAlert";
import { db } from '../internalDatabase/db';
import { generateUsername } from "unique-username-generator";
import axios from "axios";
import ChatLoading from './ChatLoading';
import NoContent from './NoContent';
import FilePreview from "./FilePreview";

function ConversationPage() {
  const { chatId } = useParams();
  const { inputMessage, setInputMessage, chatIdRef,
    userChatServer, sendChat, userMessages, loading, sendAttachment, chatFlag } = useContext(ChatsContext);
  const userData = useRef(null);
  const fileDownloadFlag = useRef(false);
  const previewBtnRef = useRef(null);
  const [userName, setUsername] = useState("");
  const [isSendBtnDisabled, setSendBtnDisability] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // If this is true sender can send messages and attachments
  // If this is false sender cannot send messages and attachments
  const [isReceiverAvail, setIsReceiverAvail] = useState(true);

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
      }
      catch (error) {
        if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
          console.error(error);
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
      setSendBtnDisability(true);
    } else {
      setSendBtnDisability(false);
    }

  }, [inputMessage])


  useEffect(() => {
    if (!selectedFile)
      return;

    previewBtnRef.current.click();

  }, [selectedFile]);

  // Handling text message input change
  const handleInputOnChange = (e) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;

    setInputMessage(e.target.value)
  }

  // sending attachments to server side using context method
  const handleAttachmentInput = async () => {
    setSendBtnDisability(true);

    try {
      if (!selectedFile || !chatIdRef || !userData.current) {
        return;
      }

      await sendAttachment(selectedFile, userData.current.recieverPublicKey);
      setSendBtnDisability(false);
      setInputMessage("");
    }
    catch (attachmentError) {
      console.log("Error sending attachment: ", attachmentError)
      if (attachmentError.response?.status)
        setIsReceiverAvail(false);
    }
    finally {
      const textarea = document.getElementById("chatInput");
      if (textarea) {
        textarea.style.height = "auto";
      }

      setSendBtnDisability(false);
      setInputMessage("")
    }
  }

  // Handle file attachement
  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    fileDownloadFlag.current = false;

    const reader = new FileReader();

    reader.onload = () => {
      const copiedFile = new File(
        [reader.result],
        file.name,
        {
          type: file.type,
          lastModified: file.lastModified
        }
      );

      setSelectedFile(copiedFile);
    };

    reader.onerror = () => {
      console.error("Failed to read selected file:", reader.error);
    };

    reader.readAsArrayBuffer(file);
  }

  // Handle file download
  const fileDownload = (imageBlob) => {
    if (!imageBlob)
      return;

    fileDownloadFlag.current = true;
    setSelectedFile(imageBlob);
  }

  // Send the message to the reciever side
  const sendMsg = async () => {
    setSendBtnDisability(true);
    try {
      if (!chatIdRef || !userData.current) {
        return;
      }

      await sendChat(userData.current.recieverPublicKey);
      setSendBtnDisability(false);
      setInputMessage("");
    }
    catch (error) {
      console.log(error);
      if (error.response?.status)
        setIsReceiverAvail(false);
    }
    finally {
      const textarea = document.getElementById("chatInput");
      if (textarea) {
        textarea.style.height = "auto";
      }

      setSendBtnDisability(false);
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
          {/* Converation Header */}
          <div className='mb-4'>
            <h2 className='card-text'>{userName}</h2>
            <h6 className='text-body-secondary mb-5'>Hope it's the opposite of your gender.</h6>
          </div>
          <div>
            {userMessages.length === 0 ? <NoContent svgType={3} title={"NO MESSAGES YET"} text={"Every great conversation starts with a single awkward message."} /> : ""}
          </div>
          {
            userMessages.map((chat) => {
              return <ConversationItem key={chat.id} chat={chat} fileDownload={fileDownload} />
            })
          }
        </div>

        <FilePreview previewBtnRef={previewBtnRef} selectedFile={selectedFile} sendAttachment={handleAttachmentInput} fileDownloadFlag={fileDownloadFlag} />

        {/* Input component to take msg from the user */}
        <div className={`chat-input-wrapper ${!chatFlag ? "d-none" : ""}`}>
          <div className="chat-input-box">

            {/* Attach the image or file button */}
            <button
              className="send-btn"
              style={{ backgroundColor: "#262626" }}
              onClick={() => {
                document.getElementById("fileInput").click()
              }}>
              <img src={uploadFileSVG} alt="Attach file" width="22" height="22" />
            </button>
            <input
              type="file"
              id='fileInput' accept="image/*" hidden
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
          <small className="e2ee-notice">Messages are protected with end-to-end encryption.</small>
        </div>
      </div>
    </>
  )
}

export default ConversationPage
