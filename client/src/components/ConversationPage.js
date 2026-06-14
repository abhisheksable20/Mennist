import React from 'react'
import "../styles/ChatPage.css"
import sendSVG from "../assets/send_svg.svg"
import { useEffect, useContext, useRef } from 'react'
import { useParams } from 'react-router-dom';
import ChatsContext from '../context/chats/chatsContext';
import ConversationItem from './ConversationItem';
import { db } from '../internalDatabase/db';
import { generateUsername } from "unique-username-generator";
import axios from "axios";


function ConversationPage() {
  const { chatId } = useParams();
  const { inputMessage, setInputMessage, chatIdRef, userChatServer, sendChat, userMessages } = useContext(ChatsContext);
  const userData = useRef(null);

  useEffect(() => {
    if (!chatId)
      return

    chatIdRef.current = chatId;
    const user = async () => {return await getUserData()};
    if(user){
      userData.current = {
        username: user.username,
        recieverPublicKey: user.publicKey
      }

      userChatServer()
    }

  }, []);

  const getUserData = async () => {
    if (!chatIdRef.current)
      return null;

    try {
      const bodyData = { chatId: chatIdRef.current };
      const userData = await db.chatUser.get(chatIdRef.current);
      if (userData)
        return userData;

      const username = generateUsername();
      const data = (await axios.post(`${process.env.REACT_APP_API_URL}/chats/get-publicKey`, bodyData)).data
      const publicKey = data.publicKey;

      const chatMetaData = {
        chatId: chatIdRef.current,
        username,
        publicKey,
        lastMsg: null,
        timestamp: null
      }

      await db.chatUser.add(chatMetaData);
      return chatMetaData;
    }
    catch (error) {
      throw error
    }
  }

  const handleInputOnChange = (e) => {
    setInputMessage(e.target.value)
  }

  const sendMsg = async () => {
    try {
      if(!chatIdRef || !userData.current){
        return;
      }

      await sendChat(userData.current.recieverPublicKey);
    } 
    catch (error) {
      console.log(error);
    }
  }

  return (
    <div className='conversation-page'>
      <div className='content-wrapper'>
        {/* Converation Header */}
        <div className='mb-4'>
          <h2 className='card-text'>killer_two</h2>
          <h6 className='text-body-secondary mb-5'>Hope it's the opposite of your gender.</h6>
        </div>
        {
          userMessages.map((chat) => {
            return <ConversationItem key={chat.id} chat={chat}/>
          })
        }
        <ConversationItem />
      </div>

      {/* Input component to take msg from the user */}
      <div className="chat-input-wrapper">
        <div className="chat-input-box">
          <textarea
            className="form-control chat-textarea"
            id='chatInput'
            name='chatInput'
            value={inputMessage}
            rows={1}
            placeholder="Type something..."
            onChange={handleInputOnChange} />
          <button className="send-btn">
            <img src={sendSVG} alt="submitButton" width="24px" height="24px" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConversationPage
