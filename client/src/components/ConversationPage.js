import React from 'react'
import "../styles/ChatPage.css"
import sendSVG from "../assets/send_svg.svg"
import { useEffect } from 'react'
import { useParams } from 'react-router-dom';

function ConversationPage() {
  const { chatId } = useParams();

  useEffect(() => {


  }, []);


  return (
    <div className='conversation-page'>
      <div className='content-wrapper'>
        {/* Converation Header */}
        <div className='mb-4'>
          <h2 className='card-text'>killer_two</h2>
          <h6 className='text-body-secondary mb-4'>Hope it's the opposite of your gender.</h6>
        </div>

      </div>

      {/* Input component to take msg from the user */}
      <div className="chat-input-wrapper">
        <div className="chat-input-box">
          <textarea className="form-control chat-textarea" rows={1} placeholder="Type something..." />
          <button className="send-btn">
            <img src={sendSVG} alt="submitButton" width="24px" height="24px" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConversationPage
