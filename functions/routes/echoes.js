const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const {isLoggedIn} = require("../middleware/authenticUser");
const {validate} = require("express-validation");
const {echoValidation} = require("../validators/postValidator");
const {postLimiter, globalLimiter} = require("../middleware/rateLimiter");
const {getFunctions} = require("firebase-admin/functions");
const {userEchoesFetching} = require("../dataProcessing/postsProcessing");

const echoMatchingQueue = getFunctions().taskQueue("matchEchoes");

const db = admin.database();

const retrieveLimit = 10;

// Fetch only user echoes from the database
router.get("/", globalLimiter, isLoggedIn, async (req, res) => {
  const endAt = req.query.endAt ? Number(req.query.endAt) : Date.now();
  const userId = req.user.uid;
  try {
    const ref = db.ref(`echoes/${userId}`);
    const data = await userEchoesFetching(ref, endAt, retrieveLimit);

    return res.status(200).send(data);
  } catch (fetchEchoErr) {
    console.log("User echoes fetching error: ", fetchEchoErr);
    return res.status(500).send("Something went wrong!");
  }
});

// Fetch single echo from the database
router.get("/echo/:echoId", globalLimiter, isLoggedIn, async (req, res) => {
  const userId = req.user.uid;
  const echoId = req.params.echoId;

  if (!echoId) {
    return res.status(400).send({error: "Something went wrong!"});
  }

  try {
    const snapshot = await db.ref(`echoes/${userId}/${echoId}`).once("value");
    if (!snapshot.exists()) {
      return res.status(404).send({error: "No echo found!"});
    }

    const data = snapshot.val();
    const echo = {
      id: snapshot.key,
      ...data,
    };

    return res.status(200).send(echo);
  } catch (echoFetchErr) {
    console.log("Single Echo Fetching Error: ", echoFetchErr);
    return res.status(500).send("Something went wrong!");
  }
});

// Fetch echoes matches from the database
router.get("/:echoId", globalLimiter, isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.uid;
    const echoId = req.params.echoId;

    if (!echoId) {
      return res.status(400).send({
        error: "Echo Id is required!",
      });
    }

    const snapshot = await db.ref(`echoMatches/${userId}/${echoId}`).once("value");

    if (!snapshot.exists()) {
      return res.status(404).send({
        status: "processing",
        message: "Dream matching is still processing.",
      });
    }

    const data = snapshot.val();
    const matches = data.matches.map(({...match}) => match);

    return res.status(200).send(matches);
  } catch (echoFetchError) {
    console.log("Error while fetching the echo matches: ", echoFetchError);
  }
});

// Submit people echoes
router.post("/submitEcho", postLimiter, isLoggedIn, validate(echoValidation), async (req, res) => {
  try {
    const userId = req.user.uid;
    const {echo} = req.body;
    const chatId = req.user.chatId;

    const timestamp = Date.now();

    const snapshotRef = db.ref(`echoes/${userId}`).push();
    const echoData = {
      echo,
      timestamp,
      status: "processing",
      chatId,
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
