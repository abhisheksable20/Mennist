import React from 'react'
import { useParams } from 'react-router-dom'

function PostContent() {
    const { id } = useParams();

    return (
        <div className='container mt-5'>
            {/* Post header section */}
            <div>
                <p className="card-text my-1">
                    <span className='text-body-secondary'>June 1, 2026</span>
                    <span className="text-body-secondary mx-3">{`\u00B7`}</span>
                    <span className='text-body-secondary'>4 min read</span>
                </p>
                {/* Green dash */}
                <div className="card-accent mt-4" />
                <h2 className='post-title mt-4'>This is my sixteen content title that shines above the rest</h2>
                {/* Divider */}
                <div className="post-divider"></div>
            </div>
            {/* Post body section */}
            <div>
                <p className='post-content fs-5 mt-5'>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Ea quo amet atque sunt expedita maiores nam itaque dolore. Voluptatem sit quaerat, vero eaque optio corrupti. Dignissimos nulla inventore quam autem.</p>
            </div>
        </div>
    )
}

export default PostContent
