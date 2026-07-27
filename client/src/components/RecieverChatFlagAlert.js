import React from 'react'

function RecieverChatFlagAlert() {
    return (
        <div className="alert alert-danger alert-danger-bg alert-dismissible fade show my-0" role="alert">
            Chat is currently unavailable for this person.
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    )
}

export default RecieverChatFlagAlert
