import React from 'react'

function ToastComponent(props) {
    return (
        props.alert &&
        <div ref={props.toastRef} className={`toast align-items-center custom-toast custom-toast-${props.alert.type} border-0 mb-2`} role="alert" aria-live="assertive" aria-atomic="true">
            <div className="d-flex">
                <div className="toast-body">
                    {props.alert.msg}
                </div>
                <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    )
}

export default ToastComponent

