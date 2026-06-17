import React from 'react'
import "../styles/ChatPage.css"
import chatSVG from "../assets/chat_round-svg.svg"
import { useNavigate } from 'react-router-dom'

function ChatBtn() {
  const navigate = useNavigate();

  const navigateToChats = () => {
    navigate("/my-chats");
  }

  return (
    <button className='btn d-flex home-chat-btn align-items-center gap-2 position-fixed' onClick={navigateToChats}>
      <img src={chatSVG} alt="chat-btn" width="24px" height="24px"/>
      <span>My Chats</span>
    </button>
  )
}

export default ChatBtn
