import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import AvatarLoading from "./AvatarLoading";
import { AVATAR_CATEGORIES, AVATAR_OPTIONS, DEFAULT_AVATAR, HAIR_COLORS } from "./avatarOptions";
import { loadAvatar, saveAvatar } from "./avatarService";
import { Link } from "react-router-dom";
import { fetchShop, TIER_LABELS } from "../Coins/coinApi";
import TierBadge from "../Coins/TierBadge";
import "../../styles/Avatar.css";

const PREMIUM_SLOTS = [
  { id: "set", label: "Full set" },
  { id: "aura", label: "Aura" },
  { id: "background", label: "Background" },
  { id: "frame", label: "Frame" },
  { id: "hairFx", label: "Hair colour" },
  { id: "eyes", label: "Eyes" },
  { id: "accessories", label: "Accessory" },
];
// What "None" means for each premium slot: empty, or back to a regular choice
const NONE_VALUE = {
  set: null, aura: null, background: null, frame: null, hairFx: null,
  accessories: "accessory-00",
  eyes: DEFAULT_AVATAR.eyes,
};
// Regular tabs where tapping the selected option again takes it off
const REMOVABLE = { accessories: "accessory-00", facialHair: "beard-00" };

export default function AvatarEditor({ chatId, alert, sessionExpired }) {
  const [avatar, setAvatar] = useState({ ...DEFAULT_AVATAR });
  const [category, setCategory] = useState("style");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ownedItems, setOwnedItems] = useState(null);

  // Premium items this user has unlocked in the coin shop
  useEffect(() => {
    let active = true;
    fetchShop()
      .then((shop) => {
        if (active) setOwnedItems(shop.items.filter((i) => i.category === "avatar" && i.owned));
      })
      .catch(() => {
        if (active) setOwnedItems([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!chatId) {
        alert("Your existing chat ID is missing!", "alert");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const saved = await loadAvatar(chatId);
        if (active) setAvatar(saved);
      } catch (err) {
        if (active) {
          alert("Couldn't load your avatar!", "alert");
        }
        if (err.response?.status === 401) {
          alert("Please start a new session.", "alert")
          sessionExpired();
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [chatId]);

  function chooseOption(option) {
    setAvatar((current) => {
      // Tapping the selected accessory or facial hair again removes it
      if (REMOVABLE[category] && current[category] === option.id) {
        return { ...current, [category]: REMOVABLE[category] };
      }
      return { ...current, [category]: option.id };
    });
  }

  function wearPremium(slot, value) {
    setAvatar((current) => ({
      ...current,
      // Tapping the item you're wearing again takes it off
      [slot]: current[slot] === value ? NONE_VALUE[slot] : value,
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { tier, mythicSeed, mythicEdition, ...toSave } = avatar;
      const saved = await saveAvatar(toSave);
      setAvatar(saved);
      alert("Veil Profile Saved Successfully.", "success");
    } catch (err) {
      alert("Failed To Save Your Veil Profile!", "alert");
    } finally {
      setSaving(false);
    }
  }

  function resetAvatar() {
    setAvatar({ ...DEFAULT_AVATAR });
  }

  // Badge for what is selected right now (before saving): the highest tier worn
  const TIER_RANK = { rare: 1, epic: 2, legendary: 3, mythic: 4 };
  const liveTier = ownedItems === null
    ? avatar.tier
    : ownedItems
      .filter((i) => avatar[i.slot] === i.value)
      .reduce((best, i) => (!best || TIER_RANK[i.tier] > TIER_RANK[best] ? i.tier : best), null);

  if (loading) return <AvatarLoading />;

  const options = AVATAR_OPTIONS[category] || [];
  return (
    <section className="mennist-avatar-editor">
      <header className="mennist-avatar-header">
        <div>
          <h2>Create Your Veil</h2>
          <p>Make a pixel identity for Mennist.</p>
        </div>
        <div className="mennist-avatar-preview">
          <Avatar avatar={avatar} size={128} title="Veil Preview" />
          {liveTier && <TierBadge tier={liveTier} edition={avatar.mythicEdition} className="editor-tier-badge" />}
        </div>
      </header>

      <nav className="mennist-avatar-category-list" aria-label="Avatar features">
        {[...AVATAR_CATEGORIES, { id: "premium", label: "Premium" }].map((item) => (
          <button
            key={item.id}
            type="button"
            className={category === item.id ? "mennist-avatar-category is-active" : "mennist-avatar-category"}
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {category === "hair" && (
        <div className="mennist-hair-colors">
          <p className="mennist-avatar-section-label">Hair color</p>
          <div className="mennist-hair-color-list">
            {HAIR_COLORS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={avatar.hairColor === item.color ? "mennist-hair-color is-active" : "mennist-hair-color"}
                style={{ backgroundColor: item.color }}
                title={item.label}
                aria-label={item.label}
                aria-pressed={avatar.hairColor === item.color}
                onClick={() => {
                  // A plain colour replaces any premium hair colour
                  setAvatar((current) => ({ ...current, hairColor: item.color, hairFx: null }));
                }}
              />
            ))}
          </div>
        </div>
      )}

      {category === "premium" && (
        <PremiumPicker avatar={avatar} ownedItems={ownedItems} onWear={wearPremium} />
      )}

      <div className="mennist-avatar-options">
        {category !== "premium" && options.map((option) => {
          const selected = avatar[category] === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={selected ? "mennist-avatar-option is-selected" : "mennist-avatar-option"}
              aria-pressed={selected}
              onClick={() => chooseOption(option)}
            >
              {category === "skin" ? (
                <span className="mennist-skin-swatch" style={{ backgroundColor: option.color }} />
              ) : (
                <Avatar avatar={{ ...avatar, [category]: option.id }} size={68} title={`${option.label} preview`} />
              )}
              <span className="mennist-avatar-option-label">{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mennist-avatar-actions">
        <button type="button" className="mennist-avatar-reset" onClick={resetAvatar} disabled={saving}>Reset</button>
        <button type="button" className="mennist-avatar-save" onClick={handleSave} disabled={saving || !chatId}>
          {saving ? "Saving..." : "Save Veil"}
        </button>
      </div>
    </section>
  );
}

// Lets the user wear or remove the premium items they own
function PremiumPicker({ avatar, ownedItems, onWear }) {
  if (ownedItems === null) {
    return <p className="mennist-avatar-section-label">Loading your items...</p>;
  }
  if (ownedItems.length === 0) {
    return (
      <div className="premium-empty">
        <p>You don't own any premium items yet. Earn Sakesnake Coins with your daily streak and unlock auras, frames, glowing eyes and full sets.</p>
        <Link to="/coins/shop" className="mennist-avatar-save premium-shop-link">Visit the shop</Link>
      </div>
    );
  }

  return (
    <div className="premium-picker">
      {PREMIUM_SLOTS.map((slot) => {
        const items = ownedItems.filter((i) => i.slot === slot.id);
        if (items.length === 0) return null;
        const noneValue = NONE_VALUE[slot.id];
        const wearingOne = items.some((i) => avatar[slot.id] === i.value);
        return (
          <div key={slot.id} className="premium-slot">
            <p className="mennist-avatar-section-label">{slot.label}</p>
            <div className="mennist-avatar-options">
              <button type="button" className={!wearingOne ? "mennist-avatar-option is-selected" : "mennist-avatar-option"}
                aria-pressed={!wearingOne}
                onClick={() => { if (wearingOne) onWear(slot.id, avatar[slot.id]); }}>
                <Avatar avatar={{ ...avatar, [slot.id]: noneValue }} size={68} title="Without" />
                <span className="mennist-avatar-option-label">{slot.id === "eyes" ? "Regular" : "None"}</span>
              </button>
              {items.map((item) => {
                const selected = avatar[slot.id] === item.value;
                return (
                  <button key={item.id} type="button" className={selected ? "mennist-avatar-option is-selected" : "mennist-avatar-option"}
                    aria-pressed={selected} onClick={() => onWear(slot.id, item.value)}
                    title={`${item.name} · ${TIER_LABELS[item.tier]}`}>
                    <Avatar avatar={{ ...avatar, [slot.id]: item.value }} size={68} title={`${item.name} preview`} />
                    <span className="mennist-avatar-option-label">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <Link to="/coins/shop" className="premium-more-link">Get more in the shop</Link>
    </div>
  );
}
