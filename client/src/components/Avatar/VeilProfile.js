import { useEffect, useState } from 'react'
import { db } from '../../internalDatabase/db'
import AvatarEditor from './AvatarEditor'
import { useNavigate } from 'react-router-dom'

function VeilProfile(props) {
    const [chatId, setChatId] = useState(null);
    const navigate = useNavigate();

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
        if(type === "success")
            navigate("/");
    }

    return (
        <div className="container mt-5 mb-5">
            {chatId ? <AvatarEditor chatId={chatId} alert={showToast}/> : ""}
        </div>
    )
}

export default VeilProfile
