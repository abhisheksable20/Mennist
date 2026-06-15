import React from 'react'
import { PuffLoader } from "react-spinners";

function ChatLoading(props) {
    return (
        <div className='w-100 d-flex justify-content-center align-items-center gap-3 py-3'
            style={{
                height: "34px",
                background: "#1F1F1F",
                border: "1px solid #2E2E2E"
            }}>
            <PuffLoader
                color='#22C55E'
                size={24}
                loading={true} />
            <span style={{ color: "#FAFAFA", fontFamily: "'Open Sans', sans-serif" }}>Loading chats...</span>
        </div>
    )
}

export default ChatLoading
