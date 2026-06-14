import React from 'react'

function ConversationItem(props) {
  const { fromMe, plainMsg, timestamp } = props.chat;

  return (
    <div className={`d-flex flex-column align-items-${fromMe ? "end" : "start"} mb-4`}>
      <div className="chat-bubble">
        <p className='mb-0'>{plainMsg}</p>
      </div>
      <small className="text-body-secondary mt-1 mx-2">{timestamp}</small>
    </div>
  )
}

export default ConversationItem
