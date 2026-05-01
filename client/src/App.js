import './App.css';
import Navbar from './components/Navbar';
import Home from './components/Home';
import SubmitSecret from './components/SubmitSecret';
import PostState from './context/posts/PostState';
import { Routes, Route } from "react-router-dom";
import PostContent from './components/PostContent';

function App() {
  return (
    <>
      <PostState>
        <Navbar/>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/submit-secret' element={<SubmitSecret />} />
          <Route path='/post/:id' element={<PostContent />}/>
        </Routes>
      </PostState>
    </>
  );
}

export default App;
