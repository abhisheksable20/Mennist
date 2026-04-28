import React from 'react'
import submitSVG from "../assets/anonymous_svg_icon.svg"
import { useNavigate, useLocation } from 'react-router-dom';

function SubmitButton() {
    const navigate = useNavigate();
    const location = useLocation();

    // The user is submit post page change the button to submit to submit post
    const currentPath = location.pathname === "/submitSecret";

    // Navigate to submit secret component
    const navigateToSubmitSecret = () => {
        if(!currentPath)
            navigate("/submitSecret");
    }

    return (
        <div>
            <button class="btn submit-button d-flex align-items-center gap-2" onClick={navigateToSubmitSecret}>
                <img src={submitSVG} alt="submitButton" width="24px" height="24px" />
                {currentPath ? "Submit" : "Post Secret"}
            </button>
        </div>
    )
}

export default SubmitButton
