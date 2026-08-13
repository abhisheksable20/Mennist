import React, { useEffect, useState, useRef, useContext } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { totalWords, convertTimestampToReadable } from '../dataProcessing/dataProcessing'
import PostContext from '../context/posts/postContext'
import ShowSimilarPosts from './ShowSimilarPosts'
import chatSVG from '../assets/chat_round-svg.svg'
import shareSVG from '../assets/share_svg.svg'
import fullLikeSVG from '../assets/heart_fullsvg.svg'
import vibeHeartSVG from "../assets/vibe_heart_full.svg"
import saveSVG from '../assets/save_svg.svg'
import removeSave from '../assets/remove_save_svg.svg'
import Spinner from './Spinner'
import reportPost from "../assets/report_svg.svg"
import ReportPostComponent from './ReportPostComponent'
import { db } from '../internalDatabase/db'
import { postActions } from '../dataProcessing/postsActions'

function PostContent(props) {
    const [searchParams] = useSearchParams();
    const { id } = useParams();
    const {similarPosts, fetchSimilarPosts} = useContext(PostContext)
    const navigate = useNavigate();
    const [postData, setPostData] = useState({ id: id, title: "Loading...", content: "", timestamp: 0, chatId: null });
    const [isLoading, setIsLoading] = useState(false);
    const [isVibed, setIsVibed] = useState(false);
    const [totalVibes, setTotalVibes] = useState(0);
    const [isSaved, setIsSaved] = useState(false);

    const reportBtnRef = useRef(null);

    const MAX_SAVING_CAPACITY = 20;

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
        document.title = postData.title;
        postActions("viewed", postData.id);

        if(postData.category)
            fetchSimilarPosts(postData.category, postData.id);
    }, [postData]);

    useEffect(() => {
        if (id) {
            fetchPost();
            getTotalVibeCount();
            isAlreadyVibed();
            isPostSaved();
        }
    }, [id]);

    // Fetch total vibe count
    const getTotalVibeCount = async () => {
        try {
            const vibeCount = (await axios.get(`${process.env.REACT_APP_API_URL}/vibes/${id}`)).data.count;
            setTotalVibes(vibeCount);
        }
        catch (vibeCountError) {}
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
    const savePostBtn = () => {
        if (!postData.chatId) {
            props.alert("Nothing to save.", "alert");
            return;
        }

        const savedPosts = JSON.parse(localStorage.getItem("savedPosts")) || [];

        const alreadySavedIndex = savedPosts.findIndex((post) => post.id === id);

        if (alreadySavedIndex !== -1) {
            savedPosts.splice(alreadySavedIndex, 1);

            localStorage.setItem(
                "savedPosts",
                JSON.stringify(savedPosts)
            );

            setIsSaved(false);
            props.alert("Post removed from saved.", "alert");
            return;
        }

        if (savedPosts.length >= MAX_SAVING_CAPACITY) {
            props.alert("Only 20 posts can be saved", "alert");
            return;
        }

        const postToSave = {
            id: id,
            title: postData.title,
            content: postData.content.length > 100 ? postData.content.substring(0, 100) + "..." : postData.content,
            timestamp: postData.timestamp
        }
        savedPosts.push(postToSave);

        localStorage.setItem("savedPosts", JSON.stringify(savedPosts));
        setIsSaved(true);
        props.alert("Post saved successfully!", "success");
        postActions("saved", postData.id);
    }

    const isPostSaved = () => {
        const savedPosts = JSON.parse(localStorage.getItem("savedPosts")) || [];
        const index = savedPosts.findIndex(post => post.id === id);

        if (index === -1) {
            setIsSaved(false);
            return;
        }

        setIsSaved(true);
    }


    // Set the vibe to local storage
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

    // Start the chat session with this user
    const startChatSesssion = async () => {
        if (postData.chatId) {
            const userChatId = (await db.keys.get("user-keypair")).chatId;
            if (postData.chatId === userChatId) {
                navigate('/my-chats');
                return;
            }

            postActions("chat", postData.id)
            navigate(`/user-chat/${postData.chatId}`)
        }
    }

    // Share the mennist vibe posts
    const sharePost = async () => {
        const url = `${window.location.origin}/post/${postData.id}`;
        const text = `Found this vibe on Mennist:
        
"${postData.content.slice(0, 150)}${postData.content.length > 150 ? "..." : ""}"

Read the full story:
${url}

Share your own vibe on Mennist.`;

        if (navigator.share) {
            await navigator.share({
                title: postData.title || "Mennist Vibe",
                text,
            });
        } else {
            await navigator.clipboard.writeText(text);
        }

        postActions("shared", postData.id);

    }

    const reportPostBtn = () => {
        reportBtnRef.current.click();
    }

    return (
        <>
            {isLoading && <Spinner isCenter={true} />}
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
                {/* Divider */}
                <div className="post-divider"></div>
                {/* Report Post section */}
                <div className='d-flex justify-content-between align-items-center mt-4'>
                    <p className='text-body-secondary'>Report this post</p>
                    <button type="button" className="btn report-btn d-flex align-items-center justify-content-center gap-2" onClick={reportPostBtn}>
                        <img src={reportPost} alt="Report Posts Icon" width="24px" height="24px" />
                        Report
                    </button>
                </div>
                <ReportPostComponent reportBtnRef={reportBtnRef} postId={id} chatId={postData.chatId} alert={props.alert} />
                {/* Show more posts section */}
                <ShowSimilarPosts similarPosts={similarPosts}/>
                {/* Post footer section */}
                <div className='d-flex justify-content-between mt-auto'>
                    <div className="floating-bar">
                        <div className="floating-content d-flex align-items-center justify-content-between">

                            {/* Vibe Btn */}
                            <div className="d-flex align-items-center gap-2 icon-svg" onClick={vibeBtn}>
                                <img src={isVibed ? fullLikeSVG : vibeHeartSVG} width="24px" height='24px' alt='Vibe Button' />
                                {totalVibes === 0 ? "" : <span>{totalVibes}</span>}
                            </div>

                            <div className="vertical-divider"></div>

                            {/* Chat Btn */}
                            <div className="d-flex align-items-center gap-2 icon-svg" onClick={startChatSesssion}>
                                <img src={chatSVG} width="24px" height='24px' alt='Start Chat' />
                            </div>

                            <div className="vertical-divider"></div>

                            {/* Save Post Btn */}
                            <div className="d-flex align-items-center gap-2 icon-svg" onClick={savePostBtn}>
                                <img src={isSaved ? removeSave : saveSVG} width="24px" height='24px' alt='Save Post' />
                            </div>

                            <div className="vertical-divider"></div>

                            {/* Share Post Btn */}
                            <div className="d-flex align-items-center gap-2 icon-svg" onClick={sharePost}>
                                <img src={shareSVG} width="24px" height='24px' alt='Share Post' />
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PostContent
