import "../styles/ChatPage.css"
import sendSVG from "../assets/send_svg.svg"
import uploadFileSVG from "../assets/add_svg_icon.svg"
import { useEffect, useContext, useRef, useCallback, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom';
import ChatsContext from '../context/chats/chatsContext';
import ConversationItem from './ConversationItem';
import ChatFeatureAlert from "./ChatFeatureAlert";
import RecieverChatFlagAlert from "./RecieverChatFlagAlert";
import { db } from '../internalDatabase/db';
import { randomUsername } from "../utils/randomUsername";
import { loadAvatar } from "./Avatar/avatarService";
import axios from "axios";
import ChatLoading from './ChatLoading';
import Avatar from "./Avatar/Avatar";
import NoContent from './NoContent';
import FilePreview from "./FilePreview";
import { scanFile } from "../utils/scanFile";
import { saveBlobToDevice } from "../utils/saveFile";
import { ACCEPT_ATTR, BIG_FILE, isImageType, isPreviewable } from "../config/attachmentConfig";
import SendCoinsModal from "./Coins/SendCoinsModal";
import TierBadge from "./Coins/TierBadge";
import CoinIcon from "./Coins/CoinIcon";
import CoinChatEvent from "./Coins/CoinChatEvent";
import CoinsContext from "../context/coins/CoinsContext";
import { fetchChatInfo } from "./Coins/coinApi";

// When each chat partner's public key was last checked (this tab only)
const keyCheckedAt = new Map();
const KEY_CHECK_EVERY_MS = 10 * 60 * 1000;

function ConversationPage(props) {
  const { chatId } = useParams();
  const [showSendCoins, setShowSendCoins] = useState(false);
  const showAlert = props.alert || (() => {});
  // Coins sent and received with this person, shown in the chat timeline
  const coinsCtx = useContext(CoinsContext);
  const [coinEvents, setCoinEvents] = useState([]);
  // null = not known yet, false = sending the first message starts a new chat
  const [chatOpen, setChatOpen] = useState(null);
  const loadCoinEvents = useCallback(async () => {
    try {
      const info = await fetchChatInfo(chatId);
      setCoinEvents(info.transfers);
      setChatOpen(info.chatOpen);
    } catch (coinErr) {
      setCoinEvents([]);
    }
  }, [chatId]);
  useEffect(() => setChatOpen(null), [chatId]);
  const walletStamp = coinsCtx && coinsCtx.wallet
    ? `${coinsCtx.wallet.balance}-${coinsCtx.wallet.transfers.incoming.length}-${coinsCtx.wallet.transfers.outgoing.length}`
    : "";
  // Reload when the chat opens and whenever the wallet changes (it refreshes every minute)
  useEffect(() => {
    loadCoinEvents();
  }, [loadCoinEvents, walletStamp]);
  const onCoinChange = () => {
    loadCoinEvents();
    if (coinsCtx) coinsCtx.refreshWallet();
  };
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
  // Small notice above the input for file problems: { text, tone: "error" | "info" }
  const [attachmentNotice, setAttachmentNotice] = useState(null);
  const setAttachmentError = useCallback((text, tone = "error") => {
    setAttachmentNotice(text ? { text, tone, id: Date.now() } : null);
  }, []);

  // Fades out by itself
  useEffect(() => {
    if (!attachmentNotice) return undefined;
    const timer = setTimeout(() => setAttachmentNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [attachmentNotice]);
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

      const username = await randomUsername();
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
      keyCheckedAt.set(chatIdRef.current, Date.now());
      return chatMetaData;
    }
    catch (error) {
      throw error
    }
  }, [])

  /*
    The other person's public key is cached in this browser. It changes when
    they recover their account on a new device, and messages sent to the old
    key can't be read. So check it in the background, at most every 10 minutes.
  */
  const refreshReceiverKey = useCallback(async (forChatId, signal) => {
    const last = keyCheckedAt.get(forChatId) || 0;
    if (Date.now() - last < KEY_CHECK_EVERY_MS) return;
    keyCheckedAt.set(forChatId, Date.now());
    try {
      const data = (await axios.post(`${process.env.REACT_APP_API_URL}/chats/get-publicKey`, { chatId: forChatId }, { signal })).data;
      if (chatIdRef.current !== forChatId) return;
      setIsReceiverAvail(!!data.chatFlag);
      if (data.publicKey && userData.current && data.publicKey !== userData.current.recieverPublicKey) {
        userData.current.recieverPublicKey = data.publicKey;
        await db.chatUser.update(forChatId, { publicKey: data.publicKey });
      }
    } catch (keyErr) {
      keyCheckedAt.delete(forChatId);
    }
  }, [chatIdRef])

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
        refreshReceiverKey(chatId, controller.signal);
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

  }, [chatId, userChatServer, getUserData, refreshReceiverKey]);

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
      .then(afterFirstMessage)
      .catch((attachmentError) => {
        console.log("Error sending attachment: ", attachmentError);
        if (attachmentError.response?.status === 403)
          setIsReceiverAvail(false);
        else if (attachmentError.response?.status === 402)
          setAttachmentError(attachmentError.response.data?.message || "Starting a new chat needs coins.");
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

      if (error.name === "GoneError") {
        // Not a failure to retry: the file isn't on the server any more
        setStatus(messageId, null);
        setAttachmentError("This file was already downloaded or has expired.", "info");
        return;
      }

      console.error("Unable to download attachment:", error);
      setStatus(messageId, "failed");
      setAttachmentError(error.message || "Couldn't download the file.");
      fileDownloadFlag.current = false;
    }
  }

  // New chat: the first message uses a free start or costs coins
  const chatRules = coinsCtx && coinsCtx.wallet ? coinsCtx.wallet.chats : null;
  const isNewChat = chatOpen === false && userMessages.length === 0;
  const startBlocked = isNewChat && !!chatRules && chatRules.freeLeft === 0
    && coinsCtx.wallet.balance < chatRules.price;

  // After the first message opens the chat, show the new balance / free count
  const afterFirstMessage = () => {
    if (!isNewChat) return;
    setChatOpen(true);
    if (coinsCtx) coinsCtx.refreshWallet();
  };

  // Send the message to the reciever side
  const sendMsg = async () => {
    setIsSendBtnDisabled(true);
    let sent = false;
    try {
      if (!chatIdRef || !userData.current) {
        return;
      }

      await sendChat(userData.current.recieverPublicKey);
      sent = true;
      afterFirstMessage();
    }
    catch (error) {
      console.log(error);
      if (error.response?.status === 403)
        setIsReceiverAvail(false);
      else if (error.response?.status === 402) {
        // Keep what they typed so nothing is lost
        showAlert(error.response.data?.message || "Starting a new chat needs coins.", "alert");
        if (coinsCtx) coinsCtx.refreshWallet();
      }
    }
    finally {
      setIsSendBtnDisabled(false);
      if (sent) {
        const textarea = document.getElementById("chatInput");
        if (textarea) {
          textarea.style.height = "auto";
        }
        setInputMessage("");
      }
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
            <div className="conversation-avatar-col">
              <div className="mennist-avatar-preview">
                {userAvatar ? <Avatar avatar={userAvatar} size={64} className="conversation-avatar" /> : ""}
              </div>
              {userAvatar && <TierBadge tier={userAvatar.tier} edition={userAvatar.mythicEdition} className="conversation-tier-badge" />}
            </div>
            <div className="conversation-user-info">
              <h2 className="card-text mb-2">
                {username}
              </h2>
              <h6 className="text-body-secondary mb-3">
                Hope it's the opposite of your gender.
              </h6>
            </div>
            <button type="button" className="coin-btn coin-btn-ghost conversation-send-coins" onClick={() => setShowSendCoins(true)}>
              <CoinIcon size={16} />
              <span>Send coins</span>
            </button>
          </div>
          {showSendCoins && (
            <SendCoinsModal
              chatId={chatId}
              name={username}
              avatar={userAvatar ? <Avatar avatar={userAvatar} size={48} /> : null}
              alert={showAlert}
              onClose={() => {
                setShowSendCoins(false);
                onCoinChange();
              }}
            />
          )}
          <div>
            {userMessages.length === 0 && coinEvents.length === 0 ? <NoContent svgType={3} title={"NO MESSAGES YET"} text={"Every great conversation starts with a single awkward message."} /> : ""}
          </div>
          {
            [
              ...userMessages.map((chat) => ({ kind: "msg", ts: chat.timestamp || Number.MAX_SAFE_INTEGER, chat })),
              ...coinEvents.map((event) => ({ kind: "coin", ts: event.createdAt || 0, event })),
            ]
              .sort((a, b) => a.ts - b.ts)
              .map((item) => {
                if (item.kind === "coin") {
                  return <CoinChatEvent key={`coin-${item.event.id}`} event={item.event} alert={showAlert} onChange={onCoinChange} />
                }
                const chat = item.chat;
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

        {/* Input component to take msg from the user */}
        <div className={`chat-input-wrapper ${!chatFlag ? "d-none" : ""}`}>
          {attachmentNotice && (
            <div key={attachmentNotice.id} className={`chat-notice is-${attachmentNotice.tone}`} role={attachmentNotice.tone === "error" ? "alert" : "status"}>
              <span className="chat-notice-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {attachmentNotice.tone === "error"
                    ? <><path d="M12 8v5" /><path d="M12 16.5h.01" /><circle cx="12" cy="12" r="9" /></>
                    : <><path d="M12 11v5" /><path d="M12 7.5h.01" /><circle cx="12" cy="12" r="9" /></>}
                </svg>
              </span>
              <span className="chat-notice-text">{attachmentNotice.text}</span>
              <button type="button" className="chat-notice-close" aria-label="Dismiss" onClick={() => setAttachmentNotice(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
          )}
          {isNewChat && chatRules && isReceiverAvail && (
            <div className={`chat-start-note ${startBlocked ? "is-blocked" : ""}`} role="status">
              {chatRules.freeLeft > 0 ? (
                <span>New chat · <b>Free</b> ({chatRules.freeLeft} of {chatRules.freePerDay} left today)</span>
              ) : startBlocked ? (
                <span>
                  Free chats used · this one costs <CoinIcon size={12} /> {chatRules.price} ·{" "}
                  <Link to="/coins">Earn coins</Link>
                </span>
              ) : (
                <span>
                  New chat · <CoinIcon size={12} /> <b>{chatRules.price}</b> · refunded if they don't reply in {chatRules.refundHours}h
                </span>
              )}
            </div>
          )}
          <div className="chat-input-box">

            {/* Attach a file button */}
            <button
              className="send-btn"
              style={{ backgroundColor: "#262626" }}
              disabled={isChecking || startBlocked}
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

            <button className={`send-btn ${startBlocked ? "is-locked" : ""}`} onClick={sendMsg} disabled={isSendBtnDisabled || startBlocked}
              title={startBlocked ? "Not enough coins to start this chat" : undefined}>
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