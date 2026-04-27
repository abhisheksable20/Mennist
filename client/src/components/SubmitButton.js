import React from 'react'
import submitSVG from "../assets/anonymous_svg_icon.svg"
import { useNavigate } from 'react-router-dom';

function SubmitButton() {
    const navigate = useNavigate();

    // Navigate to submit secret component
    const navigateToSubmitSecret = () => {
        navigate("/submitSecret");
    }

    return (
        <div>
            <button class="btn submit-button d-flex align-items-center gap-2" onClick={navigateToSubmitSecret}>
                <img src={submitSVG} alt="submitButton" width="24px" height="24px"/>
                Post Secret
            </button>
        </div>
    )
}

export default SubmitButton
