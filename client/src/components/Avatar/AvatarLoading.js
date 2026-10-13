import "../../styles/Avatar.css"

function AvatarLoading() {
    return (
        <section
            className="mennist-avatar-editor mennist-avatar-loading"
            role="status"
            aria-label="Loading avatar editor"
        >
            <header className="mennist-avatar-header">
                <div className="mennist-avatar-loading-heading">
                    <div className="mennist-skeleton mennist-skeleton-title" />
                    <div className="mennist-skeleton mennist-skeleton-description" />
                </div>

                <div className="mennist-avatar-loading-preview">
                    <div className="mennist-avatar-loading-icon">
                        <span className="mennist-loading-dot" />
                    </div>
                </div>
            </header>

            <div className="mennist-avatar-loading-categories">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div
                        key={item}
                        className="mennist-skeleton mennist-skeleton-category"
                    />
                ))}
            </div>

            <div className="mennist-skeleton mennist-skeleton-label" />

            <div className="mennist-avatar-loading-options">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div className="mennist-avatar-loading-option" key={item}>
                        <div className="mennist-skeleton mennist-skeleton-avatar" />
                        <div className="mennist-skeleton mennist-skeleton-option-label" />
                    </div>
                ))}
            </div>

            <div className="mennist-avatar-loading-actions">
                <div className="mennist-skeleton mennist-skeleton-button" />
                <div className="mennist-skeleton mennist-skeleton-button mennist-skeleton-button-primary" />
            </div>

            <span className="mennist-avatar-loading-text">
                Preparing your pixel identity...
            </span>
        </section>
    )
}

export default AvatarLoading
