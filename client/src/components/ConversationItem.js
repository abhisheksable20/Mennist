import React from 'react'

function ConversationItem(props) {
  return (
    <div className='d-flex flex-column align-items-start mb-4'>
      <div className="chat-bubble">
        <p className='mb-0'>Hello how are you</p>
      </div>
      <small className="text-body-secondary mt-1 mx-2">2 sec ago</small>
    </div>
  )
}

export default ConversationItem
