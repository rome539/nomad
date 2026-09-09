// CUTTING THE SKY OUT OF A ROOM PLATE.
//
// A scene is generated as a whole picture with a flat magenta sky, and it
// reaches the game as a WebP with a hole where that sky was, because there are
// eighty-odd scenes and only eight skies: the sky is a separate layer drawn
// behind every one of them (see scene-art.md, and paintScene in public.ts).
// This is the one step between those two states.
//
// MAGENTA IS KEYED BY HUE, not by matching one colour: alpha drops wherever
// min(r-g, b-g) > 30, which survives the compression fringing a flat #FF00FF
// test would leave behind as a halo. The same amount is then subtracted from
// red and blue, which is what stops a pink rim along a skyline.
//
// THE CUT IS THE PART THAT MUST NOT MOVE. When a plate already exists for the
// same ground under another condition, this compares the two skylines and says
// how far apart they are: two photographs of one place should agree about where
// the hill stops to within a fraction of a percent, and a number that is not
// small means one of the pair was generated from a different composition and
// the sky will jump when the hour turns.
//
//   node scripts/key-scene.mjs <source.png> <name>        # e.g. alder-night-torch
//   node scripts/key-scene.mjs <source.png> <name> --write
//
// Dry by default. Writing overwrites public/room-bg/<name>.webp, and replacing
// a file the world already has means bumping ART_V in public.ts or every
// browser keeps the one it cached.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

sharp.cache(false);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../public/room-bg");

const args = process.argv.slice(2);
const write = args.includes("--write");
const [srcArg, name] = args.filter((a) => a !== "--write");

if (!srcArg || !name) {
  console.error("usage: node scripts/key-scene.mjs <source.png> <plate-name> [--write]");
  process.exit(2);
}
const src = srcArg.startsWith("~") ? path.join(process.env.HOME, srcArg.slice(1)) : path.resolve(srcArg);
if (!fs.existsSync(src)) { console.error("no such source: " + src); process.exit(2); }

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let cut = 0;
for (let p = 0; p < data.length; p += 4) {
  const r = data[p], g = data[p + 1], b = data[p + 2];
  const spill = Math.min(r - g, b - g);
  if (spill > 30) { data[p] = data[p + 1] = data[p + 2] = data[p + 3] = 0; cut++; continue; }
  if (spill > 0) { data[p] = Math.max(0, r - spill); data[p + 2] = Math.max(0, b - spill); }
}
const total = info.width * info.height;
const pct = (100 * cut) / total;
console.log(`${name}  ${info.width}x${info.height}  sky ${pct.toFixed(1)}%`);

// The same ground under another condition, if one is already installed: the
// reference for whether this plate's horizon sits where the others' do.
// ONLY A CUT PLATE HAS A SKYLINE TO COMPARE. Checking a fog plate against a
// night one reports the whole sky as a difference, because one has a hole in it
// and the other is a photograph — 36% apart and both correct.
const keyedCond = /-(day|night|night-torch)$/.test(name);
const existed = fs.existsSync(path.join(OUT, name + ".webp"));
const sibling = name.replace(/-(day|night|night-torch|fog|rain|snow)$/, "");
const ref = ["night", "day"].map((c) => path.join(OUT, sibling + "-" + c + ".webp"))
  .find((f) => fs.existsSync(f) && path.basename(f, ".webp") !== name);
if (ref && keyedCond) {
  // COMPARED AS A PROFILE, not pixel against pixel: the generator returns
  // 1584x993 one day and 1586x992 the next, and a one-pixel difference in frame
  // size is nothing to the page (each layer is cover-cropped on its own) while
  // being enough to make a pixel-for-pixel diff meaningless. So both plates are
  // reduced to the same 256 columns of "how much of this column is sky", which
  // is the question actually being asked: does the hill stop in the same place.
  const r = await sharp(ref).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const profile = (buf, w, h) => {
    const out = new Float64Array(256);
    for (let c = 0; c < 256; c++) {
      const x0 = Math.floor((c * w) / 256), x1 = Math.max(x0 + 1, Math.floor(((c + 1) * w) / 256));
      let clear = 0;
      for (let x = x0; x < x1; x++) for (let y = 0; y < h; y++) if (buf[(y * w + x) * 4 + 3] < 8) clear++;
      out[c] = clear / ((x1 - x0) * h);
    }
    return out;
  };
  const a = profile(data, info.width, info.height), b = profile(r.data, r.info.width, r.info.height);
  let sum = 0;
  for (let c = 0; c < 256; c++) sum += Math.abs(a[c] - b[c]);
  const d = (100 * sum) / 256;
  console.log(`  vs ${path.basename(ref)}: skyline differs by ${d.toFixed(2)}%` +
    (d > 2 ? "  \u2190 TOO FAR APART, check the composition" : ""));
} else if (keyedCond) {
  console.log("  no sibling plate installed — nothing to check the skyline against");
}
// WHAT COUNTS AS RIGHT DEPENDS ON THE CONDITION, and a flat threshold was wrong
// at both ends. Only day, night and night-torch are cut: fog, rain and snow are
// whole photographs carrying their own weather sky and must have NO hole in them,
// so for those a large key is the error and zero is correct. And a keyed plate
// can legitimately be almost solid — an interior with one small window keys well
// under a percent (the Last Shelter's east slot is 0.4% of its frame) — so the
// floor has to be low enough not to cry wolf at the rooms that need it most.
if (keyedCond && pct < 0.15) console.log("  \u2190 almost nothing keyed; is the sky magenta in the source?");
if (keyedCond && pct > 70) console.log("  \u2190 most of the frame went; is the GROUND magenta too?");
if (!keyedCond && pct > 0.5) console.log("  \u2190 THIS CONDITION MUST NOT BE KEYED: fog, rain and snow carry their own sky, and a hole in one shows the wrong weather through it");
if (!keyedCond && pct <= 0.5) console.log("  opaque, as a weather plate should be");

if (!write) { console.log("  dry run — pass --write to install"); process.exit(0); }
// q92 / alphaQuality 100, the same as every other asset: colour costs under 1%
// and not one keyed pixel changes side.
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(path.join(OUT, name + ".webp"));
const kb = Math.round(fs.statSync(path.join(OUT, name + ".webp")).size / 1024);
// ART_V only matters when a URL the world already has is being replaced. A new
// filename has nobody's cache to beat.
console.log(`  wrote public/room-bg/${name}.webp  (${kb}KB)` + (existed ? "  — REPLACED, bump ART_V" : ""));
