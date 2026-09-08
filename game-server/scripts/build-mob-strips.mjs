// BUILD THE CREATURE STRIPS.
//
// A creature's animation is ONE horizontal strip: n frames side by side in a
// single .webp, which the client shows through a window exactly one frame wide
// (background-size: n*100% 100%, stepping background-position-x). The client
// reads MOB_ANIM to know how many frames there are, the shape of one, and which
// index each named pose sits at.
//
// This script takes a folder of pose PNGs per creature and packs them into that
// strip, then prints the MOB_ANIM rows to paste (or --write to patch them in).
//
//   node scripts/build-mob-strips.mjs                  # DRY RUN - writes nothing
//   node scripts/build-mob-strips.mjs --write          # build the strips
//   node scripts/build-mob-strips.mjs --patch          # ...and edit MOB_ANIM too
//   node scripts/build-mob-strips.mjs the-drake        # one creature, named
//
// WHY IT IS BUILT THE WAY IT IS - every step below is a bug that cost a session:
//
//  * ONE COORDINATE FRAME. All of a creature's poses are cropped by the SAME
//    rect (the union of their ink), so the creature does not jump between
//    frames. Cropping each pose to its own bbox looks fine one frame at a time
//    and swims horribly in motion.
//  * BOTTOM-ALIGNED PADDING FIRST. Some sheets differ in canvas size within one
//    creature (the drake's ground poses are 768x512 and its flight poses
//    768x640). Pad them up to a common canvas, bottom-aligned, or extract throws
//    "bad extract area" and the feet drift.
//  * ONE HEIGHT FOR THE WHOLE STRIP. Every frame is the same box. The client
//    states the element's width from MOB_SPRITE * aspect and sets flex: 0 0 auto
//    - if anything resizes that box, every frame is stretched.
//  * sharp CACHES BY PATH. Re-reading a file this script just overwrote returns
//    the OLD metadata. sharp.cache(false) below; do not remove it.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

sharp.cache(false);   // see the note above - this is not optional

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, "..");
const REPO = path.resolve(GAME, "..");
const OUT  = path.join(GAME, "public/mob");
const CLIENT = path.join(GAME, "src/public.ts");

// WHERE THE POSE ART LIVES. Each entry is a folder holding <pose>.png files.
// The workbench is gitignored (see .gitignore) - it is generated art kept out
// of the repo, so a fresh clone has this script but not its input.
const SOURCES = [
  { dir: path.join(REPO, "output/mountain-mobs"), perCreature: true },
  { dir: path.join(REPO, "output/drake-moves"),   id: "the-drake" },
];
// ART THAT DID NOT COME FROM THE STUDIES FOLDER. These creatures ship strips
// built from separately drawn sheets; the studies hold an older, different-
// looking version of the same animal. A blanket rebuild would silently replace
// the shipped art with the old art - it did exactly that once. Name them here
// and pass the id explicitly to rebuild one on purpose.
const FOREIGN = new Set(["gill-adder", "stone-adder", "the-gravid-adder"]);
// Sheets, not poses: the full multi-pose images the cutouts were taken from.
const NOT_A_POSE = new Set(["source", "combat-source", "flight-source",
                            "ground-source", "approved-ground-source"]);
// Frame order when a creature is new. An existing creature keeps the order it
// already had and appends whatever is newly drawn, so a rebuild never reshuffles
// a strip out from under a client that has it cached.
const CANON = ["idle", "alert", "watch", "listen", "inspect-upright",
  "rest", "bask", "hold-warm-ground", "hold-ground", "stand-ground", "keep-the-line",
  "graze", "feed", "work-pull", "steal-cache", "carry-bone", "carry-stolen-item",
  "move-a", "move-b", "advance", "twisting-leap", "call-uphill", "alarm-call",
  "alert-alarm", "defend-nest", "attack", "bite", "sweep", "inhale", "breath",
  "dive", "takeoff", "up", "glide", "down", "landing", "recover", "hit", "death"];
const MAX_H = 460;   // tallest frame we ship; the drake sets this

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
// WRITING IS OPT-IN. A bare run says what it WOULD build and touches nothing:
// this script overwrites shipped art, and a "dry run" that quietly replaced 43
// strips is not a dry run. --write builds the strips; --patch also edits
// MOB_ANIM in public.ts.
const patch = process.argv.includes("--patch");
const write = patch || process.argv.includes("--write");

// ---- what the client currently believes ----------------------------------
const client = fs.readFileSync(CLIENT, "utf8");
let blk = client.slice(client.indexOf("var MOB_ANIM = {"));
blk = blk.slice(0, blk.indexOf("\n};"));
const existing = {};
for (const m of blk.matchAll(/^\s*"([a-z0-9-]+)":\s*\{ n: \d+, aspect: [\d.]+, f: (\{[^}]*\}) \}/gm)) {
  const f = JSON.parse(m[2]), order = [];
  for (const [name, i] of Object.entries(f)) order[i] = name;
  existing[m[1]] = order;
}

// ---- find every creature with pose art ------------------------------------
const found = new Map();
for (const s of SOURCES) {
  if (!fs.existsSync(s.dir)) continue;
  if (s.perCreature) {
    for (const d of fs.readdirSync(s.dir, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name.startsWith("_") || d.name.startsWith(".")) continue;
      const p = path.join(s.dir, d.name);
      if (fs.readdirSync(p).some((f) => f.endsWith(".png"))) found.set(d.name, p);
    }
  } else found.set(s.id, s.dir);
}

async function inkBox(buf) {
  const im = sharp(buf);
  const { width, height } = await im.metadata();
  const a = await im.ensureAlpha().extractChannel(3).raw().toBuffer();
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (a[y * width + x] > 12) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error("a pose is entirely transparent");
  return { x0, y0, x1, y1, width, height };
}

const rows = [];
for (const [id, dir] of [...found].sort()) {
  if (only.length ? !only.includes(id) : FOREIGN.has(id)) continue;
  const drawn = fs.readdirSync(dir).filter((f) => f.endsWith(".png"))
    .map((f) => f.slice(0, -4)).filter((f) => !NOT_A_POSE.has(f));
  if (!drawn.length) continue;

  // the order it already had, then anything new in canonical order, then the rest
  const order = [];
  for (const p of existing[id] ?? []) if (drawn.includes(p)) order.push(p);
  for (const p of CANON) if (drawn.includes(p) && !order.includes(p)) order.push(p);
  for (const p of drawn.sort()) if (!order.includes(p)) order.push(p);

  const files = order.map((p) => path.join(dir, p + ".png"));
  const raw = await Promise.all(files.map((f) => sharp(f).toBuffer()));
  const meta = await Promise.all(raw.map((b) => sharp(b).metadata()));

  // pad every pose up to one canvas, bottom-aligned, before anything else
  const cw = Math.max(...meta.map((m) => m.width)), ch = Math.max(...meta.map((m) => m.height));
  const norm = [];
  for (let i = 0; i < raw.length; i++) {
    if (meta[i].width === cw && meta[i].height === ch) { norm.push(raw[i]); continue; }
    norm.push(await sharp({ create: { width: cw, height: ch, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
      .composite([{ input: raw[i], left: Math.round((cw - meta[i].width) / 2), top: ch - meta[i].height }])
      .png().toBuffer());
  }

  // ONE crop rect for all of them
  const boxes = await Promise.all(norm.map(inkBox));
  const X0 = Math.min(...boxes.map((b) => b.x0)), X1 = Math.max(...boxes.map((b) => b.x1));
  const Y0 = Math.min(...boxes.map((b) => b.y0)), Y1 = Math.max(...boxes.map((b) => b.y1));
  const w0 = X1 - X0 + 1, h0 = Y1 - Y0 + 1;
  const sc = Math.min(1, MAX_H / h0);
  const iw = Math.round(w0 * sc), ih = Math.round(h0 * sc);
  // A GUTTER, OR THE NEXT POSE LEAKS IN. The crop rect above is the tightest box
  // holding every pose, so by construction some pose touches each edge — and the
  // client shows a frame by percentage background-position, which rounds to
  // subpixels. Ink at the boundary means the neighbouring frame's wingtip
  // appears at the edge of the window. A few transparent pixels all round costs
  // nothing and makes that impossible.
  const gut = Math.max(4, Math.round(iw * 0.012));
  const fw = iw + gut * 2, fh = ih + gut * 2;

  const frames = [];
  for (const b of norm) {
    const cut = await sharp(b).extract({ left: X0, top: Y0, width: w0, height: h0 })
      .resize(iw, ih).png().toBuffer();
    frames.push(await sharp({ create: { width: fw, height: fh, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
      .composite([{ input: cut, left: gut, top: gut }]).png().toBuffer());
  }

  if (write) {
    fs.mkdirSync(OUT, { recursive: true });
    await sharp({ create: { width: fw * frames.length, height: fh, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
      .composite(frames.map((b, i) => ({ input: b, left: i * fw, top: 0 })))
      .webp({ quality: 92, alphaQuality: 100 })   // q92 + full alpha: ~6x smaller than png, no alpha flips
      .toFile(path.join(OUT, id + ".webp"));
  }

  const f = {}; order.forEach((p, i) => f[p] = i);
  rows.push({ id, n: order.length, aspect: +(fw / fh).toFixed(3), f, order });
  console.log(id.padEnd(20) + String(order.length).padStart(2) + " frames  " + order.join(" "));
}

if (!rows.length) { console.log("nothing to build"); process.exit(0); }

const pad = Math.max(...rows.map((r) => r.id.length)) + 3;
const line = (r) => `  "${r.id}":` + " ".repeat(pad - r.id.length)
  + `{ n: ${r.n}, aspect: ${r.aspect}, f: ${JSON.stringify(r.f)} },`;

if (patch) {
  let s = fs.readFileSync(CLIENT, "utf8");
  for (const r of rows) {
    const re = new RegExp(`^(\\s*"${r.id}":\\s*)\\{ n: \\d+, aspect: [\\d.]+, f: \\{[^}]*\\} \\},$`, "m");
    if (re.test(s)) s = s.replace(re, `$1{ n: ${r.n}, aspect: ${r.aspect}, f: ${JSON.stringify(r.f)} },`);
    else s = s.replace("var MOB_ANIM = {\n", "var MOB_ANIM = {\n" + line(r) + "\n");
  }
  fs.writeFileSync(CLIENT, s);
  console.log(`\npatched MOB_ANIM in public.ts (${rows.length} rows)`);
  console.log("NOW: bump ART_V - these filenames already existed and their content changed.");
} else {
  console.log(write
    ? "\nstrips written. MOB_ANIM rows (--patch to write these in too):\n"
    : "\nNOTHING WAS WRITTEN - this was a dry run. --write to build the strips.\n"
      + "MOB_ANIM rows these would produce:\n");
  for (const r of rows) console.log(line(r));
}
