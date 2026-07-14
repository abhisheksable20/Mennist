import React, { useMemo, useEffect } from 'react'
import { convertTimestampToReadable } from '../dataProcessing/dataProcessing';

function ConversationItem(props) {
  const { fromMe, plainMsg, timestamp, type, imageBlob } = props.chat;
  const { fileDownload } = props

  const imageUrl = useMemo(() => {
    if (!imageBlob) return null;

    return URL.createObjectURL(imageBlob);

  }, [imageBlob]);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  // Triggering the download method in conversationPage.js
  const handleDownloadBtn = () => {
    fileDownload(imageBlob);
  }

  return (
    <div className={`d-flex flex-column align-items-${fromMe ? "end" : "start"} mb-4`}>
      <div className="chat-bubble">
        {type.startsWith("image") ? (
          <img
            className="chat-image"
            src={imageUrl}
            alt="attachment"
            onClick={handleDownloadBtn} />
        ) : (
          <p className='mb-0'>{plainMsg}</p>
        )}

      </div>
      <small className="text-body-secondary mt-1 mx-2">{convertTimestampToReadable(timestamp)}</small>
    </div>
  )
}

export default ConversationItem
