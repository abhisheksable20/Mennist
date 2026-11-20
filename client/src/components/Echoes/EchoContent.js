import { useContext, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { convertTimestampToReadable } from '../../dataProcessing/dataProcessing';
import Spinner from '../Spinner';
import ReloadSVG from "../../assets/reload_svg.svg";
import MatchingEchoesItems from './MatchingEchoesItems';
import SimilarEchoModal from './SimilarEchoModal';
import { db } from '../../internalDatabase/db'
import "../../styles/Echo.css"
import CoinsContext from '../../context/coins/CoinsContext';
import CoinIcon from '../Coins/CoinIcon';
import RematchConfirmModal from '../Coins/RematchConfirmModal';
import { coinError, rematchEcho } from '../Coins/coinApi';

// Remember that the user already confirmed a paid rematch once
const CONFIRMED_KEY = "mennist-rematch-confirmed";
const readConfirmed = () => {
    try { return localStorage.getItem(CONFIRMED_KEY) === "1"; } catch (e) { return false; }
};
const saveConfirmed = () => {
    try { localStorage.setItem(CONFIRMED_KEY, "1"); } catch (e) { /* private mode */ }
};

// While matching runs, check the result this often, for at most this long
const POLL_MS = 6000;
const POLL_FOR_MS = 3 * 60 * 1000;

function EchoContent(props) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [echoData, setEchoData] = useState({ id: id, echo: "", timestamp: 0, status: "Checking..." });
    const [matchingEchoes, setMatchingEchoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEcho, setSelectedEcho] = useState(null);
    const [rematching, setRematching] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const coins = useContext(CoinsContext);
    const wallet = coins ? coins.wallet : null;
    const rematchInfo = wallet ? wallet.rematch : null;
    const [watching, setWatching] = useState(false);
    // "Matching" only while we are still checking; after that the button opens
    // again and the server decides (it refunds and unlocks stuck rematches).
    const isMatching = echoData.status === "processing" && watching;
    const pollStart = useRef(0);

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
            if (echoLoadingError.response?.status === 401) {
                props.alert("Please start a new session.", "alert");
                navigate("/setup-user");
                return;
            }

            props.alert("Something Went Wrong!", "alert");
        }
        finally {
            setLoading(false);
        }
    }

    const loadMatchingEchoes = async () => {
        try {
            const data = (await axios.get(`${process.env.REACT_APP_API_URL}/echoes/${id}`)).data;
            setEchoData(prev => ({
                ...prev,
                status: data.status
            }));

            setMatchingEchoes(Array.isArray(data.matches) ? data.matches : []);
        }
        catch (matchingError) {
            if (matchingError.response?.status === 404) {
                setEchoData(prev => ({
                    ...prev,
                    status: "processing"
                }));
                setMatchingEchoes([]);
                return;
            }
            
            props.alert("Failed To Load Matching Echoes!", "alert");
        }
    }

    // Start the conversation with the user
    const startConversation = async (echo) => {
        if (echo.chatId) {
            const userChatId = (await db.keys.get("user-keypair"))?.chatId;
            if (echo.chatId === userChatId) {
                navigate('/my-chats');
                return;
            }

            navigate(`/user-chat/${echo.chatId}`)
        }
    }

    // Start the rematch on the server
    const runRematch = async () => {
        try {
            setRematching(true);
            const out = await rematchEcho(id);
            setConfirmOpen(false);
            setEchoData(prev => ({ ...prev, status: "processing" }));
            if (!out.free) {
                saveConfirmed();
            }
        }
        catch (error) {
            setConfirmOpen(false);
            if (error.response?.status === 401) {
                props.alert("Please start a new session.", "alert");
                navigate("/setup-user");
                return;
            }
            if (error.response?.data?.code === "ALREADY_MATCHING") {
                setEchoData(prev => ({ ...prev, status: "processing" }));
            }
            props.alert(coinError(error, "Couldn't start matching. Please try again."), "alert");
        }
        finally {
            setRematching(false);
            if (coins) coins.refreshWallet();
        }
    }

    // Free rematches go straight through; a paid one asks first (once)
    const recheckEchoMatches = () => {
        if (!id || rematching || isMatching) return;
        if (rematchInfo && rematchInfo.freeLeft === 0) {
            const short = rematchInfo.price > wallet.balance;
            if (short || !readConfirmed()) {
                setConfirmOpen(true);
                return;
            }
        }
        runRematch();
    }

    // Keep checking while matching runs, only while the tab is visible
    const processing = echoData.status === "processing";
    useEffect(() => {
        if (!processing) {
            setWatching(false);
            return undefined;
        }
        pollStart.current = Date.now();
        setWatching(true);
        const timer = setInterval(() => {
            if (Date.now() - pollStart.current > POLL_FOR_MS) {
                clearInterval(timer);
                setWatching(false);
                return;
            }
            if (document.visibilityState === "visible") loadMatchingEchoes();
        }, POLL_MS);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processing, id]);

    let rematchLabel = null;
    if (isMatching) {
        rematchLabel = "Matching...";
    } else if (rematchInfo) {
        rematchLabel = rematchInfo.freeLeft > 0
            ? `Free · ${rematchInfo.freeLeft} left`
            : <><CoinIcon size={12} /> {rematchInfo.price}</>;
    }
    const rematchTitle = isMatching
        ? "Matching in progress"
        : rematchInfo && rematchInfo.freeLeft === 0
            ? `Rematch for ${rematchInfo.price} coins`
            : rematchInfo ? `Rematch (${rematchInfo.freeLeft} free left today)` : "Rematch Echo";

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

                    <div className="echo-rematch">
                        {rematchLabel && (
                            <span className={`echo-rematch-cost ${rematchInfo && rematchInfo.freeLeft === 0 && !isMatching ? "is-paid" : ""}`}>
                                {rematchLabel}
                            </span>
                        )}
                        <button
                            type="button"
                            className={`echo-rematch-button ${rematching || isMatching ? 'is-rematching' : ''}`}
                            aria-label={rematchTitle}
                            title={rematchTitle}
                            onClick={recheckEchoMatches}
                            disabled={rematching || isMatching}>
                            <img src={ReloadSVG} alt="" />
                        </button>
                    </div>
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

                {confirmOpen && rematchInfo && (
                    <RematchConfirmModal
                        info={rematchInfo}
                        balance={wallet ? wallet.balance : 0}
                        busy={rematching}
                        onConfirm={runRematch}
                        onClose={() => setConfirmOpen(false)} />
                )}
            </div>
        </>
    )
}

export default EchoContent
