import addSVG from "../assets/add_svg_icon.svg"
import { useNavigate, useLocation } from 'react-router-dom';

// "+ Post" button in the navbar: opens the new post page (posting happens there)
function SubmitButton(props) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className={["/terms-and-conditions", "/privacy-policy"].includes(location.pathname) ? "d-none" : ""}>
            <button
                type="button"
                className={`btn submit-button d-flex align-items-center justify-content-center gap-1 ${props.menu ? "navbar-menu-action navbar-new-post" : "w-100"
                    }`}
                onClick={() => navigate("/submit-secret")}
            >
                <span className="navbar-menu-icon">
                    <img src={addSVG} alt="" width="24" height="24" />
                </span>

                <span className="navbar-post-desktop-label">+ Post</span>

                <span className="navbar-post-mobile-copy mx-2">
                    <strong>New post</strong>
                    <small>Share anonymously</small>
                </span>
            </button>
        </div>
    )
}

export default SubmitButton
