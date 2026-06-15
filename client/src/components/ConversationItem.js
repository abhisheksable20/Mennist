import React from 'react'
import { convertTimestampToReadable } from '../dataProcessing/dataProcessing';

function ConversationItem(props) {
  const { fromMe, plainMsg, timestamp } = props.chat;

  return (
    <div className={`d-flex flex-column align-items-${fromMe ? "end" : "start"} mb-4`}>
      <div className="chat-bubble">
        <p className='mb-0'>{plainMsg}</p>
      </div>
      <small className="text-body-secondary mt-1 mx-2">{convertTimestampToReadable(timestamp)}</small>
    </div>
  )
}

export default ConversationItem
