import React from 'react'
import "../styles/ReportModal.css"
import axios from 'axios';
import { useContext, useRef } from 'react';
import ChatsContext from '../context/chats/chatsContext';

function DeleteChatComponent(props) {
  const { deleteBtnRef, setSelectedChatId, selectedChatId } = props;
  const { deleteUserChats } = useContext(ChatsContext);
  const closeBtnRef = useRef(null);

  // This function will trigger when the delete chat button is clicked
  const handleDeleteChat = async () => {
    if (!selectedChatId) {
      return;
    }

    const isDeleted = await deleteUserChats(selectedChatId);
    setSelectedChatId(null);

    closeBtnRef.current.click();
  }

  return (
    <div>
      <button ref={deleteBtnRef} type="button" className="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#exampleModal">
        Launch Delete Chat Modal
      </button>

      <div className="modal-dialog modal-dialog-centered">
        <div className="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h1 className="modal-title fs-5" id="exampleModalLabel">Delete this conversation?</h1>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <small className='report-msg'>This conversation will be permanently deleted from your chats. Once deleted,
                  you won't be able to view or restore any messages from this conversation.<br /><br />
                  Are you sure you want to continue?
                </small>
              </div>
              <div className="d-flex modal-footer">
                <button ref={closeBtnRef} type="button" className="btn w-50" data-bs-dismiss="modal" style={{ background: "#FAFAFA", color: "#0D0D0D" }}>Close</button>
                <button type="button" className="btn w-50" style={{ background: "#D0342C", color: "#FAFAFA" }} onClick={handleDeleteChat}>Delete Chat</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeleteChatComponent
