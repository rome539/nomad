import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
// Self-contained: art source (assets.html) and the rendered outputs both live
// next to this script, so it regenerates in any checkout. The base64 in
// game-server/src/assets.ts is then updated from the og.jpg / apple-touch-icon.png here.
const DIR = dirname(fileURLToPath(import.meta.url));
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1300, height: 900, deviceScaleFactor: 1 });
await page.goto("file://" + DIR + "/assets.html");
await page.waitForFunction("window.__done === true", { timeout: 10000 });
await (await page.$("#touch")).screenshot({ path: DIR + "/apple-touch-icon.png" });
await (await page.$("#og")).screenshot({ path: DIR + "/og.jpg", type: "jpeg", quality: 88 });
await browser.close();
console.log("rendered");
