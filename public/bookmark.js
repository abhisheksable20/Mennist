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

    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}


function loadBookmarks(){
    const savedPosts = JSON.parse(localStorage.getItem("savedPosts")) || [];
    const gridElement = document.getElementById("gridList");
    gridElement.innerHTML = "";

    if (savedPosts.length === 0) {
        gridElement.innerHTML = "<p>No bookmarked posts yet...</p>";
        return;
    }

    savedPosts.forEach(post => {
        const li = document.createElement("li");
        const timeago = formatTimeAgo(post.timestamp);

        li.innerHTML = `
            <div class="tile-title">${post.title}</div>
            <div class="tile-description">${post.content}</div>
            <div class="tile-time">${timeago}</div>
        `;

        li.addEventListener("click", () => {
            window.location.href = `/show?id=${post.id}&saved=1`;
        });
        
        gridElement.appendChild(li);
    });

}

loadBookmarks();
