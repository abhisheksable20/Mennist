import { useMemo, useEffect } from 'react'
import { convertTimestampToReadable } from '../dataProcessing/dataProcessing';
import sendingSVG from "../assets/sending_msg_svg.svg";
import sentSVG from "../assets/sent_msg_svg.svg";
import alertSVG from "../assets/alert_svg.svg";

function ConversationItem(props) {
  const { fromMe, plainMsg, timestamp, type, imageBlob, status } = props.chat;
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
      {/* Attachment sending status */}
      <div className="d-flex align-items-center gap-2 mt-1 mx-2">
        <small className="text-body-secondary">
          {convertTimestampToReadable(timestamp)}
        </small>

        {fromMe && status && (
          <>
            <span className="status-separator">•</span>

            <div className="message-status" title={status}>
              {status === "sending" && (
                <img src={sendingSVG} alt="Sending" className="sending-status-icon" />
              )}

              {status === "sent" && (
                <img src={sentSVG} alt="Sent" className="message-status-icon" />
              )}

              {status === "failed" && (
                <img src={alertSVG} alt="Failed" className="message-status-icon" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ConversationItem
