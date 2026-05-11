import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { totalWords } from '../dataProcessing/dataProcessing'
import { convertTimestampToReadable } from '../dataProcessing/dataProcessing'
import chatSVG from '../assets/chat_round-svg.svg'
import halfLikeSVG from '../assets/heart-half_svg.svg'
import fullLikeSVG from '../assets/heart_fullsvg.svg'
import saveSVG from '../assets/save_svg.svg'
import removeSave from '../assets/remove_save_svg.svg'
import Spinner from './Spinner'

function PostContent(props) {
    const { id } = useParams();
    const [postData, setPostData] = useState({ id: id, title: "", content: "", timestamp: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [isVibed, setIsVibed] = useState(false);
    const [totalVibes, setTotalVibes] = useState(0);

    // Fetching the post from the server
    const fetchPost = async () => {
        try {
            setIsLoading(true);
            const res = (await axios.get(`${process.env.REACT_APP_API_URL}/posts/${id}`)).data;
            setPostData(prev => ({
                ...prev,
                ...res
            }));
        }
        catch (fetchError) {
            props.alert("Something went wrong!", "alert");
        } finally {
            setIsLoading(false);
        }
    }

    // Calculate the read time
    const calculateReadTime = (content) => {
        const words = totalWords(content);
        const minutes = Math.floor(words / 200);
        return minutes;
    };

    useEffect(() => {
        if (id) {
            fetchPost();
            getTotalVibeCount();
            isAlreadyVibed();
        }

    }, [id]);

    // Fetch total vibe count
    const getTotalVibeCount = async () => {
        try {
            const vibeCount = (await axios.get(`${process.env.REACT_APP_API_URL}/vibes/${id}`)).data.count;
            setTotalVibes(vibeCount);
        }
        catch (error) {

        }
    }

    // Handle Vibe Btn 
    const vibeBtn = async () => {
        try {
            if (isAlreadyVibed()) {
                props.alert("Your vibe is already matched!", "success");
                return;
            }

            const data = await axios.put(`${process.env.REACT_APP_API_URL}/vibes/${id}`);

            // Setting the like post to the local storage
            setVibeToLocalStorage();

            setIsVibed(true);
            setTotalVibes(prev => prev + 1);

            props.alert("Vibe matched!", "success");

        }
        catch (error) {
            if (error.response && error.response.status === 403) {
                setVibeToLocalStorage();
                setIsVibed(true);
                props.alert("Your vibe is already matched!", "success");
                return;
            }
        }
    }

    // save the posts to local storage
    const savePost = () => {
        
    }

    const setVibeToLocalStorage = () => {
        const vibesPost = JSON.parse(localStorage.getItem("vibes")) || [];
        vibesPost.push(id);
        localStorage.setItem("vibes", JSON.stringify(vibesPost));
    }

    // Check does the user already Vibed the post
    const isAlreadyVibed = () => {
        const vibesPost = JSON.parse(localStorage.getItem("vibes")) || [];
        if (vibesPost.length === 0) {
            return false;
        }

        if (vibesPost.includes(id)) {
            setIsVibed(true);
            return true;
        }

        return false;
    }

    return (
        <>
            {isLoading && <Spinner isCenter={true}/>}
            <div className='container mt-5'>
                {/* Post header section */}
                <div>
                    <p className="card-text my-1">
                        <span className='text-body-secondary'>{convertTimestampToReadable(postData.timestamp)}</span>
                        <span className="text-body-secondary mx-3">{`\u00B7`}</span>
                        <span className='text-body-secondary'>{`${calculateReadTime(postData.content)} min read`}</span>
                    </p>
                    {/* Green dash */}
                    <div className="card-accent mt-4" />
                    <h2 className='post-title mt-4'>{postData.title}</h2>
                    {/* Divider */}
                    <div className="post-divider"></div>
                </div>
                {/* Post body section */}
                <div className='my-5'>
                    <p className='post-content fs-5'>{postData.content}</p>
                </div>
                {/* Post footer section */}
                <div className='d-flex justify-content-between mt-auto'>
                    <div className="floating-bar">
                        <div className="floating-content d-flex align-items-center justify-content-between">

                            {/* Vibe Btn */}
                            <div className="d-flex align-items-center gap-2 icon-svg" onClick={vibeBtn}>
                                <img src={isVibed ? fullLikeSVG : halfLikeSVG} width="24px" height='24px' />
                                <span>{totalVibes === 0 ? "Vibe" : totalVibes}</span>
                            </div>

                            <div className="vertical-divider"></div>

                            {/* Chat Btn */}
                            <div className="d-flex align-items-center gap-2 icon-svg">
                                <img src={chatSVG} width="24px" height='24px' />
                                <span>Chat</span>
                            </div>

                            <div className="vertical-divider"></div>

                            {/* Save Post Btn */}
                            <div className="d-flex align-items-center gap-2 icon-svg">
                                <img src={saveSVG} width="24px" height='24px' />
                                <span>Save</span>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PostContent
