import { useContext } from "react";
import { Link } from "react-router-dom";
import CoinsContext from "../../context/coins/CoinsContext";
import CoinIcon from "./CoinIcon";
import StreakFlame from "./StreakFlame";

// Streak and balance chips in the navbar. Both open the wallet.
export default function NavCoins() {
  const { wallet } = useContext(CoinsContext);
  if (!wallet) return null;

  const streak = wallet.streak.current;
  const waiting = wallet.transfers.incoming.length;
  return (
    <div className="nav-coins">
      <Link to="/coins" className="nav-coin-chip" title={streak ? `${streak}-day streak` : "Start a streak by posting today"}
        aria-label={`Streak: ${streak} days`}>
        <StreakFlame size={14} dim={!wallet.streak.postedToday} />
        <span className="coin-num">{streak}</span>
      </Link>
      <Link to="/coins" className="nav-coin-chip" aria-label={
        waiting ? `${wallet.balance} Sakesnake Coins, ${waiting} waiting for you` : `${wallet.balance} Sakesnake Coins`}>
        <CoinIcon size={14} />
        <span className="coin-num">{wallet.balance}</span>
        {waiting > 0 && <span className="nav-coin-dot" aria-hidden="true" />}
      </Link>
    </div>
  );
}
