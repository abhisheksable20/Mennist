// Runs every *.test.js one after another against the emulators.
//   npm test   (starts the database + storage emulators, runs this, stops them)
// Each suite is its own process, so in-memory caches never leak between suites.
const {spawnSync} = require("child_process");
const fs = require("fs");
const path = require("path");

const only = process.argv[2];
const files = fs.readdirSync(__dirname).filter((f) => f.endsWith(".test.js") && (!only || f.includes(only))).sort();
const env = {
  ...process.env,
  REDIS_URL: "", // never touch the real rate-limit Redis from tests
  GEMINI_API_KEY: "test",
  FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST || "127.0.0.1:9199",
};

let failed = 0;
for (const file of files) {
  const started = Date.now();
  const run = spawnSync(process.execPath, [path.join(__dirname, file)], {env, encoding: "utf8", timeout: 180000});
  const out = `${run.stdout || ""}${run.stderr || ""}`;
  const ok = run.status === 0 && /ALL PASSED/.test(out);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${ok ? "PASS" : "FAIL"}  ${file.padEnd(24)} ${secs}s`);
  if (!ok) {
    failed++;
    console.log(out.split("\n").filter((l) => !/REDIS_URL|Gemini API|injected env/.test(l)).slice(-25).join("\n"));
  }
}
console.log(failed ? `\n${failed} of ${files.length} suites failed` : `\nAll ${files.length} suites passed`);
process.exit(failed ? 1 : 0);
