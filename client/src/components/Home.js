import React from 'react'
import Posts from './Posts'

function Home(props) {
  return (
    <>
      <div>
        <Posts alert={props.alert}/>
      </div>
    </>
  )
}

export default Home
