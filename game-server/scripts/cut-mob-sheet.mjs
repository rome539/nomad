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

// The eye marker, and the width of the net thrown round it. Both are stated here
// rather than derived: the colour is a contract with the prompt, and the
// tolerance is what lets a compressed edge still be recognised as the marker.
const EYE = [0, 208, 208], EYE_TOL = 110;
let eyeTotal = 0, eyeBlobs = 0;

const COLS = { 4: 2, 6: 3, 8: 4, 9: 3, 12: 4 }[poses.length];
if (!COLS) { console.error(poses.length + " poses — expected 4, 6, 8, 9 or 12"); process.exit(2); }
const ROWS = Math.ceil(poses.length / COLS);

const meta = await sharp(sheet).metadata();
const cw = Math.floor(meta.width / COLS), ch = Math.floor(meta.height / ROWS);
console.log(`${meta.width}x${meta.height} → ${COLS}x${ROWS} grid, cells ${cw}x${ch}`);

// FOLLOW THE FIGURES, NOT THE GRID.
//
// The sheet is asked for as a strict grid and does not come back as one. The
// generator lays each pose out where it likes, and a pose with its wings fully
// open is simply WIDER than a quarter of the sheet - so it runs past the line,
// and on the eagle owl's top row the gliding bird began 62px inside the cell of
// the bird beside it. Dividing the width by four and cutting cut wings off.
//
// But an overlap is not a collision. Those two owls share a column and never
// touch a pixel of each other: keyed against the magenta, the row holds four
// separate connected pieces, one per bird, each whole. So the cut is taken from
// the PIECES - the COLS biggest components in the row, ordered left to right -
// and each pose is extracted at its own piece's bounding box. Overlapping poses
// come out entire because the boxes are allowed to overlap.
//
// Everything downstream is unchanged: the box may still contain a slice of a
// neighbour, and the existing component pass keeps the main silhouette and drops
// what touches the border, which is what it was already written to do.
//
// Two ways this can be wrong, both fall back to an even divide with a warning:
// a creature drawn in genuinely separate pieces would be read as two poses, and
// a row where one pose failed to render would promote a stray bit. Both show up
// as a smallest piece that is tiny next to the largest.
const sheetRaw = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const SW = sheetRaw.info.width, SH = sheetRaw.info.height, SC = sheetRaw.info.channels;
const sInk = (x, y) => {
  const i = (y * SW + x) * SC;
  return sheetRaw.data[i + 3] > 8 && Math.min(sheetRaw.data[i] - sheetRaw.data[i + 1],
                                              sheetRaw.data[i + 2] - sheetRaw.data[i + 1]) <= 30;
};
const boxes = [];            // boxes[row][col] = {x0,x1}
for (let r = 0; r < ROWS; r++) {
  const y0 = r * ch, y1 = Math.min(SH, y0 + ch) - 1, RH = y1 - y0 + 1;
  const lab = new Int32Array(SW * RH).fill(-1), st = new Int32Array(SW * RH);
  const found = [];
  for (let q = 0; q < SW * RH; q++) {
    const qx = q % SW, qy = (q / SW) | 0;
    if (lab[q] >= 0 || !sInk(qx, y0 + qy)) continue;
    const gid = found.length; let n = 0, minX = SW, maxX = 0, sp = 0;
    st[sp++] = q; lab[q] = gid;
    while (sp) {
      const c = st[--sp], cx = c % SW, cy = (c / SW) | 0;
      n++; if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= SW || ny >= RH) continue;
        const nq = ny * SW + nx;
        if (lab[nq] >= 0 || !sInk(nx, y0 + ny)) continue;
        lab[nq] = gid; st[sp++] = nq;
      }
    }
    found.push({ n, minX, maxX });
  }
  const inRow = Math.min(COLS, poses.length - r * COLS);
  const big = found.sort((p, q) => q.n - p.n).slice(0, inRow).sort((p, q) => p.minX - q.minX);
  const usable = big.length === inRow && big[big.length - 1].n >= big[0].n * 0.15;
  if (!usable) {
    console.log(`  row ${r + 1}: could not read ${inRow} figures from the artwork - falling back to an even divide`);
    boxes.push(Array.from({ length: inRow }, (_, k) => ({ x0: k * cw, x1: (k + 1) * cw - 1 })));
    continue;
  }
  const PAD = 6;
  boxes.push(big.map((g) => ({ x0: Math.max(0, g.minX - PAD), x1: Math.min(SW - 1, g.maxX + PAD) })));
  const over = big.some((g, k) => k && g.minX <= big[k - 1].maxX);
  if (over) console.log(`  row ${r + 1}: poses overlap on the sheet - cut from the figures, not the grid`);
}

const outDir = path.join(REPO, "output/mountain-mobs", id);
fs.mkdirSync(outDir, { recursive: true });

let bad = 0;
for (let i = 0; i < poses.length; i++) {
  const col = i % COLS, row = Math.floor(i / COLS);
  const bx = boxes[row][col];
  const cell = await sharp(sheet)
    .extract({ left: bx.x0, top: row * ch, width: bx.x1 - bx.x0 + 1, height: ch })
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
  // ...AND THE SAME TEST TURNED ON THE CREATURE ITSELF, which is the half that
  // was missing. The block above uses "touches a side edge" to recognise a
  // NEIGHBOUR'S limb reaching in, and the reasoning holds just as well the other
  // way: if the MAIN silhouette meets a side edge then this animal has been cut
  // off at the cell line, and the missing part is over in the next cell where
  // nothing can retrieve it.
  //
  // Found by rome on five birds at once (2026-09-18): every glide frame had its
  // wings sliced at both edges, because a fully spread wingspan does not fit a
  // 512 cell at the body scale the perched poses were drawn at. The sheets
  // reported nothing but "swept N stray bits" - the sweep was busy deleting the
  // neighbour's wingtip while this bird's own wingtip went in the bin with it.
  // A left or right edge is never legitimate. The bottom is (feet stand on it).
  let clipL = 0, clipR = 0;
  for (let y = 0; y < H; y++) {
    if (lab[y * W] === main) clipL++;
    if (lab[y * W + W - 1] === main) clipR++;
  }
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
  // THE EYES ARE A SECOND KEY, INSIDE THE CREATURE.
  //
  // On a blood moon every HOLLOW thing's eyes come up red — one night in every
  // 9.2 days — and that cannot be a CSS filter, because a filter treats every
  // pixel the same. Nor can it be a second sheet: a second generation is a
  // different individual, so the creature would quietly change on red nights.
  //
  // So the dead are drawn with their eyes in flat #00D0D0 and it is split off
  // here, exactly the way the magenta ground is. Two files come out of one cell
  // and they share a coordinate frame by construction, which is the whole point:
  // an overlay cut from the same pixels can never drift from what it sits on.
  //
  // Cyan was picked by measurement, not taste. It cannot trip the background key
  // (min(r-g,b-g) is -208), and the nearest pixel in all 61 shipped strips is 181
  // away, so nothing already drawn collides with it.
  //
  // THE CYAN STAYS. It was proposed here as a key to be replaced with a clouded
  // grey, and that was wrong about the creature: rome drew these with cold pale
  // eyes on purpose and that IS what a drowned thing looks like on an ordinary
  // night. The cyan is the base look, not a placeholder.
  //
  // So the split is not "marker out, real colour in" - it is TWO LOOKS OF THE
  // SAME EYE. The base keeps its cyan, and the layer written beside it holds the
  // same pixels in red, to be laid over the top on a blood moon, when the game
  // says every hollow thing's eyes come up "two coals the colour of the moon
  // above". Cold normally, red on the red nights, and nothing else changes.
  let eyes = null, eyeN = 0;
  if (EYE) {
    const buf = Buffer.alloc(W * H * 4, 0);
    for (let q = 0; q < W * H; q++) {
      const o = q * 4;
      if (data[o + 3] < 24) continue;
      const d = Math.abs(data[o] - EYE[0]) + Math.abs(data[o + 1] - EYE[1]) + Math.abs(data[o + 2] - EYE[2]);
      if (d > EYE_TOL) continue;
      eyeN++;
      const k = 1 - d / EYE_TOL;                       // 1 at the core, 0 at the rim
      // The overlay must COVER the cyan underneath it, not blend with it, so the
      // core is fully opaque and only the rim carries the eye's own soft edge.
      buf[o] = 255; buf[o + 1] = Math.round(64 * (1 - k)); buf[o + 2] = Math.round(44 * (1 - k));
      buf[o + 3] = Math.round(255 * Math.min(1, k * 1.6));
    }
    if (eyeN) eyes = buf;
  }

  const pct = kept / (info.width * info.height) * 100;
  const file = path.join(outDir, poses[i] + ".png");
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(file);
  // AND THEN IT HAS TO GLOW, WHICH A BLUR CANNOT DO.
  //
  // The eye a generator draws is about eight pixels across in a 512 cell, and on
  // screen that is four. Recoloured red it is red, and it is not "two coals the
  // colour of the moon above" - it is a red pixel. The first attempt blurred the
  // marker and screened it back, which looks right in a file viewer and vanishes
  // in the game: a blur spreads the SAME few hundred pixels of light over a much
  // larger area, so the wider it reaches the dimmer it gets. Energy is conserved
  // and that is exactly the wrong property here.
  //
  // So the halo is DRAWN, not derived. Each eye is found as a blob of marker
  // pixels, reduced to a centre and a radius, and a disc is painted around it at
  // several times that radius with its own falloff and its own brightness -
  // neither of which is bounded by how much ink the eye had to begin with.
  //
  // Baked at cut time rather than filtered at runtime, because the creature and
  // its eyes share ONE element so a single background-position steps them
  // together, and any filter on that element would bloom the whole animal.
  if (eyes) {
    const lab2 = new Int32Array(W * H).fill(-1), st2 = new Int32Array(W * H);
    const blobs = [];
    for (let q = 0; q < W * H; q++) {
      if (eyes[q * 4 + 3] < 24 || lab2[q] >= 0) continue;
      const id2 = blobs.length; let n = 0, sx = 0, sy = 0, sp = 0;
      st2[sp++] = q; lab2[q] = id2;
      while (sp) {
        const c = st2[--sp]; n++; sx += c % W; sy += (c / W) | 0;
        const cx2 = c % W, cy2 = (c / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx2 + dx, ny = cy2 + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nq = ny * W + nx;
          if (lab2[nq] >= 0 || eyes[nq * 4 + 3] < 24) continue;
          lab2[nq] = id2; st2[sp++] = nq;
        }
      }
      blobs.push({ x: sx / n, y: sy / n, r: Math.max(2, Math.sqrt(n / Math.PI)) });
    }
    // REACH is what makes it read as light rather than as paint. Seven radii out
    // is roughly a third of a head, which is what a lit eye does to a dark face.
    const REACH = 7;
    for (const bl of blobs) {
      const R = bl.r * REACH, R2 = R * R;
      const x0 = Math.max(0, Math.floor(bl.x - R)), x1 = Math.min(W - 1, Math.ceil(bl.x + R));
      const y0 = Math.max(0, Math.floor(bl.y - R)), y1 = Math.min(H - 1, Math.ceil(bl.y + R));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = x - bl.x, dy = y - bl.y, d2 = dx * dx + dy * dy;
        if (d2 > R2) continue;
        const t = 1 - Math.sqrt(d2) / R;
        const a = Math.round(255 * Math.pow(t, 2.2) * 0.95);
        const o = (y * W + x) * 4;
        if (a <= eyes[o + 3]) continue;
        eyes[o] = 255;
        eyes[o + 1] = Math.round(40 + 150 * (1 - t));
        eyes[o + 2] = Math.round(28 + 120 * (1 - t));
        eyes[o + 3] = a;
      }
    }
    // ...AND THE COAL ITSELF, WHICH MUST STAY RED. This was written as a near
    // white centre on the reasoning that the hottest part of a light is white -
    // true of a flame and wrong here. The eye is small, so at screen size the
    // white core is most of what you see, and the whole thing reads pale pink
    // with a red smudge round it instead of a red eye. It also buries the cyan
    // the creature is drawn with, which is the look on every other night.
    //
    // So the centre is RED, kept just bright enough to be the brightest thing in
    // the frame without going white, and the cyan beneath is left to show at the
    // rim rather than being stamped over edge to edge.
    // ...AND IT HAS TO COVER THE WHOLE EYE, RIM INCLUDED.
    //
    // This painted only the pixels that matched the marker within EYE_TOL, and
    // an eye is drawn anti-aliased: its outer ring is cyan blending into bone,
    // which is outside the tolerance, is never labelled, and so never got the
    // red. Measured on the shipped tide warden: 145 cyan pixels in the frame and
    // only 112 covered - 23% of every eye stayed CYAN on a blood moon, sitting
    // as a ring around a red centre. At sprite size that does not read as a rim,
    // it reads as pixels missing out of the eye.
    //
    // The detection stays tight (a loose tolerance runs away into the art - 110
    // finds 115 pixels here, 300 finds 3673). Instead the found mask is GROWN by
    // a couple of pixels, which can only ever expand around an eye that was
    // already located, and covers the blend ring it sits in.
    const CORE_GROW = 2;
    let core = new Uint8Array(W * H);
    for (let q = 0; q < W * H; q++) if (lab2[q] >= 0) core[q] = 1;
    for (let pass = 0; pass < CORE_GROW; pass++) {
      const grown = core.slice();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const q = y * W + x;
        if (core[q]) continue;
        if ((x > 0 && core[q - 1]) || (x < W - 1 && core[q + 1]) ||
            (y > 0 && core[q - W]) || (y < H - 1 && core[q + W])) grown[q] = 1;
      }
      core = grown;
    }
    for (let q = 0; q < W * H; q++) {
      if (!core[q]) continue;
      const o = q * 4;
      eyes[o] = 255; eyes[o + 1] = 46; eyes[o + 2] = 32; eyes[o + 3] = 242;
    }
    await sharp(eyes, { raw: { width: W, height: H, channels: 4 } })
      .png().toFile(path.join(outDir, poses[i] + ".eyes.png"));
    if (!eyeBlobs) eyeBlobs = 0;
    eyeBlobs += blobs.length;
  }
  eyeTotal += eyeN;
  const warn = pct < 2 ? "  \u2190 ALMOST EMPTY, check the sheet" : pct > 85 ? "  \u2190 barely keyed, is the background magenta?" : "";
  if (warn) bad++;
  const strays = dropped ? "  swept " + (sizes.length - 1 - held) + " stray bit" + ((sizes.length - 1 - held) === 1 ? "" : "s")
    + (fromNextCell ? " (" + fromNextCell + " reaching in from the next cell)" : "") : "";
  const big = held ? "  \u2190 " + held + " DETACHED PIECE" + (held === 1 ? "" : "S") + " kept, look at this frame" : "";
  if (big) bad++;
  // EIGHT PIXELS, not two. Once the boundaries snap to the sheet's real gaps
  // (above) what is left at a border is usually the outline itself grazing it,
  // which nobody can see at sprite size. A severed wing is tens of pixels. Two
  // was crying wolf on nine sheets that were fine.
  const TOL = 8;
  const clip = (clipL > TOL || clipR > TOL)
    ? "  \u2190 CLIPPED AT THE CELL EDGE: " + [clipL > TOL ? "left " + clipL + "px" : "", clipR > TOL ? "right " + clipR + "px" : ""]
        .filter(Boolean).join(" and ") + ". The drawing runs past its cell and the rest is unrecoverable - REGENERATE the sheet" : "";
  if (clip) bad++;
  console.log("  " + poses[i].padEnd(18) + pct.toFixed(1).padStart(5) + "% creature" + strays + big + warn + clip);
}
console.log("\nwrote " + poses.length + " poses to output/mountain-mobs/" + id + "/");
if (eyeTotal) console.log("     + an EYES layer: " + eyeBlobs + " eyes found, " + eyeTotal + " marker pixels, glow drawn at 7 radii");
else if (EYE) console.log("     no eye marker found — if this one is HOLLOW its sheet was drawn without it");
console.log("next: node scripts/build-mob-strips.mjs " + id + " --patch");
console.log("      node scripts/audit-mob-strips.mjs");
if (bad) process.exit(1);
