// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
process.env.FUNCTIONS_EMULATOR = "true";
const P = ROOT + "/node_modules/";
const admin = require(P + "firebase-admin");
admin.initializeApp({projectId: "demo-coins", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const express = require(P + "express"); const cookieParser = require(P + "cookie-parser"); const jwt = require(P + "jsonwebtoken");
const assert = require("assert"); const db = admin.database(); console.error = () => {}; console.log2 = console.log;
(async () => {
  await db.ref().set(null);
  const app = express(); app.set("trust proxy", true); app.use(express.json()); app.use(cookieParser());
  app.use("/api", require(ROOT + "/routes/posts"));
  app.use("/api/user", require(ROOT + "/routes/userOperation"));
  app.use("/api/actions", require(ROOT + "/routes/postTracking"));
  const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, body, uid) => {
    const r = await fetch(base + path, {method, headers: {"content-type": "application/json", "x-forwarded-for": `10.2.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, cookie: `__session=s_${uid}`}, body: body ? JSON.stringify(body) : undefined});
    return {status: r.status, body: await r.json().catch(() => null)};
  };
  for (const u of ["A", "B"]) await db.ref(`sessions/s_${u}`).set({userId: u, expiresAt: Date.now() + 1e9});
  const chatA = jwt.sign("A", "test-secret"), chatB = jwt.sign("B", "test-secret");
  await db.ref("posts/p1").set({chatId: chatA, timestamp: 1, content: "hello world post"});
  await db.ref("users/A/posts/p1").set({timestamp: 1, content: "hello"});
  await db.ref("vibes/p1").set({count: 1, userId: {B: true}});

  let r = await call("DELETE", "/user/posts/p1", null, "B");
  assert.strictEqual(r.status, 404); assert.ok((await db.ref("posts/p1").get()).exists(), "B could not delete A's post");
  r = await call("DELETE", "/user/posts/p1%2Fcontent", null, "B"); assert.strictEqual(r.status, 400);
  console.log("ok other users can't delete your post");

  r = await call("POST", "/actions/postAction", {postId: "p1/content", action: "viewed"}, "B"); assert.strictEqual(r.status, 400);
  r = await call("POST", "/actions/postAction", {postId: "nope", action: "viewed"}, "B"); assert.strictEqual(r.status, 404);
  assert.ok(!(await db.ref("posts/nope").get()).exists(), "no junk post created");
  r = await call("POST", "/actions/postAction", {postId: "p1", action: Object.keys(require(ROOT + "/routes/postTracking").stack ? {} : {})[0] || "viewed"}, "B");
  console.log("ok post actions validated (valid action status " + r.status + ")");

  r = await call("PUT", "/vibes/nope", {chatId: chatB}, "B"); assert.strictEqual(r.status, 404);
  r = await call("PUT", "/vibes/a%2Fb", {chatId: chatB}, "B"); assert.strictEqual(r.status, 400);
  console.log("ok vibes need a real post");

  r = await call("POST", "/report", {postId: "p1", postOwnerChatId: chatB, reason: "spam spam"}, "B");
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await db.ref("reports/posts/p1/B/userUniqueId").get()).val(), "A", "report goes to the real owner");
  r = await call("POST", "/report", {postId: "x/y", postOwnerChatId: chatB, reason: "spam spam"}, "B"); assert.strictEqual(r.status, 400);
  r = await call("POST", "/report", {postId: "nope", postOwnerChatId: chatB, reason: "spam spam"}, "B"); assert.strictEqual(r.status, 404);
  console.log("ok reports use the real owner");

  r = await call("DELETE", "/user/posts/p1", null, "A"); assert.strictEqual(r.status, 200);
  assert.ok(!(await db.ref("posts/p1").get()).exists());
  assert.ok(!(await db.ref("users/A/posts/p1").get()).exists(), "profile copy removed");
  assert.ok(!(await db.ref("vibes/p1").get()).exists(), "vibe data removed");
  console.log("ok owner can delete"); console.log("ALL PASSED"); server.close(); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
