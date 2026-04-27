// // Handling the get request
// app.get("/get-posts", async (req, res) => {
//   const endAt = req.query.endAt ? Number(req.query.endAt) : Date.now();
//   const limit = req.query.limit ? Number(req.query.limit) : defaulLimit;

//   try {
//     const ref = db.ref("posts");
//     const snapshot = await ref
//         .orderByChild("timestamp")
//         .endAt(endAt)
//         .limitToLast(limit)
//         .once("value");

//     const raw = snapshot.val();
//     if (!raw) return res.status(200).send(null);

//     const posts = Object.entries(raw)
//         .map(([id, data]) => ({id, title: data.title, content: data.content,
//           timestamp: data.timestamp}))
//         .sort((a, b) => b.timestamp - a.timestamp);

//     return res.status(200).send(posts);
//   } catch (error) {
//     console.error("Error fetching posts:", error);
//     return res.status(500).send("Internal server error");
//   }
// });

// // Generate User Unique ID
// app.get("/generate-user-id", (req, res) => {
//   const ip = req.headers["x-forwarded-for"] ||
//     req.socket.remoteAddress ||
//     "0.0.0.0";
//   const userAgent = req.headers["user-agent"] || "unknown";
//   const rawId = `${ip}_${userAgent}`;
//   const uniqueId = crypto.createHash("sha256")
//       .update(rawId).digest("hex").slice(0, 16);
//   res.json({uniqueId});
// });

// // Get post by id
// app.get("/get-post-by-id", async (req, res) => {
//   const postId = req.query.postId;
//   if (!postId) {
//     return res.status(400).send("Missing Post Id!");
//   }

//   try {
//     const snapshot = await db.ref(`posts/${postId}`).once("value");
//     const post = snapshot.val();
//     if (!post) {
//       return res.status(404).send(null);
//     }
//     return res.status(200).send(post);
//   } catch (err) {
//     console.error("Error fetching post by ID:", err);
//     return res.status(500).send("Internal Server Error.");
//   }
// });

// // Handling the post request
// app.post("/submit-post", async (req, res) => {
//   try {
//     const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//     const safeIp = ip.replace(/[^a-zA-Z0-9]/g, "_");
//     const ipRef = db.ref(`rateLimit/${safeIp}`);

//     const snapshot = await ipRef.once("value");
//     const lastPostTime = snapshot.val();

//     if (lastPostTime && Date.now() - lastPostTime < 10 * 1000) {
//       return res.status(429).send("Too many requests. Slow down.");
//     }

//     const {title, content, userUniqueId} = req.body;

//     if (!title || !content) {
//       return res.status(400).send("Missing title and content");
//     }

//     if (!userUniqueId) {
//       return res.status(400).send("Missing User ID.");
//     }

//     // Restrict title word count
//     const titleCount = title.trim().length;
//     const contentCount = content.trim().length;

//     if (titleCount > 50) {
//       return res.status(400).send("Title must be 50 characters or fewer.");
//     }

//     if (contentCount > 2000) {
//       return res.status(400).send("Content must be 2000 characters or fewer.");
//     }

//     const postData = {
//       title,
//       content,
//       userUniqueId,
//       timestamp: Date.now(),
//     };

//     const newPostRef = await db.ref("posts").push(postData);
//     const postId = newPostRef.key;
//     await ipRef.set(Date.now());
//     return res.status(200).send({postId});
//   } catch (error) {
//     console.error("Submit Error:", error);
//     return res.status(500).send("Internal Server Error.");
//   }
// });

// // Simple relate post function
// app.post("/relate-post", async (req, res) => {
//   try {
//     const {postId} = req.body;
//     if (!postId) {
//       return res.status(400).send("Missing postId");
//     }
//     const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//     const safeIp = ip.replace(/[^a-zA-Z0-9]/g, "_");

//     const userRef = db.ref(`relatable/${postId}/ips/${safeIp}`);
//     const userSnapshot = await userRef.once("value");

//     if (userSnapshot.exists()) {
//       return res.status(403).send("You already marked this as relatable.");
//     }

//     // Increment relatable count
//     const countRef = db.ref(`relatable/${postId}/count`);
//     await userRef.set(true);
//     await countRef.transaction((current) => (current || 0) + 1);

//     return res.status(200).send("Marked as relatable");
//   } catch (err) {
//     return res.status(500).send("Internal Server Error.");
//   }
// });

// // Getting relatable count
// app.get("/relatable-count", async (req, res) => {
//   const postId = req.query.postId;
//   if (!postId) {
//     return res.status(400).send("Missing postId");
//   }

//   try {
//     const countRef = db.ref(`relatable/${postId}/count`);
//     const snapshot = await countRef.once("value");
//     const count = snapshot.val() || 0;
//     return res.status(200).send({count});
//   } catch (error) {
//     return res.status(500).send("Internal Server Error");
//   }
// });