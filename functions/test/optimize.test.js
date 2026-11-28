// Runs against the Firebase emulators: `npm test` in functions/ (see test/run.js)
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.GEMINI_API_KEY = "x";
const P = ROOT + "/node_modules/";
const admin = require(P + "firebase-admin");
admin.initializeApp({projectId: "demo-coins", storageBucket: "demo-coins.appspot.com", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const express = require(P + "express"); const cookieParser = require(P + "cookie-parser"); const jwt = require(P + "jsonwebtoken");
const assert = require("assert"); const db = admin.database(); console.error = () => {};
// No real task queues in tests: record what gets enqueued
const fns = require(require.resolve("firebase-admin/functions", {paths: [ROOT]}));
const queued = [];
fns.getFunctions = () => ({taskQueue: (name) => ({enqueue: async (d) => queued.push({name, d})})});
const coins = require(ROOT + "/coins/coinService");
(async () => {
  await db.ref().set(null);
  const app = express(); app.set("trust proxy", true); app.use(express.json()); app.use(cookieParser());
  app.use("/api", require(ROOT + "/routes/posts"));
  app.use("/api/echoes", require(ROOT + "/routes/echoes"));
  app.use("/api/user", require(ROOT + "/routes/userOperation"));
  app.use("/api/chats", require(ROOT + "/routes/chats"));
  app.use("/api/coins", require(ROOT + "/routes/coins"));
  const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, body, uid) => {
    const r = await fetch(base + path, {method, headers: {"content-type": "application/json", "x-forwarded-for": `10.3.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, cookie: `__session=s_${uid}`}, body: body ? JSON.stringify(body) : undefined});
    return {status: r.status, body: await r.json().catch(() => null)};
  };
  for (const u of ["A", "B", "C"]) {
    await db.ref(`sessions/s_${u}`).set({userId: u, expiresAt: Date.now() + 1e9});
    await db.ref(`users/${u}/userDetail`).set({publicKey: "pk" + u, chatFlag: true, createdAt: 1});
  }
  const chat = (u) => jwt.sign(u, "test-secret");

  // Wallet: created once with the welcome bonus + ledger entry, then plain reads
  let r = await call("GET", "/coins/wallet", null, "A");
  assert.strictEqual(r.status, 200); const bal = r.body.wallet.balance; assert.ok(bal > 0, "welcome bonus");
  r = await call("GET", "/coins/wallet", null, "A"); assert.strictEqual(r.body.wallet.balance, bal);
  const ledger = (await db.ref("coinLedger/A").get()).val(); assert.strictEqual(Object.keys(ledger).length, 1, "one welcome entry");
  r = await call("GET", "/coins/shop", null, "B"); assert.strictEqual(r.status, 200); assert.ok(Array.isArray(r.body.items));
  assert.ok((await db.ref("coins/B/bonus").get()).val() > 0, "shop creates wallet too");
  console.log("ok wallet: one read, created once");

  // Session cache: valid session served; unknown session refused
  r = await call("GET", "/coins/wallet", null, "nobody"); assert.strictEqual(r.status, 401);
  console.log("ok sessions");

  // Chat: message + preview in one write, receiver with chat off refused
  r = await call("POST", "/chats/send-chat", {chatId: chat("B"), encryptedMsg: "ZW5j", senderPublicKey: "pkA", nounce: "bm9u"}, "A");
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  const conv = (await db.ref("chats/B/A").get()).val();
  assert.strictEqual(conv.senderChatId, chat("A")); assert.strictEqual(conv.encryptedMsg, "ZW5j"); assert.strictEqual(conv.type, "plain/text");
  assert.strictEqual(Object.keys(conv.messages).length, 1);
  r = await call("GET", "/chats/user-chat?chatId=" + encodeURIComponent(chat("A")), null, "B");
  assert.strictEqual(r.body.messages.length, 1); assert.strictEqual(r.body.chatId, chat("A"));
  r = await call("GET", "/chats/my-chats", null, "B"); assert.strictEqual(r.body.length, 1);
  r = await call("POST", "/chats/get-publicKey", {chatId: chat("B")}, "A");
  assert.deepStrictEqual(r.body, {publicKey: "pkB", chatFlag: true, blocked: false});
  await db.ref("users/C/userDetail/chatFlag").set(false);
  r = await call("POST", "/chats/send-chat", {chatId: chat("C"), encryptedMsg: "ZW5j", senderPublicKey: "pkA", nounce: "bm9u"}, "A");
  assert.strictEqual(r.status, 403);
  console.log("ok chat send + chat off");

  // Blocking: B blocks A. Neither can message or send coins; A only sees "unavailable"
  r = await call("POST", "/chats/block", {chatId: chat("B")}, "B"); assert.strictEqual(r.status, 406, "can't block yourself");
  r = await call("POST", "/chats/block", {chatId: "not-a-token"}, "B"); assert.strictEqual(r.status, 400);
  r = await call("POST", "/chats/block", {chatId: chat("A")}, "B"); assert.strictEqual(r.status, 200);
  const msg = {encryptedMsg: "ZW5j", senderPublicKey: "pkA", nounce: "bm9u"};
  r = await call("POST", "/chats/send-chat", {chatId: chat("B"), ...msg}, "A"); assert.strictEqual(r.status, 403, "blocked sender");
  r = await call("POST", "/chats/send-chat", {chatId: chat("A"), ...msg}, "B"); assert.strictEqual(r.status, 403, "blocker can't send either");
  r = await call("POST", "/chats/get-publicKey", {chatId: chat("B")}, "A");
  assert.deepStrictEqual(r.body, {publicKey: "pkB", chatFlag: false, blocked: false});
  r = await call("POST", "/chats/get-publicKey", {chatId: chat("A")}, "B");
  assert.deepStrictEqual(r.body, {publicKey: "pkA", chatFlag: true, blocked: true});
  await assert.rejects(coins.previewTransfer("A", chat("B"), 20), /not accepting coins/);
  await assert.rejects(coins.previewTransfer("B", chat("A"), 20), /not accepting coins/);
  r = await call("GET", "/chats/blocked", null, "B");
  assert.strictEqual(r.body.length, 1); assert.strictEqual(r.body[0].chatId, chat("A")); assert.ok(r.body[0].at > 0);
  r = await call("GET", "/chats/blocked", null, "A"); assert.deepStrictEqual(r.body, []);
  r = await call("DELETE", "/chats/block", {chatId: chat("A")}, "B"); assert.strictEqual(r.status, 200);
  r = await call("POST", "/chats/send-chat", {chatId: chat("B"), ...msg}, "A"); assert.strictEqual(r.status, 200, "unblocked");
  r = await call("GET", "/chats/blocked", null, "B"); assert.deepStrictEqual(r.body, []);
  console.log("ok block + unblock");

  // Receipts: one record per chat, written once per new message
  const chatQ = (u) => "/chats/user-chat?chatId=" + encodeURIComponent(chat(u));
  await db.ref().update({"chats/A/B": null, "chats/B/A": null, "receipts": null});
  r = await call("POST", "/chats/send-chat", {chatId: chat("B"), ...msg}, "A");
  const sentAt = r.body.timestamp; assert.ok(sentAt > 0, "send returns server time");
  r = await call("GET", chatQ("B"), null, "A"); assert.deepStrictEqual(r.body.receipt, {d: 0, r: 0}, "not delivered yet");
  await call("GET", "/chats/my-chats", null, "B");
  r = await call("GET", chatQ("B"), null, "A"); assert.deepStrictEqual(r.body.receipt, {d: sentAt, r: 0}, "delivered by chat list");
  r = await call("GET", chatQ("A"), null, "B"); assert.strictEqual(r.body.messages.length, 1);
  r = await call("GET", chatQ("B"), null, "A"); assert.deepStrictEqual(r.body.receipt, {d: sentAt, r: sentAt}, "read by opening");
  await db.ref("receipts/A/B").set({d: 1, r: 1});
  await call("GET", "/chats/my-chats", null, "B"); await call("GET", chatQ("A"), null, "B");
  assert.deepStrictEqual((await db.ref("receipts/A/B").get()).val(), {d: 1, r: 1}, "no write without a new message");
  // B turns read receipts off: A still sees delivered, never read; B can't see A's reads either
  r = await call("POST", "/user/readReceipts", {readReceipts: "no"}, "B"); assert.strictEqual(r.status, 400);
  r = await call("POST", "/user/readReceipts", {readReceipts: false}, "B"); assert.strictEqual(r.status, 200);
  r = await call("POST", "/chats/send-chat", {chatId: chat("B"), ...msg}, "A"); const sentAt2 = r.body.timestamp;
  await call("GET", chatQ("A"), null, "B");
  assert.deepStrictEqual((await db.ref("receipts/A/B").get()).val(), {d: sentAt2, r: 1}, "read not shared");
  await db.ref("receipts/B/A").set({d: 5, r: 5});
  r = await call("GET", chatQ("A"), null, "B"); assert.deepStrictEqual(r.body.receipt, {d: 5, r: 0}, "theirs hidden too");
  r = await call("POST", "/user/readReceipts", {readReceipts: true}, "B");
  assert.strictEqual((await db.ref("users/B/userDetail/readReceiptsOff").get()).val(), null);
  console.log("ok receipts");

  // Vibes: counted with a server increment, once per user
  await db.ref("posts/p1").set({chatId: chat("A"), timestamp: 5, content: "hi"});
  r = await call("PUT", "/vibes/p1", {}, "B"); assert.strictEqual(r.status, 200);
  r = await call("PUT", "/vibes/p1", {}, "C"); assert.strictEqual(r.status, 200);
  r = await call("PUT", "/vibes/p1", {}, "B"); assert.strictEqual(r.status, 403);
  r = await call("GET", "/vibes/p1"); assert.strictEqual(r.body.count, 2);
  assert.ok(queued.some((q) => q.d.type === "vibe" && q.d.userId === "A"), "owner notified");
  console.log("ok vibes count 2");

  // Echo feed: old echoes backfilled once; new echoes written to both places; own echoes skipped
  await db.ref("echoes/A/old1").set({echo: "old dream about a dog", timestamp: 10, chatId: chat("A"), status: "completed"});
  await db.ref("echoes/B/old2").set({echo: "old dream about a wolf", timestamp: 11, chatId: chat("B"), status: "completed"});
  r = await call("POST", "/echoes/submitEcho", {echo: "being chased by a dog"}, "C");
  assert.strictEqual(r.status, 200);
  const job = queued.find((q) => q.name === "matchEchoes"); assert.ok(job);
  const feedEntry = (await db.ref(`echoFeed/${job.d.echoId}`).get()).val();
  assert.strictEqual(feedEntry.uid, "C"); assert.strictEqual((await db.ref(`echoes/C/${job.d.echoId}/status`).get()).val(), "processing");

  // Run the matching task with Gemini stubbed
  const gp = require(ROOT + "/dataProcessing/geminiProcessing");
  let seen = null;
  gp.findEchoMatches = async (echo, cands) => { seen = cands; return cands.map((c) => ({...c, similarityScore: 80})); };
  delete require.cache[require.resolve(ROOT + "/bgTasks/cloudTasks")];
  const tasks = require(ROOT + "/bgTasks/cloudTasks");
  await tasks.matchEchoes.run({data: job.d});
  assert.deepStrictEqual(seen.map((c) => c.echoId).sort(), ["old1", "old2"], "others' echoes only, backfilled");
  assert.strictEqual((await db.ref("echoFeedMeta/ready").get()).val(), true);
  assert.strictEqual((await db.ref(`echoes/C/${job.d.echoId}/status`).get()).val(), "completed");
  assert.strictEqual((await db.ref(`echoMatches/C/${job.d.echoId}/matches`).get()).val().length, 2);
  r = await call("GET", "/echoes/" + job.d.echoId, null, "C"); assert.strictEqual(r.body.status, "completed");
  r = await call("GET", "/echoes", null, "C"); assert.strictEqual(r.body.echoesData.length, 1);
  r = await call("GET", "/echoes/echo/a%2Fb", null, "C"); assert.strictEqual(r.status, 400);
  console.log("ok echo feed + matching");

  // Echo matches can be reported: owner comes from echoFeed
  r = await call("POST", "/report", {postId: "old2", postOwnerChatId: chat("C"), reason: "spam spam"}, "C");
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual((await db.ref("reports/echoes/old2/C/userUniqueId").get()).val(), "B", "echo report goes to the echo's owner");
  r = await call("POST", "/report", {postId: "p1", postOwnerChatId: chat("C"), reason: "spam spam"}, "B");
  assert.strictEqual((await db.ref("reports/posts/p1/B/userUniqueId").get()).val(), "A");
  r = await call("POST", "/report", {postId: "ghost", postOwnerChatId: chat("C"), reason: "spam spam"}, "B");
  assert.strictEqual(r.status, 404);
  // Echo from before echoFeed: owner taken from the form, but only if it really owns that echo
  await db.ref("echoes/B/legacy1").set({echo: "old one", timestamp: 3, chatId: chat("B")});
  r = await call("POST", "/report", {postId: "legacy1", postOwnerChatId: chat("A"), reason: "spam spam"}, "C");
  assert.strictEqual(r.status, 404, "can't blame someone who doesn't own it");
  r = await call("POST", "/report", {postId: "legacy1", postOwnerChatId: "garbage", reason: "spam spam"}, "C");
  assert.strictEqual(r.status, 404);
  r = await call("POST", "/report", {postId: "legacy1", postOwnerChatId: chat("B"), reason: "spam spam"}, "C");
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual((await db.ref("reports/echoes/legacy1/C/userUniqueId").get()).val(), "B");
  console.log("ok reports for posts and echoes (incl. old echoes)");

  // Vibe check task: owner comes from the post, not the request
  queued.length = 0;
  await tasks.postVibeCheck.run({data: {postId: "p1", actorId: "B", postVibe: "funny", userChatId: chat("C")}});
  await tasks.postVibeCheck.run({data: {postId: "p1", actorId: "B", postVibe: "funny", userChatId: chat("C")}});
  assert.strictEqual((await db.ref("posts/p1/vibeCheck/funny").get()).val(), 1, "counted once");
  assert.strictEqual(queued.length, 1); assert.strictEqual(queued[0].d.userId, "A", "real owner notified");
  console.log("ok vibe check task");

  // Account deletion clears feed entries and post vibe data
  await db.ref("users/A/posts/p1").set({timestamp: 5});
  await tasks.deleteUserData.run({data: {userId: "A", sessionId: "s_A"}});
  assert.ok(!(await db.ref("echoFeed/old1").get()).exists()); assert.ok((await db.ref("echoFeed/old2").get()).exists());
  assert.ok(!(await db.ref("vibes/p1").get()).exists()); assert.ok(!(await db.ref("posts/p1").get()).exists());
  console.log("ok delete account cleans up");
  console.log("ALL PASSED"); server.close(); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
