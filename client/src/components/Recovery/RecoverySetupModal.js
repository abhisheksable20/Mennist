import { useContext, useEffect, useMemo, useRef, useState } from "react";
import CoinModal from "../Coins/CoinModal";
import CoinIcon from "../Coins/CoinIcon";
import CoinsContext from "../../context/coins/CoinsContext";
import RecoveryKeyBox from "./RecoveryKeyBox";
import { confirmRecoveryKey, createRecoveryKey, keyGroup } from "./recoveryApi";

// Two different groups (1-6) for the user to type back
const pickGroups = () => {
  const a = 1 + Math.floor(Math.random() * 6);
  let b = 1 + Math.floor(Math.random() * 5);
  if (b >= a) b++;
  return a < b ? [a, b] : [b, a];
};

const clean = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

/*
  Set up recovery, or replace the key (replacing = true).
  Steps: (replace: are you sure) -> key -> type back two groups -> done.
*/
export default function RecoverySetupModal({ replacing, onClose, onDone }) {
  const coins = useContext(CoinsContext);
  const [step, setStep] = useState(replacing ? "replace" : "loading");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState(["", ""]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState(0);
  const groups = useMemo(pickGroups, []);
  const started = useRef(false);

  const makeKey = async () => {
    setStep("loading");
    setError("");
    try {
      setRecoveryKey(await createRecoveryKey());
      setStep("key");
      onDone && onDone();
    } catch (err) {
      setError(err.response?.status === 429
        ? "Too many new keys. Try again in an hour."
        : "Couldn't create a key. Please try again.");
      setStep("error");
    }
  };

  useEffect(() => {
    if (!replacing && !started.current) {
      started.current = true;
      makeKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matches = groups.map((g, i) => answers[i] === keyGroup(recoveryKey, g));
  const allMatch = matches.every(Boolean);

  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      const out = await confirmRecoveryKey();
      setReward(out.reward || 0);
      if (coins) coins.refreshWallet();
      setStep("done");
      onDone && onDone();
    } catch (err) {
      setError("Couldn't finish setup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    replace: "Make a new key?",
    loading: "Account recovery",
    error: "Account recovery",
    key: "Your recovery key",
    confirm: "Check you saved it",
    done: "Your account is protected",
  };

  return (
    <CoinModal title={titles[step]} onClose={onClose} labelledBy="recovery-setup-title">
      <div className="recovery-flow">
        {step === "replace" && (
          <>
            <p className="coin-muted">Your current recovery key will stop working right away. Do this if someone may have seen it or you lost it.</p>
            <button type="button" className="coin-btn coin-btn-primary coin-btn-block" onClick={makeKey}>Make a new key</button>
            <button type="button" className="coin-btn coin-btn-ghost coin-btn-block" onClick={onClose}>Keep my current key</button>
          </>
        )}

        {step === "loading" && <p className="coin-muted" role="status">Creating your key…</p>}

        {step === "error" && (
          <>
            <p className="coin-error" role="alert">{error}</p>
            <button type="button" className="coin-btn coin-btn-primary coin-btn-block" onClick={makeKey}>Try again</button>
          </>
        )}

        {step === "key" && (
          <>
            <p className="coin-muted">Write it down exactly, or download it. You'll need it to get back into your account. It's shown only once.</p>
            <RecoveryKeyBox recoveryKey={recoveryKey} />
            <p className="coin-muted coin-small">Letters A–Z and numbers 2–9. No 0, O, 1 or I, so it's hard to mistype.</p>
            <div className="recovery-warning" role="note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
              <span>Anyone with this key can open your account. Never share it. We can't show it again or reset it for you.</span>
            </div>
            <label className="recovery-check">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
              I've saved my recovery key
            </label>
            <button type="button" className="coin-btn coin-btn-primary coin-btn-block" disabled={!saved} onClick={() => setStep("confirm")}>Continue</button>
          </>
        )}

        {step === "confirm" && (
          <>
            <p className="coin-muted">Type these two groups from the key you saved. This makes sure you can really use it later.</p>
            <p className="recovery-mask" aria-hidden="true">
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <span key={g} className={groups.includes(g) ? "is-asked" : ""}>{groups.includes(g) ? "????" : "••••"}</span>
              ))}
            </p>
            <div className="recovery-groups">
              {groups.map((g, i) => (
                <div key={g} className="recovery-group">
                  <label htmlFor={`recovery-group-${g}`}>Group {g}</label>
                  <input
                    id={`recovery-group-${g}`}
                    className={`recovery-input ${matches[i] ? "is-ok" : ""}`}
                    value={answers[i]}
                    maxLength={4}
                    autoComplete="off"
                    spellCheck="false"
                    onChange={(e) => {
                      const next = [...answers];
                      next[i] = clean(e.target.value);
                      setAnswers(next);
                    }} />
                </div>
              ))}
            </div>
            {answers.every((a) => a.length === 4) && !allMatch && (
              <p className="coin-error" role="alert">That doesn't match your key. Check what you saved.</p>
            )}
            {error && <p className="coin-error" role="alert">{error}</p>}
            <button type="button" className="coin-btn coin-btn-primary coin-btn-block" disabled={!allMatch || busy} onClick={finish}>
              {busy ? "Finishing…" : "Finish setup"}
            </button>
            <button type="button" className="coin-btn coin-btn-link coin-btn-left" onClick={() => setStep("key")}>Go back and see the key again</button>
          </>
        )}

        {step === "done" && (
          <>
            <div className="recovery-done-icon" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
            </div>
            <p className="coin-muted coin-center">If you ever lose this browser, tap "I have a recovery key" on the Mennist home page to get back in.</p>
            {reward > 0 && (
              <div className="recovery-reward">
                <CoinIcon size={20} />
                <b>+{reward}</b>
                <span>coins added</span>
              </div>
            )}
            <button type="button" className="coin-btn coin-btn-primary coin-btn-block" onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </CoinModal>
  );
}
