import { convertTimestampToReadable } from "../../dataProcessing/dataProcessing";
import "../../styles/Echo.css"
import chatSVG from "../../assets/chat_round-svg.svg"
import ReportPostComponent from "../ReportPostComponent";
import { useRef } from "react";

function SimilarEchoModal(props) {
    const { echo, startConversation } = props;
    const reportBtnRef = useRef(null);

    // Report Echo Btn Handler
    const reportEchoBtn = () => {
        reportBtnRef.current.click();
    }

    if (!echo) {
        return (
            <div
                className="modal fade"
                id="echoModal"
                tabIndex="-1"
                aria-hidden="true"
                data-bs-backdrop="static"
                data-bs-keyboard="false"
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content echo-modal-content">
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                className="modal fade"
                id="echoModal"
                tabIndex="-1"
                aria-labelledby="echoModalLabel"
                aria-hidden="true"
                data-bs-backdrop="static"
                data-bs-keyboard="false">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content echo-modal-content">

                        {/* Close button */}
                        <button
                            type="button"
                            className="btn-close echo-modal-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        >
                        </button>

                        {/* Modal body */}
                        <div className="modal-body echo-modal-body">

                            {/* Similarity */}
                            <div className="echo-modal-match">
                                <span className="echo-modal-match-dot"></span>

                                {echo.similarityScore}% Match
                            </div>

                            {/* Echo content */}
                            <p
                                id="echoModalLabel"
                                className="echo-modal-text"
                            >
                                {echo.echo}
                            </p>

                            {/* Timestamp & ReportPost */}
                            <div className="d-flex align-items-center justify-content-between gap-2 echo-modal-meta">
                                <div className="echo-modal-time">
                                    {convertTimestampToReadable(echo.timestamp)}
                                </div>

                                {/* Report Echo Btn */}
                                <button
                                    type="button"
                                    className="btn echo-modal-report-button"
                                    aria-label="Report echo"
                                    onClick={reportEchoBtn}>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M4 22V4" />
                                        <path d="M4 4c7-4 9 4 16 0v12c-7 4-9-4-16 0" />
                                    </svg>
                                    Report
                                </button>
                            </div>

                            {/* Start Conversation */}
                            <button
                                type="button"
                                className="echo-modal-chat-button"
                                onClick={() => startConversation(echo)}
                                data-bs-dismiss="modal">

                                <img src={chatSVG} alt="Chat Button" width="24px" height="24px" />

                                Start Conversation
                            </button>

                        </div>

                    </div>
                </div>
            </div>
            <ReportPostComponent reportBtnRef={reportBtnRef} postId={echo.echoId} chatId={echo.chatId} alert={props.alert}
            />
        </>
    )
}

export default SimilarEchoModal
