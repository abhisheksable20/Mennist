import React from 'react'
import "../styles/ChatPage.css"
import { convertTimestampToReadable } from '../dataProcessing/dataProcessing'
import { Link } from 'react-router-dom'

function ChatItem(props) {
        const { username, timestamp, lastMsg, chatId } = props
        return (
            <Link to={`/user-chat/${chatId}`} className="list-group-item chat-item" aria-current="true">
                <div className='my-2'>
                    <div className="d-flex justify-content-between">
                        <h5 className="mb-1 card-title">{username}</h5>
                        <small className='card-text'>{convertTimestampToReadable(timestamp)}</small>
                    </div>

                    <p className="mb-1 card-text">
                        {lastMsg}
                    </p>
                </div>
            </Link>
        )
    }

export default ChatItem
