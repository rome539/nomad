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
  // ...AND THEN THROW AWAY WHAT BELONGS TO THE NEXT CELL.
  //
  // The prompt asks for generous gutters with nothing crossing a cell boundary,
  // and the grid divide trusts that. A generator does not always honour it: on
  // the dancer's sheet the death pose's black tail tip reached left into the
  // middle cell, so the leap frame shipped with a detached blob hanging under a
  // creature in mid-air. It is not a near miss either - it is the tail of a
  // DIFFERENT pose, drawn at a different place on the ground, and in motion it
  // reads as a piece of the animal coming off.
  //
  // So each cell is reduced to its own silhouette: label the opaque pixels into
  // connected components and keep the largest. This is the same rule the studies
  // folder's prepare.py already applied before these sheets were ever cut here,
  // and it carries the same known cost - a genuinely DETACHED prop would be
  // dropped with the strays. That is why anything sizeable enough to be real is
  // kept and merely reported: under a twentieth of the main body is litter, and
  // anything above it is somebody's decision to look at.
  const W = info.width, H = info.height;
  const lab = new Int32Array(W * H).fill(-1);
  const sizes = [];
  const stack = new Int32Array(W * H);
  for (let q = 0; q < W * H; q++) {
    if (data[q * 4 + 3] === 0 || lab[q] >= 0) continue;
    const id_ = sizes.length; let n = 0, sp = 0;
    stack[sp++] = q; lab[q] = id_;
    while (sp) {
      const c = stack[--sp]; n++;
      const cx = c % W, cy = (c / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nq = ny * W + nx;
        if (lab[nq] >= 0 || data[nq * 4 + 3] === 0) continue;
        lab[nq] = id_; stack[sp++] = nq;
      }
    }
    sizes.push(n);
  }
  let main = 0;
  for (let k = 1; k < sizes.length; k++) if (sizes[k] > sizes[main]) main = k;
  // WHAT REACHED IN FROM NEXT DOOR TOUCHES THE EDGE, and that is the test worth
  // having. A size threshold alone is a guess and it guessed wrong here: the
  // piece hanging under the dancer's leap was a fifth of the animal - far too
  // big to call litter - and it was still the tail of the pose in the NEXT cell.
  // A creature drawn inside its own cell with the gutters the prompt asks for
  // does not touch the cell border; something crossing the boundary does, by
  // definition, because it entered through it. So a component that is not the
  // main silhouette AND meets an edge is somebody else's, whatever its size.
  const edge = new Uint8Array(sizes.length);
  for (let x = 0; x < W; x++) { const a = lab[x], b = lab[(H - 1) * W + x]; if (a >= 0) edge[a] = 1; if (b >= 0) edge[b] = 1; }
  for (let y = 0; y < H; y++) { const a = lab[y * W], b = lab[y * W + W - 1]; if (a >= 0) edge[a] = 1; if (b >= 0) edge[b] = 1; }
  const junk = (k) => k !== main && (edge[k] || sizes[k] < sizes[main] / 20);
  let dropped = 0, held = 0, fromNextCell = 0;
  for (let k = 0; k < sizes.length; k++) {
    if (k === main) continue;
    if (!junk(k)) { held++; continue; }            // sizeable, interior: somebody's decision
    if (edge[k] && sizes[k] >= sizes[main] / 20) fromNextCell++;
    dropped += sizes[k];
  }
  if (dropped) {
    for (let q = 0; q < W * H; q++) {
      const l = lab[q];
      if (l >= 0 && junk(l)) data[q * 4] = data[q * 4 + 1] = data[q * 4 + 2] = data[q * 4 + 3] = 0;
    }
    kept -= dropped;
  }
  const pct = kept / (info.width * info.height) * 100;
  const file = path.join(outDir, poses[i] + ".png");
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(file);
  const warn = pct < 2 ? "  \u2190 ALMOST EMPTY, check the sheet" : pct > 85 ? "  \u2190 barely keyed, is the background magenta?" : "";
  if (warn) bad++;
  const strays = dropped ? "  swept " + (sizes.length - 1 - held) + " stray bit" + ((sizes.length - 1 - held) === 1 ? "" : "s")
    + (fromNextCell ? " (" + fromNextCell + " reaching in from the next cell)" : "") : "";
  const big = held ? "  \u2190 " + held + " DETACHED PIECE" + (held === 1 ? "" : "S") + " kept, look at this frame" : "";
  if (big) bad++;
  console.log("  " + poses[i].padEnd(18) + pct.toFixed(1).padStart(5) + "% creature" + strays + big + warn);
}
console.log("\nwrote " + poses.length + " poses to output/mountain-mobs/" + id + "/");
console.log("next: node scripts/build-mob-strips.mjs " + id + " --patch");
console.log("      node scripts/audit-mob-strips.mjs");
if (bad) process.exit(1);
