import SubmitButton from './SubmitButton'
import ChatFlagButton from './ChatFlagButton';
import NotificationCenter from './utils/NotificationCenter';
import NavCoins from './Coins/NavCoins';
import MenuCoinsCard from './Coins/MenuCoinsCard';
import CoinsContext from '../context/coins/CoinsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';

function Navbar(props) {
    const navigate = useNavigate();
    const location = useLocation();

    const [moreOpen, setMoreOpen] = useState(false);
    const coins = useContext(CoinsContext);
    const coinsWaiting = coins && coins.wallet ? coins.wallet.transfers.incoming.length : 0;

    const isMinimalPage = ["/terms-and-conditions", "/privacy-policy"].includes(location.pathname);

    useEffect(() => {
        setMoreOpen(false);
    }, [location.pathname]);

    const isSubmitPage = location.pathname === '/submit-secret';

    const isChatPage = location.pathname === "/my-chats" || location.pathname.startsWith("/user-chat/");


    const navigateToHome = () => {
        navigate("/")
    }

    return (
        <nav className="navbar">
            <div className="container-fluid">

                <span
                    className="navbar-brand navbar-title mb-0 h1 px-2 py-3"
                    onClick={navigateToHome}
                >
                    Mennist{""}
                    <span className="beta-badge">BETA</span>
                </span>

                {!isMinimalPage && (
                    <div className="navbar-actions">

                        <NavCoins />

                        <NotificationCenter />

                        <div className={`navbar-more-menu ${moreOpen ? 'is-open' : ''}`}>
                            <button
                                type="button"
                                className="navbar-more-toggle"
                                aria-label={coinsWaiting ? "More options, coins waiting for you" : "More options"}
                                aria-expanded={moreOpen}
                                onClick={() => setMoreOpen(prev => !prev)}
                            >
                                &#8942;
                                {coinsWaiting > 0 && <span className="navbar-more-dot" aria-hidden="true" />}
                            </button>

                            <div className="navbar-more-content">
                                <div className="mobile-coins-menu">
                                    <MenuCoinsCard />
                                </div>
                                {!isSubmitPage && (
                                    <SubmitButton alert={props.alert} menu />
                                )}

                                <div className="mobile-chat-flag">
                                    <ChatFlagButton alert={props.alert} menu />
                                </div>
                            </div>
                        </div>

                        {isChatPage && (
                            <div className="desktop-chat-flag">
                                <ChatFlagButton alert={props.alert} />
                            </div>
                        )}

                    </div>
                )}

            </div>
        </nav>
    )
}

export default Navbar
