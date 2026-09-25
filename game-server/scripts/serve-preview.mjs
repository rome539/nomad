// SERVE THE MOB PREVIEW, AND NEVER SERVE A STALE ONE.
//
//   node scripts/serve-preview.mjs [port]        # default 8790
//   then open http://127.0.0.1:8790/mobs.html
//
// WHY THIS EXISTS. The preview is a BUILT page: build-mob-preview.mjs lifts the
// tables and the driver out of public.ts and writes preview/mobs.html. Served by
// a plain static server, that file is a photograph of the client as it was the
// last time somebody remembered to run the builder — so a table edited in
// public.ts is simply not in the page, and the page gives no sign of it. Five
// room plates were wired up and none of them appeared, and nothing was wrong
// except that the html was older than the source.
//
// A page you have to remember to rebuild is a page that lies to you, and the
// preview's whole job is to not lie: its header says it CANNOT show an animation
// the game does not have, and this is the other half of that promise — it cannot
// fail to show one the game DOES have.
//
// SO THE SERVER REBUILDS. Every request for the page compares the mtime of the
// built html against public.ts and the builder itself, and re-runs the builder
// if either is newer. Nothing to remember, nothing to watch, and a reload is the
// whole interface: change a table, hit refresh, see it.
//
// TWO THINGS GO STALE, NOT ONE. The file is the obvious one; the browser cache
// is the one that wastes an afternoon, because a rebuilt page that the browser
// declines to re-fetch looks exactly like a builder that did not run. So the
// html goes out no-store. The art does not — plates are large, they are reached
// through symlinks into public/, and they change name when they change.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, "..");
const argv = process.argv.slice(2);
// SERVING A STAGED BUILD IS A DIFFERENT JOB FROM SERVING THE WORKING PREVIEW.
//
//   node scripts/serve-preview.mjs                       the working preview, rebuilt on demand
//   node scripts/serve-preview.mjs nsite 8791 --static   a staged tree, exactly as published
//
// --static is the whole point of the second form: it does NOT rebuild and does
// NOT reach into public/, so what you are looking at is the bytes that would be
// hashed and uploaded, and nothing else. A test that quietly regenerated the
// page from source would be testing the source, which is the one thing already
// known to be fine.
const isStatic = argv.includes("--static");
const rest = argv.filter((a) => !a.startsWith("--"));
const dirArg = rest.find((a) => !/^\d+$/.test(a));
const DIR = dirArg ? path.resolve(GAME, dirArg) : path.join(GAME, "preview");
// A gateway serves the root, so a staged tree is entered through index.html.
const ENTRY = isStatic ? "index.html" : "mobs.html";
const PAGE = path.join(DIR, ENTRY);
const BUILDER = path.join(HERE, "build-mob-preview.mjs");
const SOURCES = [path.join(GAME, "src/public.ts"), BUILDER];
const port = Number(rest.find((a) => /^\d+$/.test(a)) ?? 8790);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
};

const mtime = (f) => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } };

// Rebuild only when something it is built FROM has moved. A rebuild on every
// request would work and would also put a second of lag on every reload of a
// page whose point is to be flicked back and forth.
function fresh() {
  const built = mtime(PAGE);
  if (built && SOURCES.every((s) => mtime(s) <= built)) return null;
  try {
    execFileSync(process.execPath, [BUILDER, DIR], { stdio: "pipe" });
    console.log("  rebuilt preview/mobs.html");
    return null;
  } catch (e) {
    // Report the failure INTO THE PAGE. A builder that throws used to leave the
    // last good html on disk, which the server would then serve happily — the
    // exact stale-page failure this file exists to remove, wearing a disguise.
    return (e.stderr?.toString() || e.message || "build failed");
  }
}

// ---- /game: THE GAME'S OWN RENDERER, NOT A COPY OF IT --------------------------
//
// mobs.html is a workbench: it lifts the tables out of public.ts and draws with
// its own stage, which is why it can show every pose on demand - and also why it
// is never quite what a player sees. Scene fitting, mob scale, how a row of
// creatures is dealt out, the prose strip over the bottom of the picture: the
// game does all of that itself, and a copy drifts.
//
// /game serves the REAL client page and drives it with scripts/game-panel.js,
// injected inside the page's own module script (its functions are not on
// window). Two sources, one switch:
//
//   /game?src=prod    the page exactly as nomadmud.com serves it right now, and
//                     every picture fetched from nomadmud.com - what is LIVE
//   /game?src=local   the page built from src/public.ts and pictures from
//                     public/ - what the next ship will make live
//
// Which source a picture comes from is read off the page that asked for it (the
// Referer), so the workbench at mobs.html keeps drawing from public/ however
// many times /game?src=prod has been opened beside it.
const PROD = "https://nomadmud.com";
const sourceOf = (req) => {
  const ref = req.headers.referer || "";
  if (ref.indexOf("/game") < 0) return "workbench";
  return /[?&]src=local\b/.test(ref) ? "local" : "prod";
};
let prodPage = { at: 0, html: "" };
let localPage = { mtime: -1, html: "" };
const PANEL = path.join(HERE, "game-panel.js");

async function gameHtml(src) {
  let html;
  if (src === "prod") {
    // Thirty seconds of cache: long enough to flick PROD/LOCAL back and forth,
    // short enough that a ship shows up on the next reload.
    if (Date.now() - prodPage.at > 30000) {
      const r = await fetch(PROD + "/", { headers: { "cache-control": "no-cache" } });
      prodPage = { at: Date.now(), html: await r.text() };
    }
    html = prodPage.html;
  } else if (localPage.mtime === mtime(path.join(GAME, "src/public.ts"))) {
    html = localPage.html;
  } else {
    const { transform } = await import("esbuild");
    const { code } = await transform(fs.readFileSync(path.join(GAME, "src/public.ts"), "utf8"), { loader: "ts", format: "esm" });
    const { PAGE } = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64") + "#" + Date.now());
    html = PAGE;
    localPage = { mtime: mtime(path.join(GAME, "src/public.ts")), html: PAGE };
  }
  // No Google sign-in script and nothing else that reaches out on load.
  html = html.replace(/<script src="https:\/\/accounts\.google\.com[^>]*><\/script>/, "");
  // A QUIET, OFFLINE CLIENT. The page runs its whole start-up, and left alone
  // that plays the threshold music and opens a socket to the game and one to
  // every relay - which then fail here and retry, forever, which is the lag.
  // This runs BEFORE the client: no AudioContext exists, so every sound bails
  // at its own try/catch; and a WebSocket is a line that never opens and never
  // closes, so there is no close for a reconnect loop to fire on.
  const QUIET = "<script>(function(){"
    + "function NoAudio(){throw new Error('silent preview');}"
    + "window.AudioContext=NoAudio;window.webkitAudioContext=NoAudio;"
    + "function DeadSocket(){this.readyState=0;this.bufferedAmount=0;}"
    + "DeadSocket.prototype.send=function(){};DeadSocket.prototype.close=function(){};"
    + "DeadSocket.prototype.addEventListener=function(){};DeadSocket.prototype.removeEventListener=function(){};"
    + "DeadSocket.CONNECTING=0;DeadSocket.OPEN=1;DeadSocket.CLOSING=2;DeadSocket.CLOSED=3;"
    + "window.WebSocket=DeadSocket;"
    + "})();</script>";
  const head = html.indexOf("<head>");
  html = head >= 0 ? html.slice(0, head + 6) + QUIET + html.slice(head + 6) : QUIET + html;
  const panel = "window.__GAME_SRC=" + JSON.stringify(src) + ";\n" + fs.readFileSync(PANEL, "utf8");
  // INSIDE the last script before </body>, which is the client's module.
  const end = html.lastIndexOf("</body>");
  const close = html.lastIndexOf("</script>", end);
  if (close < 0) throw new Error("could not find the client's script to hook into");
  return html.slice(0, close) + "\n;" + panel + "\n" + html.slice(close);
}

const LOCAL_FILES = { "/nostr.js": "src/nostr-bundle.js", "/qrcode.js": "src/qrcode-bundle.js" };

// Pictures are fetched from prod ONCE and held here; the url carries the ?v=
// cache-bust, so a ship that bumps BG_V or MOB_V is a new key and a new fetch.
const prodCache = new Map();
const CACHE = "public, max-age=600";
async function serveGameAsset(rel, res, from, full) {
  if (from === "prod") {
    let hit = prodCache.get(full);
    if (!hit) {
      const r = await fetch(PROD + full);
      hit = { status: r.status, type: r.headers.get("content-type") || "application/octet-stream", body: Buffer.from(await r.arrayBuffer()) };
      if (r.ok) prodCache.set(full, hit);
    }
    res.writeHead(hit.status, { "content-type": hit.type, "cache-control": CACHE }).end(hit.body);
    return true;
  }
  const f = LOCAL_FILES[rel] ? path.join(GAME, LOCAL_FILES[rel]) : path.join(GAME, "public", rel);
  if (!f.startsWith(GAME + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return false;
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] ?? "application/octet-stream", "cache-control": CACHE }).end(fs.readFileSync(f));
  return true;
}

const missed = new Set();
http.createServer(async (req, res) => {
  let rel = decodeURIComponent((req.url || "/").split("?")[0]);
  if (rel === "/game" || rel === "/game.html") {
    const src = new URL(req.url, "http://x").searchParams.get("src") === "local" ? "local" : "prod";
    try {
      const html = await gameHtml(src);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(html);
    } catch (e) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }).end("could not build the game page (" + src + "):\n\n" + (e.stack || e.message));
    }
    return;
  }
  // The client asks for a world and a manifest on load; it gets an empty one
  // and draws whatever the panel tells it to.
  if (["/world", "/world.json", "/manifest.json"].includes(rel)) {
    res.writeHead(200, { "content-type": "application/json" }).end("{}"); return;
  }
  // Everything the real client asks for at the root that the workbench does not
  // carry - pictures, fonts, bundles - comes from the page's own source.
  const from = sourceOf(req);
  if (from === "prod" || (from === "local" && !fs.existsSync(path.join(DIR, rel)))) {
    try { if (await serveGameAsset(rel, res, from, req.url)) return; } catch (e) {}
  }
  if (rel === "/" || rel === "") rel = "/mobs.html";
  const file = path.join(DIR, rel);
  // Never serve outside the preview directory, symlinked art excepted.
  if (!file.startsWith(DIR + path.sep) && file !== PAGE) { res.writeHead(403).end("no"); return; }

  if (file === PAGE && !isStatic) {
    const broke = fresh();
    if (broke) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end("the preview could not be built from public.ts:\n\n" + broke);
      return;
    }
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      // EVERY MISS IS PRINTED. Testing a staged tree means finding the file the
      // page asks for and the tree does not carry, and in a browser that is a
      // picture that silently does not appear. Here it is a line in the
      // terminal, which is the difference between a test and a look.
      missed.add(rel);
      console.log("  404  " + rel + "   (" + missed.size + " distinct so far)");
      res.writeHead(404, { "content-type": "text/plain" }).end("not here: " + rel); return;
    }
    const head = { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" };
    // The page is rebuilt per request and must never be remembered; the art is
    // large, lives behind a symlink into public/, and is named for its content.
    if (file === PAGE) head["cache-control"] = "no-store, must-revalidate";
    res.writeHead(200, head).end(buf);
  });
}).listen(port, "127.0.0.1", () => {
  console.log((isStatic ? "STAGED BUILD " : "preview ") + path.relative(GAME, DIR)
    + " on http://127.0.0.1:" + port + "/");
  console.log(isStatic
    ? "  served exactly as staged - no rebuild, nothing read from public/.\n"
      + "  every missing file prints here; a clean click-through prints nothing."
    : "  rebuilds from src/public.ts whenever it has moved; just reload the page");
});
