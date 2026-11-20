import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CoinsContext from "../../context/coins/CoinsContext";
import CoinIcon from "./CoinIcon";
import StreakFlame from "./StreakFlame";
import TransferRequest from "./TransferRequest";
import { answerTransfer, coinError, fetchHistory, setAllowTransfers } from "./coinApi";
import "../../styles/Coins.css";

const DAY_LETTERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Turn a history entry into a readable line
const describe = (e) => {
  switch (e.type) {
    case "welcome": return "Welcome bonus";
    case "daily_post": return `Daily post · day ${e.streak}`;
    case "streak_milestone": return `${e.streak}-day streak bonus`;
    case "streak_freeze_used": return e.count > 1 ? `${e.count} streak freezes used` : "Streak freeze used";
    case "spend": return `Bought ${e.itemName || (e.item || "an item").replace(/^(avatar_|vibe_)/, "").replace(/_/g, " ")}`;
    case "transfer_out": return "Sent coins";
    case "transfer_in": return "Received coins";
    case "chat_start": return "Started a new chat";
    case "chat_start_refund": return "No reply in 48h · refunded";
    case "echo_rematch": return "Echo rematch";
    case "echo_rematch_refund": return "Echo rematch failed · refunded";
    case "transfer_refund": return e.reason === "declined" ? "Transfer declined · refunded" : "Transfer refunded";
    default: return "Coins";
  }
};

const timeAgo = (ts) => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

function WalletPage(props) {
  const { wallet, refreshWallet } = useContext(CoinsContext);
  const [history, setHistory] = useState([]);
  const [historyDone, setHistoryDone] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Mennist | Sakesnake Coins";
    refreshWallet();
    fetchHistory().then((items) => {
      setHistory(items);
      setHistoryDone(items.length < 10);
    }).catch((err) => {
      if (err.response && err.response.status === 401) navigate("/setup-user");
    });
  }, [refreshWallet, navigate]);

  const loadMore = async () => {
    if (!history.length) return;
    setLoadingMore(true);
    try {
      const more = await fetchHistory(history[history.length - 1]);
      setHistory((prev) => [...prev, ...more]);
      setHistoryDone(more.length < 10);
    } catch (err) {
      props.alert(coinError(err), "alert");
    } finally {
      setLoadingMore(false);
    }
  };

  const cancel = async (id) => {
    try {
      const out = await answerTransfer(id, "cancel");
      props.alert(`Cancelled. ${out.refunded} coins are back in your wallet.`, "success");
    } catch (err) {
      props.alert(coinError(err), "alert");
    }
    refreshWallet();
  };

  const toggleTransfers = async () => {
    setSavingSetting(true);
    try {
      await setAllowTransfers(!wallet.transfers.allowTransfers);
      await refreshWallet();
    } catch (err) {
      props.alert(coinError(err), "alert");
    } finally {
      setSavingSetting(false);
    }
  };

  if (!wallet) {
    return (
      <div className="coin-page">
        <div className="coin-skeleton" style={{ height: 120 }} />
        <div className="coin-skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  const s = wallet.streak;
  const t = wallet.transfers;
  const week = Array.from({ length: 7 }, (_, i) => {
    const offset = 6 - i;
    const d = new Date(Date.now() - offset * 86400000);
    // Days inside the current streak are lit. Today is lit only after posting.
    const lit = offset === 0 ? s.postedToday : (s.postedToday ? offset < s.current : offset <= s.current);
    return { label: offset === 0 ? "Today" : DAY_LETTERS[d.getDay()], lit, today: offset === 0 };
  });

  return (
    <div className="coin-page">
      <header className="coin-page-header">
        <div>
          <p className="coin-eyebrow">Sakesnake Coins</p>
          <h1 className="coin-page-title">Your wallet</h1>
        </div>
      </header>

      <div className="wallet-grid">
        <section className="coin-card wallet-balance" aria-labelledby="balance-label">
          <span id="balance-label" className="coin-muted">Balance</span>
          <div className="wallet-balance-amount">
            <CoinIcon size={34} />
            <span className="pixel-number">{wallet.balance}</span>
          </div>
          <div className="wallet-balance-split">
            <span><b>{wallet.earned}</b> earned · can send</span>
            <span><b>{wallet.bonus}</b> welcome bonus · spend only</span>
          </div>
          <div className="wallet-actions">
            <Link to="/my-chats" className="coin-btn coin-btn-primary" title="Open a chat and use Send coins">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></svg>
              Send
            </Link>
            <Link to="/coins/shop" className="coin-btn coin-btn-ghost">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 7h12l1 14H5z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
              Shop
            </Link>
          </div>
          <p className="coin-muted coin-small">To send coins, open a chat with someone and choose Send coins.</p>
        </section>

        <section className="coin-card wallet-streak" aria-labelledby="streak-title">
          <div className="wallet-streak-head">
            <StreakFlame size={32} dim={!s.postedToday} />
            <div className="wallet-streak-text">
              <h2 id="streak-title">{s.current}-day streak</h2>
              <span className="coin-muted coin-small">Longest: {s.longest} days</span>
            </div>
            <span className="freeze-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 2v20M4 7l16 10M20 7 4 17" /></svg>
              {s.freezes} of 2 freezes
            </span>
          </div>
          <ol className="wallet-week" aria-label="Last 7 days">
            {week.map((d, i) => (
              <li key={i} className={`${d.lit ? "is-lit" : ""} ${d.today ? "is-today" : ""}`}>
                <span className="wallet-week-bar" />
                {d.label}
              </li>
            ))}
          </ol>
          <p className="coin-muted coin-small">
            {s.postedToday
              ? "Posted today. Your streak is safe until midnight tomorrow."
              : s.current > 0 ? "Post today to keep your streak." : "Post today to start a streak."}
            {" "}<b className="text-gold">+{s.next.reward} coins</b> at {s.next.day} days.
          </p>
          {s.freezes < 2 && (
            <Link to="/coins/shop#boosts" className="coin-btn coin-btn-link coin-btn-left">Get a streak freeze</Link>
          )}
        </section>
      </div>

      {(t.incoming.length > 0 || t.outgoing.length > 0) && (
        <section className="coin-section" aria-labelledby="pending-title">
          <h2 id="pending-title" className="coin-section-title">Waiting</h2>
          <div className="coin-list">
            {t.incoming.map((tr) => (
              <div key={tr.id} className="coin-card">
                <TransferRequest transfer={tr} alert={props.alert} onDone={() => refreshWallet()} />
              </div>
            ))}
            {t.outgoing.map((tr) => (
              <div key={tr.id} className="coin-card transfer-out">
                <div className="transfer-request-info">
                  <span className="transfer-request-title">You sent {tr.amount} coins</span>
                  <span className="coin-muted coin-small">
                    They'll get {tr.receives} · waiting for them to accept · {Math.max(0, Math.ceil((tr.expiresAt - Date.now()) / 3600000))}h left
                  </span>
                </div>
                <button type="button" className="coin-btn coin-btn-ghost" onClick={() => cancel(tr.id)}>Cancel</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="wallet-grid">
        <section className="coin-section" aria-labelledby="history-title">
          <h2 id="history-title" className="coin-section-title">History</h2>
          {history.length === 0 ? (
            <p className="coin-muted">Nothing yet. Post today to earn your first coins.</p>
          ) : (
            <ul className="coin-history">
              {history.map((e) => (
                <li key={e.id}>
                  <span className="coin-history-what">
                    {describe(e)}
                    <span className="coin-muted coin-small">{timeAgo(e.timestamp)}</span>
                  </span>
                  <span className={`coin-history-amount ${e.amount > 0 ? "is-plus" : ""}`}>
                    {e.amount > 0 ? `+${e.amount}` : e.amount === 0 ? "0" : `−${Math.abs(e.amount)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!historyDone && history.length > 0 && (
            <button type="button" className="coin-btn coin-btn-ghost" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Show more"}
            </button>
          )}
        </section>

        <section className="coin-section" aria-labelledby="limits-title">
          <h2 id="limits-title" className="coin-section-title">Sending coins</h2>
          <div className="coin-card coin-limits">
            {!t.canSend && (
              <p className="coin-note">Reach a 7-day streak to unlock sending coins.</p>
            )}
            <div className="coin-meter">
              <div className="coin-meter-label"><span>Sent today</span><span>{t.sentToday} / {t.sendLimit}</span></div>
              <span className="coin-meter-track"><span style={{ width: `${Math.min(100, (t.sentToday / t.sendLimit) * 100)}%` }} /></span>
            </div>
            <div className="coin-meter">
              <div className="coin-meter-label"><span>Received today</span><span>{t.receivedToday} / {t.receiveLimit}</span></div>
              <span className="coin-meter-track"><span style={{ width: `${Math.min(100, (t.receivedToday / t.receiveLimit) * 100)}%` }} /></span>
            </div>
            <label className="coin-switch" htmlFor="allow-transfers">
              <span>
                <b>Let people send me coins</b>
                <span className="coin-muted coin-small">You can still accept or decline each one.</span>
              </span>
              <input id="allow-transfers" type="checkbox" role="switch" checked={t.allowTransfers}
                disabled={savingSetting} onChange={toggleTransfers} />
            </label>
            <p className="coin-muted coin-small">
              Mennist keeps a small cut when you send coins: 5% the first time to someone this week, then 10%, 20% and 30%.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default WalletPage;
