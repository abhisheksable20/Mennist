import './App.css';
import Navbar from './components/Navbar';
import Home from './components/Home';
import SubmitSecret from './components/SubmitSecret';
import PostState from './context/posts/PostState';
import { Routes, Route, Outlet } from "react-router-dom";
import PostContent from './components/PostContent';
import LandingPage from './components/LandingPage';
import ToastComponent from './components/ToastComponent';
import { useEffect, useRef, useState } from 'react';
import { Toast as BSToast } from 'bootstrap'
import ChatsPage from './components/ChatsPage';
import ConversationPage from './components/ConversationPage';
import ChatsState from './context/chats/ChatsState';
import TermsAndConditions from './components/TermsAndConditions';
import EchoesComponent from './components/Echoes/EchoesComponent';
import EchoState from './context/posts/EchoState';
import EchoContent from './components/Echoes/EchoContent';
import VeilProfile from './components/Avatar/VeilProfile';


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
            <Routes>
              {/* This is landing page */}
              <Route path='/setup-user' element={<LandingPage alert={showAlert} />} />

              <Route element={<Layout alert={showAlert} />}>
                <Route path='/' element={<Home alert={showAlert} />} />
                <Route path='/terms-and-conditions' element={<TermsAndConditions />} />
                <Route path='/submit-secret' element={<SubmitSecret alert={showAlert} />} />
                <Route path='/post/:id' element={<PostContent alert={showAlert} />} />
                <Route path='/my-chats' element={<ChatsPage alert={showAlert} />} />
                <Route path='/user-chat/:chatId' element={<ConversationPage />} />
                <Route path='/echoes' element={<EchoesComponent alert={showAlert}/>} />
                <Route path='/echoes/:id' element={<EchoContent alert={showAlert}/>}/>
                <Route path='/veil' element={<VeilProfile alert={showAlert}/>}/>
              </Route>
            </Routes>
          </ChatsState>
        </EchoState>
      </PostState>
    </>
  );
}

export default App;
