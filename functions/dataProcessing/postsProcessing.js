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
      postsData: data,
    };
  }

  snapshot.forEach((child) => {
    const post = child.val();
    delete post.postActions;

    data.push({
      id: child.key,
      ...post,
      content:
        post.content && post.content.length > 100 ?
          post.content.substring(0, 100) + "..." :
          post.content,
    });
  });

  const filteredData = data.reverse();

  const postsData = {
    lastTimestamp: filteredData[filteredData.length - 1].timestamp,
    postsData: filteredData,
  };

  return postsData;
};

// Content moderation (Checking wheather the content is adult or not just return true or false)
const isContentAdult = (content, title) => {
  const adultWords = [
    "porn",
    "nude",
    "xxx",
    "blowjob",
    "cum",
    "anal",
    "sex",
    "fuck",
    "dick",
    "pussy",
  ];

  const lContent = content.toLowerCase();
  const lTitle = title.toLowerCase();

  const isTitleAdult = adultWords.some((word) => lTitle.includes(word));
  if (isTitleAdult) {
    return true;
  }

  return adultWords.some((word) => lContent.includes(word));
};

module.exports = {postFetching, isContentAdult};
