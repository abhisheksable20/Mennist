import React, { useEffect, useState, useRef, useContext } from 'react'
import PostContext from '../context/posts/postContext';
import PostItem from './PostItem';
import axios from "axios";
import useInfiniteScroll from "react-infinite-scroll-hook";
import Spinner from './Spinner';

const PAGE_SIZE = 10;

function Posts() {
    const {posts, hasNext,getAllPosts} = useContext(PostContext)
    const [loading, setLoading] = useState(false);

    const loadMore = async () => {
        setLoading(true);

        try {
            await getAllPosts();
        } 
        catch (apiError) {
            console.log("API Error: ", apiError);
        }
        finally{
            setLoading(false);
        }
    }

    // Infinite scroll hook
    const [sentryRef] = useInfiniteScroll({
        loading,
        hasNextPage:hasNext,
        onLoadMore: loadMore,
        disabled: false,
        rootMargin: '0px 0px 300px 0px'
    });

    return (
        <div className="container my-5">
            <div>
                <h6 className='special-text'>LATEST SECRETS</h6>
                <h2 className='card-text'>Share Your Secret, Secretly!</h2>
                <h6 className='text-body-secondary mb-4'>Speak freely, stay anonymous.</h6>
            </div>

            <div className="row g-5">
                {posts.map(post => (
                    <PostItem key={post.id} post={post} />
                ))}
            </div>

            {/* Sentinel — always render this at the bottom */}{
                hasNext && (
                    <div ref={sentryRef}>
                        {loading && <Spinner/>}
                    </div>
                )
            }
        </div>
    )
}

export default Posts
