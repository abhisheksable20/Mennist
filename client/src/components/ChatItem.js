import React from 'react'
import "../styles/ChatPage.css"
import { convertTimestampToReadable } from '../dataProcessing/dataProcessing'
import { Link } from 'react-router-dom'
import deleteSVG from '../assets/delete_svg_icon.svg'
import ChatsContext from '../context/chats/chatsContext'

function ChatItem(props) {
    const { username, timestamp, lastMsg, chatId, deleteChat } = props;

    const handleDeleteBtn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteChat(chatId);
    }

    return (
        <div className="list-group-item chat-item">
            <div className="chat-item-layout">
                <Link to={`/user-chat/${chatId}`} className="chat-content text-decoration-none">
                    <h5 className="mb-1 card-title">{username}</h5>
                    <p className="mb-0 card-text chat-preview">{lastMsg}</p>
                    <small className="chat-timestamp">
                        {convertTimestampToReadable(timestamp)}
                    </small>
                </Link>

                <div className="delete-section">
                    <img src={deleteSVG} alt="Delete Chat" width="28px" height="28px" onClick={handleDeleteBtn} />
                </div>
            </div>
        </div>
    )
}

export default ChatItem
