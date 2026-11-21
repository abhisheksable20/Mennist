import { useContext, useState } from "react";
import Avatar from "../Avatar/Avatar";
import { saveAvatar } from "../Avatar/avatarService";
import CoinsContext from "../../context/coins/CoinsContext";
import CoinModal from "./CoinModal";
import CoinIcon from "./CoinIcon";
import TierBadge from "./TierBadge";
import { buyItem, coinError } from "./coinApi";
import { AVATAR_OPTIONS, DEFAULT_AVATAR } from "../Avatar/avatarOptions";

const SLOT_LABELS = {
  hairFx: "Hair colour", eyes: "Eyes", accessories: "Accessory", aura: "Aura",
  background: "Background", frame: "Frame", set: "Full set",
};

const FREE_EYES = new Set(AVATAR_OPTIONS.eyes.map((o) => o.id));
const FREE_ACCESSORIES = new Set(AVATAR_OPTIONS.accessories.map((o) => o.id));

// The avatar with every premium item taken off, so a preview shows one item at a time
export const withoutPremium = (avatar) => {
  const plain = { ...avatar, hairFx: null, aura: null, background: null, frame: null, set: null };
  if (!FREE_EYES.has(plain.eyes)) plain.eyes = DEFAULT_AVATAR.eyes;
  if (!FREE_ACCESSORIES.has(plain.accessories)) plain.accessories = DEFAULT_AVATAR.accessories;
  delete plain.tier;
  delete plain.mythicSeed;
  delete plain.mythicEdition;
  return plain;
};

// Preview of one item on the user's Veil, without the premium items they already wear
export const wearItem = (avatar, item) => {
  const next = { ...withoutPremium(avatar), [item.slot]: item.value };
  // Owners see their own Mythic; everyone else sees an example
  if (item.value === "mythic") next.mythicSeed = avatar.mythicSeed || "preview";
  return next;
};

// Try an avatar item on your own avatar, then buy it and wear it
export default function ItemPreviewModal({ item, myAvatar, setMyAvatar, onClose, onBought, alert, longestStreak }) {
  const { wallet, refreshWallet } = useContext(CoinsContext);
  const [showWith, setShowWith] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [bought, setBought] = useState(item.owned);

  const balance = wallet ? wallet.balance : 0;
  const bonus = wallet ? wallet.bonus : 0;
  const fromBonus = Math.min(bonus, item.price);
  const short = item.price - balance;
  const needsStreak = item.requiresStreak && longestStreak < item.requiresStreak;
  const wearing = myAvatar && myAvatar[item.slot] === item.value;

  const preview = showWith ? wearItem(myAvatar, item) : withoutPremium(myAvatar);

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      await buyItem(item.id);
      setBought(true);
      await refreshWallet();
      onBought();
      alert(`${item.name} unlocked.`, "success");
    } catch (err) {
      setError(coinError(err));
    } finally {
      setBusy(false);
    }
  };

  const wear = async () => {
    setBusy(true);
    setError(null);
    try {
      const { tier, mythicSeed, mythicEdition, ...rest } = myAvatar;
      const saved = await saveAvatar({ ...rest, [item.slot]: item.value });
      setMyAvatar(saved);
      alert(`You're now wearing ${item.name}.`, "success");
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't update your Veil.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <CoinModal title={item.name} onClose={onClose} labelledBy="item-preview-title">
      <div className="item-preview">
        <div className={`item-preview-stage tier-bg-${item.tier}`}>
          {myAvatar && <Avatar avatar={preview} size={200} title={showWith ? `Your Veil wearing ${item.name}` : "Your Veil"} />}
          <div className="segmented" role="group" aria-label="Preview">
            <button type="button" aria-pressed={showWith} onClick={() => setShowWith(true)}>With it</button>
            <button type="button" aria-pressed={!showWith} onClick={() => setShowWith(false)}>Without</button>
          </div>
        </div>

        <div className="item-preview-info">
          <div className="item-preview-tags">
            <TierBadge tier={item.tier} />
            <span className="coin-muted coin-small">{SLOT_LABELS[item.slot]}</span>
          </div>
          <h3 className="pixel-heading">{item.name}</h3>
          {item.value === "mythic" && (
            <p className="coin-muted">
              Your Mythic is generated from your account. Nobody else will ever have the same colours, pattern and aura.
              The preview shows an example. Only {item.limit} will ever exist.
            </p>
          )}
          {item.slot !== "set" && myAvatar && myAvatar.set && (
            <p className="coin-muted coin-small">The preview shows this item on its own. With your full set on, some colours will look different.</p>
          )}
        </div>

        {!bought ? (
          <>
            <div className="coin-summary">
              <div className="coin-summary-row"><span>Price</span><span><CoinIcon size={14} /> {item.price}</span></div>
              {fromBonus > 0 && short <= 0 && (
                <div className="coin-summary-row is-muted"><span>Paid from welcome bonus first</span><span>{fromBonus} + {item.price - fromBonus} earned</span></div>
              )}
              <div className="coin-summary-divider" />
              <div className="coin-summary-row is-total">
                <span>Balance after</span>
                <span>{short > 0 ? "Not enough coins" : `${balance} → ${balance - item.price}`}</span>
              </div>
            </div>
            {error && <p className="coin-error" role="alert">{error}</p>}
            {needsStreak ? (
              <p className="coin-note">Reach a {item.requiresStreak}-day Ritzz to unlock this. Your longest so far is {longestStreak}.</p>
            ) : short > 0 ? (
              <p className="coin-note">You need {short} more coins. Keep your Ritzz going to earn them.</p>
            ) : null}
            <button type="button" className="coin-btn coin-btn-primary coin-btn-block"
              disabled={busy || short > 0 || needsStreak} onClick={buy}>
              {busy ? "Unlocking..." : <>Unlock for <CoinIcon size={16} className="coin-icon-on-green" /> {item.price}</>}
            </button>
            <p className="coin-muted coin-small coin-center">Unlocked forever. Avatar items can't be refunded.</p>
          </>
        ) : (
          <>
            {error && <p className="coin-error" role="alert">{error}</p>}
            <button type="button" className="coin-btn coin-btn-primary coin-btn-block" disabled={busy || wearing} onClick={wear}>
              {wearing ? "You're wearing this" : busy ? "Saving..." : "Wear it now"}
            </button>
            <button type="button" className="coin-btn coin-btn-link" onClick={onClose}>Maybe later</button>
          </>
        )}
      </div>
    </CoinModal>
  );
}
