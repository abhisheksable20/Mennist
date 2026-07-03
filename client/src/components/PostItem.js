import React from 'react'
import { Link } from 'react-router-dom';
import { convertTimestampToReadable } from '../dataProcessing/dataProcessing';

function PostItem(props) {
  const { id, title, content, timestamp } = props.post;

  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div className="card h-100">
        <div className="card-body d-flex flex-column">
          {/* Green dash */}
          <div className="card-accent mt-2" />

          {/* Title & Content */}
          <h5 className="card-title mt-1">{title}</h5>
          <p className="card-text">{content}</p>

          {/* Footer */}
          <div className='d-flex justify-content-between mt-auto'>
            {/* Display date when the post was uploaded */}
            <p className="card-text my-1"><small className="text-body-secondary">{convertTimestampToReadable(timestamp)}</small></p>
            {/* Read more link with icon animation */}
            <Link className="icon-link icon-link-hover" to={`/post/${id}`}>
              Read More
              <svg xmlns="http://www.w3.org/2000/svg" className="bi" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
              </svg>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}

export default PostItem
