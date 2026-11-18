import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/*
  Popup used by every coin screen. Centred card on desktop, slides up from
  the bottom on phones. Closes with Escape, the X button or a backdrop click.
*/
export default function CoinModal({ title, onClose, children, labelledBy, wide = false, hideTitle = false }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (panelRef.current) panelRef.current.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previous && previous.focus) previous.focus();
    };
  }, [onClose]);

  const headingId = labelledBy || "coin-modal-title";

  return createPortal(
    <div className="coin-modal-root">
      <button type="button" className="coin-modal-backdrop" aria-label="Close" onClick={onClose} />
      <section
        ref={panelRef}
        tabIndex={-1}
        className={`coin-modal ${wide ? "is-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <span className="coin-modal-handle" aria-hidden="true" />
        <header className="coin-modal-header">
          <h2 id={headingId} className={hideTitle ? "visually-hidden" : ""}>{title}</h2>
          <button type="button" className="coin-icon-btn" aria-label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="coin-modal-body">{children}</div>
      </section>
    </div>,
    document.body
  );
}
