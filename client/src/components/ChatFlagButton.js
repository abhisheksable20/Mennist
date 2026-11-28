import { useState, useEffect, useContext } from 'react'
import "../styles/LandingPage.css"
import ChatsContext from '../context/chats/chatsContext'
import chatSVG from "../assets/chat_round-svg.svg";
import MenuSwitch from "./MenuSwitch";

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
        <MenuSwitch
            menu={props.menu}
            id={props.menu ? "chatFlagMenuSwitch" : "chatFlagSwitch"}
            icon={<img src={chatSVG} alt="" />}
            title="Allow chats"
            subtitle="Chat with others"
            shortTitle="Chat"
            checked={chatFlag}
            onChange={enableDisableChat}
            disabled={loading} />
    )
}

export default ChatFlagButton
