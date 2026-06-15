import React, { useEffect, useState, useContext } from 'react'
import "../styles/ChatPage.css"
import ChatItem from './ChatItem'
import ChatsContext from '../context/chats/chatsContext'
import ChatLoading from './ChatLoading'

function ChatsPage() {
  const { fetchAllChats, allMessages, loading } = useContext(ChatsContext);

  useEffect(() => {
    fetchAllChats();
  }, [])

  return (
    <>
      {loading? <ChatLoading/> : ""}
      <div className='container my-5'>
        <h6 className='special-text'>PRIVATE CHATS</h6>
        <h2 className='card-text'>Your Conversations</h2>
        <h6 className='text-body-secondary'>Every secret has a conversation.</h6>

        {/* Display my all chats */}
        <div className='list-group mt-4'>
          {
            allMessages.map((msg) => {
              return <ChatItem key={msg.chatId} chatId={msg.chatId} username={msg.username} timestamp={msg.timestamp} lastMsg={msg.lastMsg} />
            })
          }
        </div>

      </div>
    </>
  )
}

export default ChatsPage
