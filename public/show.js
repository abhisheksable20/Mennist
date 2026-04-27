const baseUrl = "https://api-i7cqcol4da-uc.a.run.app";
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("id");
const saved = urlParams.get("saved");

const btn = document.getElementById("relatableBtn");
const saveBtn = document.getElementById("savePostBtn");
const saveIcon = document.getElementById("saveIcon");
const toast = document.getElementById("toast");
const icon = document.getElementById("relatableIcon");

var post = null;

if (!postId) {
    document.getElementById('post-title').innerText = "Invalid URL";
    throw new Error("Missing ID");
}

if(saved){
    saveIcon.src = "/assets/fill_bookmarked_black_vector.svg"
}

// Timestamp format function
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

// Blur adult content function
function blurIfAdult(content){
    const adultKeywords = ["sex", "porn", "nude", "xxx", "nsfw", "erotic",
        "boobs", "naked", "masturbate", "blowjob", "fetish", "anal", "fuck"];

    const lowerContent = content.toLowerCase();
    const isAdult = adultKeywords.some(keyword => lowerContent.includes(keyword));

    const postDiv = document.querySelector('.post');
    const overlay = document.getElementById('adultOverlay');
    const buttons = document.querySelector('.button-container');

    if (isAdult) {
        postDiv.classList.add('blurred');
        buttons.classList.add('hidden-buttons');
        overlay.style.display = 'block';

        const revealBtn = document.getElementById('revealBtn');
        revealBtn.addEventListener('click', () => {
            postDiv.classList.remove('blurred');
            overlay.style.display = 'none';
            buttons.classList.remove('hidden-buttons');
        });
    }
}

async function loadPostById(){
    try{
        const res = await axios.get(`${baseUrl}/get-post-by-id?postId=${postId}`);
        post = res.data;
        if (!post) {
            document.getElementById('post-title').innerText = "Post not found";
            document.getElementById('post-description').innerText = "";
            return;
        }

        document.title = post.title;
        document.getElementById('post-title').innerText = post.title;
        document.getElementById('post-timestamp').innerText = formatTimeAgo(post.timestamp);
        document.getElementById('post-description').innerText = post.content;
        
        blurIfAdult(post.content);

    } catch (err) {
        console.error("Failed to load post:", err);
    }
}

//Copy link address button
document.getElementById('copyLinkBtn').addEventListener("click", async () => {
    const link = `${window.location.origin}/show?id=${postId}`;
    try {
        await navigator.clipboard.writeText(link);
        showToast("Link copied to clipboard!");
    } catch (err) {
        showToast("Failed to copy link.");
    }
})

// Load Relatable Count of the post
async function loadRelatableCount(){
    try {
        const res = await axios.get(`${baseUrl}/relatable-count?postId=${postId}`);
        const count = res.data.count || 0;
        document.getElementById("relatableCount").innerText = count;
    } catch (error) {
        console.error("Failed to load relatable count", err);
    }
}

// Show toast message
function showToast(msg) {
    toast.innerHTML = msg;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}

// Bookmark the post button
saveBtn.addEventListener("click", () => {
    let savedPosts = JSON.parse(localStorage.getItem("savedPosts")) || [];
    const postIndex = savedPosts.findIndex(p => p.id === postId);

    if (postIndex !== -1) {
        // Already saved → remove it
        savedPosts.splice(postIndex, 1);
        localStorage.setItem("savedPosts", JSON.stringify(savedPosts));
        saveIcon.src = "/assets/bookmarks_vector.svg"; // unfilled icon
        showToast("Post removed from bookmarks!");
    }
    else {
        // Not saved → add it
        savedPosts.push({
            id: postId,
            title: post.title,
            content: post.content,
            timestamp: post.timestamp
        });

        localStorage.setItem("savedPosts", JSON.stringify(savedPosts));
        saveIcon.src = "/assets/fill_bookmarked_black_vector.svg"; // filled icon
        showToast("Post bookmarked!");
    }
})


// Select the post for relatable
btn.addEventListener("click", async () => {
    try {
        await axios.post(`${baseUrl}/relate-post`, { postId });
        btn.disabled = true;
        icon.src = "/assets/related_vector.svg";

        // Animate
        btn.classList.add("shake");
        setTimeout(() => {
            btn.classList.remove("shake");
        }, 500);

        showToast("Post marked as relatable.");
        loadRelatableCount();

    } catch (err) {
        if (err.response?.status === 403) {
            showToast("You already marked this as relatable.");
            btn.disabled = true;
            icon.src = "/assets/related_vector.svg";
        } else {
            console.error("Error occured while setting the post to relatable.",err);
        }
    }
});

loadPostById();
loadRelatableCount();

