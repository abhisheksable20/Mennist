import { useContext, useState } from "react";
import CoinsContext from "../../context/coins/CoinsContext";
import CoinModal from "./CoinModal";
import CoinIcon from "./CoinIcon";
import { VIBES } from "./vibeMeta";
import { buyItem, coinError } from "./coinApi";

/*
  Opens when someone taps a Vibe Check option they haven't unlocked.
  Unlock just that one, or every remaining vibe at a discount.
*/
export default function VibeUnlockModal({ vibe, owned, onClose, onUnlocked }) {
  const { wallet, refreshWallet } = useContext(CoinsContext);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const balance = wallet ? wallet.balance : 0;
  const missing = VIBES.filter((v) => !owned.includes(v.id));
  const packPrice = missing.length >= 2 ? Math.min(60, (missing.length - 1) * 15) : null;
  const target = VIBES.find((v) => v.id === vibe);

  const buy = async (itemId) => {
    setBusy(itemId);
    setError(null);
    try {
      const out = await buyItem(itemId);
      await refreshWallet();
      const unlocked = (out.unlocked || []).map((id) => id.replace("vibe_", ""));
      onUnlocked(unlocked, vibe);
    } catch (err) {
      setError(coinError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <CoinModal title={`Unlock "${target ? target.label : vibe}"`} onClose={onClose} labelledBy="vibe-unlock-title">
      <div className="vibe-unlock">
        <p className="coin-muted">Each vibe is yours forever once unlocked. Use it on any post.</p>
        <div className="vibe-unlock-grid">
          {VIBES.map((v) => {
            const has = owned.includes(v.id);
            const isTarget = v.id === vibe;
            return (
              <div key={v.id} className={`vibe-unlock-item ${has ? "is-owned" : ""} ${isTarget ? "is-target" : ""}`}>
                <img src={v.icon} alt="" width="22" height="22" />
                <span>{v.label}</span>
                {has ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Owned"><path d="M5 12l5 5L20 7" /></svg>
                ) : (
                  <span className="shop-price is-small"><CoinIcon size={12} />15</span>
                )}
              </div>
            );
          })}
        </div>

        {packPrice !== null && (
          <div className="coin-card coin-card-green vibe-pack">
            <div>
              <b>Unlock all {missing.length} remaining</b>
              <span className="coin-muted coin-small">{packPrice} instead of {missing.length * 15}. You save {missing.length * 15 - packPrice}.</span>
            </div>
            <button type="button" className="coin-btn coin-btn-ghost" disabled={!!busy || balance < packPrice} onClick={() => buy("vibe_pack")}>
              <CoinIcon size={14} /> {packPrice}
            </button>
          </div>
        )}

        {error && <p className="coin-error" role="alert">{error}</p>}
        {balance < 15 && <p className="coin-note">You need {15 - balance} more coins. Post daily to earn them.</p>}

        <button type="button" className="coin-btn coin-btn-primary coin-btn-block" disabled={!!busy || balance < 15}
          onClick={() => buy(`vibe_${vibe}`)}>
          {busy === `vibe_${vibe}` ? "Unlocking..." : `Unlock ${target ? target.label : vibe} for 15 and use it`}
        </button>
        <p className="coin-muted coin-small coin-center">
          Balance {balance} → {Math.max(0, balance - 15)}. To report a harmful post, use Report. It's always free.
        </p>
      </div>
    </CoinModal>
  );
}
