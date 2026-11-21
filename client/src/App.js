import './App.css';
import './styles/Coins.css';
import Navbar from './components/Navbar';
import PostState from './context/posts/PostState';
import { Routes, Route, Outlet, useLocation } from "react-router-dom";
import ToastComponent from './components/ToastComponent';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import ChatsState from './context/chats/ChatsState';
import EchoState from './context/posts/EchoState';
import LazyLoader from './components/utils/LazyLoader';
import ErrorBoundary from './components/utils/ErrorBoundary';
import CoinsState from './context/coins/CoinsState';
import StreakRewardModal from './components/Coins/StreakRewardModal';
import IncomingCoinsAlert from './components/Coins/IncomingCoinsAlert';


// Pages that lazy loaded
const Home = lazy(() => import('./components/Home'));
const SubmitSecret = lazy(() => import('./components/SubmitSecret'));
const PostContent = lazy(() => import('./components/PostContent'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const RecoverPage = lazy(() => import('./components/Recovery/RecoverPage'));
const ChatsPage = lazy(() => import('./components/ChatsPage'));
const ConversationPage = lazy(() => import('./components/ConversationPage'));
const TermsAndConditions = lazy(() => import('./components/TermsAndConditions'));
const EchoesComponent = lazy(() => import('./components/Echoes/EchoesComponent'));
const EchoContent = lazy(() => import('./components/Echoes/EchoContent'));
const VeilProfile = lazy(() => import('./components/Avatar/VeilProfile'));
const PageNotFound = lazy(() => import('./components/utils/PageNotFound'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'))
const WalletPage = lazy(() => import('./components/Coins/WalletPage'));
const ShopPage = lazy(() => import('./components/Coins/ShopPage'));

function Layout(props) {
  const location = useLocation();
  // A crash inside a page keeps the navbar, so people can still leave the page
  return (
    <>
      <Navbar alert={props.alert} />
      <ErrorBoundary resetKey={location.pathname}>
        <Outlet />
      </ErrorBoundary>
    </>
  );
}

function App() {
  const location = useLocation();
  const [alerts, setAlerts] = useState([]);
  const toastRef = useRef(null);

  const removeAlert = (id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const showAlert = (msg, type) => {
    const id = Date.now();
    setAlerts((prev) => [...prev, { id, msg, type }]);

    // auto remove after 3 sec
    setTimeout(() => removeAlert(id), 3000);
  }

  useEffect(() => {
    if (alerts && toastRef.current) {
      // Bootstrap comes from the CDN script in index.html. Importing the npm copy too
      // ran two Bootstraps at once, so every modal got two backdrops.
      const BSToast = window.bootstrap?.Toast;
      if (BSToast) BSToast.getOrCreateInstance(toastRef.current).show();
    }
  }, [alerts]);

  return (
    <CoinsState>
    <PostState>
      <EchoState>
        <ChatsState>
          <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 99999 }}>
            {
              alerts.map((alert) => {
                return <ToastComponent key={alert.id} toastRef={toastRef} alert={alert} />
              })
            }
          </div>
          <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<LazyLoader />}>
            <Routes>
              {/* This is landing page */}
              <Route path='/setup-user' element={<LandingPage alert={showAlert} />} />
              <Route path='/recover' element={<RecoverPage alert={showAlert} />} />
              <Route path="*" element={<PageNotFound />} />

              <Route element={<Layout alert={showAlert} />}>
                <Route path='/' element={<Home alert={showAlert} />} />
                <Route path='/terms-and-conditions' element={<TermsAndConditions />} />
                <Route path='/privacy-policy' element={<PrivacyPolicy />} />
                <Route path='/submit-secret' element={<SubmitSecret alert={showAlert} />} />
                <Route path='/post/:id' element={<PostContent alert={showAlert} />} />
                <Route path='/my-chats' element={<ChatsPage alert={showAlert} />} />
                <Route path='/user-chat/:chatId' element={<ConversationPage alert={showAlert} />} />
                <Route path='/echoes' element={<EchoesComponent alert={showAlert} />} />
                <Route path='/echoes/:id' element={<EchoContent alert={showAlert} />} />
                <Route path='/veil' element={<VeilProfile alert={showAlert} />} />
                <Route path='/coins' element={<WalletPage alert={showAlert} />} />
                <Route path='/coins/shop' element={<ShopPage alert={showAlert} />} />
              </Route>
            </Routes>
          </Suspense>
          </ErrorBoundary>
          <StreakRewardModal />
          <IncomingCoinsAlert alert={showAlert} />
        </ChatsState>
      </EchoState>
    </PostState>
    </CoinsState>
  );
}

export default App;
