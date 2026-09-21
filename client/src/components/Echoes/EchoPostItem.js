function EchoPostItem(props) {
    return (
        <div className="col-12 col-md-6 col-lg-4">
            <div className="card h-100">
                <div className="card-body d-flex flex-column">
                    {/* Green dash */}
                    <div className="card-accent mt-2" />

                    {/* Content */}
                    <p className="card-text" style={{ color: "#FAFAFA" }}>lorem ipsum dolor sit amet consectetur adipiscing elit dolores quas
                        et est sed laboris maxime sit officia mollit placeat distinctio minim nobis nobis est sint voluptatum at similique harum velit</p>

                    {/* Footer */}
                    <div className='d-flex justify-content-between mt-auto'>
                        {/* Display date when the post was uploaded */}
                        <p className="card-text my-1"><small className="text-body-secondary">{"20 May 2026"}</small></p>
                        <p className="card-text my-1"><small className="text-body-secondary">{"Seccess"}</small></p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EchoPostItem
