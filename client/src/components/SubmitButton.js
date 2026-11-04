import { useContext, useState, useEffect } from 'react'
import addSVG from "../assets/add_svg_icon.svg"
import PostContext from '../context/posts/postContext';
import { useNavigate, useLocation } from 'react-router-dom';

function SubmitButton(props) {
    const navigate = useNavigate();
    const location = useLocation();
    const [btnDisabled, setBtnDisabled] = useState(false);
    const { content, submitPost, contentType } = useContext(PostContext);

    // The user is submit post page change the button to submit to submit post
    const currentPath = location.pathname === "/submit-secret";

    const isSubmitPage = location.pathname === "/submit-secret";

    // Navigate to submit secret component
    const navigateToSubmitSecret = async () => {
        if (!currentPath) {
            navigate("/submit-secret");
        }

        // Submit post we are in submit secret page
        else {
            setBtnDisabled(true);
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
                if (submitErr.response?.status === 401) {
                    props.alert("Please start a new session.", "alert");
                    navigate("/setup-user")
                }
                props.alert("Something went wrong!", "alert");
            }
            finally {
                setBtnDisabled(false);
            }
        }
    }

    // Handle content validation submit btn
    useEffect(() => {
        if (!currentPath) {
            setBtnDisabled(false);
            return;
        }

        // validate the data before submitting
        if (contentType === 0) {
            if (content.title.trim().length < 3 || content.content.trim().length < 3) {
                setBtnDisabled(true);
            }
            else {
                setBtnDisabled(false);
            }
        }

        if (contentType === 1) {
            if (content.content.trim().length < 3) {
                setBtnDisabled(true);
            }
            else {
                setBtnDisabled(false);
            }
        }

    }, [content, currentPath]);

    return (
        <div className={["/terms-and-conditions", "/privacy-policy"].includes(location.pathname) ? "d-none" : ""}>
            <button
                type="button"
                className={`btn submit-button d-flex align-items-center justify-content-center gap-1 ${props.menu ? "navbar-menu-action navbar-new-post" : "w-100"
                    }`}
                onClick={navigateToSubmitSecret}
                disabled={btnDisabled}
            >
                <span className="navbar-menu-icon">
                    <img src={addSVG} alt="" width="24" height="24" />
                </span>

                <span className={`navbar-post-desktop-label ${isSubmitPage ? "show-mobile-submit-label" : ""}`}>
                    {isSubmitPage ? "Submit" : "+ Post"}
                </span>

                {!isSubmitPage && (
                    <span className="navbar-post-mobile-copy mx-2">
                        <strong>New post</strong>
                        <small>Share anonymously</small>
                    </span>
                )}
            </button>
        </div>
    )
}

export default SubmitButton
