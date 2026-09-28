import "../../styles/Echo.css"
import { convertTimestampToReadable } from "../../dataProcessing/dataProcessing"

function MatchingEchoesItems(props) {
    const { echo, similarityScore, timestamp } = props.echo;
    const truncatedEcho = echo.length > 150 ? echo.slice(0, 150) + "..." : echo;

    return (
        <div
            className="matching-echo-item px-2"
            onClick={props.onClick}
            role="button"
            tabIndex="0"
            data-bs-toggle="modal"
            data-bs-target="#echoModal">
            {/* Similarity */}
            <div className="matching-echo-score">
                <strong>{similarityScore}%</strong>

                <div className="similarity-bar">
                    <div
                        className="similarity-fill"
                        style={{ width: `${similarityScore}%` }}
                    />
                </div>
            </div>
            {/* Echo content */}
            <div className="matching-echo-content">

                <p className="matching-echo-text mt-1">
                    {truncatedEcho}
                </p>

                <div className="matching-echo-meta">
                    <span className="text-body-secondary mt-1">
                        {convertTimestampToReadable(timestamp)}
                    </span>
                </div>

            </div>
        </div>
    )
}

export default MatchingEchoesItems
