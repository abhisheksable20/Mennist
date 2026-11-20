import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import CoinsContext from "../../context/coins/CoinsContext";
import { db } from "../../internalDatabase/db";
import { deleteUserInternalData } from "../../internalDatabase/UserData";
import { generateKeyPair } from "../../crypto/keyManager";
import RecoveryKeyBox from "./RecoveryKeyBox";
import { confirmRecoveryKey, findKeyInText, formatKeyInput, KEY_LENGTH, keyCharCount, recoverAccount } from "./recoveryApi";
import "../../styles/Coins.css";
import "../../styles/Recovery.css";

const getFingerprint = async () => {
  try {
    const fp = await FingerprintJS.load();
    const id = (await fp.get()).visitorId;
    localStorage.setItem("deviceFingerprint", id);
    return id;
  } catch (fpErr) {
    return null;
  }
};

// Enter a recovery key on a new device, then save the new key it gives back
export default function RecoverPage(props) {
  const navigate = useNavigate();
  const coins = useContext(CoinsContext);
  const fileRef = useRef(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasAccountHere, setHasAccountHere] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [saved, setSaved] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    document.title = "Mennist | Recover account";
    db.keys.get("user-keypair").then((k) => setHasAccountHere(!!k?.chatId)).catch(() => {});
  }, []);

  const count = keyCharCount(value);
  const complete = count === KEY_LENGTH;

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const key = findKeyInText(text);
      if (key) setValue(key);
      else setError("No recovery key found in what you copied.");
    } catch (pasteErr) {
      setError("Couldn't read the clipboard. Paste into the box instead.");
    }
  };

  const upload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10000) {
      setError("That file is too big to be a recovery key file.");
      return;
    }
    const key = findKeyInText(await file.text());
    if (key) {
      setValue(key);
      setError("");
    } else {
      setError("No recovery key found in that file.");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!complete || busy) return;
    setBusy(true);
    setError("");
    try {
      // A fresh key pair for this device; the account moves to it
      const keys = await generateKeyPair();
      const fingerprint = await getFingerprint();
      const out = await recoverAccount(value, keys.publicKey, fingerprint);

      // This browser now belongs to the recovered account
      await deleteUserInternalData(true);
      if (fingerprint) localStorage.setItem("deviceFingerprint", fingerprint);
      localStorage.setItem("chatEnableStatus", "true");
      await db.keys.put({ id: "user-keypair", privateKey: keys.privateKey, publicKey: keys.publicKey, chatId: out.chatId });

      setNewKey(out.recoveryCode);
      if (coins) coins.refreshWallet();
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setError("That recovery key doesn't work. Check it and try again. A key works only once.");
      else if (status === 429) setError("Too many tries. Wait an hour and try again.");
      else setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setFinishing(true);
    try {
      await confirmRecoveryKey();
    } catch (confirmErr) {
      // Not critical: the Veil page will ask them to finish later
    }
    if (coins) coins.refreshWallet();
    if (props.alert) props.alert("Welcome back.", "success");
    navigate("/");
  };

  if (newKey) {
    const wallet = coins && coins.wallet;
    return (
      <main className="recover-page">
        <div className="recover-panel">
          <h1 className="recover-title">Welcome back</h1>
          <p className="coin-muted">Your account is back on this device.</p>

          <section className="recovery-new-key" aria-labelledby="new-key-title">
            <h2 id="new-key-title">Save your new recovery key</h2>
            <p>Your old key was used up just now. This new one replaces it.</p>
            <RecoveryKeyBox recoveryKey={newKey} />
            <label className="recovery-check">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
              I've saved my new key
            </label>
          </section>

          <section className="recovery-restored" aria-labelledby="restored-title">
            <h2 id="restored-title">Restored</h2>
            {wallet && (
              <div className="recovery-restored-chips">
                <span className="is-coins">{wallet.balance} coins</span>
                <span className="is-streak">{wallet.streak.current} day streak</span>
              </div>
            )}
            <p>Your Veil, premium items, posts, echoes and chats.</p>
            <p className="coin-muted coin-small">Old messages that were only on your lost device can't come back. Every other browser on this account has been signed out.</p>
          </section>

          <button type="button" className="coin-btn coin-btn-primary coin-btn-block" disabled={!saved || finishing} onClick={finish}>
            {finishing ? "Opening…" : "Continue to Mennist"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="recover-page">
      <form className="recover-panel" onSubmit={submit}>
        <Link to="/setup-user" className="recover-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </Link>
        <h1 className="recover-title">Enter your recovery key</h1>
        <p className="coin-muted">Dashes are added for you as you type. Small or capital letters both work.</p>

        <div className="recover-field">
          <label htmlFor="recovery-key-input">Recovery key</label>
          <input
            id="recovery-key-input"
            className={`recovery-input recover-key-input ${complete ? "is-ok" : ""}`}
            value={value}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            onChange={(e) => {
              setValue(formatKeyInput(e.target.value));
              setError("");
            }} />
          <span className="coin-muted coin-small">{count} of {KEY_LENGTH} characters</span>
        </div>

        <div className="recovery-key-actions">
          <button type="button" className="coin-btn coin-btn-ghost" onClick={paste}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /></svg>
            Paste key
          </button>
          <button type="button" className="coin-btn coin-btn-ghost" onClick={() => fileRef.current && fileRef.current.click()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21V9M7 14l5-5 5 5M5 3h14" /></svg>
            Upload file
          </button>
          <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={upload} />
        </div>

        {hasAccountHere && (
          <p className="coin-note">This browser already has a Mennist account. Recovering replaces it here.</p>
        )}
        {error && <p className="coin-error" role="alert">{error}</p>}

        <button type="submit" className="coin-btn coin-btn-primary coin-btn-block" disabled={!complete || busy}>
          {busy ? "Recovering…" : "Recover my account"}
        </button>

        <p className="coin-muted coin-small coin-center">Lost your key? Without it we can't recover the account. That's what keeps it anonymous.</p>
      </form>
    </main>
  );
}
