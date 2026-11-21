import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Avatar from "../Avatar/Avatar";
import CoinsContext from "../../context/coins/CoinsContext";
import CoinIcon from "./CoinIcon";
import TierBadge from "./TierBadge";
import ItemPreviewModal, { wearItem } from "./ItemPreviewModal";
import useMyAvatar from "./useMyAvatar";
import { VIBES } from "./vibeMeta";
import { buyItem, coinError, fetchShop, TIER_LABELS } from "./coinApi";
import "../../styles/Coins.css";

const TABS = [
  { id: "avatars", label: "Avatars" },
  { id: "vibes", label: "Vibe Check" },
  { id: "boosts", label: "Ritzz freeze" },
];
const TIERS = ["all", "rare", "epic", "legendary", "mythic"];

function ShopPage(props) {
  const { wallet, refreshWallet } = useContext(CoinsContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [tab, setTab] = useState(() => {
    const hash = (location.hash || "").replace("#", "");
    return TABS.some((t) => t.id === hash) ? hash : "avatars";
  });
  const [tier, setTier] = useState("all");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(null);
  const [myAvatar, setMyAvatar] = useMyAvatar();
  const alertRef = useRef(props.alert);
  alertRef.current = props.alert;

  const load = useCallback(async () => {
    try {
      setShop(await fetchShop());
    } catch (err) {
      if (err.response && err.response.status === 401) navigate("/setup-user");
      else alertRef.current(coinError(err, "Couldn't load the shop."), "alert");
    }
  }, [navigate]);

  useEffect(() => {
    document.title = "Mennist | Coin shop";
    load();
  }, [load]);

  const chooseTab = (id) => {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  const buySimple = async (itemId, label) => {
    setBusy(itemId);
    try {
      await buyItem(itemId);
      props.alert(`${label} unlocked.`, "success");
      await Promise.all([load(), refreshWallet()]);
    } catch (err) {
      props.alert(coinError(err), "alert");
    } finally {
      setBusy(null);
    }
  };

  if (!shop || !myAvatar) {
    return (
      <div className="coin-page">
        <div className="coin-skeleton" style={{ height: 60 }} />
        <div className="shop-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="coin-skeleton" style={{ height: 240 }} />)}</div>
      </div>
    );
  }

  const balance = wallet ? wallet.balance : 0;
  const avatarItems = shop.items.filter((i) => i.category === "avatar");
  const shownItems = avatarItems.filter((i) => tier === "all" || i.tier === tier);
  const featured = avatarItems.find((i) => i.id === "avatar_set_cosmic");
  const vibeItems = shop.items.filter((i) => i.category === "vibe");
  const freeze = shop.items.find((i) => i.id === "streak_freeze");
  const mythic = avatarItems.find((i) => i.tier === "mythic");

  return (
    <div className="coin-page">
      <header className="coin-page-header">
        <div>
          <p className="coin-eyebrow">Sakesnake Coins</p>
          <h1 className="coin-page-title">Shop</h1>
        </div>
        <Link to="/coins" className="nav-coin-chip is-large" aria-label={`Your balance: ${balance} coins`}>
          <CoinIcon size={16} /><span className="coin-num">{balance}</span>
        </Link>
      </header>

      <div className="coin-tabs" role="tablist" aria-label="Shop sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={`coin-tab ${tab === t.id ? "is-active" : ""}`} onClick={() => chooseTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "avatars" && (
        <>
          {featured && tier === "all" && (
            <button type="button" className="shop-featured" onClick={() => setSelected(featured)}>
              <Avatar avatar={wearItem(myAvatar, featured)} size={150} title={`${featured.name} preview`} />
              <span className="shop-featured-text">
                <span className="coin-eyebrow text-gold">Legendary · Full set</span>
                <span className="pixel-heading">{featured.name}</span>
                <span className="coin-muted">A body made of deep space, with stars drifting across the face. Shown on your own Veil.</span>
                <span className="shop-price">
                  <CoinIcon size={16} /> {featured.price}
                  {!featured.owned && featured.price > balance && <span className="coin-muted coin-small"> · {featured.price - balance} more to go</span>}
                  {featured.owned && <span className="owned-label"> · Owned</span>}
                </span>
              </span>
            </button>
          )}

          <div className="coin-chips" role="group" aria-label="Filter by tier">
            {TIERS.map((t) => (
              <button key={t} type="button" aria-pressed={tier === t}
                className={`coin-chip ${t !== "all" ? `tier-text-${t}` : ""} ${tier === t ? "is-active" : ""}`}
                onClick={() => setTier(t)}>
                {t === "all" ? "All" : TIER_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="shop-grid">
            {shownItems.filter((i) => i.tier !== "mythic").map((item) => {
              const worn = myAvatar[item.slot] === item.value;
              return (
                <button key={item.id} type="button" className={`shop-item ${item.owned ? "is-owned" : ""}`} onClick={() => setSelected(item)}>
                  <span className={`shop-item-stage tier-bg-${item.tier}`}>
                    <Avatar avatar={wearItem(myAvatar, item)} size={112} title={`${item.name} preview`} />
                  </span>
                  <span className="shop-item-name">{item.name}</span>
                  <span className="shop-item-foot">
                    {item.owned ? (
                      <span className="owned-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
                        {worn ? "Wearing" : "Owned"}
                      </span>
                    ) : (
                      <span className="shop-price"><CoinIcon size={14} />{item.price}</span>
                    )}
                    <TierBadge tier={item.tier} className="is-small" />
                  </span>
                </button>
              );
            })}
          </div>

          {mythic && (tier === "all" || tier === "mythic") && (
            <MythicCard item={mythic} shop={shop} myAvatar={myAvatar} onOpen={() => setSelected(mythic)} />
          )}
        </>
      )}

      {tab === "vibes" && (
        <section className="shop-section" aria-label="Vibe Check">
          <p className="coin-muted">Unlock a vibe once and use it on any post, forever. Reporting a post is always free.</p>
          <div className="vibe-shop-grid">
            {VIBES.map((v) => {
              const item = vibeItems.find((i) => i.vibe === v.id);
              if (!item) return null;
              return (
                <div key={v.id} className={`vibe-shop-item ${item.owned ? "is-owned" : ""}`}>
                  <img src={v.icon} alt="" width="28" height="28" />
                  <span className="vibe-shop-name">{v.label}</span>
                  {item.owned ? (
                    <span className="owned-label">Owned</span>
                  ) : (
                    <button type="button" className="coin-btn coin-btn-ghost coin-btn-small" disabled={busy === item.id || balance < item.price}
                      onClick={() => buySimple(item.id, v.label)}>
                      <CoinIcon size={14} /> {item.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {shop.vibePack.price !== null && (
            <div className="coin-card coin-card-green vibe-pack">
              <div>
                <b>Unlock all {shop.vibePack.missing} remaining vibes</b>
                <span className="coin-muted coin-small">
                  {shop.vibePack.price} instead of {shop.vibePack.missing * 15}. You save {shop.vibePack.missing * 15 - shop.vibePack.price}.
                </span>
              </div>
              <button type="button" className="coin-btn coin-btn-primary" disabled={busy === "vibe_pack" || balance < shop.vibePack.price}
                onClick={() => buySimple("vibe_pack", "All vibes")}>
                <CoinIcon size={14} className="coin-icon-on-green" /> {shop.vibePack.price}
              </button>
            </div>
          )}
        </section>
      )}

      {tab === "boosts" && freeze && (
        <section className="shop-section" aria-label="Ritzz freeze">
          <div className="coin-card freeze-card">
            <span className="freeze-icon" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v20M4 7l16 10M20 7 4 17" /></svg>
            </span>
            <div className="freeze-text">
              <h2 className="pixel-heading">Ritzz freeze</h2>
              <p className="coin-muted">If you miss a day, a freeze is used automatically and your Ritzz keeps going. You can hold {freeze.max}.</p>
              <p className="coin-small">You have <b>{freeze.owned}</b> of {freeze.max}.</p>
            </div>
            <button type="button" className="coin-btn coin-btn-primary"
              disabled={busy === "streak_freeze" || freeze.owned >= freeze.max || balance < freeze.price}
              onClick={() => buySimple("streak_freeze", "Ritzz freeze")}>
              {freeze.owned >= freeze.max ? "Full" : <>Buy for <CoinIcon size={14} className="coin-icon-on-green" /> {freeze.price}</>}
            </button>
          </div>
        </section>
      )}

      {selected && (
        <ItemPreviewModal
          item={selected}
          myAvatar={myAvatar}
          setMyAvatar={setMyAvatar}
          longestStreak={shop.longestStreak}
          alert={props.alert}
          onBought={load}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function MythicCard({ item, shop, myAvatar, onOpen }) {
  const progress = Math.min(1, shop.longestStreak / item.requiresStreak);
  const soldOut = shop.mythic.sold >= shop.mythic.limit && !item.owned;
  return (
    <button type="button" className="shop-mythic" onClick={onOpen} disabled={soldOut}>
      <span className="shop-mythic-avatar">
        <Avatar avatar={wearItem(myAvatar, item)} size={96} title="Mythic example" />
      </span>
      <span className="shop-mythic-text">
        <span className="tier-text-mythic shop-mythic-title">
          {item.owned ? `Your Mythic #${String(shop.mythic.edition || 0).padStart(3, "0")}` : "Mythic · one of one"}
        </span>
        <span className="coin-small">
          {item.owned ? "Made only for you. Tap to wear it." : "A look made only for you. Unlocks at a 30-day Ritzz."}
        </span>
        {!item.owned && (
          <>
            <span className="coin-meter-track is-mythic"><span style={{ width: `${progress * 100}%` }} /></span>
            <span className="coin-muted coin-small">
              Longest Ritzz {shop.longestStreak} / {item.requiresStreak} days · <CoinIcon size={12} /> {item.price} ·{" "}
              {soldOut ? "Sold out" : `${shop.mythic.limit - shop.mythic.sold} of ${shop.mythic.limit} left`}
            </span>
          </>
        )}
      </span>
    </button>
  );
}

export default ShopPage;
