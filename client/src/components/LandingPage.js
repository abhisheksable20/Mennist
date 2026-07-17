import React from 'react'
import '../styles/LandingPage.css'
import creatAcc from "../assets/anonymous_svg_icon.svg"
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { generateKeyPair } from '../crypto/keyManager'
import { db } from '../internalDatabase/db'
import FingerprintJS from '@fingerprintjs/fingerprintjs';

function LandingPage(props) {
  const [btnDisabled, setDisablility] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Mennist - Anonymous Chats & Posts";
  }, [])

  // Setup the user
  const setupUser = async () => {
    setDisablility(true);
    props.alert("Preparing your safe space...", "primary");
    try {
      const keys = await generateKeys();
      const deviceFingerprint = await getOrCreateFingerprint();

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
        await db.transaction("rw", db.chatUser, db.chats, async () => {
          await db.chatUser.clear();
          await db.chats.clear();
        })
      }

      props.alert("You're now anonymous.", "success");
      setTimeout(() => {
        navigate("/");
      }, 1000);
    }
    catch (setupErr) {
      if (setupErr.response && setupErr.response.status === 401) {
        props.alert("Please try again.", "alert");
        return;
      }

      props.alert("Internal server error", "alert");
    }
    finally {
      setDisablility(false);
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
          <img src={creatAcc} alt="submitButton" width="28px" height="28px" />
          Get Started
        </button>

        <p className="mt-3">
          By clicking <strong>Get Started</strong>, you agree to our{" "}
          <Link className='terms-link' to="/terms-and-conditions">Terms & Conditions</Link>.
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
