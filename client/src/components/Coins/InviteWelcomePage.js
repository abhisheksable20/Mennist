import { useContext, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import CoinsContext from "../../context/coins/CoinsContext";
import CoinIcon from "./CoinIcon";
import { fetchInviteOffer } from "./coinApi";
import useSetupUser, { INVITE_KEY } from "../useSetupUser";
import "../../styles/Coins.css";
import "../../styles/Invite.css";

// What someone sees when they open a friend's invite link (/i/:code)
export default function InviteWelcomePage(props) {
  const { code } = useParams();
  const { wallet } = useContext(CoinsContext);
  const { setupUser, busy } = useSetupUser(props.alert);
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    document.title = "Mennist | You're invited";
    let current = true;
    fetchInviteOffer(code).then((o) => {
      if (!current) return;
      setOffer(o);
      // Kept until the account is made, even if they look around first
      if (o.valid) localStorage.setItem(INVITE_KEY, code.toUpperCase());
    }).catch(() => current && setOffer({ valid: false }));
    return () => { current = false; };
  }, [code]);

  // Already on Mennist: invites are for new people
  if (wallet) return <Navigate to="/" replace />;

  const invited = !offer || offer.valid;

  return (
    <div className="coin-page invite-welcome">
      <section className="invite-welcome-hero">
        <h1>{invited ? "You're invited" : "Welcome to Mennist"}</h1>
        <p>
          {invited && "A friend wants you on Mennist. "}
          Say what you really think, anonymously. No name, email or phone number needed.
        </p>
      </section>

      <aside className="invite-gift">
        {offer && offer.welcomeBonus && (
          <div className="invite-gift-coins">
            <span className="invite-gift-label">
              <strong>Coins waiting for you</strong>
              <span>{offer.friendBonus ? `${offer.welcomeBonus} welcome + ${offer.friendBonus} from your friend` : "Your welcome bonus"}</span>
            </span>
            <span className="invite-gift-amount"><CoinIcon size={26} />{offer.welcomeBonus + offer.friendBonus}</span>
          </div>
        )}
        <dl className="invite-features">
          <div><dt>Vibes</dt><dd>Post a thought or secret. People send vibes back.</dd></div>
          <div><dt>Echoes</dt><dd>Find people who dream and think like you.</dd></div>
          <div><dt>Ritzz</dt><dd>Post every day to grow your streak and earn more coins.</dd></div>
        </dl>
      </aside>

      <div className="invite-welcome-actions">
        <button type="button" className="coin-btn coin-btn-primary coin-btn-block" onClick={setupUser} disabled={busy || !offer}>
          Join Mennist
        </button>
        <span className="coin-muted coin-small">Already on Mennist? <Link to="/recover">Log in</Link></span>
      </div>
    </div>
  );
}
