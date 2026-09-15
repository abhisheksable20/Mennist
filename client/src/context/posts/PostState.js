import PostContext from "./postContext";
import { useState, useRef } from "react";
import axios from "axios";

const PostState = (props) => {
    const [posts, setPosts] = useState([]);
    const [hasNext, setHasNext] = useState(true);
    const [content, setContent] = useState({ title: "", content: "" });
    const [loading, setLoading] = useState(false);
    // State to set content type
    // 0 Vibe (Default)
    // 1 Echo
    const [contentType, setContentType] = useState(0);
    const [similarPosts, setSimilarPosts] = useState([]);

    const isFetchingRef = useRef(false);
    const isSimilarPostsFetchingRef = useRef(false);
    const lastTimestampRef = useRef(Date.now());
    const fetchURLRef = useRef(null);
    const abortControllerRef = useRef(null);
    const abortSimilarPostsControllerRef = useRef(null);

    const PAGE_SIZE = 10;

    // Fetch all the post from the server for home page
    const getAllPosts = async (url = fetchURLRef.current, timestamp = lastTimestampRef.current) => {
        if (isFetchingRef.current) return;
        if (!url) return;

        isFetchingRef.current = true;
        setLoading(true);

        if (abortControllerRef.current)
            abortControllerRef.current.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const data = (await axios.get(`${url}?endAt=${timestamp - 1}`, { signal: controller.signal })).data;
            setPosts((prev) => [...prev, ...data.postsData]);

            lastTimestampRef.current = data.lastTimestamp;
            // No new posts to fetch stop here
            if (data.postsData.length < PAGE_SIZE) {
                setHasNext(false);
            }

        }
        catch (fetchError) {
            // Ignore intentional cancellations (AbortController)
            if (axios.isCancel(fetchError)) return;
            console.log("Fetching error: ", fetchError)
            setHasNext(false);
            throw fetchError

        } finally {
            isFetchingRef.current = false;
            setLoading(false);
        }
    }

    // Fetch the similar posts according to their category
    const fetchSimilarPosts = async (category, currentPostId) => {
        setSimilarPosts([]);
        if (!category)
            return;

        if (abortSimilarPostsControllerRef.current)
            abortSimilarPostsControllerRef.current.abort();

        const controller = new AbortController();
        abortSimilarPostsControllerRef.current = controller;
        isSimilarPostsFetchingRef.current = true;

        try {
            const data = (await axios.get(`${process.env.REACT_APP_API_URL}/suggestPost/${category}`,
                { signal: controller.signal })).data

            if (controller.signal.aborted)
                return;

            if (data) {
                const filteredSimilarPosts = data.filter((post) => post.id !== currentPostId)
                setSimilarPosts(filteredSimilarPosts);
            }
        }
        catch (SimilarPostsError) {
            if (axios.isCancel(SimilarPostsError))
                return;
            console.log("Failed to load similar posts")
        }
        finally {
            if (abortSimilarPostsControllerRef.current === controller) {
                isSimilarPostsFetchingRef.current = false;
            }
        }
    }

    // Reset the value for Re-Fetch the data
    const resetPostFetching = async (activeState) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        isFetchingRef.current = false;

        let newUrl = ""
        const timestamp = Date.now();

        // Fetch all the posts
        if (activeState === 0) {
            newUrl = `${process.env.REACT_APP_API_URL}/posts`
        }
        // Fetch user specific posts
        else if (activeState === 1) {
            newUrl = `${process.env.REACT_APP_API_URL}/user/posts`
        }


        fetchURLRef.current = newUrl;
        lastTimestampRef.current = timestamp;

        setPosts([]);
        setHasNext(true);

        // Fetch posts from local storage
        if (activeState === 2) {
            const savedPosts = JSON.parse(localStorage.getItem("savedPosts")) || [];
            setPosts(savedPosts);
            setHasNext(false);
            return;
        }

        await getAllPosts(newUrl, timestamp);
    }

    // Submit post from user
    // Submiting both vibe and echo
    const submitPost = async () => {
        try {
            // Validated data for submitting to the server
            const data = {}
            let subApi = "";
            // Submit vibe
            if (contentType === 0) {
                data.title = content.title;
                data.content = content.content;
                subApi = "posts"
            }

            // Submit Echo
            if (contentType === 1) {
                data.echo = content.content;
                subApi = "echoes/submitEcho"
            }

            await axios.post(`${process.env.REACT_APP_API_URL}/${subApi}`, data)
            setContent({
                title: "",
                content: ""
            });
        }

        catch (submitError) {
            throw submitError;
        }
    }


    return (
        <PostContext.Provider value={{
            posts, hasNext, content, loading, similarPosts, contentType,
            setContent, getAllPosts, submitPost, resetPostFetching, fetchSimilarPosts, setContentType
        }}>
            {props.children}
        </PostContext.Provider>
    )
}

export default PostState
