import React from 'react'
import "../styles/ChatPage.css"

function ChatItem(props) {
    const {username, timestamp, lastMsg} = props

    return (
        <a href="#" className="list-group-item chat-item" aria-current="true">
            <div className='my-2'>
                <div className="d-flex justify-content-between">
                    <h5 className="mb-1 card-title">{username}</h5>
                    <small className='card-text'>{timestamp}</small>
                </div>

                <p className="mb-1 card-text">
                    {lastMsg}
                </p>
            </div>
        </a>
    )
}

export default ChatItem
