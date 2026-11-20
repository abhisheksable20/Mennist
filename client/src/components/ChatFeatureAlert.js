import { useState } from "react";

// Closed by React (not Bootstrap's data-bs-dismiss): Bootstrap removing the
// node itself crashes React when this alert is later unmounted.
function ChatFeatureAlert() {
    const [closed, setClosed] = useState(false);
    if (closed) return null;

    return (
        <div className="alert alert-danger alert-danger-bg alert-dismissible fade show my-0" role="alert">
            Your chat is disabled. Enable it to start conversations.
            {" "}
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setClosed(true)}></button>
        </div>
    )
}

export default ChatFeatureAlert
