import React, { useMemo, useEffect } from 'react'
import { convertTimestampToReadable } from '../dataProcessing/dataProcessing';

function ConversationItem(props) {
  const { fromMe, plainMsg, timestamp, type, imageBlob } = props.chat;

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

  return (
    <div className={`d-flex flex-column align-items-${fromMe ? "end" : "start"} mb-4`}>
      <div className="chat-bubble">
        {type.startsWith("image") ? (
          <img
            src={imageUrl}
            alt="attachment"
            style={{
              maxWidth: "250px",
              maxHeight: "350px",
              borderRadius: "12px",
              objectFit: "cover"
            }} />
        ) : (
          <p className='mb-0'>{plainMsg}</p>
        )}

      </div>
      <small className="text-body-secondary mt-1 mx-2">{convertTimestampToReadable(timestamp)}</small>
    </div>
  )
}

export default ConversationItem
