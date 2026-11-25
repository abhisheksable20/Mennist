import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CoinsContext from "../../context/coins/CoinsContext";
import Avatar from "../Avatar/Avatar";
import useMyAvatar from "./useMyAvatar";
import { drawRitzzCard, loadAvatarImage, loadCardFonts, CARD_SIZES } from "./ritzzCard";
import { fetchInvites } from "./coinApi";
import "../../styles/Coins.css";

const canShareFiles = () => {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [new File([""], "ritzz.png", { type: "image/png" })] });
  } catch {
    return false;
  }
};

// Make a shareable image of the user's Ritzz (Story 9:16 or Square 1:1)
export default function ShareRitzzPage(props) {
  const { wallet, refreshWallet } = useContext(CoinsContext);
  const [avatar] = useMyAvatar();
  const [format, setFormat] = useState("story");
  const [busy, setBusy] = useState(false);
  // undefined while loading, null if it couldn't load (the card then links to mennist.com)
  const [invite, setInvite] = useState();
  const canvasRef = useRef(null);
  const avatarRef = useRef(null);
  const days = wallet ? wallet.streak.current : 0;

  useEffect(() => {
    document.title = "Mennist | Share your Ritzz";
    refreshWallet();
    fetchInvites().then((i) => setInvite({ code: i.code, bonus: i.friendBonus }), () => setInvite(null));
  }, [refreshWallet]);

  // Redraw when the format, Ritzz or avatar changes; ignore a draw that a newer one replaced
  useEffect(() => {
    if (!days || !avatar || invite === undefined) return;
    let current = true;
    (async () => {
      const px = format === "story" ? 440 : 120;
      const [img] = await Promise.all([loadAvatarImage(avatarRef.current?.querySelector("svg"), px), loadCardFonts()]);
      if (current && canvasRef.current) drawRitzzCard(canvasRef.current, { days, format, avatar: img, invite });
    })();
    return () => { current = false; };
  }, [days, format, avatar, invite]);

  const toFile = () => new Promise((resolve, reject) => canvasRef.current.toBlob((blob) => (
    blob ? resolve(new File([blob], `mennist-ritzz-${days}.png`, { type: "image/png" })) : reject(new Error("No image"))
  ), "image/png"));

  const run = async (action) => {
    setBusy(true);
    try {
      await action(await toFile());
    } catch (err) {
      if (err.name !== "AbortError") props.alert("Couldn't make your card. Please try again.", "alert");
    } finally {
      setBusy(false);
    }
  };

  const share = (file) => navigator.share({ files: [file], text: `My ${days}-day Ritzz on Mennist. Be real. Stay anonymous. https://mennist.com${invite ? `/i/${invite.code}` : ""}` });

  const save = (file) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    props.alert("Card saved.", "success");
  };

  if (!wallet) {
    return (
      <div className="coin-page">
        <div className="coin-skeleton" style={{ height: 420 }} />
      </div>
    );
  }

  const [w, h] = CARD_SIZES[format];

  return (
    <div className="coin-page ritzz-share">
      <header className="coin-page-header">
        <div>
          <p className="coin-eyebrow">Ritzz</p>
          <h1 className="coin-page-title">Share your Ritzz</h1>
        </div>
      </header>

      {!days ? (
        <section className="coin-card">
          <p className="coin-muted">You don't have a Ritzz yet. Post today to start one, then come back to share it.</p>
          <Link to="/submit-secret" className="coin-btn coin-btn-primary coin-btn-left">Write a post</Link>
        </section>
      ) : (
        <>
          <div className="segmented" role="group" aria-label="Card format">
            <button type="button" aria-pressed={format === "story"} onClick={() => setFormat("story")}>Story · 9:16</button>
            <button type="button" aria-pressed={format === "square"} onClick={() => setFormat("square")}>Square · 1:1</button>
          </div>

          <canvas ref={canvasRef} className="ritzz-share-card" style={{ aspectRatio: `${w} / ${h}`, width: `min(100%, calc(min(60vh, 560px) * ${w / h}))` }}
            role="img" aria-label={`Your ${days}-day Ritzz card`} />

          <p className="coin-muted coin-small ritzz-share-note">Only your avatar and Ritzz show. Never your posts or chats.</p>

          <div className="ritzz-share-actions">
            {canShareFiles() && (
              <button type="button" className="coin-btn coin-btn-primary coin-btn-block" disabled={busy} onClick={() => run(share)}>
                Share
              </button>
            )}
            <button type="button" className="coin-btn coin-btn-ghost coin-btn-block" disabled={busy} onClick={() => run(save)}>
              Save image
            </button>
          </div>
        </>
      )}

      {/* The user's avatar, drawn off-screen so it can be painted onto the card */}
      <div ref={avatarRef} hidden>{avatar && <Avatar avatar={avatar} size={64} />}</div>
    </div>
  );
}
