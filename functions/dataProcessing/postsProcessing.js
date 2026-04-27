// Fetch the global and user posts according to the ref
const postFetching = async (ref, endAt, limitToLast) => {
    const snapshot = await ref
        .orderByChild("timestamp")
        .endAt(endAt)
        .limitToLast(limitToLast)
        .once("value");

    const data = [];

    if (!snapshot.exists()) {
        return {
            lastTimestamp: -1,
            postsData: data
        };
    }

    snapshot.forEach((child) => {
        const post = child.val();

        delete post.userUniqueId;

        data.push({
            id: child.key,
            ...post
        });
    });

    const filteredData = data.reverse();

    const postsData = {
        lastTimestamp: filteredData[filteredData.length - 1].timestamp,
        postsData: filteredData
    }

    return postsData

}

module.exports = postFetching;