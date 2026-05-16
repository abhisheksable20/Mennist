import React, { useContext, useState, useEffect } from 'react'
import submitSVG from "../assets/anonymous_svg_icon.svg"
import PostContext from '../context/posts/postContext';
import { useNavigate, useLocation } from 'react-router-dom';

function SubmitButton(props) {
    const navigate = useNavigate();
    const location = useLocation();
    const [btnDisabled, setDisability] = useState(false);
    const { content, submitPost } = useContext(PostContext);

    // The user is submit post page change the button to submit to submit post
    const currentPath = location.pathname === "/submit-secret";

    // Navigate to submit secret component
    const navigateToSubmitSecret = async () => {
        if (!currentPath) {
            navigate("/submit-secret");
        }

        // Submit post we are in submit secret page
        else {
            setDisability(true);
            try {
                props.alert("Shhh... your secret is on its way", "primary");
                await submitPost();
                props.alert("Confession delivered successfully", "success");
                navigate("/")
            } 
            catch (submitErr) {
                props.alert("Something went wrong!", "alert");
            }
            finally {
                setDisability(false);
            }
        }
    }

    // Handle content validation submit btn
    useEffect(() => {
        if (!currentPath) {
            setDisability(false);
            return;
        }

        // validate the data before submitting
        if (content.title.trim().length < 3 || content.content.trim().length < 3) {
            setDisability(true);
        } else {
            setDisability(false);
        }

    }, [content, currentPath]);

    return (
        <div>
            <button className="btn submit-button d-flex align-items-center justify-content-center gap-2 w-100"
                onClick={navigateToSubmitSecret} disabled={btnDisabled}>
                <img src={submitSVG} alt="submitButton" width="24px" height="24px" />
                {currentPath ? "Submit" : "Post Secret"}
            </button>
        </div>
    )
}

export default SubmitButton
