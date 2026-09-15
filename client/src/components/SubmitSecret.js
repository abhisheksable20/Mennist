import { useContext, useState, useEffect } from 'react'
import SubmitButton from './SubmitButton'
import PostContext from '../context/posts/postContext'
import dreamSVG from '../assets/sleep_mask_svg.svg'
import hearFillSVG from "../assets/heart_fill_svg.svg"

function SubmitSecret(props) {
  const { content, setContent, contentType, setContentType } = useContext(PostContext);

  useEffect(() => {
    document.title = "Share My Vibe"
  }, [])

  // Handle imput changing its texts
  const handleInputOnChange = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;

    setContent({ ...content, [e.target.name]: e.target.value });
  }

  // Handle characters count
  const totalCharacters = () => {
    return content.content.trim().length;
  }

  // Handle total words count
  const totalWords = () => {
    if (content.content.trim().length === 0)
      return 0;

    return content.content.trim().split(/\s+/).length;
  }

  return (
    <div className="container mt-5 mb-5">
      <div className='d-flex align-items-center'>
        {/* Green dash */}
        <div className="card-accent" />
        <h5 className="ms-3 custom-primary-text">{`NEW ${contentType===0?"VIBE":"ECHO"}`}</h5>
      </div>

      {/* Content type selector button */}
      <div className="secret-type-selector mt-4">

        <button
          type="button"
          className={`secret-type-option ${contentType===0?"active":""}`}
          onClick={()=>setContentType(0)}>
          <div className="secret-type-icon">
            <img src={hearFillSVG} width="30px" height="30px"/>
          </div>
          <div className="secret-type-name">Vibe</div>
        </button>

        <button
          type="button"
          className={`secret-type-option ${contentType===1?"active":""}`}
          onClick={()=>setContentType(1)}>
          <div className="secret-type-icon">
            <img src={dreamSVG} width="34px" height="34px"/>
          </div>
          <div className="secret-type-name">Echo</div>
        </button>

      </div>

      {/* Input form Title */}
      <div className={`mt-5 ${contentType===1?"d-none":""}`}>
        <label for="exampleFormControlInput1" className="form-label custom-label">TITLE</label>
        <input type="text"
          className="form-control form-control-lg custom-input"
          id="title" name='title'
          value={content.title}
          onChange={handleInputOnChange}
          placeholder="Your vibe title here..." />
      </div>

      {/* Input form Content */}
      <div className="mt-5 mb-4">
        <label for="exampleFormControlTextarea1" className="form-label custom-label">{`MY ${contentType===0?"VIBE":"ECHO"}`}</label>
        <textarea className="form-control form-control-lg custom-input auto-grow-textarea"
          id="content"
          name='content'
          value={content.content}
          onChange={handleInputOnChange}
          rows="12"
          placeholder={`Write your ${contentType===0?"vibe":"echo"} here...`}>
        </textarea>

        {/* Divider */}
        <div className="textarea-divider mt-3"></div>

        {/* Bottom stats */}
        <div className="d-flex justify-content-between mt-2">
          <span className='custom-submit-span'>{`Characters: ${totalCharacters()}`}</span>
          <span className='custom-submit-span'>{content && `Words: ${totalWords(content.content)}`}</span>
        </div>

      </div>
      <p className='condition-text'>Share freely, but stay respectful — avoid posting any misleading, harmful, self-harming, hateful, or threatening content toward others.</p>
      <SubmitButton alert={props.alert} />
    </div>
  )
}

export default SubmitSecret
