import { useEffect, useState, useContext, useRef, useLayoutEffect } from 'react'
import PostContext from '../context/posts/postContext';
import PostItem from './PostItem';
import useInfiniteScroll from "react-infinite-scroll-hook";
import Spinner from './Spinner';
import { useNavigate } from 'react-router-dom';
import NoContent from './NoContent';
import PostHeaders from './utils/PostHeaders';

function Posts(props) {
    const { posts, hasNext, getAllPosts, resetPostFetching, loading } = useContext(PostContext);


    const [activeBtn, setActiveBtn] = useState(() => {
        const savedFilter = sessionStorage.getItem("postsActiveFilter");
        return savedFilter !== null ? Number(savedFilter) : 0;
    });

    const navigate = useNavigate();

    // Scroll restoration references
    const hasRestoredScroll = useRef(false);
    const isFirstRender = useRef(true);

    const loadMore = async () => {
        try {
            await getAllPosts();
        }
        catch (apiError) {
            // Check wheather the session is expired
            if (apiError.response && apiError.response.status === 401) {
                props.alert("Session expired", "alert");
                navigate("/setup-user");
                return;
            }

            props.alert(`Something went wrong!`, "alert");
        }
    }

    useEffect(() => {
        document.title = "Mennist | Home";
    }, []);

    // Save scroll position as the user scrolls
    useLayoutEffect(() => {
        const saveScrollPosition = () => {
            // Don't overwrite the saved value before we've restored it
            if (!hasRestoredScroll.current) return;
            sessionStorage.setItem("postsScrollPosition", String(window.scrollY));
        };

        window.addEventListener("scroll", saveScrollPosition, { passive: true });

        // Layout-effect cleanup runs synchronously on unmount, so the
        // layout shrink / scroll-to-0 caused by the next page can't reach it
        return () => window.removeEventListener("scroll", saveScrollPosition);
    }, []);



    // Restore scroll position once posts are in the DOM
    useLayoutEffect(() => {
        if (loading || posts.length === 0 || hasRestoredScroll.current) return;

        const savedPosition = sessionStorage.getItem("postsScrollPosition");
        if (savedPosition !== null) {
            window.scrollTo(0, Number(savedPosition));
        }
        hasRestoredScroll.current = true;
    }, [loading, posts.length]);



    // Trigger when state of the pill change
    useEffect(() => {
        sessionStorage.setItem("postsActiveFilter", String(activeBtn));

        if (isFirstRender.current) {
            isFirstRender.current = false;
            if (posts.length > 0 || loading) {
                return;
            }
        }

        const resetFetching = async () => {
            try {
                await resetPostFetching(activeBtn);
            }
            catch (resetErr) {
                if (resetErr.response?.status === 401) {
                    props.alert("Session expired", "alert");
                    navigate("/setup-user", { replace: true });
                    return;
                }

                props.alert("Something went wrong!", "alert");
            }
        }

        resetFetching();

    }, [activeBtn]);

    // Infinite scroll hook
    const [sentryRef] = useInfiniteScroll({
        loading,
        hasNextPage: hasNext,
        onLoadMore: loadMore,
        disabled: loading,
        rootMargin: '0px 0px 300px 0px'
    });

    return (
        <div className="container my-5 posts-container">

            <PostHeaders splText={"LATEST VIBES"} heading={"Share Your Vibe, Secretly!"} subHeading={"Speak freely, stay anonymous."} />

            {/* Nav Pills */}
            <div className='mb-4'>
                <ul className="nav nav-pills gap-3">
                    <li className="nav-item">
                        <button
                            className={`nav-link custom-toast rounded-pill px-4 ${activeBtn === 0 ? "active" : ""}`}
                            aria-current="page"
                            onClick={() => setActiveBtn(0)}>All</button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link custom-toast rounded-pill px-4 ${activeBtn === 1 ? "active" : ""}`}
                            onClick={() => setActiveBtn(1)}>Mine</button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link custom-toast rounded-pill px-4 ${activeBtn === 2 ? "active" : ""}`}
                            onClick={() => setActiveBtn(2)}>Saved</button>
                    </li>
                </ul>
            </div>
            {
                loading && posts.length === 0 ? (<Spinner />) :
                    (
                        <div className="row g-5">
                            {!loading && posts.length === 0 ? (
                                <NoContent svgType={1} title={"TOO QUIET IN HERE"} text={"Tell the story nobody knows about."} />
                            ) : (
                                posts.map(post => (
                                    <PostItem key={post.id} post={post} />
                                ))
                            )}
                        </div>

                    )}

            {/* Sentinel — always render this at the bottom */}
            {loading && posts.length > 0 && <Spinner />}
            {hasNext && <div ref={sentryRef} />}

        </div>
    )
}

export default Posts
