import React, { useContext, useState, useEffect } from 'react'
import SubmitButton from './SubmitButton'
import PostContext from '../context/posts/postContext'
import { totalWords } from '../dataProcessing/dataProcessing';

function SubmitSecret(props) {
  const { content, setContent } = useContext(PostContext);


  useEffect(() => {
    document.title = "Share my vibe"
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
        <h5 className="ms-3 custom-primary-text">NEW SECRET</h5>
      </div>

      {/* Input form Title */}
      <div className="mt-5">
        <label for="exampleFormControlInput1" className="form-label custom-label">TITLE</label>
        <input type="text"
          className="form-control form-control-lg custom-input"
          id="title" name='title'
          value={content.title}
          onChange={handleInputOnChange}
          placeholder="Your Secret Title Here..." />
      </div>

      {/* Input form Content */}
      <div className="mt-5 mb-4">
        <label for="exampleFormControlTextarea1" className="form-label custom-label">MY SECRET</label>
        <textarea className="form-control form-control-lg custom-input auto-grow-textarea"
          id="content"
          name='content'
          value={content.content}
          onChange={handleInputOnChange}
          rows="12"
          placeholder="Write your secret here...">
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
