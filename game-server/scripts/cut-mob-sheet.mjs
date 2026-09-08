// CUT A FINISHED SPRITE SHEET into the pose PNGs the strip builder reads.
//
//   node scripts/cut-mob-sheet.mjs <sheet.png> <creature-id> <pose> <pose> …
//
// e.g.
//   node scripts/cut-mob-sheet.mjs ~/Desktop/hill-wolf.png hill-wolf \
//        idle move-a move-b attack rest death
//
// Writes output/mountain-mobs/<creature-id>/<pose>.png, one per cell, in the
// sheet's reading order: left to right, top row then bottom. Then run
// build-mob-strips.mjs and audit-mob-strips.mjs.
//
// THE GRID IS THE CONTRACT. The prompt asks for strict columns x rows with
// generous gutters and nothing crossing a cell boundary, so the cut is a plain
// grid divide - far more reliable than hunting silhouettes, and it fails loudly
// (an empty cell) rather than quietly stealing a leg from the next frame.
// Columns are inferred from the pose count: 6 -> 3x2, 8 -> 4x2, 4 -> 2x2.
//
// MAGENTA IS KEYED BY HUE, not by matching one colour: alpha drops wherever
// min(r-g, b-g) > 30. That survives the compression fringing a flat #FF00FF
// test would leave behind as a magenta halo. The same amount is then subtracted
// from red and blue, which is what stops a pink rim on white fur.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

sharp.cache(false);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const [sheetArg, id, ...poses] = process.argv.slice(2);

if (!sheetArg || !id || !poses.length) {
  console.error("usage: node scripts/cut-mob-sheet.mjs <sheet.png> <creature-id> <pose> <pose> …");
  process.exit(2);
}
const sheet = sheetArg.startsWith("~") ? path.join(process.env.HOME, sheetArg.slice(1)) : path.resolve(sheetArg);
if (!fs.existsSync(sheet)) { console.error("no such sheet: " + sheet); process.exit(2); }

const COLS = { 4: 2, 6: 3, 8: 4, 9: 3, 12: 4 }[poses.length];
if (!COLS) { console.error(poses.length + " poses — expected 4, 6, 8, 9 or 12"); process.exit(2); }
const ROWS = Math.ceil(poses.length / COLS);

const meta = await sharp(sheet).metadata();
const cw = Math.floor(meta.width / COLS), ch = Math.floor(meta.height / ROWS);
console.log(`${meta.width}x${meta.height} → ${COLS}x${ROWS} grid, cells ${cw}x${ch}`);

const outDir = path.join(REPO, "output/mountain-mobs", id);
fs.mkdirSync(outDir, { recursive: true });

let bad = 0;
for (let i = 0; i < poses.length; i++) {
  const col = i % COLS, row = Math.floor(i / COLS);
  const cell = await sharp(sheet)
    .extract({ left: col * cw, top: row * ch, width: cw, height: ch })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = cell;
  let kept = 0;
  for (let p = 0; p < data.length; p += 4) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const spill = Math.min(r - g, b - g);
    if (spill > 30) { data[p] = data[p+1] = data[p+2] = data[p+3] = 0; continue; }
    if (spill > 0) { data[p] = Math.max(0, r - spill); data[p+2] = Math.max(0, b - spill); }
    kept++;
  }
  const pct = kept / (info.width * info.height) * 100;
  const file = path.join(outDir, poses[i] + ".png");
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(file);
  const warn = pct < 2 ? "  ← ALMOST EMPTY, check the sheet" : pct > 85 ? "  ← barely keyed, is the background magenta?" : "";
  if (warn) bad++;
  console.log("  " + poses[i].padEnd(18) + pct.toFixed(1).padStart(5) + "% creature" + warn);
}
console.log("\nwrote " + poses.length + " poses to output/mountain-mobs/" + id + "/");
console.log("next: node scripts/build-mob-strips.mjs " + id + " --patch");
console.log("      node scripts/audit-mob-strips.mjs");
if (bad) process.exit(1);
