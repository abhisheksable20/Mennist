import React from 'react'
import Posts from './Posts'
import ChatBtn from './ChatBtn'
import EchoBtn from './EchoBtn'
import VeilBtn from './VeilBtn'
import '../styles/Home.css';

function Home(props) {
  return (
    <div>
      <Posts alert={props.alert} />
      <div className="floating-action-bar">
        <EchoBtn />
        <ChatBtn />
        <VeilBtn />
      </div>
    </div>

  )
}

export default Home
