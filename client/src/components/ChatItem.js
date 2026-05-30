import React from 'react'
import "../styles/ChatPage.css"

function ChatItem() {
    return (
        <a href="#" className="list-group-item chat-item" aria-current="true">
            <div className='my-2'>
                <div className="d-flex justify-content-between">
                    <h5 className="mb-1 card-title">killer_user</h5>
                    <small className='card-text'>2:45 PM</small>
                </div>

                <p className="mb-1 card-text">
                    Hey, are you working on the UI?
                </p>
            </div>
        </a>
    )
}

export default ChatItem
