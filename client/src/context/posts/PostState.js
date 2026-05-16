import PostContext from "./postContext";
import { useState, useContext, useRef } from "react";
import axios from "axios";
import React from 'react'

const PostState = (props) => {
    const [posts, setPosts] = useState([]);
    const [hasNext, setHasNext] = useState(true);
    const [content, setContent] = useState({ title: "", content: "" });
    const [loading, setLoading] = useState(true);

    const isFetchingRef = useRef(false);
    const lastTimestampRef = useRef(Date.now());
    const fetchURLRef = useRef(null);
    const abortControllerRef = useRef(null);

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

            setHasNext(false);
            throw fetchError
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
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
        if(activeState === 2){
            const savedPosts = JSON.parse(localStorage.getItem("savedPosts")) || [];
            setPosts(savedPosts);
            setHasNext(false);
            return;
        }

        await getAllPosts(newUrl, timestamp);
    }

    // Submit post from user
    // I have to work on this after fixing submit btn
    const submitPost = async () => {
        try {
            // Validated data for submitting to the server
            const data = {
                title: content.title,
                content: content.content
            }

            const res = (await axios.post(`${process.env.REACT_APP_API_URL}/posts`, data)).data;
        }

        catch (submitError) {
            throw submitError;
        }
    }

    // Get like count from the server


    return (
        <PostContext.Provider value={{ posts, hasNext, content, loading, setContent, getAllPosts, submitPost, resetPostFetching }}>
            {props.children}
        </PostContext.Provider>
    )
}

export default PostState
