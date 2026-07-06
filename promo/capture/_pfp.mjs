import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const DIR = dirname(fileURLToPath(import.meta.url)); // source html + output live next to this script
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
await page.goto("file://" + DIR + "/pfp.html");
await page.waitForFunction("window.__done === true", { timeout: 10000 });
const el = await page.$("#c");
await el.screenshot({ path: DIR + "/pfp.png" });
await browser.close();
console.log("wrote pfp.png");
