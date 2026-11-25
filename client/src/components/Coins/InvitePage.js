import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { coinError, fetchInvites } from "./coinApi";
import "../../styles/Coins.css";
import "../../styles/Invite.css";

const inviteLink = (code) => `${window.location.origin}/i/${code}`;
const shortDate = (ts) => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });

// One invited friend: only when they joined and how far their Ritzz got, never who they are
function FriendRow({ friend, need }) {
  const joined = `Friend joined ${shortDate(friend.joinedAt)}`;
  if (friend.rewarded > 0 || friend.capped) {
    return (
      <li className="invite-friend">
        <span className="invite-friend-text">
          <strong>{joined}</strong>
          <span>{friend.capped ? `Kept a ${need}-day Ritzz · monthly limit reached` : `Kept a ${need}-day Ritzz`}</span>
        </span>
        {friend.rewarded > 0 && <span className="invite-coins">+{friend.rewarded}</span>}
      </li>
    );
  }
  if (friend.days > 0) {
    const days = Math.min(friend.days, need);
    return (
      <li className="invite-friend is-progress">
        <span className="invite-friend-head">
          <strong>{joined}</strong>
          <span className="invite-friend-days">Ritzz day {days} of {need}</span>
        </span>
        <span className="invite-progress" aria-hidden="true">
          {Array.from({ length: need }, (_, i) => <span key={i} className={i < days ? "is-lit" : ""} />)}
        </span>
      </li>
    );
  }
  return (
    <li className="invite-friend">
      <span className="invite-friend-text">
        <strong>{joined}</strong>
        <span>Hasn't posted a vibe yet</span>
      </span>
    </li>
  );
}

// Wallet → Invite friends: your link, and how your invited friends are doing
export default function InvitePage(props) {
  const [invite, setInvite] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Mennist | Invite friends";
    const ctrl = new AbortController();
    fetchInvites(ctrl.signal).then(setInvite).catch((err) => {
      if (ctrl.signal.aborted) return;
      if (err.response && err.response.status === 401) navigate("/setup-user");
      else props.alert(coinError(err), "alert");
    });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  if (!invite) {
    return (
      <div className="coin-page">
        <div className="coin-skeleton" style={{ height: 160 }} />
        <div className="coin-skeleton" style={{ height: 240 }} />
      </div>
    );
  }

  const link = inviteLink(invite.code);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      props.alert("Invite link copied.", "success");
    } catch {
      props.alert(`Copy this link: ${link}`, "primary");
    }
  };

  const share = async () => {
    if (!navigator.share) return copy();
    try {
      await navigator.share({
        title: "Join me on Mennist",
        text: `Join me on Mennist. Say what you really think, anonymously. You'll start with ${invite.welcomeBonus + invite.friendBonus} coins.`,
        url: link,
      });
    } catch (err) {
      if (err.name !== "AbortError") copy();
    }
  };

  return (
    <div className="coin-page invite-page">
      <Link to="/coins" className="invite-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Wallet
      </Link>

      <div className="invite-layout">
        <section className="invite-main">
          <div className="invite-hero">
            <h1>Bring your friends to Mennist</h1>
            <p>They get {invite.friendBonus} coins when they join with your link. You get {invite.reward} coins when they keep a {invite.rewardStreak}-day Ritzz.</p>
          </div>

          <div className="invite-link-box">
            <div className="invite-ticket">
              <div className="invite-ticket-top">
                <div className="invite-code">
                  <span>Your invite code</span>
                  <strong>{invite.code}</strong>
                </div>
                <button type="button" className="invite-copy" onClick={copy}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                  Copy link
                </button>
              </div>
              <div className="invite-url">{link.replace(/^https?:\/\//, "")}</div>
            </div>
            <button type="button" className="coin-btn coin-btn-primary coin-btn-block" onClick={share}>Share invite</button>
          </div>
        </section>

        <aside className="invite-side" aria-labelledby="invites-title">
          <div>
            <div className="invite-list-head">
              <h2 id="invites-title">Your invites</h2>
              <span>Earned <b className="invite-coins">{invite.earned}</b></span>
            </div>
            {invite.friends.length === 0 ? (
              <p className="invite-empty">No one has joined with your link yet. Share it to get started.</p>
            ) : (
              <ul className="invite-friends">
                {invite.friends.map((f) => <FriendRow key={f.id} friend={f} need={invite.rewardStreak} />)}
              </ul>
            )}
            <p className="invite-used">{invite.rewardsUsed} of {invite.monthlyLimit} invite rewards used this month</p>
          </div>
          <p className="invite-fine">
            Invites stay anonymous both ways: you never see which account joined, and your friend never sees yours.
            Invite coins can be spent in the shop but can't be sent.
          </p>
        </aside>
      </div>
    </div>
  );
}
