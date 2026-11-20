import { useState } from "react";
import { copyText, downloadKeyFile } from "./recoveryApi";

// The recovery key with Copy and Download buttons
export default function RecoveryKeyBox({ recoveryKey }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (await copyText(recoveryKey)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="recovery-key">
      <div className="recovery-key-box">
        <span className="recovery-key-label">RECOVERY KEY</span>
        <p className="recovery-key-value">{recoveryKey}</p>
      </div>
      <div className="recovery-key-actions">
        <button type="button" className="coin-btn coin-btn-ghost" onClick={copy}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
        <button type="button" className="coin-btn coin-btn-ghost" onClick={() => downloadKeyFile(recoveryKey)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
          Download
        </button>
      </div>
    </div>
  );
}
