import { Link, useNavigate } from 'react-router-dom';
import { convertTimestampToReadable } from '../dataProcessing/dataProcessing';

// Keys match the lowercase categories the server stores
const CATEGORY_COLORS = {
  love: "#E87991",
  friendship: "#E5A04B",
  family: "#C49A6C",
  education: "#60A5FA",
  career: "#818CF8",
  finance: "#34B88A",
  "mental health": "#A78BFA",
  technology: "#38BDF8",
  gaming: "#A3A3E8",
  entertainment: "#D68BC5",
  politics: "#94A3B8",
  health: "#4DB6AC",
  confession: "#D97777",
  motivation: "#D4AD55",
  other: "#A1A1AA",
};

const compact = new Intl.NumberFormat("en", { notation: "compact" });

const Stat = ({ label, value, path }) => (
  <span className="post-stat" aria-label={`${value} ${label}`}>
    <svg viewBox="0 0 24 24" aria-hidden="true">{path}</svg>
    {compact.format(value)}
  </span>
);

function PostItem({ post }) {
  const navigate = useNavigate();
  const { id, title, content, timestamp, isAdult = false, category, stats } = post || {};
  const color = category && (CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.other);

  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div
        className={`card post-card h-100 ${isAdult ? "adult-card" : ""}`}
        onClick={() => navigate(`/post/${id}`)}>
        {isAdult && <span className="badge text-bg-danger">18+</span>}

        <div className="card-body d-flex flex-column gap-2">
          <div className="d-flex justify-content-between align-items-center">
            {category && (
              <span className="post-category" style={{ color }}>{category}</span>
            )}
            <small className="post-meta ms-auto">{convertTimestampToReadable(timestamp)}</small>
          </div>

          <h5 className="card-title mb-0">
            <Link to={`/post/${id}`}>{title}</Link>
          </h5>
          <p className="card-text post-excerpt mb-0">{content}</p>

          {stats && (
            <div className="post-footer mt-auto">
              <small className="post-meta">
                {stats.topVibe ? `Mostly ${stats.topVibe}` : "No vibe checks yet"}
              </small>
              <div className="d-flex gap-3 ms-auto">
                <Stat label="views" value={stats.views}
                  path={<><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>} />
                <Stat label="chats" value={stats.chats}
                  path={<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20l1.1-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />} />
                <Stat label="saves" value={stats.saves}
                  path={<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PostItem
