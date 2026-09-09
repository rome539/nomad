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

const missed = new Set();
http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || "/").split("?")[0]);
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
