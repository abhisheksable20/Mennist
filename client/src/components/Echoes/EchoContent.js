import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { convertTimestampToReadable } from '../../dataProcessing/dataProcessing';
import Spinner from '../Spinner';
import MatchingEchoesItems from './MatchingEchoesItems';
import "../../styles/Echo.css"

function EchoContent(props) {
    const { id } = useParams();
    const [echoData, setEchoData] = useState({ id: id, echo: "", timestamp: 0, status: "Checking..."});
    const [matchingEchoes, setMatchingEchoes] = useState([]);
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
            props.alert("Something Went Wrong!", "alert");
        }
        finally {
            setLoading(false);
        }
    }

    const loadMatchingEchoes = async () => {
        try {
            const data = (await axios.get(`${process.env.REACT_APP_API_URL}/echoes/${id}`)).data;
            setMatchingEchoes(data);
        } 
        catch (matchingError) {
            props.alert("Failed To Load Matching Echoes!", "alert");
        }
    }

    useEffect(() => {
        loadEcho();
        loadMatchingEchoes();
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
                                    : "#A3A3A3"
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

                {/* Matching Echoes */}
                <div className="matching-echoes-section" >
                    <h3 className="matching-echoes-title">
                        Matching Echoes
                    </h3>
                    <h6 className="matching-echoes-description">
                        Echoes that share similar thoughts, feelings, or experiences.
                    </h6>

                    {matchingEchoes.map((echo, index) => {
                        return <MatchingEchoesItems echo={echo} key={index}/>
                    })}
                </div>

            </div>
        </>
    )
}

export default EchoContent
