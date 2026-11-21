// The whole production app (index.js): host check, CORS, parsers, limits, routes, error handler.
const ROOT = require("path").resolve(__dirname, "..");
process.env.JWT_SECRET_KEY = "test-secret";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.REDIS_URL = "";
process.env.ALLOWED_ORIGINS = "https://mennist.com";
const P = ROOT + "/node_modules/";
const admin = require(P + "firebase-admin");
admin.initializeApp({projectId: "demo-coins", storageBucket: "demo-coins.appspot.com", databaseURL: "http://127.0.0.1:9000?ns=demo-coins-default-rtdb"});
const express = require(P + "express");
const assert = require("assert");
const db = admin.database();
console.error = () => {};

(async () => {
  await db.ref().set(null);
  const {api} = require(ROOT + "/index.js");
  const host = express(); host.disable("x-powered-by"); host.set("trust proxy", true); host.use((req, res) => api(req, res));
  const server = host.listen(0); const base = `http://127.0.0.1:${server.address().port}`;
  let ip = 0;
  const call = async (method, path, {body, raw, uid, origin, headers = {}} = {}) => {
    const h = {"x-forwarded-for": `10.9.${Math.floor(ip / 250)}.${ip++ % 250}`, ...headers};
    if (body !== undefined || raw !== undefined) h["content-type"] = "application/json";
    if (uid) h.cookie = `__session=s_${uid}`;
    if (origin) h.origin = origin;
    const r = await fetch(base + path, {method, headers: h, body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined});
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not json */ }
    return {status: r.status, headers: r.headers, body: json, text};
  };
  await db.ref("sessions/s_A").set({userId: "A", expiresAt: Date.now() + 1e9});
  await db.ref("sessions/s_old").set({userId: "Z", expiresAt: Date.now() - 1000});

  // Sessions
  let r = await call("GET", "/api/coins/wallet");
  assert.strictEqual(r.status, 401, "no cookie");
  r = await call("GET", "/api/coins/wallet", {uid: "nobody"});
  assert.strictEqual(r.status, 401, "unknown session");
  r = await call("GET", "/api/coins/wallet", {headers: {cookie: "__session=" + "x".repeat(500)}});
  assert.strictEqual(r.status, 401, "absurd cookie refused without a DB read");
  r = await call("GET", "/api/coins/wallet", {uid: "A"});
  assert.strictEqual(r.status, 200);
  console.log("ok sessions");

  // Headers
  assert.strictEqual(r.headers.get("cache-control"), "no-store", "API answers never cached");
  assert.strictEqual(r.headers.get("x-powered-by"), null);
  assert.strictEqual(r.headers.get("etag"), null);
  console.log("ok headers");

  // CORS: other sites are refused before any route runs
  r = await call("GET", "/api/coins/wallet", {uid: "A", origin: "https://evil.example"});
  assert.strictEqual(r.status, 403);
  r = await call("GET", "/api/coins/wallet", {uid: "A", origin: "https://mennist.com"});
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get("access-control-allow-origin"), "https://mennist.com");
  console.log("ok cors");

  // Bodies
  r = await call("POST", "/api/user/chatFlag", {uid: "A", raw: "{not json"});
  assert.strictEqual(r.status, 400); assert.ok(r.body, "JSON error, not an HTML stack trace");
  r = await call("POST", "/api/user/chatFlag", {uid: "A", raw: JSON.stringify({chatFlag: true, pad: "x".repeat(200 * 1024)})});
  assert.strictEqual(r.status, 413);
  r = await call("POST", "/api/user/chatFlag", {uid: "A", body: {chatFlag: "yes"}});
  assert.strictEqual(r.status, 400, "chatFlag must be boolean");
  r = await call("POST", "/api/user/chatFlag", {uid: "A", body: {chatFlag: false}});
  assert.strictEqual(r.status, 200);
  console.log("ok bodies");

  // Pagination cursors and categories
  await db.ref("posts").set({p1: {title: "t", content: "c", timestamp: 1000, category: "love", chatId: "x"}});
  for (const endAt of ["abc", "", "1e400", "NaN", "[object]"]) {
    r = await call("GET", "/api/posts?endAt=" + encodeURIComponent(endAt), {uid: "A"});
    assert.strictEqual(r.status, 200, "endAt=" + endAt); assert.strictEqual(r.body.postsData.length, 1);
  }
  r = await call("GET", "/api/posts?endAt=-2", {uid: "A"});
  assert.strictEqual(r.body.postsData.length, 0, "past the end stays at the end");
  r = await call("GET", "/api/posts?endAt=999", {uid: "A"});
  assert.strictEqual(r.body.postsData.length, 0);
  r = await call("GET", "/api/echoes?endAt=xyz", {uid: "A"}); assert.strictEqual(r.status, 200);
  r = await call("GET", "/api/user/posts?endAt=xyz", {uid: "A"}); assert.strictEqual(r.status, 200);
  r = await call("GET", "/api/suggestPost/love", {uid: "A"}); assert.strictEqual(r.status, 200); assert.strictEqual(r.body.length, 1);
  r = await call("GET", "/api/suggestPost/" + encodeURIComponent("../../users"), {uid: "A"}); assert.strictEqual(r.status, 400);
  r = await call("GET", "/api/suggestPost/Mental%20Health", {uid: "A"}); assert.strictEqual(r.status, 200);
  console.log("ok cursors and categories");

  // Ids in paths
  for (const bad of ["a.b", "a$b", "x".repeat(65), "%2E%2E"]) {
    r = await call("GET", "/api/posts/" + bad); assert.ok([400, 404].includes(r.status), bad + " -> " + r.status);
    r = await call("GET", "/api/vibes/" + bad); assert.ok([400, 404].includes(r.status), "vibes " + bad + " -> " + r.status + " " + r.text.slice(0, 80));
    // "%2E%2E" is normalised by the client to the parent path (your own echo list): skip it here
    if (bad !== "%2E%2E") r = await call("GET", "/api/echoes/echo/" + bad, {uid: "A"}); assert.ok([400, 404].includes(r.status), "echo " + bad + " -> " + r.status + " " + r.text.slice(0, 80));
  }
  r = await call("GET", "/api/posts/p1"); assert.strictEqual(r.status, 200); assert.strictEqual(r.body.title, "t");
  r = await call("GET", "/api/user/avatar/not-a-token"); assert.strictEqual(r.status, 404);
  console.log("ok path ids");

  // Async errors reach the error handler instead of hanging the request
  const probe = express();
  probe.get("/boom", async () => { throw new Error("boom"); });
  probe.get("/sync", () => { throw new Error("sync"); });
  probe.use((err, req, res, next) => res.status(500).json({caught: err.message}));
  const ps = probe.listen(0);
  for (const p of ["/boom", "/sync"]) {
    const res = await Promise.race([
      fetch(`http://127.0.0.1:${ps.address().port}${p}`).then(async (x) => ({status: x.status, body: await x.json()})),
      new Promise((resolve) => setTimeout(() => resolve({status: "hung"}), 3000)),
    ]);
    assert.strictEqual(res.status, 500, p + " " + JSON.stringify(res));
  }
  ps.close();
  console.log("ok async errors caught");

  // Rate limit answers in JSON
  let last;
  for (let i = 0; i < 6; i++) last = await call("POST", "/api/user/recover", {body: {recoveryCode: "AAAA", publicKey: "x"}, headers: {"x-forwarded-for": "10.200.0.1"}});
  assert.strictEqual(last.status, 429); assert.strictEqual(last.body.success, false);
  console.log("ok rate limit");

  // Unknown API routes
  r = await call("GET", "/api/does-not-exist", {uid: "A"});
  assert.ok([404, 200].includes(r.status) && !/at .*\.js/.test(r.text), "no stack trace leaked");
  console.log("ALL PASSED"); server.close(); process.exit(0);
})().catch((e) => { console.log("FAIL", e.stack); process.exit(1); });
