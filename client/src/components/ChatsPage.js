import { useEffect, useState, useContext, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import "../styles/ChatPage.css"
import ChatItem from './ChatItem'
import ChatsContext from '../context/chats/chatsContext'
import ChatLoading from './ChatLoading'
import NoContent from './NoContent'
import DeleteChatComponent from './DeleteChatComponent'
import ChatFeatureAlert from './ChatFeatureAlert'
import PostHeaders from './utils/PostHeaders'

function ChatsPage(props) {
  const { fetchAllChats, allMessages, loading, chatFlag } = useContext(ChatsContext);
  const deleteBtnRef = useRef(null);
  const [selectedChatId, setSelectedChatId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Mennist | My Chats"
  }, []);

  // If chat flag change to true trigger fetch all the chats
  useEffect(() => {
    if (chatFlag) {
      try {
        fetchAllChats();
      } catch (error) {
        if (error.response?.status === 401) {
          navigate("/setup-user");
        }
      }
    }

  }, [chatFlag])

  // Handle delete single user chats
  const deleteMyChats = async (chatId) => {
    try {
      setSelectedChatId(chatId);
      deleteBtnRef.current.click();
    }
    catch (error) {
      console.log("Failed to delete the chat", error);
    }
  }

  return (
    <>
      {loading ? <ChatLoading /> : ""}
      {!chatFlag && (<ChatFeatureAlert />)}

      <DeleteChatComponent deleteBtnRef={deleteBtnRef} setSelectedChatId={setSelectedChatId} selectedChatId={selectedChatId} />

      <div className='container my-5'>
        <PostHeaders splText={"PRIVATE CHATS"} heading={"Your Conversations"} subHeading={"Every secret has a conversation."} />

        {/* Display my all chats */}
        <div className='list-group mt-4'>
          {allMessages.length === 0 ? <NoContent svgType={2} title={"NO CHATS"} text={"Your chat history is cleaner than my browser history."} /> : ""}
          {
            allMessages.map((msg) => {
              return <ChatItem key={msg.chatId} chatId={msg.chatId} username={msg.username} timestamp={msg.timestamp} lastMsg={msg.lastMsg} deleteChat={deleteMyChats} />
            })
          }
        </div>

      </div>
    </>
  )
}

export default ChatsPage
