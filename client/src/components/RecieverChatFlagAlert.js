import { useState } from "react";

// Closed by React (not Bootstrap's data-bs-dismiss), see ChatFeatureAlert.
function RecieverChatFlagAlert() {
    const [closed, setClosed] = useState(false);
    if (closed) return null;

    return (
        <div className="alert alert-danger alert-danger-bg alert-dismissible fade show my-0" role="alert">
            Chat is currently unavailable for this person.
            {" "}
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setClosed(true)}></button>
        </div>
    )
}

export default RecieverChatFlagAlert
