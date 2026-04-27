import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyC1ijUH3BRAxMdInv7JU77METDpriJdviE",
    authDomain: "mennist-4dda7.firebaseapp.com",
    projectId: "mennist-4dda7",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInAnonymously(auth);

export function getUserUid() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user.uid);
    });
  });
}