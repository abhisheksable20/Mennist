import React, { useEffect, useState, useContext, useRef } from 'react'
import "../styles/ChatPage.css"
import ChatItem from './ChatItem'
import ChatsContext from '../context/chats/chatsContext'
import ChatLoading from './ChatLoading'
import NoContent from './NoContent'
import DeleteChatComponent from './DeleteChatComponent'

function ChatsPage(props) {
  const { fetchAllChats, allMessages, loading} = useContext(ChatsContext);
  const deleteBtnRef = useRef(null);
  const [selectedChatId, setSelectedChatId] = useState(null);

  useEffect(() => {
    document.title = "Mennist | My Chats"
    fetchAllChats();
  }, []);

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
      <DeleteChatComponent deleteBtnRef={deleteBtnRef} setSelectedChatId={setSelectedChatId} selectedChatId={selectedChatId} />
      <div className='container my-5'>
        <h6 className='special-text'>PRIVATE CHATS</h6>
        <h2 className='card-text'>Your Conversations</h2>
        <h6 className='text-body-secondary'>Every secret has a conversation.</h6>

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
