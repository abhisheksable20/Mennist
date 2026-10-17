import './App.css';
import Navbar from './components/Navbar';
import PostState from './context/posts/PostState';
import { Routes, Route, Outlet } from "react-router-dom";
import ToastComponent from './components/ToastComponent';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Toast as BSToast } from 'bootstrap'
import ChatsState from './context/chats/ChatsState';
import EchoState from './context/posts/EchoState';
import LazyLoader from './components/utils/LazyLoader';


// Pages that lazy loaded
const Home = lazy(() => import('./components/Home'));
const SubmitSecret = lazy(() => import('./components/SubmitSecret'));
const PostContent = lazy(() => import('./components/PostContent'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const ChatsPage = lazy(() => import('./components/ChatsPage'));
const ConversationPage = lazy(() => import('./components/ConversationPage'));
const TermsAndConditions = lazy(() => import('./components/TermsAndConditions'));
const EchoesComponent = lazy(() => import('./components/Echoes/EchoesComponent'));
const EchoContent = lazy(() => import('./components/Echoes/EchoContent'));
const VeilProfile = lazy(() => import('./components/Avatar/VeilProfile'));
const PageNotFound = lazy(() => import('./components/utils/PageNotFound'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'))

function Layout(props) {
  return (
    <>
      <Navbar alert={props.alert} />
      <Outlet />
    </>
  );
}

function App() {
  const [alerts, setAlerts] = useState([]);
  const toastRef = useRef(null);

  const showAlert = (msg, type) => {
    const id = Date.now();

    setAlerts((prev) => [
      ...prev,
      { id, msg, type }
    ]);

    // auto remove after 3 sec
    setTimeout(() => {
      setAlerts((prev) => prev.filter(alert => alert.id !== id));
    }, 3000)
  }

  useEffect(() => {
    if (alerts && toastRef.current) {
      const toast = new BSToast(toastRef.current);
      toast.show();
    }
  }, [alerts]);

  return (
    <>
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
            <Suspense fallback={<LazyLoader />}>
              <Routes>
                {/* This is landing page */}
                <Route path='/setup-user' element={<LandingPage alert={showAlert} />} />
                <Route path="*" element={<PageNotFound />} />

                <Route element={<Layout alert={showAlert} />}>
                  <Route path='/' element={<Home alert={showAlert} />} />
                  <Route path='/terms-and-conditions' element={<TermsAndConditions />} />
                  <Route path='/privacy-policy' element={<PrivacyPolicy />} />
                  <Route path='/submit-secret' element={<SubmitSecret alert={showAlert} />} />
                  <Route path='/post/:id' element={<PostContent alert={showAlert} />} />
                  <Route path='/my-chats' element={<ChatsPage alert={showAlert} />} />
                  <Route path='/user-chat/:chatId' element={<ConversationPage />} />
                  <Route path='/echoes' element={<EchoesComponent alert={showAlert} />} />
                  <Route path='/echoes/:id' element={<EchoContent alert={showAlert} />} />
                  <Route path='/veil' element={<VeilProfile alert={showAlert} />} />
                </Route>
              </Routes>
            </Suspense>
          </ChatsState>
        </EchoState>
      </PostState>
    </>
  );
}

export default App;
