import React, { useEffect, useState, useRef } from 'react'
import "../styles/ReportModal.css"
import { formatFileSize } from '../dataProcessing/dataProcessing';

function FilePreview(props) {
  const { previewBtnRef, selectedFile, sendAttachment, fileDownloadFlag } = props;
  const [imageUrl, setImageUrl] = useState(null);
  const closeModalRef = useRef(null);

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile])

  // Generating preview for image url
  const generateImagePreviewURL = () => {
    return URL.createObjectURL(selectedFile);
  }

  // User has confirm to send the attachement
  const handleSendBtn = () => {
    sendAttachment();
    closeModalRef.current.click();
  }

  // Save file in local device
  const saveFile = ()=>{
    const url = URL.createObjectURL(selectedFile);

    const a = document.createElement("a");
    a.href = url;
    a.download = `M-${Date.now()}`;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <button ref={previewBtnRef} type="butto n" className="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
        Launch preview modal
      </button>
      <div className="modal fade" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="staticBackdropLabel">{selectedFile && selectedFile.type.startsWith("image/") ? selectedFile.name : "File Upload"}</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body text-center">
              {selectedFile?.type.startsWith("image/") ? (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="img-fluid"
                />
              ) : (
                <div>
                  <h5>{selectedFile?.name}</h5>

                  <p className="text-body-secondary">
                    {formatFileSize(selectedFile?.size)}
                  </p>
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
