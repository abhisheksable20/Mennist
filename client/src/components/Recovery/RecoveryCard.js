import { useCallback, useEffect, useState } from "react";
import CoinIcon from "../Coins/CoinIcon";
import RecoverySetupModal from "./RecoverySetupModal";
import { fetchRecoveryStatus } from "./recoveryApi";

const REWARD = 15;

const formatDate = (ts) => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// Veil page: set up recovery, or see that it's on and make a new key
export default function RecoveryCard() {
  const [status, setStatus] = useState(null);
  const [modal, setModal] = useState(null); // null | "setup" | "replace"

  const load = useCallback(async () => {
    try {
      setStatus(await fetchRecoveryStatus());
    } catch (statusErr) {
      // Not logged in: nothing to show. Anything else: say so, don't vanish.
      setStatus(statusErr.response?.status === 401 ? null : { error: true });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const close = useCallback(() => {
    setModal(null);
    load();
  }, [load]);

  if (!status) return null;

  if (status.error) {
    return (
      <section className="recovery-card is-on" aria-labelledby="recovery-card-title">
        <div className="recovery-card-row">
          <div>
            <h2 id="recovery-card-title" className="recovery-card-status">Account recovery</h2>
            <span className="coin-muted coin-small">Couldn't check your recovery status right now.</span>
          </div>
          <button type="button" className="coin-btn coin-btn-ghost coin-btn-small" onClick={load}>Try again</button>
        </div>
      </section>
    );
  }

  const protectedOk = status.enabled && status.confirmed;

  return (
    <>
      {protectedOk ? (
        <section className="recovery-card is-on" aria-labelledby="recovery-card-title">
          <div className="recovery-card-row">
            <div>
              <h2 id="recovery-card-title" className="recovery-card-status">
                <span className="recovery-dot" aria-hidden="true" />
                Recovery is on
              </h2>
              <span className="coin-muted coin-small">Key made {formatDate(status.createdAt)}</span>
            </div>
            <button type="button" className="coin-btn coin-btn-ghost coin-btn-small" onClick={() => setModal("replace")}>Make a new key</button>
          </div>
          <p className="coin-muted coin-small">Making a new key stops the old one from working. Do it if someone may have seen your key.</p>
        </section>
      ) : (
        <section className="recovery-card" aria-labelledby="recovery-card-title">
          <div className="recovery-card-head">
            <span className="recovery-card-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </span>
            <h2 id="recovery-card-title">{status.enabled ? "Finish protecting your account" : "Protect your account"}</h2>
          </div>
          {status.enabled ? (
            <p>You made a recovery key but didn't confirm you saved it. Make a new one and finish the check, so you can really get back in.</p>
          ) : (
            <>
              <p>Your account lives only in this browser. If you clear it or switch devices, your coins, Ritzz and Veil are gone. A recovery key brings them back.</p>
              <ul>
                <li>No email or phone. You stay anonymous.</li>
                <li>Takes about a minute.</li>
              </ul>
            </>
          )}
          {!status.rewarded && (
            <div className="recovery-card-reward">
              <span className="recovery-card-chip"><CoinIcon size={12} /> +{REWARD}</span>
              coins when you finish
            </div>
          )}
          <button type="button" className="coin-btn coin-btn-primary coin-btn-block" onClick={() => setModal("setup")}>
            {status.enabled ? "Make a new key" : "Set up recovery"}
          </button>
        </section>
      )}

      {modal && <RecoverySetupModal replacing={modal === "replace"} onClose={close} />}
    </>
  );
}
