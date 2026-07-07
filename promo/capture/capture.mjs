// Record the NOMAD trailer: headless Chrome plays the page, CDP screencast
// streams paint-timed JPEG frames, and we keep every frame's timestamp so
// ffmpeg can rebuild real time exactly (variable frame rate, no guessing).
import puppeteer from "puppeteer-core";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const FRAMES = join(here, "frames");
const PAGE = "file://" + join(here, "..", process.argv[2] || "nomad-cut.html");
mkdirSync(FRAMES, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: [
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    "--autoplay-policy=no-user-gesture-required", // the page keeps its sound log without a click
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });

const cdp = await page.createCDPSession();
const meta = []; // { file, ts } in CDP monotonic seconds
let n = 0;
cdp.on("Page.screencastFrame", async (ev) => {
  const file = `f${String(n++).padStart(6, "0")}.jpg`;
  writeFileSync(join(FRAMES, file), Buffer.from(ev.data, "base64"));
  meta.push({ file, ts: ev.metadata.timestamp });
  try { await cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }); } catch {}
});

await cdp.send("Page.startScreencast", {
  format: "jpeg",
  quality: 88,
  maxWidth: 1920,
  maxHeight: 1080,
});

await page.goto(PAGE, { waitUntil: "load" });
console.log("playing…");

// The hint fades in only when the end card has finished holding — that is
// the trailer's last beat, right before it loops. Stop there.
await page.waitForFunction(
  () => document.getElementById("hint")?.classList.contains("show"),
  { timeout: 120_000, polling: 250 },
);
await new Promise((r) => setTimeout(r, 1200)); // let the hint land on screen

await cdp.send("Page.stopScreencast");
await new Promise((r) => setTimeout(r, 500)); // drain in-flight frames
writeFileSync(join(here, "frames.json"), JSON.stringify(meta));

// Re-render the page's logged sounds offline, shifted so audio time zero is
// the first captured frame (frame timestamps and Date.now() share the epoch).
const dur = meta.at(-1).ts - meta[0].ts + 1.5;
const offset = (await page.evaluate(() => window.__take.t0)) / 1000 - meta[0].ts;
const wavB64 = await page.evaluate((d, o) => window.__renderAudio(d, o), dur, offset);
writeFileSync(join(here, "audio.wav"), Buffer.from(wavB64, "base64"));

await browser.close();
console.log(`captured ${meta.length} frames over ${dur.toFixed(1)}s, audio offset ${offset.toFixed(3)}s`);
