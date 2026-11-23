import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PostContext from '../context/posts/postContext'
import CoinsContext from '../context/coins/CoinsContext'
import Avatar from './Avatar/Avatar'
import useMyAvatar from './Coins/useMyAvatar'
import StreakFlame from './Coins/StreakFlame'
import '../styles/Composer.css'

const RITZZ_MIN_CHARS = 20; // same as STREAK_MIN_CONTENT_LENGTH on the server

const TYPES = [
  {
    id: 0, name: "Vibe", desc: "Share a thought or secret. Get vibes back.",
    icon: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />,
  },
  {
    id: 1, name: "Echo", desc: "Share a dream or thought. Find your twin.",
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5.5" /><circle cx="12" cy="12" r="2" fill="currentColor" /></>,
  },
];

function SubmitSecret(props) {
  const { content, setContent, contentType, setContentType, submitPost } = useContext(PostContext);
  const { wallet } = useContext(CoinsContext);
  const [avatar] = useMyAvatar();
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Mennist | Share something"
  }, [])

  const isVibe = contentType === 0;
  const text = content.content.trim();
  const chars = text.length;
  const words = chars ? text.split(/\s+/).length : 0;
  const titleOk = content.title.trim().length >= 3;
  const canPost = (isVibe ? titleOk : true) && chars >= 3 && !sending;
  const streak = wallet && wallet.streak;

  const handleChange = (e) => {
    if (e.target.tagName === "TEXTAREA") {
      e.target.style.height = "auto";
      e.target.style.height = `${e.target.scrollHeight}px`;
    }
    setContent({ ...content, [e.target.name]: e.target.value });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    setSending(true);
    try {
      props.alert("Shhh... delivering your post", "primary");
      await submitPost();
      props.alert(`Your ${isVibe ? "vibe" : "echo"} was sent.`, "success");
      navigate(isVibe ? "/" : "/echoes");
    }
    catch (submitErr) {
      if (submitErr.response?.status === 401) {
        props.alert("Please start a new session.", "alert");
        navigate("/setup-user");
      }
      else {
        props.alert("Something went wrong!", "alert");
      }
    }
    finally {
      setSending(false);
    }
  }

  // Only vibes count for the Ritzz (the server records the streak on posts, not echoes)
  let ritzz = null;
  if (isVibe && streak) {
    if (streak.postedToday) ritzz = { done: true, text: "Today's Ritzz is already kept" };
    else if (chars >= RITZZ_MIN_CHARS) ritzz = { done: true, text: "Counts for today's Ritzz" };
    else ritzz = { done: false, text: `${RITZZ_MIN_CHARS - chars} more characters to count for your Ritzz` };
  }

  const status = isVibe && !titleOk
    ? "Add a title (3+ characters) to post"
    : chars < 3 ? "Write something to post" : `${chars} characters · ${words} words`;

  return (
    <div className="composer">
      <div className="composer-heading">
        <span className="composer-eyebrow">CREATE</span>
        <h1>Share something</h1>
        <p>You're anonymous here. Only your Veil is shown.</p>
      </div>

      <div className="composer-types" role="group" aria-label="What do you want to post?">
        {TYPES.map((t) => (
          <button key={t.id} type="button" className="composer-type" aria-pressed={contentType === t.id} onClick={() => setContentType(t.id)}>
            <span className="composer-type-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
            </span>
            <span className="composer-type-text">
              <strong>{t.name}</strong>
              <span>{t.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <form className="composer-card" onSubmit={handleSubmit} aria-label={isVibe ? "Write your vibe" : "Write your echo"}>
        <div className="composer-card-head">
          <div className="composer-who">
            {avatar ? <Avatar avatar={avatar} size={36} title="Your Veil" /> : <span className="composer-avatar-slot" />}
            <div>
              <strong>Anonymous</strong>
              <span>Only your Veil is shown</span>
            </div>
          </div>
          {isVibe && streak && (
            <span className="composer-ritzz-pill">
              <StreakFlame size={12} dim={!streak.postedToday} />
              {streak.current > 0 ? `Day ${streak.current} Ritzz` : "Start your Ritzz"}
            </span>
          )}
        </div>

        {!isVibe && (
          <p className="composer-echo-note">After you post, you'll see Echoes from people who wrote something similar, with a match score.</p>
        )}

        <div className="composer-fields">
          {isVibe && (
            <div className="composer-field">
              <label htmlFor="title">Title</label>
              <input id="title" name="title" type="text" className="composer-title" maxLength={120}
                value={content.title} onChange={handleChange} placeholder="Give it a short title" />
            </div>
          )}
          <div className="composer-field">
            <label htmlFor="content">{isVibe ? "Your vibe" : "Your echo"}</label>
            <textarea id="content" name="content" className="composer-body" rows="8"
              value={content.content} onChange={handleChange}
              placeholder={isVibe ? "What's on your mind? Nobody will know it's you." : "Describe a dream, a fear or a thought you keep having…"} />
          </div>
        </div>

        <div className="composer-foot">
          <div className="composer-foot-text">
            {ritzz && (
              <span className={`composer-ritzz ${ritzz.done ? "is-done" : ""}`}>
                {ritzz.done && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
                )}
                {ritzz.text}
              </span>
            )}
            <span className="composer-status" aria-live="polite">{status}</span>
          </div>
          <button type="submit" className="composer-post" disabled={!canPost}>
            {sending ? "Posting…" : `Post ${isVibe ? "vibe" : "echo"}`}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </form>

      <p className="composer-rules">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>
        <span>Be real, stay respectful. No misleading, harmful, self-harming, hateful or threatening posts. Category and 18+ tags are added for you.</span>
      </p>
    </div>
  )
}

export default SubmitSecret
