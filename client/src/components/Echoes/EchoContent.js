import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { convertTimestampToReadable } from '../../dataProcessing/dataProcessing';
import Spinner from '../Spinner';

function EchoContent(props) {
    const { id } = useParams();
    const [echoData, setEchoData] = useState({ id: id, echo: "", timestamp: 0, status: "Checking..." });
    const [loading, setLoading] = useState(false)

    const loadEcho = async () => {
        try {
            setLoading(true);
            const data = (await axios.get(`${process.env.REACT_APP_API_URL}/echoes/echo/${id}`)).data;
            setEchoData(prev => ({
                ...prev,
                ...data
            }));
        }
        catch (echoLoadingError) {
            props.alert("Something went wrong!", "alert");
        }
        finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadEcho();
    }, [])

    return (
        <>
            {loading && <Spinner isCenter={true} />}
            <div className='container mt-5'>
                {/* Post header section */}
                <div>
                    <p className="card-text my-1">
                        <span className='text-body-secondary'>{convertTimestampToReadable(echoData.timestamp)}</span>
                        <span className="text-body-secondary mx-3">{`\u00B7`}</span>
                        <span style={{
                            color: echoData.status === "completed"
                                ? "#22C55E"
                                : echoData.status === "failed"
                                    ? "#D0342C"
                                    : "#A3A3A34"
                        }}>
                            {echoData.status.charAt(0).toUpperCase() + echoData.status.slice(1)}
                        </span>
                    </p>
                </div>

                {/* Green dash */}
                <div className="card-accent mt-4" />

                {/* Divider */}
                <div className="post-divider"></div>

                {/* Post body section */}
                <div className='my-5'>
                    <p className='post-content fs-5'>{echoData.echo}</p>
                </div>

                {/* Divider */}
                <div className="post-divider"></div>
            </div>
        </>
    )
}

export default EchoContent
