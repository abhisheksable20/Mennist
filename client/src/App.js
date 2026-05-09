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


function Layout() {
  return (
    <>
      <Navbar />
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
        <div className="position-fixed bottom-0 end-0 p-3">
          {
            alerts.map((alert) => {
              return <ToastComponent key={alert.id} toastRef={toastRef} alert={alert} />
            })
          }
        </div>
        <Routes>
          {/* This is landing page */}
          <Route path='/setup-user' element={<LandingPage alert={showAlert} />} />

          <Route element={<Layout />}>
            <Route path='/' element={<Home alert={showAlert} />} />
            <Route path='/submit-secret' element={<SubmitSecret />} />
            <Route path='/post/:id' element={<PostContent />} />
          </Route>
        </Routes>
      </PostState>
    </>
  );
}

export default App;
