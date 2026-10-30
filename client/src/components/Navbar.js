import SubmitButton from './SubmitButton'
import ChatFlagButton from './ChatFlagButton';
import NotificationCenter from './utils/NotificationCenter';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar(props) {
    const navigate = useNavigate();
    const location = useLocation();

    const navigateToHome = () => {
        navigate("/")
    }

    return (
        <div>
            <nav className="navbar">
                <div className="container-fluid">

                    <span className="navbar-brand navbar-title mb-0 h1 px-2 py-3" onClick={navigateToHome}>
                        Mennist
                        {" "}
                        <span className="beta-badge">BETA</span>
                    </span>

                    {/* Right-side buttons */}
                    <div className="d-flex align-items-center gap-2 ms-auto">
                        {/* NEW: Notification bell */}
                        <NotificationCenter />

                        {/* Existing Post / Chat button */}
                        {location.pathname === '/my-chats' ||
                            location.pathname.startsWith('/user-chat/') ? (
                            <ChatFlagButton alert={props.alert} />
                        ) : (
                            <SubmitButton alert={props.alert} />
                        )}

                    </div>
                </div>
            </nav>
        </div>
    )
}

export default Navbar
