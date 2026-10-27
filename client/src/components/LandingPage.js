import '../styles/LandingPage.css'
import creatAccSVG from "../assets/right_arrow_svg.svg"
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { generateKeyPair } from '../crypto/keyManager'
import { db } from '../internalDatabase/db'
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { deleteUserInternalData } from '../internalDatabase/UserData'

function LandingPage(props) {
  const [btnDisabled, setBtnDisabled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Mennist - Anonymous Chats & Posts";
  }, [])

  // Setup the user
  const setupUser = async () => {
    setBtnDisabled(true);
    props.alert("Preparing your safe space...", "primary");
    try {
      const keys = await generateKeys();
      const deviceFingerprint = await getOrCreateFingerprint();
      localStorage.setItem("chatEnableStatus", "true");

      const publicKey = keys.publicKey

      const postData = {
        publicKey,
        deviceFingerprint
      }

      const data = (await axios.post(`${process.env.REACT_APP_API_URL}/user/create-user`, postData, { withCredentials: true })).data;
      await db.keys.put({
        id: "user-keypair",
        privateKey: keys.privateKey,
        publicKey: keys.publicKey,
        chatId: data.chatId
      });

      // Delete all the data in index db
      if (data.isNew) {
        deleteUserInternalData(false)
      }

      props.alert("You're now anonymous.", "success");
      setTimeout(() => {
        navigate("/veil");
      }, 1000);
    }
    catch (setupErr) {
      if (setupErr.response && setupErr.response.status === 401) {
        props.alert("Please try again.", "alert");
        return;
      }
      console.log("Error: ", setupErr)
      props.alert("Internal server error", "alert");
    }
    finally {
      setBtnDisabled(false);
    }
  }

  // Generating Private Key and Public Key
  const generateKeys = async () => {
    try {
      const keys = await db.keys.get("user-keypair");
      if (keys)
        return keys

      const userKeys = await generateKeyPair();
      return userKeys;
    }
    catch (error) {
      throw error;
    }
  }

  // Generating device fingerprint
  const getOrCreateFingerprint = async () => {
    let fingerPrint = localStorage.getItem('deviceFingerprint');

    if (!fingerPrint) {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      fingerPrint = result.visitorId;

      localStorage.setItem('deviceFingerprint', fingerPrint);
    }

    return fingerPrint;
  }

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
        <button className="btn create-acc justify-content-center gap-2 mt-4" onClick={setupUser} disabled={btnDisabled}>
          Get Started
          {" "}
          <img src={creatAccSVG} alt="submitButton" width="28px" height="28px" />
        </button>

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
