const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const {isLoggedIn} = require("../middleware/authenticUser");
const {publicReadLimiter, globalLimiter, postLimiter, dailyAiLimiter, vibeLimiter, reportLimiter} = require("../middleware/rateLimiter");
const {validate} = require("express-validation");
const {postValidation, reportValidation, vibeCheckValidation} = require("../validators/postValidator");
const {postFetching, parseEndAt} = require("../dataProcessing/postsProcessing");
const {recordDailyPost, ownsUnlock} = require("../coins/coinService");
const {GoogleGenAI} = require("@google/genai");
const {getFunctions} = require("firebase-admin/functions");

const taskQueue = getFunctions().taskQueue("postVibeCheck");
const notificationQueue = getFunctions().taskQueue("processNotification");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
const db = admin.database();

const retrieveLimit = 10;
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
// The categories Gemini can give a post (stored in lowercase)
const CATEGORIES = new Set(["love", "friendship", "family", "education", "career", "finance", "mental health",
  "technology", "gaming", "entertainment", "politics", "health", "confession", "motivation", "other"]);

// Get all the database posts
router.get("/posts", isLoggedIn, globalLimiter, async (req, res) => {
  const endAt = parseEndAt(req.query.endAt);
  try {
    const ref = db.ref("posts");
    const data = await postFetching(ref, endAt, retrieveLimit);

    return res.status(200).send(data);
  } catch (getError) {
    console.log(getError);
    return res.status(500).send("Something went wrong!");
  }
});

// Get a specific post
router.get("/posts/:postId", publicReadLimiter, async (req, res) => {
  try {
    const postId = req.params.postId;
    if (!SAFE_ID.test(postId || "")) {
      res.status(400).send({
        error: "Something went wrong!",
      });

      return;
    }

    const snapshot = await db.ref(`posts/${postId}`).once("value");
    if (!snapshot.exists()) {
      return res.status(404).send({error: "No post found!"});
    }

    const data = snapshot.val();
    delete data.userUniqueId;
    delete data.postActions;

    const post = {
      id: snapshot.key,
      ...data,
    };

    return res.status(200).send(post);
  } catch (fetchErr) {
    return res.status(500).send({
      error: "Internal server error",
    });
  }
});

// Get specific category posts from database
router.get("/suggestPost/:category", isLoggedIn, globalLimiter, async (req, res) => {
  try {
    const postCategory = String(req.params.category || "").toLowerCase();
    if (!CATEGORIES.has(postCategory)) {
      return res.status(400).send({
        error: "Category not found.",
      });
    }

    const snapshot = await db
        .ref("posts")
        .orderByChild("category")
        .equalTo(postCategory)
        .limitToFirst(retrieveLimit)
        .once("value");

    if (!snapshot.exists()) {
      return res.status(200).send([]);
    }

    const data = [];

    snapshot.forEach((child) => {
      const post = child.val();
      delete post.postActions;
      delete post.category;
      delete post.vibeCheck;

      data.push({
        id: child.key,
        ...post,
        content:
          post.content && post.content.length > 100 ?
            post.content.substring(0, 100) + "..." :
            post.content,
      });
    });

    return res.status(200).send(data);
  } catch (postFetchError) {
    console.log("Suggestion fetching error:", postFetchError);
    return res.status(500).send("Internal server error!");
  }
});

// Submit the post in database
router.post("/posts", isLoggedIn, postLimiter, dailyAiLimiter, validate(postValidation), async (req, res) => {
  try {
    const userUniqueId = req.user.uid;

    const {title, content} = req.body;
    const timestamp = Date.now();

    let aiData = {
      category: "Other",
      nsfw: false,
    };

    try {
      aiData = await postClassification(title, content);
    } catch (geminiError) {
      console.error("Gemini classification failed:", geminiError);
    }

    const postData = {
      title,
      content,
      timestamp,
      isAdult: aiData.nsfw,
      category: aiData.category.toLowerCase(),
      chatId: req.user.chatId,
    };

    // The post and its copy on the user's profile, in one write
    const postId = db.ref("posts").push().key;
    await db.ref().update({
      [`posts/${postId}`]: postData,
      [`users/${userUniqueId}/posts/${postId}`]: {title, content, timestamp, isAdult: aiData.nsfw},
    });

    // Streak + Sakesnake Coins. A coin error must never fail the post itself.
    let coins = null;
    try {
      coins = await recordDailyPost(userUniqueId, content);
    } catch (coinError) {
      console.error("Streak update failed:", coinError);
    }

    return res.status(200).send({message: "Post submitted successfully.", coins});
  } catch (submitError) {
    console.error("Submit Error:", submitError);
    return res.status(500).send("Internal Server Error.");
  }
});

// Classifying the post according to their title and content also checking nsfw
const postClassification = async (title, content) => {
  const prompt = `
You are an AI content classifier.

Return ONLY valid JSON.

Categories:
Love
Friendship
Family
Education
Career
Finance
Mental Health
Technology
Gaming
Entertainment
Politics
Health
Confession
Motivation
Other

Return JSON:

{
  "category":""
  "nsfw":false
}

Title:
${title}

Content:
${content}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          category: {
            type: "STRING",
            enum: [
              "Love",
              "Friendship",
              "Family",
              "Education",
              "Career",
              "Finance",
              "Mental Health",
              "Technology",
              "Gaming",
              "Entertainment",
              "Politics",
              "Health",
              "Confession",
              "Motivation",
              "Other",
            ],
          },
          nsfw: {type: "BOOLEAN"},
        },
        required: ["category", "nsfw"],
      },
    },
  });

  const text = response.text;
  const cleanedText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

  return JSON.parse(cleanedText);
};


// Post like counter functions
router.put("/vibes/:postId", isLoggedIn, vibeLimiter, async (req, res) => {
  const user = req.user.uid;
  const postId = req.params.postId;

  if (!SAFE_ID.test(postId || "")) {
    return res.status(400).send({error: "Failed to process your request!"});
  }

  try {
    // The notification goes to the post's real owner, read from the post itself
    const [ownerSnap, userSnapshot] = await Promise.all([
      db.ref(`posts/${postId}/chatId`).get(),
      db.ref(`vibes/${postId}/userId/${user}`).get(),
    ]);
    const ownerChatId = ownerSnap.val();
    if (!ownerChatId) {
      return res.status(404).send({error: "Post not found."});
    }
    if (userSnapshot.exists()) {
      return res.status(403).send({error: "You already matched the vibe"});
    }
    const reveiverUserId = jwt.verify(ownerChatId, process.env.JWT_SECRET_KEY);

    // Mark the vibe and count it in one write (the server adds 1, no transaction needed)
    await db.ref().update({
      [`vibes/${postId}/userId/${user}`]: true,
      [`vibes/${postId}/count`]: admin.database.ServerValue.increment(1),
    });

    // eventId, userId, actorId, type, postId, echoId, chatId, vibe
    const notificationData = {
      eventId: `vibe_${postId}_${user}`,
      userId: reveiverUserId,
      actorId: user,
      type: "vibe",
      postId,
    };

    await notificationQueue.enqueue(notificationData);

    return res.status(200).send("Vibe Matched!");
  } catch (relError) {
    console.log("vibe marking error: ", relError);
    return res.status(500).send({error: "Internal server error"});
  }
});

// Vibe check the post
router.post("/vibeCheck", isLoggedIn, vibeLimiter, validate(vibeCheckValidation), async (req, res) => {
  const userId = req.user.uid;
  const {postId, chatId, postVibe} = req.body;

  try {
    // Each Vibe Check option is unlocked with Sakesnake Coins
    if (!(await ownsUnlock(userId, `vibe_${postVibe}`))) {
      return res.status(402).send({code: "VIBE_LOCKED", vibe: postVibe, message: "Unlock this vibe with coins first."});
    }

    await taskQueue.enqueue({postId, actorId: userId, postVibe, userChatId: chatId});
    return res.status(200).send({Message: "Vibe registered sucessfully!"});
  } catch (vibeCheckErr) {
    console.error("Vibe check failed:", vibeCheckErr);
    return res.status(500).send({error: "Internal server error"});
  }
});

// Send the type of vibe check to client side
router.get("/vibeCheck/:postId", isLoggedIn, globalLimiter, async (req, res) => {
  const userId = req.user.uid;
  const postId = req.params.postId;

  if (!SAFE_ID.test(postId || "")) {
    return res.status(400).send({error: "Failed to process your request!"});
  }

  try {
    const snapshot = await db.ref(`postVibeChecks/${postId}/${userId}`).get();
    const postVibe = snapshot.exists() ? snapshot.val() : null;

    return res.status(200).send({postVibe});
  } catch (postVibeError) {
    console.log("Failed to get post vibe check type: ", postVibeError);
    return res.status(500).send("Internal server error!");
  }
});

// Report the post
router.post("/report", isLoggedIn, reportLimiter, validate(reportValidation), async (req, res) => {
  const user = req.user.uid;
  const {reason, postOwnerChatId, postId} = req.body;

  if (!postOwnerChatId || !postId) {
    return res.status(400).send({error: "Something went wrong!"});
  }

  try {
    // Report the real owner, read from our data (not from the request).
    // The same form reports posts and Echo matches; an echo's owner is in echoFeed.
    const [ownerSnap, echoOwnerSnap] = await Promise.all([
      db.ref(`posts/${postId}/chatId`).get(),
      db.ref(`echoFeed/${postId}/uid`).get(),
    ]);
    let kind = "posts";
    let recieverUserId = null;
    if (ownerSnap.exists()) {
      recieverUserId = jwt.verify(ownerSnap.val(), process.env.JWT_SECRET_KEY);
    } else if (echoOwnerSnap.exists()) {
      kind = "echoes";
      recieverUserId = echoOwnerSnap.val();
    } else {
      // Echo matched before echoFeed existed: the form sends the echo owner's
      // chatId. Trust it only if that user really has an echo with this id.
      let claimed = null;
      try {
        claimed = jwt.verify(postOwnerChatId, process.env.JWT_SECRET_KEY);
      } catch (tokenErr) {
        claimed = null;
      }
      const echoExists = typeof claimed === "string" && claimed &&
        (await db.ref(`echoes/${claimed}/${postId}/timestamp`).get()).exists();
      if (!echoExists) {
        return res.status(404).send({error: "Post not found."});
      }
      kind = "echoes";
      recieverUserId = claimed;
    }

    const reportData = {
      reason: reason,
      timestamp: Date.now(),
      userUniqueId: recieverUserId,
    };

    await db.ref(`reports/${kind}/${postId}/${user}`).set(reportData);
    return res.status(200).send({message: "Post reported successfully!"});
  } catch (reportError) {
    console.log("Failed to report post: ", reportError);
    res.status(500).send({error: "Internal server error."});
  }
});


// Get vibes count
router.get("/vibes/:postId", publicReadLimiter, async (req, res) => {
  const postId = req.params.postId;
  if (!SAFE_ID.test(postId || "")) {
    return res.status(400).send({error: "No data found"});
  }

  try {
    // Getting vibes count
    const countVal = (await db.ref(`vibes/${postId}/count`).once("value")).val();
    const count = countVal || 0;

    return res.status(200).send({count});
  } catch (relError) {
    console.log("vibe marking error: ", relError);
    return res.status(500).send({error: "Internal server error"});
  }
});


module.exports = router;
