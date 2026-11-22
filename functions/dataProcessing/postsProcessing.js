// "Load older" cursor from ?endAt=. Missing or not a number: start from now.
// A number is kept in range: negative means "nothing older" (returns no items),
// so a client that runs past the end never starts the feed over.
const parseEndAt = (value) => {
  const n = Number(value);
  if (value === undefined || value === "" || !Number.isFinite(n)) return Date.now();
  return Math.min(Math.max(n, 0), Date.now() + 60000);
};

// Shape a post for a feed card: only the fields a card shows, so private
// fields (author ids, chat ids) never leave the server. Stats come from the
// post node itself, so the client needs no extra request per card.
const toCardPost = (id, post) => {
  const {title, content, timestamp, isAdult, category, vibeCheck, postActions} = post;

  let topVibe = null;
  for (const vibe in vibeCheck) {
    if (!topVibe || vibeCheck[vibe] > vibeCheck[topVibe]) topVibe = vibe;
  }

  const actions = postActions || {};
  return {
    id,
    title,
    timestamp,
    isAdult,
    category,
    content: content && content.length > 100 ? content.substring(0, 100) + "..." : content,
    stats: {
      topVibe,
      views: actions.postViews || 0,
      chats: actions.postChats || 0,
    },
  };
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
    data.push(toCardPost(child.key, child.val()));
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

module.exports = {postFetching, userEchoesFetching, parseEndAt, toCardPost};
