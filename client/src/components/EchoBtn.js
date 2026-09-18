import { useNavigate } from 'react-router-dom';
import echoSVG from '../assets/echo_svg.svg';
import '../styles/Home.css';

function EchoBtn() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="floating-action-btn"
      onClick={() => navigate('/echoes')}
    >
      <img src={echoSVG} alt="echo_icon" />
      <span>Echoes</span>
    </button>
  );
}

export default EchoBtn;