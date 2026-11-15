// Converting raw timestamp to month date, year
export function convertTimestampToReadable(timestamp) {
    if (!timestamp) {
        return "NO DATE";
    }

    const date = new Date(+timestamp);
    const now = new Date();

    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return "Just now";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} min${diffInMinutes > 1 ? "s" : ""} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    }

    // Older than 7 days → show actual date
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    if (bytes < 1024 * 1024 * 1024) {
        return `${Math.round(bytes / (1024 * 1024))} MB`;
    }
    return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
};

// Get total word count from the content
export function totalWords(content) {
    if (!content || content.trim().length === 0)
        return 0;

    return content.trim().split(/\s+/).length;
}
