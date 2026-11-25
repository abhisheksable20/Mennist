import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { generateKeyPair, answerLoginChallenge } from '../crypto/keyManager'
import { db } from '../internalDatabase/db'
import { deleteUserInternalData } from '../internalDatabase/UserData'

// Invite code from an /i/:code link, sent once when the account is made
export const INVITE_KEY = "inviteCode";

const readInviteCode = () => {
  try { return localStorage.getItem(INVITE_KEY) || undefined; } catch { return undefined; }
};

// Generating Private Key and Public Key
const generateKeys = async () => {
  const keys = await db.keys.get("user-keypair");
  if (keys) return keys;
  return generateKeyPair();
}

// Generating device fingerprint
const getOrCreateFingerprint = async () => {
  let fingerPrint = localStorage.getItem('deviceFingerprint');

  if (!fingerPrint) {
    const fp = await FingerprintJS.load({ monitoring: false }); // no usage ping to the library maker
    const result = await fp.get();
    fingerPrint = result.visitorId;

    localStorage.setItem('deviceFingerprint', fingerPrint);
  }

  return fingerPrint;
}

// Make a new account, or log in to this browser's existing one
export default function useSetupUser(alert) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const setupUser = async () => {
    setBusy(true);
    alert("Preparing your safe space...", "primary");
    try {
      const keys = await generateKeys();
      const deviceFingerprint = await getOrCreateFingerprint();
      localStorage.setItem("chatEnableStatus", "true");

      const postData = {
        publicKey: keys.publicKey,
        deviceFingerprint,
        inviteCode: readInviteCode(),
      }

      let data = (await axios.post(`${process.env.REACT_APP_API_URL}/user/create-user`, postData, { withCredentials: true })).data;
      localStorage.removeItem(INVITE_KEY);

      // Existing account: prove this browser holds its private key
      if (data.challenge) {
        const answer = await answerLoginChallenge(keys.privateKey, data.challenge);
        data = (await axios.post(`${process.env.REACT_APP_API_URL}/user/login`,
          { challengeId: data.challenge.id, answer }, { withCredentials: true })).data;
      }
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

      alert("You're now anonymous.", "success");
      setTimeout(() => {
        navigate("/veil");
      }, 1000);
    }
    catch (setupErr) {
      if (setupErr.response && setupErr.response.status === 401) {
        alert("Please try again.", "alert");
        return;
      }
      if (setupErr.response && setupErr.response.status === 403 && setupErr.response.data?.code === "KEY_REPLACED") {
        // Moved to another device: drop this browser's old copy
        await deleteUserInternalData(true).catch(() => {});
        alert("Your account was moved to another device. Its data on this browser was removed. Tap Get Started for a new account, or use your recovery key.", "alert");
        return;
      }
      console.log("Error: ", setupErr)
      alert("Internal server error", "alert");
    }
    finally {
      setBusy(false);
    }
  }

  return { setupUser, busy };
}
