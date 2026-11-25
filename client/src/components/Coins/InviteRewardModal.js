import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CoinsContext from "../../context/coins/CoinsContext";
import CoinModal from "./CoinModal";
import CoinIcon from "./CoinIcon";
import { markInviteRewardSeen } from "./coinApi";
import "../../styles/Invite.css";

// Shown once after a friend you invited keeps their Ritzz and you got the reward
export default function InviteRewardModal() {
  const { wallet, refreshWallet } = useContext(CoinsContext);
  const navigate = useNavigate();
  const [closed, setClosed] = useState(false);
  const amount = wallet ? wallet.inviteReward : 0;

  // Ready for the next reward once the server has cleared this one
  useEffect(() => {
    if (!amount) setClosed(false);
  }, [amount]);

  if (!amount || closed) return null;

  const close = (to) => {
    setClosed(true);
    markInviteRewardSeen().catch(() => {}).finally(refreshWallet);
    if (to) navigate(to);
  };

  return (
    <CoinModal title="Your invite paid off" onClose={() => close()} hideTitle>
      <div className="invite-reward">
        <span className="invite-reward-amount"><CoinIcon size={36} />+{amount}</span>
        <strong className="invite-reward-title" aria-hidden="true">Your invite paid off</strong>
        <p className="coin-muted">A friend you invited kept their Ritzz going. The coins are in your wallet.</p>
        <div className="invite-reward-actions">
          <button type="button" className="coin-btn coin-btn-ghost coin-btn-block" onClick={() => close()}>Done</button>
          <button type="button" className="coin-btn coin-btn-primary coin-btn-block" onClick={() => close("/coins/invite")}>Invite another</button>
        </div>
      </div>
    </CoinModal>
  );
}
