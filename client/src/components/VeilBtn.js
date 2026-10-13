import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';
import veilSVG from "../assets/anonymous_svg_icon.svg";

function VeilBtn() {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            className="floating-action-btn"
            onClick={() => navigate('/veil')}>
            <img src={veilSVG} alt="echo_icon" />
            <span>Veil</span>
        </button>
    )
}

export default VeilBtn
