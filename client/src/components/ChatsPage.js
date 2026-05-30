import React from 'react'
import "../styles/ChatPage.css"
import ChatItem from './ChatItem'

function ChatsPage() {
  return (
    <div className='container my-5'>
      <h6 className='special-text'>PRIVATE CHATS</h6>
      <h2 className='card-text'>Your Conversations</h2>
      <h6 className='text-body-secondary'>Every secret has a conversation.</h6>

      {/* Display my all chats */}
      <div className='list-group mt-4'>
        <ChatItem />
        <ChatItem />
        <ChatItem />
        <ChatItem />
        <ChatItem />
        <ChatItem />
      </div>

    </div>
  )
}

export default ChatsPage
