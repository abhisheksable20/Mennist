import React from 'react'
import noContentSVG from "../assets/no_content_svg_ill.svg"

function NoContent() {
  return (
    <div className='text-center py-5'>
      <img className='img-fluid' src={noContentSVG} alt="No Secrets Available" style={{ maxWidth: "320px", opacity: 0.9 }}/>
      <h4 className='mt-4 card-text'>TOO QUIET IN HERE</h4>
      <p className='mt-3 text-body-secondary'>Tell the story nobody knows about.</p>
    </div>
  )
}

export default NoContent
