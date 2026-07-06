import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const DIR = dirname(fileURLToPath(import.meta.url)); // output next to this script
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 780, deviceScaleFactor: 2 });
await page.goto("https://nomadmud.com/", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise(r => setTimeout(r, 3500)); // connect + welcome + room
async function cmd(c, wait) {
  await page.type("#cmd", c);
  await page.keyboard.press("Enter");
  await new Promise(r => setTimeout(r, wait));
}
await cmd("attack rat", 9000);   // a few combat rounds
await cmd("inventory", 1200);
await cmd("go north", 1500);
await page.screenshot({ path: DIR + "/colorcheck.png" });
await browser.close();
console.log("shot taken");
