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

function PostContent() {
    const { id } = useParams();
    const [postData, setPostData] = useState({ id: id, title: "", content: "", timestamp: 0 });

    // Fetching the post from the server
    const fetchPost = async () => {
        try {
            const res = (await axios.get(`${process.env.REACT_APP_API_URL}/posts/${id}`)).data;
            setPostData(prev => ({
                ...prev,
                ...res
            }));
        }
        catch (fetchError) {
            console.log("Post Component Error: ", fetchError)
        }
    }

    // Calculate the read time
    const calculateReadTime = (content) => {
        const words = totalWords(content);
        const minutes = Math.floor(words / 200);
        return minutes;
    };

    useEffect(() => {
        if (id)
            fetchPost();

    }, [id])

    return (
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

                        <div className="d-flex align-items-center gap-2 icon-svg">
                            <img src={halfLikeSVG} width="24px" height='24px' />
                            <span>Like</span>
                        </div>

                        <div className="vertical-divider"></div>

                        <div className="d-flex align-items-center gap-2 icon-svg">
                            <img src={chatSVG} width="24px" height='24px' />
                            <span>Chat</span>
                        </div>

                        <div className="vertical-divider"></div>

                        <div className="d-flex align-items-center gap-2 icon-svg">
                            <img src={saveSVG} width="24px" height='24px' />
                            <span>Save</span>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default PostContent
