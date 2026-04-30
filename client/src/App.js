import './App.css';
import Navbar from './components/Navbar';
import Home from './components/Home';
import SubmitSecret from './components/SubmitSecret';
import PostState from './context/posts/PostState';
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <>
      <PostState>
        <Navbar/>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/submitSecret' element={<SubmitSecret />} />
        </Routes>
      </PostState>
    </>
  );
}

export default App;
