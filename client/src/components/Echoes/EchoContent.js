import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { convertTimestampToReadable } from '../../dataProcessing/dataProcessing';
import Spinner from '../Spinner';
import ReloadSVG from "../../assets/reload_svg.svg";
import MatchingEchoesItems from './MatchingEchoesItems';
import SimilarEchoModal from './SimilarEchoModal';
import { db } from '../../internalDatabase/db'
import "../../styles/Echo.css"

function EchoContent(props) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [echoData, setEchoData] = useState({ id: id, echo: "", timestamp: 0, status: "Checking..." });
    const [matchingEchoes, setMatchingEchoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEcho, setSelectedEcho] = useState(null);
    const [rematching, setRematching] = useState(false);

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

    // Start the conversation with the user
    const startConversation = async (echo) => {
        if (echo.chatId) {
            const userChatId = (await db.keys.get("user-keypair")).chatId;
            if (echo.chatId === userChatId) {
                navigate('/my-chats');
                return;
            }

            navigate(`/user-chat/${echo.chatId}`)
        }
    }

    // Rechecking the echo matches of the echo post
    const recheckEchoMatches = async () => {
        if (!id) {
            console.log("Echo ID is missing.")
            return
        }

        try {
            setRematching(true);
            await axios.get(`${process.env.REACT_APP_API_URL}/echoes/rematch/${id}`);
            setEchoData(prev => ({
                ...prev,
                status: "processing"
            }));
        }
        catch (error) {
            console.log(error);
        }
        finally {
            setRematching(false);
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
                <div className="echo-header">
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

                    <button
                        type="button"
                        className={`echo-rematch-button ${rematching ? 'is-rematching' : ''}`}
                        aria-label="Rematch echo"
                        title={rematching ? "Checking..." : "Rematch Echo"}
                        onClick={recheckEchoMatches}
                        disabled={rematching}>
                        <img src={ReloadSVG} alt="Reload Echo" />
                    </button>
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
                        {matchingEchoes.length === 0 ? "No Echoes In Sync Yet" : "Matching Echoes"}

                    </h3>
                    <h6 className="matching-echoes-description">
                        {matchingEchoes.length === 0
                            ? "This echo hasn't found its match. Maybe the next one will."
                            : "Echoes that share similar thoughts, feelings, or experiences."}
                    </h6>

                    {matchingEchoes.map((echo, index) => {
                        return <MatchingEchoesItems
                            echo={echo}
                            key={index}
                            onClick={() => setSelectedEcho(echo)} />
                    })}

                </div>

                <SimilarEchoModal echo={selectedEcho} startConversation={startConversation} alert={props.alert} />
            </div>
        </>
    )
}

export default EchoContent
