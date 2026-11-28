import { useEffect, useRef, useState } from "react";
import CoinIcon from "./Coins/CoinIcon";

const Icon = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

// "⋯" menu in the chat header. "Send coins" is in here only on phones (desktop shows its own button).
function ChatOptionsMenu({ blocked, onSendCoins, onDelete, onBlock, onUnblock }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close on a click outside or Escape; listeners exist only while the menu is open
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (action) => () => {
    setOpen(false);
    action();
  };

  return (
    <div className="chat-options" ref={wrapRef}>
      <button type="button" className="chat-options-toggle" aria-label="Chat options"
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((prev) => !prev)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {open && (
        <div className="chat-options-menu" role="menu">
          {!blocked && (
            <button type="button" role="menuitem" className="chat-options-item chat-options-coins" onClick={pick(onSendCoins)}>
              <CoinIcon size={18} /> Send coins
            </button>
          )}
          <button type="button" role="menuitem" className="chat-options-item" onClick={pick(onDelete)}>
            <Icon><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></Icon>
            Delete chat
          </button>
          <div className="chat-options-divider" />
          {blocked ? (
            <button type="button" role="menuitem" className="chat-options-item" onClick={pick(onUnblock)}>
              <Icon><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></Icon>
              Unblock user
            </button>
          ) : (
            <button type="button" role="menuitem" className="chat-options-item is-danger" onClick={pick(onBlock)}>
              <Icon><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></Icon>
              Block user
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatOptionsMenu;
