import '../../styles/LazyLoader.css'

function LazyLoader() {
    return (
        <div className="mennist-loader">
            <div className="mennist-loader__ring">
                <div className="mennist-loader__inner" />
            </div>

            <p className="mennist-loader__text">
                Finding your place...
            </p>
        </div>
    )
}

export default LazyLoader
