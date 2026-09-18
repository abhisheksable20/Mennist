import React from 'react'
import Posts from './Posts'
import ChatBtn from './ChatBtn'
import EchoBtn from './EchoBtn'
import '../styles/Home.css';

function Home(props) {
  return (
    <>
      <div>
        <Posts alert={props.alert}/>
        <div className="floating-action-bar">
        <EchoBtn />
        <ChatBtn />
        </div>
      </div>
    </>
  )
}

export default Home
