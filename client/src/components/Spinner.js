import React from 'react'

function Spinner() {
    return (
        <div>
            <div className="d-flex justify-content-center m-3">
                <div className="spinner-border custom-spinner" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
    )
}

export default Spinner
