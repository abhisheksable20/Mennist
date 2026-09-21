import EchoPostItem from "./EchoPostItem"

function EchoesComponent() {
    return (
        <div className="container my-5 posts-container">
            {/* Section Heading */}
            <div>
                <h6 className='special-text'>LATEST ECHOES</h6>
                <h2 className='card-text'>Share Your Echo, Secretly!</h2>
                <h6 className='text-body-secondary mb-5'>Your dreams, your stories.</h6>
            </div>

            {/* Echo Items */}
            <div className="row g-5">
                <EchoPostItem/>
            </div>
        </div>
    )
}

export default EchoesComponent
