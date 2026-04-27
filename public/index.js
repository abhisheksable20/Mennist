const firebaseURL = "https://api-i7cqcol4da-uc.a.run.app/";
let lastTimestamp = Date.now(); // Load most recent posts first
const postsPerPage = 10;
let loading = false;
let noMorePosts = false;


function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds} sec ago`;
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

  // If older than a week, show date like Jul 12, 2025
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function loadPosts() {
  if (loading || noMorePosts) return;
  loading = true;

  // Show the loading text
  document.getElementById("loadingIndicator").style.display = "block";

  try {
    const res = await axios.get(`${firebaseURL}get-posts`, {
      params: {
        endAt: lastTimestamp,
        limit: postsPerPage
      }
    });

    const posts = res.data;
    if (!posts) {
      noMorePosts = true;
      disableMoreLoadBtn();
      return;
    }


    const gridElement = document.getElementById("gridList");
    posts.forEach(post => {
      const li = document.createElement("li");

      const timeAgo = formatTimeAgo(post.timestamp);

      li.innerHTML = `
        <div class="tile-title">${post.title}</div>
        <div class="tile-description">${post.content}</div>
        <div class="tile-time">${timeAgo}</div>
      `;

      li.addEventListener('click', () => {
        window.location.href = `/show?id=${post.id}`;
      });

      gridElement.appendChild(li);



    });

    const lastItem = posts[posts.length - 1];
    if (lastItem.timestamp === lastTimestamp) {
      noMorePosts = true;
      disableMoreLoadBtn();
    } else {
      lastTimestamp = lastItem.timestamp - 1;
    }
  } catch (error) {
    console.error("Error loading posts:", error);
  } finally {
    // Hide loading indicator
    document.getElementById("loadingIndicator").style.display = "none";
    loading = false;
  }
}

function disableMoreLoadBtn() {
  setTimeout(() => {
    document.getElementById("loadMoreContainer").style.display = "none";
  }, 2000)
}

document.getElementById("loadMoreBtn").addEventListener("click", () => {
  loadPosts();
})


loadPosts();