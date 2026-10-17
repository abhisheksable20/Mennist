import { Link } from "react-router-dom";
import MennistLogoSVG from "../../assets/Mennist_Logo_SVG.svg"
import "../../styles/PageNotFound.css"

function PageNotFound() {
    return (
        <div className="not-found">
            <div className="not-found-container">

                <div className="not-found-logo-section">
                    <img
                        src={MennistLogoSVG}
                        alt="Mennist"
                        className="not-found-logo"
                    />
                </div>

                <div className="not-found-divider"></div>

                <div className="not-found-content">
                    <h1>404</h1>
                    <h2>Page not found</h2>
                    <p>Looks like this page doesn't exist.</p>
                    <Link to="/">Back to Home</Link>
                </div>

            </div>
        </div>
    )
}

export default PageNotFound
