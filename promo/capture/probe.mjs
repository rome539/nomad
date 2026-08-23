// Proof pass for a trailer page: load it, watch for console errors and page
// exceptions, and grab a still at each named beat so the composition can be
// checked without sitting through a capture + assemble cycle.
//
//   node probe.mjs ../nomad-mountain.html            long cut
//   node probe.mjs "../nomad-mountain.html?cut=short"  short cut
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const rel = process.argv[2] || "../nomad-mountain.html";
const [file, query] = rel.split("?");
const PAGE = "file://" + join(here, file) + (query ? "?" + query : "");
const OUT = join(here, "probe");
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--force-device-scale-factor=1", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });

const problems = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

await page.goto(PAGE, { waitUntil: "load" });
const T = await page.evaluate(() => window.__T || null);

// Beats to sample. Times come from the page itself when it exposes them, so
// this never drifts from the trailer's own clock.
const beats = T
  ? Object.entries(T).filter(([k, v]) => v >= 0 && k !== "END").map(([k, v]) => [k, v + 1.2])
  : [["a", 3], ["b", 9], ["c", 15], ["d", 24], ["e", 33], ["f", 42], ["g", 50], ["h", 57], ["i", 63], ["j", 68], ["k", 73]];

const start = Date.now();
for (const [name, at] of beats.sort((a, b) => a[1] - b[1])) {
  const waitMs = at * 1000 - (Date.now() - start);
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  const f = join(OUT, `${String(Math.round(at)).padStart(3, "0")}-${name}.jpg`);
  await page.screenshot({ path: f, type: "jpeg", quality: 82 });
  console.log(`  ${String(at.toFixed(1)).padStart(5)}s  ${name}`);
}

// The end signal the real capture waits on — if this never lands, a capture
// would hang for two minutes and then fail.
const ended = await page
  .waitForFunction(() => document.getElementById("hint")?.classList.contains("show"), { timeout: 30_000, polling: 200 })
  .then(() => true)
  .catch(() => false);

// The audio track has to render too, or the mp4 has no sound and nobody finds
// out until assemble.
let audio = "not attempted";
try {
  const b64 = await page.evaluate(() => window.__renderAudio(6, 0));
  audio = `${Math.round((b64.length * 3) / 4 / 1024)} KB of wav`;
} catch (e) { audio = `FAILED: ${e.message}`; }

await browser.close();
console.log(`\nend signal (#hint): ${ended ? "reached" : "NEVER REACHED — capture would hang"}`);
console.log(`audio render:       ${audio}`);
console.log(`console problems:   ${problems.length ? "\n  " + problems.join("\n  ") : "none"}`);
console.log(`stills in:          ${OUT}`);
