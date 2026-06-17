import React from 'react'
import noContentSVG from "../assets/no_content_svg_ill.svg"
import noChatsSVG from "../assets/no_chats_svg.svg"
import noConversation from "../assets/no_conversation_svg.svg"

function NoContent(props) {
  const { svgType, title, text } = props
  let svgSrc = noContentSVG;
  if (svgType === 1)
    svgSrc = noContentSVG
  else if (svgType === 2)
    svgSrc = noChatsSVG
  else if (svgType === 3)
    svgSrc = noConversation

  return (
    <div className='text-center py-5'>
      <img className='img-fluid' src={svgSrc} alt="No Secrets Available" style={{ maxWidth: "320px", opacity: 0.9 }} />
      <h4 className='mt-4 card-text'>{title}</h4>
      <p className='mt-3 text-body-secondary'>{text}</p>
    </div>
  )
}

export default NoContent
