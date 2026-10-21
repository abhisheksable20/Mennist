function ChatFeatureAlert() {
    return (
        <div className="alert alert-danger alert-danger-bg alert-dismissible fade show my-0" role="alert">
            Your chat is disabled. Enable it to start conversations.
            {" "}
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>

    )
}

export default ChatFeatureAlert
