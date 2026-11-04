import { useMemo, useEffect } from 'react'
import { convertTimestampToReadable } from '../dataProcessing/dataProcessing';
import sendingSVG from "../assets/sending_msg_svg.svg";
import sentSVG from "../assets/sent_msg_svg.svg";
import alertSVG from "../assets/alert_svg.svg";


function ConversationItem(props) {
  const { fromMe, plainMsg, timestamp, type, imageBlob, status } = props.chat;
  const { fileDownload, downloadStatus } = props;

  const isAttachment = type && type.startsWith("image");

  const imageUrl = useMemo(() => {
    if (!imageBlob)
      return null;

    return URL.createObjectURL(imageBlob);
  }, [imageBlob]);

  useEffect(() => {
    return () => {
      if (imageUrl)
        URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // Triggering the download method in conversationPage.js
  const handleDownloadBtn = () => {
    fileDownload(props.chat);
  }

  return (
    <div className={`d-flex flex-column align-items-${fromMe ? "end" : "start"} mb-4`}>
      <div className="chat-bubble" title={isAttachment ? plainMsg : ""}>
        {isAttachment ? (
          imageBlob ? (
            <img className="chat-image" src={imageUrl} alt="attachment" onClick={handleDownloadBtn} />
          ) : (
            <button
              type="button"
              className="attachment-download-card"
              onClick={handleDownloadBtn}
              disabled={downloadStatus === "downloading"}
              aria-label={
                downloadStatus === "failed"
                  ? `Retry downloading ${plainMsg}`
                  : `Download ${plainMsg}`
              }
            >
              <span className="attachment-file-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </span>

              <span className="attachment-file-name">
                {plainMsg}
              </span>

              <span
                className="attachment-download-icon"
                title={
                  downloadStatus === "downloading"
                    ? "Downloading"
                    : downloadStatus === "failed"
                      ? "Download failed. Click to retry."
                      : "Download"
                }
              >
                {downloadStatus === "downloading" ? (
                  <img src={sendingSVG} alt="Downloading" className="sending-status-icon"/>
                ) : downloadStatus === "failed" ? (
                  <img
                    src={alertSVG}
                    alt="Download failed"
                  />
                ) : (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                )}
              </span>
            </button>
          )
        ) : (
          <p className="mb-0">{plainMsg}</p>
        )}
      </div>

      <div className="d-flex align-items-center gap-2 mt-1 mx-2">
        <small className="text-body-secondary">
          {convertTimestampToReadable(timestamp)}
        </small>

        {fromMe && status && (
          <>
            <span className="status-separator">•</span>

            <div className="message-status" title={status}>
              {status === "sending" && (
                <img
                  src={sendingSVG}
                  alt="Sending"
                  className="sending-status-icon"
                />
              )}

              {status === "sent" && (
                <img
                  src={sentSVG}
                  alt="Sent"
                  className="message-status-icon"
                />
              )}

              {status === "failed" && (
                <img
                  src={alertSVG}
                  alt="Failed"
                  className="message-status-icon"
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ConversationItem
