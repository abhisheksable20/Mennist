import { useEffect, useState, useRef } from 'react'
import { db } from '../../internalDatabase/db'
import AvatarEditor from './AvatarEditor'
import { useNavigate } from 'react-router-dom'
import DeleteUserProfile from './DeleteUserProfile'
import WhiteDeleteSVG from "../../assets/delete_svg_white.svg"
import RedDeleteSVG from "../../assets/delete_svg_icon.svg"

function VeilProfile(props) {
    const [chatId, setChatId] = useState(null);
    const navigate = useNavigate();
    const deleteBtnRef = useRef(null);

    useEffect(() => {
        document.title = "Mennist | Veil Profile"
        const getChatId = async () => {
            try {
                const keys = await db.keys.get("user-keypair")
                if (keys?.chatId) {
                    setChatId(keys.chatId);
                }
            } catch (chatIdFetchErr) {
                console.log("Error fetching chat ID: ", chatIdFetchErr)
            }
        }

        getChatId();

    }, []);

    const showToast = (msg, type) => {
        props.alert(msg, type);
        if (type === "success")
            navigate("/");
    }

    const openDeleteProfileModal = () => {
        deleteBtnRef.current.click();
    }

    const profileDeleted = () => {
        props.alert("WE WILL MISS YOU!", "alert");
        setTimeout(() => {
            navigate("/setup-user");
        }, 2000);
    }

    return (
        <div className="container mt-5 mb-5">
            {chatId ? <AvatarEditor chatId={chatId} alert={showToast} /> : ""}
            <section
                className="mennist-delete-profile"
                aria-labelledby="mennist-delete-profile-title"
            >
                <div className="mennist-delete-profile-icon" aria-hidden="true">
                    <img src={RedDeleteSVG} alt='Delete Profile' width={24} height={24} />
                </div>

                <div className="mennist-delete-profile-copy">
                    <h3 id="mennist-delete-profile-title">
                        Delete My Profile
                    </h3>
                    <p>
                        Permanently delete your profile and all associated data.
                    </p>
                    <span>This action is irreversible.</span>
                </div>

                <button
                    type="button"
                    className="mennist-delete-profile-button"
                    onClick={openDeleteProfileModal}>
                    <img src={WhiteDeleteSVG} alt='Delete Profile' width={24} height={24} />
                    <span>Delete My Profile</span>
                </button>

                <button
                    type="button"
                    className="mennist-delete-profile-mobile-arrow"
                    aria-label="Delete my profile"
                    onClick={openDeleteProfileModal}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            d="m9 18 6-6-6-6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </section>

            <DeleteUserProfile deleteBtnRef={deleteBtnRef} profileDeleted={profileDeleted} />
        </div>
    )
}

export default VeilProfile
