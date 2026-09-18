import "../styles/Home.css"
import chatSVG from "../assets/chat_round-svg.svg"
import { useNavigate } from 'react-router-dom'

function ChatBtn() {
  const navigate = useNavigate();

  const navigateToChats = () => {
    navigate("/my-chats");
  }

  return (
    <button className='floating-action-btn' onClick={navigateToChats}>
      <img src={chatSVG} alt="chat-btn" width="24px" height="24px"/>
      <span>Chats</span>
    </button>
  )
}

export default ChatBtn
