import PostContext from "./postContext";
import { useState, useContext } from "react";
import axios from "axios";
import React from 'react'

const PostState = (props) => {
    const [posts, setPosts] = useState([]);
    const [lastTimestamp, setLastTimestamp] = useState(Date.now());
    const [hasNext, setHasNext] = useState(true);

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

    return (
        <PostContext.Provider value={{posts, hasNext, getAllPosts}}>
            {props.children}
        </PostContext.Provider>
    )
}

export default PostState
