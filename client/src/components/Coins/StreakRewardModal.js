import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import CoinsContext from "../../context/coins/CoinsContext";
import CoinModal from "./CoinModal";
import CoinIcon from "./CoinIcon";
import StreakFlame from "./StreakFlame";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Shown after a post that counts for the streak
export default function StreakRewardModal() {
  const { reward, closeReward, wallet } = useContext(CoinsContext);
  const navigate = useNavigate();
  if (!reward) return null;

  const total = (reward.dailyReward || 0) + (reward.milestone || 0);
  const streak = reward.streak;
  const shown = Math.min(7, streak);
  const today = new Date().getDay();
  const days = Array.from({ length: shown }, (_, i) => {
    const offset = shown - 1 - i;
    return {
      number: streak - offset,
      label: offset === 0 ? "Today" : DAY_NAMES[(today - offset + 7) % 7],
      isToday: offset === 0,
    };
  });
  const next = wallet && wallet.streak && wallet.streak.next;

  return (
    <CoinModal title={reward.milestone ? `${streak}-day streak!` : `Day ${streak}`} onClose={closeReward} hideTitle>
      <div className="streak-reward">
        <StreakFlame big size={96} />
        <div className="streak-reward-title">
          <span className="pixel-heading">{reward.milestone ? `${streak}-day streak!` : `Day ${streak}`}</span>
          <span className="coin-muted">
            {streak === 1 ? "You started a new streak. Post tomorrow to keep it going." : `You posted ${streak} days in a row.`}
          </span>
        </div>

        <ol className="streak-days" aria-label="Your streak">
          {days.map((d) => (
            <li key={d.number} className={d.isToday ? "is-today" : ""}>
              <span className="streak-day-box">{d.number}</span>
              <span className="streak-day-label">{d.label}</span>
            </li>
          ))}
        </ol>

        {reward.freezesUsed > 0 && (
          <p className="coin-note coin-note-ice">
            {reward.freezesUsed === 1 ? "A streak freeze saved the day you missed." : `${reward.freezesUsed} streak freezes saved the days you missed.`}
          </p>
        )}

        <div className="coin-summary">
          <div className="coin-summary-row"><span>Daily post</span><span>+{reward.dailyReward}</span></div>
          {reward.milestone > 0 && (
            <div className="coin-summary-row"><span>{streak}-day streak bonus</span><span>+{reward.milestone}</span></div>
          )}
          <div className="coin-summary-divider" />
          <div className="coin-summary-row is-total">
            <span>You earned</span>
            <span className="coin-amount-gold"><CoinIcon size={18} />+{total}</span>
          </div>
          {wallet && <span className="coin-muted coin-small">New balance: {wallet.balance} coins</span>}
        </div>

        {next && (
          <p className="streak-next">
            <span className="pixel-tag">NEXT</span>
            <span>Reach <b>{next.day} days</b> for <b className="text-gold">+{next.reward} coins</b>.</span>
          </p>
        )}

        <button type="button" className="coin-btn coin-btn-primary coin-btn-block" onClick={closeReward}>Nice!</button>
        <button type="button" className="coin-btn coin-btn-link" onClick={() => { closeReward(); navigate("/coins/shop"); }}>
          Spend coins in the shop
        </button>
      </div>
    </CoinModal>
  );
}
