// "Load older" cursor from ?endAt=. Missing or not a number: start from now.
// A number is kept in range: negative means "nothing older" (returns no items),
// so a client that runs past the end never starts the feed over.
const parseEndAt = (value) => {
  const n = Number(value);
  if (value === undefined || value === "" || !Number.isFinite(n)) return Date.now();
  return Math.min(Math.max(n, 0), Date.now() + 60000);
};

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
    delete post.category;

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

const userEchoesFetching = async (ref, endAt, limitToLast) => {
  const snapshot = await ref
      .orderByChild("timestamp")
      .endAt(endAt)
      .limitToLast(limitToLast)
      .once("value");

  const data = [];

  if (!snapshot.exists()) {
    return {
      lastTimestamp: -1,
      echoesData: data,
    };
  }

  snapshot.forEach((child) => {
    const echo = child.val();
    data.push({
      id: child.key,
      ...echo,
    });
  });

  const filteredData = data.reverse();
  const echoData = {
    lastTimestamp: filteredData[filteredData.length - 1].timestamp,
    echoesData: filteredData,
  };

  return echoData;
};

module.exports = {postFetching, userEchoesFetching, parseEndAt};
