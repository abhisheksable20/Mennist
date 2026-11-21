import { useMemo, useEffect } from 'react'
import { convertTimestampToReadable, formatFileSize } from '../dataProcessing/dataProcessing';
import { isAttachmentType, isImageType } from '../config/attachmentConfig';
import sendingSVG from "../assets/sending_msg_svg.svg";
import sentSVG from "../assets/sent_msg_svg.svg";
import alertSVG from "../assets/alert_svg.svg";

const Svg = ({ size = 22, sw = 2, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

const FileIcon = () => (
  <Svg size={24} sw={1.7}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </Svg>
);

const DownloadIcon = () => (
  <Svg>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </Svg>
);

const CheckIcon = () => (
  <Svg><path d="M20 6 9 17l-5-5" /></Svg>
);

function ConversationItem(props) {
  const { fromMe, plainMsg, timestamp, type, imageBlob, status, progress, fileSize, downloaded, gone } = props.chat;
  // Downloaded without a local copy = it went to the device (older records lack savedToDisk)
  const savedToDisk = props.chat.savedToDisk || (!fromMe && downloaded && !imageBlob);
  const { fileDownload, downloadStatus, downloadProgress } = props;

  const isAttachment = isAttachmentType(type);

  // Only images with a local blob are rendered inline. Every other file is a download card.
  const showImage = isImageType(type) && !!imageBlob;

  // Can the user get the file right now?
  // - a local copy exists (small file / own upload), or
  // - it is an incoming file that is still on the server
  const canDownload = !!imageBlob || (!fromMe && !savedToDisk && !gone);

  const imageUrl = useMemo(() => {
    if (!showImage)
      return null;

    return URL.createObjectURL(imageBlob);
  }, [imageBlob, showImage]);

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

  const isUploading = fromMe && status === "sending";
  const subText =
    downloadStatus === "downloading"
      ? (downloadProgress >= 100 ? "Verifying…" : `Downloading ${downloadProgress ?? 0}%`) :
      downloadStatus === "failed" ? "Download failed. Tap to retry" :
        isUploading && progress != null ? `Uploading ${progress}%` :
          savedToDisk ? "Saved to your device" :
            gone && !imageBlob ? "No longer available" :
            fileSize ? formatFileSize(fileSize) : "";

  return (
    <div className={`d-flex flex-column align-items-${fromMe ? "end" : "start"} mb-4`}>
      <div className="chat-bubble" title={isAttachment ? plainMsg : ""}>
        {isAttachment ? (
          showImage ? (
            <img className="chat-image" src={imageUrl} alt="attachment" onClick={handleDownloadBtn} />
          ) : (
            <button
              type="button"
              className="attachment-download-card"
              onClick={handleDownloadBtn}
              disabled={downloadStatus === "downloading" || !canDownload}
              aria-label={
                downloadStatus === "failed"
                  ? `Retry downloading ${plainMsg}`
                  : `Download ${plainMsg}`
              }
            >
              <span className="attachment-file-icon"><FileIcon /></span>

              <span className="attachment-file-text">
                <span className="attachment-file-name">{plainMsg}</span>
                {subText && <span className="attachment-file-sub">{subText}</span>}
              </span>

              <span className="attachment-download-icon">
                {downloadStatus === "downloading" ? (
                  <img src={sendingSVG} alt="Downloading" className="sending-status-icon" />
                ) : downloadStatus === "failed" ? (
                  <img src={alertSVG} alt="Download failed" />
                ) : savedToDisk && !imageBlob ? (
                  <CheckIcon />
                ) : canDownload ? (
                  <DownloadIcon />
                ) : null}
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
                <>
                  <img src={sendingSVG} alt="Sending" className="sending-status-icon" />
                  {progress != null && <small className="text-body-secondary ms-1">{progress}%</small>}
                </>
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