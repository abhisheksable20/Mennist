import { useContext, useState } from "react";
import ChatsContext from "../context/chats/chatsContext";
import MenuSwitch from "./MenuSwitch";

const TicksIcon = () => (
    <svg width="20" height="14" viewBox="0 0 24 16" fill="none" stroke="#4ADE80" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1.5 8.5l4 4L15 3" /><path d="M9.5 12.5L19 3" />
    </svg>
);

// Off: others don't see when you read their messages, and you don't see theirs
function ReadReceiptsButton(props) {
    const { readReceipts, changeReadReceipts } = useContext(ChatsContext);
    const [saving, setSaving] = useState(false);

    const toggle = async (e) => {
        const on = e.target.checked;
        setSaving(true);
        try {
            await changeReadReceipts(on);
            props.alert(on ? "Read receipts are on." : "Read receipts are off.", "success");
        }
        catch (receiptsErr) {
            props.alert("Something went wrong!", "alert");
        }
        finally {
            setSaving(false);
        }
    }

    return (
        <MenuSwitch
            menu={props.menu}
            id={props.menu ? "readReceiptsMenuSwitch" : "readReceiptsSwitch"}
            icon={<TicksIcon />}
            title="Read receipts"
            subtitle="Show read ticks"
            shortTitle={<><span className="receipts-label">Read receipts</span><span className="receipts-icon" title="Read receipts"><TicksIcon /></span></>}
            checked={readReceipts}
            onChange={toggle}
            disabled={saving} />
    )
}

export default ReadReceiptsButton
