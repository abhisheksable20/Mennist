import PostContext from "./postContext";
import { useState, useContext } from "react";
import axios from "axios";
import React from 'react'

const PostState = (props) => {
    const [posts, setPosts] = useState([]);
    const [lastTimestamp, setLastTimestamp] = useState(Date.now());
    const [hasNext, setHasNext] = useState(true);
    const [content, setContent] = useState({title:"", content:""});

    const PAGE_SIZE = 10;

    const getAllPosts = async () => {
        try {
            const data = (await axios.get(`${process.env.REACT_APP_API_URL}/posts?endAt=${lastTimestamp - 1}`)).data;
            setPosts((prev) => [...prev, ...data.postsData]);
            setLastTimestamp(data.lastTimestamp);

            // No new posts to fetch stop here
            if(data.postsData.length < PAGE_SIZE){
                setHasNext(false);
            }

        }
        catch (fetchError) {
            throw fetchError
        }
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
            console.log("Submitting error: ",submitError)
        }
    }

    return (
        <PostContext.Provider value={{posts, hasNext, content, setContent, getAllPosts, submitPost}}>
            {props.children}
        </PostContext.Provider>
    )
}

export default PostState
