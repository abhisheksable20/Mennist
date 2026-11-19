import { useState } from "react";
import CoinIcon from "./CoinIcon";
import TransferRequest from "./TransferRequest";
import { answerTransfer, coinError } from "./coinApi";
import { convertTimestampToReadable } from "../../dataProcessing/dataProcessing";

const OUT_STATUS = {
  pending: "Waiting for them to accept",
  accepted: "Accepted",
  declined: "Declined · coins returned to you",
  cancelled: "You cancelled · coins returned",
  expired: "Not accepted in time · coins returned",
  failed: "Didn't go through · coins returned",
};
const IN_STATUS = {
  accepted: "Added to your wallet",
  declined: "You declined",
  cancelled: "They cancelled it",
  expired: "Expired before you answered",
  failed: "Didn't go through",
};

// A coin transfer shown in the chat timeline between two messages
export default function CoinChatEvent({ event, alert, onChange }) {
  const [busy, setBusy] = useState(false);
  const out = event.dir === "out";

  const cancel = async () => {
    setBusy(true);
    try {
      await answerTransfer(event.id, "cancel");
      alert("Cancelled. The coins are back in your wallet.", "success");
    } catch (err) {
      alert(coinError(err), "alert");
    } finally {
      setBusy(false);
      onChange();
    }
  };

  const pending = event.status === "pending";
  return (
    <div className={`coin-chat-event is-${out ? "out" : "in"} status-${event.status}`}>
      <div className="coin-chat-event-card">
        <span className="coin-chat-event-icon"><CoinIcon size={18} /></span>
        <div className="coin-chat-event-text">
          <b>
            {out
              ? <>You sent <span className="coin-num">{event.amount}</span> coins</>
              : <>They sent you <span className="coin-num">{event.amount}</span> coins</>}
          </b>
          <span className="coin-small coin-muted">
            {out && pending ? `They'll get ${event.receives} after the ${event.cut}-coin cut · ` : ""}
            {out && event.status === "accepted" ? `They got ${event.receives} after the ${event.cut}-coin cut · ` : ""}
            {out ? OUT_STATUS[event.status] : (pending ? "Accept or decline" : IN_STATUS[event.status])}
          </span>
          {pending && !out && (
            <TransferRequest compact transfer={{ id: event.id }} alert={alert} onDone={onChange} />
          )}
          {pending && out && (
            <button type="button" className="coin-btn coin-btn-ghost coin-btn-small coin-chat-cancel" disabled={busy} onClick={cancel}>
              {busy ? "Cancelling..." : "Cancel"}
            </button>
          )}
        </div>
      </div>
      <small className="coin-chat-event-time">{convertTimestampToReadable(event.createdAt)}</small>
    </div>
  );
}
