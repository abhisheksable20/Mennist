import { useState } from "react";
import CoinModal from "./Coins/CoinModal";

const POINTS = [
  "They can't send you messages, files or coins.",
  "They can't start a new chat with you.",
  "They won't be told. To them, chat just looks unavailable.",
  "You can unblock them any time.",
];

// Confirm before blocking. onConfirm(alsoDelete) does the work and may throw.
function BlockUserModal({ name, onConfirm, onClose }) {
  const [alsoDelete, setAlsoDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm(alsoDelete);
    } catch (blockErr) {
      setError(blockErr.response?.data?.error || "Couldn't block this person. Please try again.");
      setBusy(false);
    }
  };

  return (
    <CoinModal title={`Block ${name}?`} labelledBy="block-user-title" onClose={onClose}>
      <ul className="block-points">
        {POINTS.map((point) => <li key={point}>{point}</li>)}
      </ul>

      <label className="block-delete-option">
        <input type="checkbox" checked={alsoDelete} onChange={(e) => setAlsoDelete(e.target.checked)} disabled={busy} />
        Also delete this chat
      </label>

      {error && <p className="block-error" role="alert">{error}</p>}

      <div className="block-actions">
        <button type="button" className="coin-btn coin-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="coin-btn block-confirm-btn" onClick={confirm} disabled={busy}>
          {busy ? "Blocking…" : "Block"}
        </button>
      </div>
    </CoinModal>
  );
}

export default BlockUserModal;
