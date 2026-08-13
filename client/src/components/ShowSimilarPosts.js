import React from 'react'
import PostItem from './PostItem'

// This component will show the similar posts to the user
function ShowSimilarPosts(props) {
    const { similarPosts } = props;
    return (
        <div>
            {
                similarPosts.length === 0 ? "" : (
                    <div className="mt-5" style={{ marginBottom: "200px" }}>
                        <h4 className="post-title mb-4">Similar Posts</h4>
                        <div className="row g-5">
                            {
                                similarPosts.map((post) => {
                                    return <PostItem key={post.id} post={post} />
                                })   
                            }
                        </div>
                    </div>
                )
            }
        </div>
    )
}

export default ShowSimilarPosts
