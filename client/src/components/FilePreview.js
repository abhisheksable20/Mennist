import React from 'react'

function FilePreview(props) {
  const { fileUrl, fileName, fileSize, fileType } = props;
  const isImage = fileType?.startsWith("image/");

  return (
    <div>
      {isImage && (
        <div className='file-preview-card'>
          <div className='image-preview-wrapper'>
            <img src={fileUrl} className='preview-image'/>
          </div>
        </div>)
      }
    </div>
  )
}

export default FilePreview
