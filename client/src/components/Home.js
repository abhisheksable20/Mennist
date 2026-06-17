import React from 'react'
import Posts from './Posts'
import ChatBtn from './ChatBtn'

function Home(props) {
  return (
    <>
      <div>
        <Posts alert={props.alert}/>
        <ChatBtn />
      </div>
    </>
  )
}

export default Home
