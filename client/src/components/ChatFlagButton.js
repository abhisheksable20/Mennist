import { useState, useEffect, useContext } from 'react'
import "../styles/LandingPage.css"
import ChatsContext from '../context/chats/chatsContext'

function ChatFlagButton(props) {
    const {changeChatFlag, setChatFlag, chatFlag} = useContext(ChatsContext);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setChatFlag(localStorage.getItem("chatEnableStatus") === "true");
    }, []);

    // Enable or disable chats for the user
    const enableDisableChat = async (e) => {
        if (loading) return;
        setLoading(true);
        try {
            const isChecked = e.target.checked;
            await changeChatFlag(isChecked);
            if (isChecked)
                props.alert("You're now available to chat.", "success");
            else
                props.alert("You're no longer available to chat.", "success");
        } 
        catch (chatFlagError) {
            props.alert("Something went wrong!", "alert");
        }
        finally{
            setLoading(false);
        }
    }

    return (
        <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0 post-title mx-2">Chat</h5>
            <div className="large-switch form-check form-switch mb-0">
                <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="switchCheckDefault"
                    checked={chatFlag}
                    onChange={enableDisableChat}
                    disabled={loading}
                />
            </div>
        </div>
    )
}

export default ChatFlagButton
