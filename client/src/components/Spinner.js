import React from 'react'

function Spinner(props) {
    let isCenter = false;
    if(props.isCenter)
        isCenter = true;

    return (
        <div>
            <div className={`d-flex justify-content-center ${isCenter ? "align-items-center vh-100":""} m-3`}>
                <div className="spinner-border custom-spinner" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
    )
}

export default Spinner
