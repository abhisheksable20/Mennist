import { Component } from "react";
import "../../styles/ErrorBoundary.css";

const RELOAD_FLAG = "mennist-chunk-reload";

// A code file from an older deploy is gone (user kept the tab open across a deploy)
const isChunkError = (error) =>
  !!error && (error.name === "ChunkLoadError" || /Loading (CSS )?chunk [\w-]+ failed/i.test(error.message || ""));

/*
  Keeps one broken page from blanking the whole site.
  - Missing code chunk after a deploy: reload once to get the new version.
  - Anything else: a small "Something went wrong" screen with Try again.
  Changing `resetKey` (the page path) clears the error, so the navbar still works.
*/
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (isChunkError(error)) {
      let reloaded = false;
      try {
        reloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
        sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch (storageErr) {
        reloaded = true; // can't remember: don't risk a reload loop
      }
      if (!reloaded) {
        window.location.reload();
        return;
      }
    }
    console.error("Page crashed:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
    if (!this.state.error) {
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch (storageErr) { /* ignore */ }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = isChunkError(this.state.error);
    return (
      <main className="error-screen" role="alert">
        <div className="error-card">
          <span className="error-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16.5h.01" /></svg>
          </span>
          <h1>{chunk ? "A new version is available" : "Something went wrong"}</h1>
          <p>{chunk ? "Reload to get the latest Mennist." : "This page hit a problem. Your account and messages are safe."}</p>
          <div className="error-actions">
            <button type="button" className="error-btn is-primary" onClick={() => window.location.reload()}>
              {chunk ? "Reload" : "Try again"}
            </button>
            {!chunk && (
              <a className="error-btn" href="/">Go home</a>
            )}
          </div>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
