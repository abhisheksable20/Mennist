const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const {isLoggedIn} = require("../middleware/authenticUser");
const {globalLimiter, postLimiter} = require("../middleware/rateLimiter");
const {validate} = require("express-validation");
const {postValidation, reportValidation} = require("../validators/postValidator");
const postFetching = require("../dataProcessing/postsProcessing");

const db = admin.database();

const retrieveLimit = 10;

// Get all the database posts
router.get("/posts", isLoggedIn, globalLimiter, async (req, res) => {
  const endAt = req.query.endAt ? Number(req.query.endAt) : Date.now();
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
router.get("/posts/:postId", isLoggedIn, globalLimiter, async (req, res) => {
  try {
    const postId = req.params.postId;
    if (!postId) {
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


// Submit the post in database
router.post("/posts", isLoggedIn, postLimiter, validate(postValidation), async (req, res) => {
  try {
    const userUniqueId = req.user.uid;

    const {title, content} = req.body;
    const timestamp = Date.now();

    const postData = {
      title,
      content,
      timestamp,
    };

    const dbRef = db.ref("posts").push();
    await dbRef.set(postData);

    // Setting user post data
    await db.ref(`users/${userUniqueId}/posts/${dbRef.key}`).set({title, content, timestamp});

    return res.status(200).send("Post submitted successfully.");
  } catch (submitError) {
    console.error("Submit Error:", submitError);
    return res.status(500).send("Internal Server Error.");
  }
});


// Post like counter functions
router.put("/vibes/:postId", isLoggedIn, globalLimiter, async (req, res) => {
  const user = req.user.uid;
  const postId = req.params.postId;

  if (!postId) {
    return res.status(400).send({error: "Failed to process your request!"});
  }

  try {
    const userRef = db.ref(`vibes/${postId}/userId/${user}`);
    const userSnapshot = await userRef.once("value");

    if (userSnapshot.exists()) {
      return res.status(403).send({error: "You already matched the vibe"});
    }

    // Marking as vibes
    await userRef.set(true);
    const countRef = db.ref(`vibes/${postId}/count`);
    await countRef.transaction((current) => (current || 0) + 1);

    return res.status(200).send("Vibe Matched!");
  } catch (relError) {
    console.log("vibe marking error: ", relError);
    return res.status(500).send({error: "Internal server error"});
  }
});

// Report the post
router.post("/report", isLoggedIn, validate(reportValidation), async (req, res) => {
  const user = req.user.uid;
  const {postId, reason} = req.body;

  if (!postId) {
    return res.status(400).send({error: "Something went wrong!"});
  }

  try {
    const postRef = await db.ref(`posts/${postId}`).once("value");
    if (!postRef.exists()) {
      return res.status(404).send({error: "Sorry, post not found"});
    }

    const data = postRef.val();

    const reportData = {
      reason: reason,
      timestamp: Date.now(),
      userUniqueId: data.userUniqueId,
    };

    await db.ref(`reports/posts/${postId}/${user}`).set(reportData);
    return res.status(200).send({message: "Post reported successfully!"});
  } catch (reportError) {
    console.log("Failed to report post: ", reportError);
    res.status(500).send({error: "Internal server error."});
  }
});


// Get vibes count
router.get("/vibes/:postId", async (req, res) => {
  const postId = req.params.postId;
  if (!postId) {
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
