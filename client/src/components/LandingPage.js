import '../styles/LandingPage.css'
import '../styles/Recovery.css'
import creatAccSVG from "../assets/right_arrow_svg.svg"
import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { db } from '../internalDatabase/db'
import { deleteUserInternalData } from '../internalDatabase/UserData'
import { fetchKeyStatus } from './Recovery/recoveryApi'
import useSetupUser from './useSetupUser'

function LandingPage(props) {
  const { setupUser, busy: btnDisabled } = useSetupUser(props.alert);

  useEffect(() => {
    document.title = "Mennist - Anonymous Chats & Posts";
  }, [])

  // This browser's account may have been recovered on another device. If so,
  // its key here was replaced: remove the local copy (keys, chats, settings).
  useEffect(() => {
    let cancelled = false;
    const checkKey = async () => {
      try {
        const keys = await db.keys.get("user-keypair");
        if (!keys?.publicKey) return;
        if ((await fetchKeyStatus(keys.publicKey)) !== "replaced" || cancelled) return;
        await deleteUserInternalData(true);
        props.alert("Your account was moved to another device with a recovery key. Its data on this browser was removed.", "alert");
      } catch (keyCheckErr) {
        // Offline or server busy: try again next visit
      }
    };
    checkKey();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className='landing-page d-flex justify-content-center'>
      <div className='text-center'>
        {/* Logo */}
        <h1 className='logo mb-4'>MENNIST</h1>

        {/* Custom Badge */}
        <div className="badge-custom mb-4">
          <span className="dot"></span>
          {" "}
          Share anonymously
        </div>

        {/* Heading Hero Title */}
        <h1 className='hero-title fw-bold'>
          Thoughts deserve
          <br />
          <span>freedom</span>.
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle mx-auto mt-4">
          Share your thoughts, stories and ideas with the world — no
          account, no name, no trace.
        </p>

        {/* Create account button */}
        <div className="landing-actions">
          <button className="btn create-acc justify-content-center gap-2 mt-4" onClick={setupUser} disabled={btnDisabled}>
            Get Started
            {" "}
            <img src={creatAccSVG} alt="submitButton" width="28px" height="28px" />
          </button>

          {/* Coming back on a new device */}
          <Link to="/recover" className="recover-link-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3M17 6l3 3M14 9l2 2" /></svg>
            I have a recovery key
          </Link>
        </div>

        <p className="mt-3 px-2">
          By clicking <strong>Get Started</strong>, you agree to our{" "}
          <Link className='terms-link' to="/terms-and-conditions">Terms & Conditions</Link>
          {" "}and acknowledge our{" "}
          <Link className="terms-link" to="/privacy-policy">Privacy Policy</Link>.
        </p>

        {/* Bottom text */}
        <div className="bottom-text mt-4 mb-5">
          <span>No account required · Completely anonymous</span>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
