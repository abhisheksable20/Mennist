import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import AvatarLoading from "./AvatarLoading";
import { AVATAR_CATEGORIES, AVATAR_OPTIONS, DEFAULT_AVATAR, HAIR_COLORS } from "./avatarOptions";
import { loadAvatar, saveAvatar } from "./avatarService";
import "../../styles/Avatar.css";

export default function AvatarEditor({ chatId, alert, sessionExpired }) {
  const [avatar, setAvatar] = useState({ ...DEFAULT_AVATAR });
  const [category, setCategory] = useState("style");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    setAvatar((current) => ({ ...current, [category]: option.id }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await saveAvatar(avatar);
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
        </div>
      </header>

      <nav className="mennist-avatar-category-list" aria-label="Avatar features">
        {AVATAR_CATEGORIES.map((item) => (
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
                  setAvatar((current) => ({ ...current, hairColor: item.color }));
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mennist-avatar-options">
        {options.map((option) => {
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
