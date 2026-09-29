import { useNavigate } from 'react-router-dom';
import { convertTimestampToReadable } from '../../dataProcessing/dataProcessing';

function EchoPostItem(props) {
    const navigate = useNavigate();
    const { timestamp, echo, status, id } = props.echo

    return (
        <div className="col-12 col-md-6 col-lg-4">
            <div className="card h-100">
                <div
                    className="card-body d-flex flex-column"
                    onClick={() => navigate(`/echoes/${id}`)}>
                    {/* Green dash */}
                    <div className="card-accent mt-2" />

                    {/* Content */}
                    <p className="card-text" style={{ color: "#FAFAFA" }}>
                        {echo.length > 100 ?
                            echo.substring(0, 150) + "..." :
                            echo
                        }
                    </p>

                    {/* Footer */}
                    <div className='d-flex justify-content-between mt-auto'>
                        {/* Display date when the post was uploaded */}
                        <p className="card-text my-1"><small className="text-body-secondary">{convertTimestampToReadable(timestamp)}</small></p>
                        <p className="card-text my-1"><small style={{
                            color: status === "completed"
                                ? "#22C55E"
                                : status === "failed"
                                    ? "#D0342C"
                                    : "#A3A3A3"
                        }}>{status.charAt(0).toUpperCase() + status.slice(1)}</small></p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EchoPostItem
