import { useContext, useState, useEffect } from 'react'
import addSVG from "../assets/add_svg_icon.svg"
import PostContext from '../context/posts/postContext';
import { useNavigate, useLocation } from 'react-router-dom';

function SubmitButton(props) {
    const navigate = useNavigate();
    const location = useLocation();
    const [btnDisabled, setDisability] = useState(false);
    const { content, submitPost, contentType } = useContext(PostContext);

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
                props.alert("Shhh... delivering your post", "primary");
                await submitPost();
                if (contentType === 0) {
                    props.alert("Your vibe was sent.", "success");
                    navigate("/")
                }
                else if (contentType === 1) {
                    props.alert("Your echo was sent.", "success");
                    navigate("/echoes")
                }
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
        if (contentType === 0) {
            if (content.title.trim().length < 3 || content.content.trim().length < 3) {
                setDisability(true);
            }
            else {
                setDisability(false);
            }
        }

        if (contentType === 1) {
            if (content.content.trim().length < 3) {
                setDisability(true);
            }
            else {
                setDisability(false);
            }
        }

    }, [content, currentPath]);

    return (
        <div className={`${location.pathname === '/terms-and-conditions' ? "d-none" : ""}`}>
            <button className="btn submit-button d-flex align-items-center justify-content-center gap-1 w-100"
                onClick={navigateToSubmitSecret} disabled={btnDisabled}>
                {currentPath ? "" : <img src={addSVG} alt="submitButton" width="24px" height="24px" />}
                {currentPath ? "Submit" : "Post"}
            </button>
        </div>
    )
}

export default SubmitButton
