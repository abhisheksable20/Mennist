import './App.css';
import Navbar from './components/Navbar';
import Home from './components/Home';
import SubmitSecret from './components/SubmitSecret';
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />}/>
        <Route path='/submitSecret' element={<SubmitSecret />}/>
      </Routes>

    </>
  );
}

export default App;
