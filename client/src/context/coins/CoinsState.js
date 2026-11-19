import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import CoinsContext from "./CoinsContext";
import { fetchWallet } from "../../components/Coins/coinApi";

/*
  Shares the user's Sakesnake Coins wallet with the whole site
  (navbar balance, streak, wallet page, shop) and shows the streak reward
  popup after a post.
*/
function CoinsState(props) {
  const [wallet, setWallet] = useState(null);
  const [reward, setReward] = useState(null);
  const location = useLocation();
  const loadingRef = useRef(false);

  const againRef = useRef(false);

  const refreshWallet = useCallback(async () => {
    // A check is already running: run once more after it, so a fresh change isn't missed
    if (loadingRef.current) {
      againRef.current = true;
      return;
    }
    loadingRef.current = true;
    try {
      do {
        againRef.current = false;
        try {
          setWallet(await fetchWallet());
        } catch (err) {
          // Not logged in yet, or offline: hide coin UI instead of failing
          if (err.response && err.response.status === 401) setWallet(null);
        }
      } while (againRef.current);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // Load once, and again when the user comes back to the tab
  useEffect(() => {
    if (location.pathname === "/setup-user") return;
    refreshWallet();
  }, [location.pathname, refreshWallet]);

  // Check again when the user comes back to the tab, and every minute while it's open,
  // so coins someone sends show up without a reload
  useEffect(() => {
    const onFocus = () => refreshWallet();
    window.addEventListener("focus", onFocus);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refreshWallet();
    }, 60 * 1000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [refreshWallet]);

  // Called with the `coins` result the server sends back after a post
  const showStreakReward = useCallback((coins) => {
    if (coins && coins.counted) setReward(coins);
    refreshWallet();
  }, [refreshWallet]);

  const value = {
    wallet,
    refreshWallet,
    reward,
    showStreakReward,
    closeReward: () => setReward(null),
  };

  return <CoinsContext.Provider value={value}>{props.children}</CoinsContext.Provider>;
}

export default CoinsState;
