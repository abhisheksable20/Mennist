import { Link } from "react-router-dom";
import CoinModal from "./CoinModal";
import CoinIcon from "./CoinIcon";

/*
  Shown before a paid echo rematch (the first time), or when the user
  doesn't have enough coins for one.
*/
export default function RematchConfirmModal({ info, balance, busy, onConfirm, onClose }) {
  const short = info.price - balance;

  return (
    <CoinModal title={short > 0 ? "Not enough coins" : `Rematch for ${info.price} coins?`} onClose={onClose} labelledBy="rematch-confirm-title">
      <div className="rematch-confirm">
        <p className="coin-muted">
          You've used your {info.freePerDay} free rematches for today. They reset at midnight.
        </p>

        {short > 0 ? (
          <>
            <p className="coin-note">You need {short} more coins. Post daily to keep your Ritzz and earn them.</p>
            <Link to="/coins" className="coin-btn coin-btn-primary coin-btn-block" onClick={onClose}>Open wallet</Link>
          </>
        ) : (
          <>
            <ul className="rematch-confirm-points">
              <li>If matching fails, the coins come back to you.</li>
              <li>Your current matches stay until the new ones are ready.</li>
            </ul>
            <button type="button" className="coin-btn coin-btn-primary coin-btn-block" disabled={busy} onClick={onConfirm}>
              {busy ? "Starting..." : <>Rematch · <CoinIcon size={14} /> {info.price}</>}
            </button>
            <p className="coin-muted coin-small coin-center">
              Balance {balance} → {balance - info.price}
            </p>
          </>
        )}
      </div>
    </CoinModal>
  );
}
