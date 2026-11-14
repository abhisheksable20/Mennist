import { useEffect, useState, useRef } from 'react'
import "../styles/ReportModal.css"
import { formatFileSize } from '../dataProcessing/dataProcessing';
import { saveBlobToDevice } from '../utils/saveFile';
import { isImageType } from '../config/attachmentConfig';

function FilePreview(props) {
  const { previewBtnRef, selectedFile, sendAttachment, fileDownloadFlag, onClose } = props;
  const [imageUrl, setImageUrl] = useState(null);
  const closeModalRef = useRef(null);
  const modalRef = useRef(null);

  const isImage = isImageType(selectedFile?.type);

  // Object URL only for images. Other files are never rendered.
  useEffect(() => {
    if (!selectedFile || !isImage) {
      setImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile, isImage]);

  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const handleHidden = () => onClose && onClose();
    modalEl.addEventListener("hidden.bs.modal", handleHidden);

    return () => modalEl.removeEventListener("hidden.bs.modal", handleHidden);
  }, [onClose]);

  // User has confirmed to send the attachment
  const handleSendBtn = () => {
    sendAttachment();
    closeModalRef.current.click();
  }

  // Save image to the local device
  const saveFile = () => {
    saveBlobToDevice(selectedFile, selectedFile.name || `M-${Date.now()}`);
  }

  return (
    <div>
      <button ref={previewBtnRef} type="button" className="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
        Launch preview modal
      </button>
      <div ref={modalRef} className="modal fade" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="staticBackdropLabel">{isImage ? selectedFile.name : "Send file"}</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body text-center">
              {isImage ? (
                <img src={imageUrl} alt="Preview" className="img-fluid" />
              ) : (
                <div>
                  <h5 className="text-break">{selectedFile?.name}</h5>
                  <p className="text-body-secondary mb-2">
                    {selectedFile ? formatFileSize(selectedFile.size) : ""}
                  </p>
                  <small className="text-body-secondary">
                    No preview for this file type. The receiver will download it directly.
                  </small>
                </div>
              )}
            </div>
            <div className="d-flex modal-footer">
              {fileDownloadFlag.current ? (
                <button className="btn w-100 submit-button" onClick={saveFile}>Download</button>
              ) : (
                <div className="d-flex w-100 gap-2">
                  <button ref={closeModalRef} type="button" className="btn w-50 red-btn" data-bs-dismiss="modal">Cancel</button>
                  <button type="button" className="btn w-50 submit-button" onClick={handleSendBtn}>Send</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilePreview