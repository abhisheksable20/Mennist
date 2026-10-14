import "../../styles/PostContentSkeleton.css"

function PostContentSkeleton() {
    return (
        <main className="post-loading container mt-5" role="status" aria-label="Loading post">
            {/* Post header */}
            <div className="post-loading-header">
                <div className="post-loading-header-main">
                    <div className="post-skeleton post-skeleton-meta" />

                    <div className="post-skeleton post-skeleton-accent" />

                    <div className="post-skeleton post-skeleton-title" />
                    <div className="post-skeleton post-skeleton-title-short" />
                </div>

                <div className="post-skeleton post-skeleton-avatar" />
            </div>

            <div className="post-loading-divider" />

            {/* Post content */}
            <div className="post-loading-content">
                <div className="post-skeleton post-skeleton-line" />
                <div className="post-skeleton post-skeleton-line" />
                <div className="post-skeleton post-skeleton-line" />
                <div className="post-skeleton post-skeleton-line" />
                <div className="post-skeleton post-skeleton-line-short" />
                <div className="post-skeleton post-skeleton-gap" />
                <div className="post-skeleton post-skeleton-line" />
                <div className="post-skeleton post-skeleton-line" />
                <div className="post-skeleton post-skeleton-line-short" />
            </div>

            {/* Vibe check */}
            <div className="post-loading-vibes">
                <div className="post-skeleton post-skeleton-vibe-heading" />

                <div className="post-loading-vibe-options">
                    {[1, 2, 3, 4, 5, 6, 7].map((item) => (
                        <div
                            key={item}
                            className="post-skeleton post-skeleton-vibe"
                        />
                    ))}
                </div>
            </div>

            <p className="post-loading-message">
                Finding your vibe...
            </p>
        </main>
    )
}

export default PostContentSkeleton
