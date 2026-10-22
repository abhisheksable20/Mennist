import PostItem from './PostItem'

// This component will show the similar posts to the user
function ShowSimilarPosts(props) {
    const { similarPosts, isLoading } = props;
    return (
        <div className="mt-5 similar-posts-section" style={{ marginBottom: '200px' }}>
            {isLoading ? (
                <>
                    <h4 className="post-title mb-4">Similar Posts</h4>

                    <div className="row g-5">
                        {[1, 2, 3].map((item) => (
                            <div className="col-12 col-md-6 col-lg-4" key={item}>
                                <div className="similar-post-skeleton">
                                    <div className="skeleton-line skeleton-title" />
                                    <div className="skeleton-line skeleton-short" />
                                    <div className="skeleton-line" />
                                    <div className="skeleton-line" />
                                    <div className="skeleton-line skeleton-medium" />
                                    <div className="skeleton-footer">
                                        <div className="skeleton-circle" />
                                        <div className="skeleton-line skeleton-footer-line" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : similarPosts.length > 0 ? (
                <div>
                    <h4 className="post-title mb-4">Similar Posts</h4>
                    <div className="row g-5">
                        {
                            similarPosts.map((post) => {
                                return <PostItem key={post.id} post={post} />
                            })
                        }
                    </div>
                </div>
            ) : null}
        </div>
    )
}

export default ShowSimilarPosts
