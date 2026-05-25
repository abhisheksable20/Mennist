import React from 'react'
import "../styles/ChatPage.css"
import chatSVG from "../assets/chat_round-svg.svg"

function ChatBtn() {
  return (
    <button className='btn d-flex home-chat-btn align-items-center gap-2 position-fixed'>
      <img src={chatSVG} alt="chat-btn" width="24px" height="24px"/>
      <span>My Chats</span>
    </button>
  )
}

export default ChatBtn
