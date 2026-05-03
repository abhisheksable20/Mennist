// Converting raw timestamp to month date, year
export function convertTimestampToReadable(timestamp) {
    if(!timestamp){
        return "NO DATE";
    }

    const formattedDate = new Date(timestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });

    return formattedDate;
}

// Get total word count from the content
export function totalWords (content) {
    if(!content || content.trim().length === 0)
      return 0;
    
    return content.trim().split(/\s+/).length;
}
