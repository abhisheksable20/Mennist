const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { isLoggedIn } = require("../middleware/authenticUser");
const { validate } = require("express-validation");
const { echoValidation } = require("../validators/postValidator");
const { postLimiter, globalLimiter } = require("../middleware/rateLimiter");
const { getFunctions } = require("firebase-admin/functions");

const echoMatchingQueue = getFunctions().taskQueue("matchEchoes");

const db = admin.database();

// Fetch echoes from the database
router.get("/echoes/:echoId", globalLimiter, isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.uid;
    const echoId = req.params.echoId;

    if (!echoId) {
      return res.status(400).send({
        error: "Echo Id is required!"
      });
    }

    const snapshot = await db.ref(`echoMatches/${userId}/${echoId}`).once("value");

    if (!snapshot.exists()) {
      return res.status(404).send({
        status: "processing",
        message: "Dream matching is still processing.",
      })
    }

    const data = snapshot.val();
    return res.status(200).send(data);
  }
  catch (echoFetchError) {
    console.log("Error while fetching the echo matches: ", echoFetchError)
  }
})

// Submit people echoes
router.post("/submitEcho", postLimiter, isLoggedIn, validate(echoValidation), async (req, res) => {
  try {
    const userId = req.user.uid;
    const { echo } = req.body;

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
