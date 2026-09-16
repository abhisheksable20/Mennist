const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const {isLoggedIn} = require("../middleware/authenticUser");
const {validate} = require("express-validation");
const {echoValidation} = require("../validators/postValidator");
const {postLimiter} = require("../middleware/rateLimiter");
const {getFunctions} = require("firebase-admin/functions");

const echoMatchingQueue = getFunctions().taskQueue("matchEchoes");

const db = admin.database();

// Submit people dreams
router.post("/submitEcho", postLimiter, isLoggedIn, validate(echoValidation), async (req, res) => {
  try {
    const userId = req.user.uid;
    const {echo} = req.body;

    const timestamp = Date.now();

    const snapshotRef = db.ref(`echoes/${userId}`).push();
    const echoData = {
      echo,
      timestamp,
      status: "processing",
    };

    await snapshotRef.set(echoData);

    const echoId = snapshotRef.key;

    // Queue Gemini matching
    await echoMatchingQueue.enqueue({
      userId,
      echoId,
      echo,
    });

    return res.status(200).send("Save successfully!");
  } catch (echoSubmitError) {
    console.log("Echo Submittion Error: ", echoSubmitError);
    return res.status(500).send("Internal server error!");
  }
});


module.exports = router;
