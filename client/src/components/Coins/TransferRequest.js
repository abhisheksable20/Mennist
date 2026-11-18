import { useState } from "react";
import CoinIcon from "./CoinIcon";
import { answerTransfer, coinError } from "./coinApi";

const hoursLeft = (expiresAt) => Math.max(0, Math.ceil((expiresAt - Date.now()) / (60 * 60 * 1000)));

/*
  Accept / Decline / Block for coins someone sent you.
  Used on the wallet page and inside notifications.
*/
export default function TransferRequest({ transfer, onDone, alert, compact = false }) {
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);

  const act = async (action) => {
    setBusy(action);
    try {
      const out = await answerTransfer(transfer.id, action);
      const msg = out.status === "accepted"
        ? `Added ${out.received} coins to your wallet.`
        : action === "block" ? "Declined and blocked. They can't send you coins again." : "Declined. The coins went back to the sender.";
      setResult(msg);
      if (alert) alert(msg, "success");
      if (onDone) onDone(out);
    } catch (err) {
      const msg = coinError(err);
      setResult(msg);
      if (alert) alert(msg, "alert");
      if (err.response && [404, 410].includes(err.response.status) && onDone) onDone(null);
    } finally {
      setBusy(null);
    }
  };

  if (result) return <p className="coin-note">{result}</p>;

  const left = transfer.expiresAt ? hoursLeft(transfer.expiresAt) : null;
  return (
    <div className={`transfer-request ${compact ? "is-compact" : ""}`}>
      {!compact && (
        <div className="transfer-request-info">
          <span className="transfer-request-title"><CoinIcon size={16} /> +{transfer.receives} coins from someone</span>
          {left !== null && <span className="coin-muted coin-small">Expires in {left}h</span>}
        </div>
      )}
      <div className="transfer-request-actions">
        <button type="button" className="coin-btn coin-btn-primary" disabled={!!busy} onClick={() => act("accept")}>
          {busy === "accept" ? "Accepting..." : "Accept"}
        </button>
        <button type="button" className="coin-btn coin-btn-ghost" disabled={!!busy} onClick={() => act("decline")}>
          {busy === "decline" ? "Declining..." : "Decline"}
        </button>
        <button type="button" className="coin-btn coin-btn-ghost coin-btn-icon" disabled={!!busy} onClick={() => act("block")}
          aria-label="Decline and block this sender" title="Decline and block this sender">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
