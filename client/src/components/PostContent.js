import { useEffect, useState, useRef, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import "../styles/Avatar.css"
import { totalWords, convertTimestampToReadable } from '../dataProcessing/dataProcessing'
import PostContentSkeleton from './LoadingSkeleton/PostContentSkeleton'
import PostContext from '../context/posts/postContext'
import ShowSimilarPosts from './ShowSimilarPosts'
import Avatar from './Avatar/Avatar'
import chatSVG from '../assets/chat_round-svg.svg'
import shareSVG from '../assets/share_svg.svg'
import fullLikeSVG from '../assets/heart_fullsvg.svg'
import vibeHeartSVG from "../assets/vibe_heart_full.svg"
import saveSVG from '../assets/save_svg.svg'
import removeSave from '../assets/remove_save_svg.svg'
import funnySVG from '../assets/funny_svg.svg'
import emotionalSVG from '../assets/emotional_svg.svg'
import racistSVG from '../assets/racist_svg.svg'
import relatableSVG from '../assets/relatable_svg.svg'
import sadSVG from '../assets/sad_svg.svg'
import toxicSVG from '../assets/toxic_svg.svg'
import wholesomeSVG from '../assets/wholesome_svg.svg'
import reportPost from "../assets/report_svg.svg"
import ReportPostComponent from './ReportPostComponent'
import { db } from '../internalDatabase/db'
import { postActions } from '../dataProcessing/postsActions'
import { loadAvatar } from './Avatar/avatarService'

function PostContent(props) {
    const { id } = useParams();
    const { similarPosts, fetchSimilarPosts } = useContext(PostContext)
    const navigate = useNavigate();
    const [postData, setPostData] = useState({ id: id, title: "Loading...", content: "", timestamp: 0, chatId: null, vibeCheck: null });
    const [isLoading, setIsLoading] = useState(false);
    const [isVibed, setIsVibed] = useState(false);
    const [totalVibes, setTotalVibes] = useState(0);
    const [isSaved, setIsSaved] = useState(false);
    const [postVibe, setPostVibe] = useState(null);
    const [userAvatar, setUserAvatar] = useState({});
    const [isSimilarPostsLoading, setIsSimilarPostsLoading] = useState(false);

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

    // Fetch user avatar from the server
    const getUserAvatar = async (chatId) => {
        if (!chatId) return;
        try {
            const avatar = await loadAvatar(chatId);
            setUserAvatar(avatar);
        }
        catch (userAvatarErr) {
            console.log("Failed to load avatar:", userAvatarErr)
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
        getUserAvatar(postData.chatId)
        postActions("viewed", postData.id);
    }, [postData]);

    useEffect(() => {
        if (id) {
            setPostData({ id: id, title: "Loading...", content: "", timestamp: 0, chatId: null, vibeCheck: null });
            fetchPost();
            getTotalVibeCount();
            getPostsVibeCheck();
            isAlreadyVibed();
            isPostSaved();
        }
    }, [id]);

    useEffect(() => {
        let isMounted = true;

        const loadSimilarPosts = async () => {
            setIsSimilarPostsLoading(true);

            try {
                await fetchSimilarPosts(postData.category, postData.id);
            } catch (error) {
                console.error("Failed to fetch similar posts:", error);
            } finally {
                if (isMounted) {
                    setIsSimilarPostsLoading(false);
                }
            }
        };

        if (postData.category && postData.id) {
            loadSimilarPosts();
        }

        return () => {
            isMounted = false;
        };

    }, [postData.category, postData.id, fetchSimilarPosts])

    // Get posts vibe check type from local storage and also from server side
    const getPostsVibeCheck = async () => {
        const postsVibe = JSON.parse(localStorage.getItem("postsVibeCheck") || "{}");
        const existingVibe = postsVibe[id] || null;

        if (existingVibe) {
            setPostVibe(existingVibe);
            return;
        }

        try {
            const postVibeCheck = (await axios.get(`${process.env.REACT_APP_API_URL}/vibeCheck/${id}`)).data.postVibe;
            setPostVibe(postVibeCheck);
        } catch (error) {
            console.log(error);
        }

    }

    // get the post vibe count 
    const getPostVibeCount = (vibe) => {
        return postData.vibeCheck?.[vibe] || "";
    }

    // Fetch total vibe count
    const getTotalVibeCount = async () => {
        try {
            const vibeCount = (await axios.get(`${process.env.REACT_APP_API_URL}/vibes/${id}`)).data.count;
            setTotalVibes(vibeCount);
        }
        catch (vibeCountError) {
            console.log("Failed to vibe this post.", vibeCountError)
        }
    }

    // Handle post vibe check button
    const postVibeCheckBtn = async (postVibe) => {
        if (hasPostVibeCheck(id, postVibe)) {
            return;
        }

        try {
            const vibeCheckBody = {
                postId: id,
                postVibe: postVibe
            }

            setPostVibe(postVibe);

            await axios.post(`${process.env.REACT_APP_API_URL}/vibeCheck`, vibeCheckBody);
        }
        catch (vibeCheckError) {
            console.log(vibeCheckError)
        }
    }

    // Check wheather the post vibe check is already selected
    const hasPostVibeCheck = (postId, postVibe) => {
        const postsVibeCheck = JSON.parse(localStorage.getItem("postsVibeCheck") || "{}");
        if (postsVibeCheck[postId]) {
            return true;
        }

        postsVibeCheck[postId] = postVibe;

        localStorage.setItem(
            "postsVibeCheck",
            JSON.stringify(postsVibeCheck)
        );

        return false;
    }

    // Handle Vibe Btn 
    const vibeBtn = async () => {
        try {
            if (isAlreadyVibed()) {
                props.alert("Your vibe is already matched!", "success");
                return;
            }

            setIsVibed(true);
            setTotalVibes(prev => prev + 1);

            await axios.put(`${process.env.REACT_APP_API_URL}/vibes/${id}`);

            // Setting the like post to the local storage
            setVibeToLocalStorage();
        }
        catch (error) {
            if (error.response && error.response.status === 403) {
                setVibeToLocalStorage();
                setTotalVibes(prev => Math.max(0, prev - 1));
                props.alert("Your vibe is already matched!", "success");
                return;
            }

            setIsVibed(false);
            setTotalVibes(prev => Math.max(0, prev - 1));
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

    // Show loading screen while fetching the post
    if (isLoading) {
        return <PostContentSkeleton />;
    }

    return (
        <>
            <div className='container mt-5'>
                {/* Post header section */}
                <div className="post-header">
                    <div className="post-header-main">
                        <div className="post-header-meta">
                            <p className="card-text my-1">
                                <span className="text-body-secondary">
                                    {convertTimestampToReadable(postData.timestamp)}
                                </span>

                                <span className="text-body-secondary mx-3">
                                    {"\u00B7"}
                                </span>

                                <span className="text-body-secondary">
                                    {`${calculateReadTime(postData.content)} min read`}
                                </span>
                            </p>
                        </div>

                        {/* Green dash */}
                        <div className="card-accent mt-4" />

                        <h2 className="post-title mt-4">
                            {postData.title}
                        </h2>
                    </div>

                    {/* Avatar at the far right */}
                    <div className="post-header-avatar">
                        <div className="mennist-avatar-preview">
                            {userAvatar ? <Avatar avatar={userAvatar} size={64} /> : ""}
                        </div>
                    </div>
                </div>
                <div className="post-divider"></div>
                {/* Post body section */}
                <div className='my-4'>
                    <p className='post-content fs-5'>{postData.content}</p>
                </div>
                {/* Post vibe check section */}
                <div className="vibe-check">
                    <div className="vibe-check-title">
                        VIBE CHECK
                    </div>

                    <div className="vibe-options">

                        <button
                            className={`vibe-option ${postVibe === "funny" ? "active" : ""}`}
                            onClick={() => postVibeCheckBtn("funny")}>
                            <img src={funnySVG} alt="Funny_Icon" />
                            {" "}
                            Funny
                            <small>{getPostVibeCount("funny")}</small>
                        </button>

                        <button
                            className={`vibe-option ${postVibe === "relatable" ? "active" : ""}`}
                            onClick={() => postVibeCheckBtn("relatable")}>
                            <img src={relatableSVG} alt="Relatable_Icon" />
                            {" "}
                            Relatable
                            <small>{getPostVibeCount("relatable")}</small>
                        </button>

                        <button
                            className={`vibe-option ${postVibe === "emotional" ? "active" : ""}`}
                            onClick={() => postVibeCheckBtn("emotional")}>
                            <img src={emotionalSVG} alt="Emotional_Icon" />
                            {" "}
                            Emotional
                            <small>{getPostVibeCount("emotional")}</small>
                        </button>

                        <button
                            className={`vibe-option ${postVibe === "wholesome" ? "active" : ""}`}
                            onClick={() => postVibeCheckBtn("wholesome")}>
                            <img src={wholesomeSVG} alt="Wholesome_Icon" />
                            {" "}
                            Wholesome
                            <small>{getPostVibeCount("wholesome")}</small>
                        </button>

                        <button
                            className={`vibe-option vibe-option-alert ${postVibe === "sad" ? "active" : ""}`}
                            onClick={() => postVibeCheckBtn("sad")}>
                            <img src={sadSVG} alt="Sad_Icon" />
                            {" "}
                            Sad
                            <small>{getPostVibeCount("sad")}</small>
                        </button>
                        <button
                            className={`vibe-option vibe-option-alert ${postVibe === "toxic" ? "active" : ""}`}
                            onClick={() => postVibeCheckBtn("toxic")}>
                            <img src={toxicSVG} alt="Toxic_Icon" />
                            {" "}
                            Toxic
                            <small>{getPostVibeCount("toxic")}</small>
                        </button>
                        <button
                            className={`vibe-option vibe-option-alert ${postVibe === "racist" ? "active" : ""}`}
                            onClick={() => postVibeCheckBtn("racist")}>
                            <img src={racistSVG} alt="Racist_Icon" />
                            {" "}
                            Racist
                            <small>{getPostVibeCount("racist")}</small>
                        </button>
                    </div>
                </div>
                {/* Divider */}
                <div className="post-divider mt-5"></div>
                {/* Report Post section */}
                <div className='d-flex justify-content-between align-items-center mt-4'>
                    <p className='text-body-secondary'>Report this post</p>
                    <button type="button" className="btn report-btn d-flex align-items-center justify-content-center gap-2" onClick={reportPostBtn}>
                        <img src={reportPost} alt="Report Posts Icon" width="24px" height="24px" />
                        {" "}
                        Report
                    </button>
                </div>
                <ReportPostComponent reportBtnRef={reportBtnRef} postId={id} chatId={postData.chatId} alert={props.alert} />
                {/* Show more posts section */}
                <ShowSimilarPosts similarPosts={similarPosts} isLoading={isSimilarPostsLoading}/>
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
