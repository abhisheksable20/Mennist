import { convertTimestampToReadable } from "../../dataProcessing/dataProcessing";
import "../../styles/Echo.css"
import chatSVG from "../../assets/chat_round-svg.svg"

function SimilarEchoModal(props) {
    const { echo, startConversation } = props;

    if (!echo) {
        return (
            <div
                className="modal fade"
                id="echoModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content echo-modal-content">
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="modal fade"
            id="echoModal"
            tabIndex="-1"
            aria-labelledby="echoModalLabel"
            aria-hidden="true">
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

                        {/* Timestamp */}
                        <div className="echo-modal-time">
                            {convertTimestampToReadable(echo.timestamp)}
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
    )
}

export default SimilarEchoModal
