import "../../styles/Avatar.css";
import WhiteDeleteSVG from "../../assets/delete_svg_white.svg"
import RedDeleteSVG from "../../assets/delete_svg_icon.svg"
import AlertSVG from "../../assets/alert_svg.svg"
import axios from "axios";
import { useState, useRef } from "react";
import { deleteUserInternalData } from "../../internalDatabase/UserData";

function DeleteUserProfile(props) {
    const { deleteBtnRef, profileDeleted } = props;
    const [deleteFlag, setDeleteFlag] = useState(false);
    const closeBtnRef = useRef(null);

    const executeDeleteProfile = async () => {
        try {
            setDeleteFlag(true);

            await axios.delete(`${process.env.REACT_APP_API_URL}/user/delete-account`, { withCredentials: true });
            deleteUserInternalData(true);

            closeBtnRef.current.click();
            profileDeleted();
        }
        catch (deleteError) {
            console.log("Failed to delete the data: ", deleteError)
        }
        finally {
            setDeleteFlag(false);
        }
    }

    return (
        <>
            {/* Hidden Bootstrap modal trigger */}
            <button ref={deleteBtnRef} type="button" className="d-none" data-bs-toggle="modal" data-bs-target="#staticBackdrop" />

            {/* Delete Profile Modal */}
            <div
                className="modal fade mennist-delete-modal"
                id="staticBackdrop"
                data-bs-backdrop="static"
                data-bs-keyboard="false"
                tabIndex="-1"
                aria-labelledby="deleteProfileModalLabel"
                aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content mennist-delete-modal-content">

                        <button ref={closeBtnRef} type="button" className="mennist-delete-modal-close" data-bs-dismiss="modal" aria-label="Close"></button>

                        <div className="mennist-delete-modal-icon">
                            <img src={RedDeleteSVG} alt="Delete Profile" />
                        </div>

                        <h2 id="deleteProfileModalLabel">
                            Delete My Profile?
                        </h2>

                        <p className="mennist-delete-modal-description">
                            This will permanently delete your profile
                            and all your data from Mennist, including
                            your posts, chats, echoes, veil, and any
                            other associated information.
                        </p>

                        <div className="mennist-delete-modal-warning">
                            <img src={AlertSVG} width={24} height={24} alt="Delete Profile Button" />
                            <span>This action cannot be undone.</span>
                        </div>

                        <div className="mennist-delete-modal-actions">
                            <button type="button" className="mennist-delete-cancel" data-bs-dismiss="modal">
                                Cancel
                            </button>

                            <button
                                type="button"
                                title="Delete Profile"
                                className="mennist-delete-confirm"
                                disabled={deleteFlag}
                                onClick={executeDeleteProfile}>
                                <img src={WhiteDeleteSVG} alt="Delete Profile Button" />
                                <span>{deleteFlag ? "Deleting..." : "Delete Profile"}</span>
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    )
}

export default DeleteUserProfile
