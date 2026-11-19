import { useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import CoinsContext from "../../context/coins/CoinsContext";
import TransferRequest from "./TransferRequest";

const STORE_KEY = "mennist-hidden-transfers";

const readHidden = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch (e) {
    return [];
  }
};

/*
  Corner card that appears on every page when someone sends you coins,
  so you don't have to open notifications to find out.
*/
export default function IncomingCoinsAlert({ alert }) {
  const { wallet, refreshWallet } = useContext(CoinsContext);
  const location = useLocation();
  const [hidden, setHidden] = useState(readHidden);

  // Not on the wallet (already listed there) or in a chat (shown in the conversation,
  // and the card would cover the message box)
  if (!wallet || location.pathname === "/coins" || location.pathname === "/setup-user"
    || location.pathname.startsWith("/user-chat/")) return null;
  const transfer = wallet.transfers.incoming.find((t) => !hidden.includes(t.id));
  if (!transfer) return null;

  const hide = () => {
    const next = [...hidden, transfer.id].slice(-50);
    setHidden(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch (e) {
      // Private mode: it just shows again next visit
    }
  };

  const others = wallet.transfers.incoming.length - 1;

  return (
    <aside className="incoming-coins" role="status" aria-label="Coins received">
      <div className="incoming-coins-head">
        <span className="pixel-tag">NEW</span>
        <b>Someone sent you {transfer.receives} coins</b>
        <button type="button" className="coin-icon-btn" aria-label="Hide for now" onClick={hide}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <span className="coin-muted coin-small">
        Accept or decline within {Math.max(1, Math.ceil((transfer.expiresAt - Date.now()) / 3600000))} hours.
        {others > 0 ? ` ${others} more waiting in your wallet.` : ""}
      </span>
      <TransferRequest key={transfer.id} compact transfer={transfer} alert={alert} onDone={() => refreshWallet()} />
    </aside>
  );
}
