import { useContext } from "react";
import { Link } from "react-router-dom";
import CoinsContext from "../../context/coins/CoinsContext";
import CoinIcon from "./CoinIcon";
import StreakFlame from "./StreakFlame";

// Streak and coins as a card in the phone menu (the navbar is too small for chips there)
export default function MenuCoinsCard() {
  const { wallet } = useContext(CoinsContext);
  if (!wallet) return null;
  const waiting = wallet.transfers.incoming.length;

  return (
    <Link to="/coins" className="menu-coins-card">
      <span className="menu-coins-icon"><CoinIcon size={18} /></span>
      <span className="menu-coins-text">
        <strong>Sakesnake Coins</strong>
        <span className="menu-coins-stats">
          <span><StreakFlame size={12} dim={!wallet.streak.postedToday} /> {wallet.streak.current}-day Ritzz</span>
          <span><CoinIcon size={12} /> <span className="coin-num">{wallet.balance.toLocaleString()}</span></span>
        </span>
        {waiting > 0 && <span className="menu-coins-waiting">{waiting === 1 ? "1 transfer waiting for you" : `${waiting} transfers waiting for you`}</span>}
      </span>
      <svg className="menu-coins-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </Link>
  );
}
