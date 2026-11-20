import { useEffect, useState } from 'react';
import Avatar from '../Avatar/Avatar';
import { loadAvatar } from '../Avatar/avatarService';
import { db } from '../../internalDatabase/db';

function PostHeaders(props) {
    const { splText, heading, subHeading } = props;
    const [userAvatar, setUserAvatar] = useState(null);

    useEffect(() => {
        getUserAvatar();
    }, []);

    // Fetch user avatar first from the local storage then from the server
    const getUserAvatar = async () => {
        let avatar = localStorage.getItem("mennist-avatar");
        if (avatar) {
            setUserAvatar(JSON.parse(avatar));
            return;
        }

        try {
            // No key pair yet (fresh browser, not set up): nothing to show
            const chatId = (await db.keys.get("user-keypair"))?.chatId;
            if (!chatId)
                return;

            avatar = await loadAvatar(chatId);
            localStorage.setItem("mennist-avatar", JSON.stringify(avatar));
            setUserAvatar(avatar);
        }
        catch (error) {
            console.log("Something went wrong!")
        }
    }

    return (
        <div className="posts-heading">
            <div className="posts-heading-content">
                <h6 className="special-text">{splText}</h6>

                <h2 className="card-text">
                    {heading}
                </h2>

                <h6 className="text-body-secondary mb-4">
                    {subHeading}
                </h6>
            </div>

            <div className="posts-heading-avatar">
                <div className="posts-avatar-tile">
                    {userAvatar ? <Avatar avatar={userAvatar} size={64} title="Your Veil" /> : ""}
                </div>
            </div>
        </div>
    )
}

export default PostHeaders
