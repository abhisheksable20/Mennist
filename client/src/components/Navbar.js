import React from 'react'
import SubmitButton from './SubmitButton'
import { useNavigate } from 'react-router-dom';

function Navbar() {
    const navigate = useNavigate();

    const navigateToHome = ()=>{
        navigate("/")
    }

    return (
        <div>
            {/*  */}
            <nav className="navbar">
                <div className="container-fluid">
                    <span className="navbar-brand navbar-title mb-0 h1 px-2 py-3" onClick={navigateToHome}>Mennist</span>

                    {/* Submit Secret Button */}
                    <SubmitButton />
                </div>
            </nav>
        </div>
    )
}

export default Navbar
