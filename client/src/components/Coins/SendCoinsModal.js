import { useContext, useEffect, useState } from "react";
import CoinsContext from "../../context/coins/CoinsContext";
import CoinModal from "./CoinModal";
import CoinIcon from "./CoinIcon";
import { coinError, previewTransfer, sendTransfer } from "./coinApi";

const CUTS = ["5%", "10%", "20%", "30%"];
const ORDINAL = ["1st", "2nd", "3rd", "4th+"];

// Send coins to the person in this chat. Shows the cut before sending.
export default function SendCoinsModal({ chatId, name, avatar, onClose, alert }) {
  const { wallet, refreshWallet } = useContext(CoinsContext);
  const [amount, setAmount] = useState("20");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const value = parseInt(amount, 10);
  const valid = Number.isInteger(value) && value >= 5 && value <= 100;
  const t = wallet && wallet.transfers;
  const canSend = t && t.canSend;
  const leftToday = t ? Math.max(0, t.sendLimit - t.sentToday) : 0;

  // Ask the server for the exact cut whenever the amount changes
  useEffect(() => {
    if (!valid || !canSend) {
      setPreview(null);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const p = await previewTransfer(chatId, value);
        if (active) {
          setPreview(p);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setPreview(null);
          setError(coinError(err));
        }
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [chatId, value, valid, canSend]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const out = await sendTransfer(chatId, value);
      await refreshWallet();
      alert(`Sent ${out.amount} coins. They'll get ${out.receives} once they accept.`, "success");
      onClose();
    } catch (err) {
      setError(coinError(err));
    } finally {
      setSending(false);
    }
  };

  const step = preview ? Math.min(preview.transferNumber, 4) - 1 : 0;

  return (
    <CoinModal title="Send coins" onClose={onClose} labelledBy="send-coins-title">
      <div className="send-coins">
        <div className="send-coins-to">
          {avatar}
          <div>
            <b>{name || "Anonymous"}</b>
            <span className="coin-muted coin-small">They can accept or decline</span>
          </div>
        </div>

        {!canSend ? (
          <p className="coin-note">
            Sending coins unlocks after a 7-day streak and when your account is at least 7 days old. Keep posting daily to get there.
          </p>
        ) : (
          <>
            <div className="send-amount">
              <label htmlFor="send-amount-input" className="coin-muted coin-small">Amount</label>
              <div className="send-amount-field">
                <CoinIcon size={26} />
                <input id="send-amount-input" type="number" inputMode="numeric" min="5" max={Math.min(100, leftToday)}
                  value={amount} onChange={(e) => setAmount(e.target.value)} />
                <span className="coin-muted coin-small">{wallet.earned} available</span>
              </div>
              <div className="send-quick" role="group" aria-label="Quick amounts">
                {[10, 20, 50, 80].map((n) => (
                  <button key={n} type="button" aria-pressed={value === n} className={`coin-chip ${value === n ? "is-active" : ""}`}
                    onClick={() => setAmount(String(n))} disabled={n > leftToday}>{n}</button>
                ))}
              </div>
              {!valid && amount !== "" && <p className="coin-error">Send between 5 and 100 coins.</p>}
            </div>

            {preview && (
              <>
                <div className="coin-summary">
                  <div className="coin-summary-row"><span>You send</span><span>{preview.amount}</span></div>
                  <div className="coin-summary-row">
                    <span>Mennist cut <span className="coin-muted">· {preview.cutPercent}%, {ORDINAL[step]} transfer to them this week</span></span>
                    <span className="text-red">−{preview.cut}</span>
                  </div>
                  <div className="coin-summary-divider" />
                  <div className="coin-summary-row is-total"><span>They receive</span><span className="coin-amount-gold">{preview.receives}</span></div>
                </div>
                <ol className="cut-steps" aria-label="How the cut grows">
                  {CUTS.map((c, i) => (
                    <li key={c} className={i === step ? "is-current" : i < step ? "is-past" : ""}>
                      <span className="cut-steps-bar" />{ORDINAL[i]} · {c}
                    </li>
                  ))}
                </ol>
              </>
            )}

            <div className="coin-muted coin-small send-rules">
              <span>They have 48 hours to accept. If they decline, you get all {valid ? value : "your"} coins back.</span>
              <span>You can send <b>{leftToday} more</b> coins today. Welcome bonus coins can't be sent.</span>
            </div>

            {error && <p className="coin-error" role="alert">{error}</p>}

            <button type="button" className="coin-btn coin-btn-primary coin-btn-block"
              disabled={!valid || !preview || sending || value > leftToday} onClick={send}>
              {sending ? "Sending..." : `Send ${valid ? value : ""} coins`}
            </button>
          </>
        )}
      </div>
    </CoinModal>
  );
}
