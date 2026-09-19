// REDO A CREATURE'S EYE LAYER FROM ART THAT IS ALREADY CUT.
//
//   node scripts/rekey-eyes.mjs the-refuge-man [more ids…]
//
// The eye overlay is normally made by the cutter, off the sheet. This does the
// same job off the POSE PNGs instead, which matters whenever the eyes need
// redoing and the sheet does not:
//
//  * the key was widened (EYE_TOL 110 -> 200, see cut-mob-sheet.mjs) and every
//    hollow creature drawn before that has frames with one eye lit and one cold;
//  * a sheet's reading order is NOT the strip's order, and guessing it wrong
//    silently relabels every pose. Going through the cut art cannot make that
//    mistake, because each file already carries its own name.
//
// It never touches <pose>.png - only <pose>.eyes.png is rewritten.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

sharp.cache(false);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");

// THE CUTTER IS THE SOURCE OF TRUTH FOR ALL THREE NUMBERS, so they are read out
// of it rather than written down twice. A copied constant is a constant that
// drifts, and the whole point of this pass is to apply the cutter's current key.
const cut = fs.readFileSync(path.join(HERE, "cut-mob-sheet.mjs"), "utf8");
const EYE = JSON.parse(cut.match(/const EYE = (\[[^\]]*\])/)[1]);
const EYE_TOL = +cut.match(/EYE_TOL = (\d+)/)[1];
const REACH = +cut.match(/const REACH = (\d+)/)[1];

const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!ids.length) { console.error("name at least one creature"); process.exit(2); }

for (const id of ids) {
  const dir = path.join(REPO, "output/mountain-mobs", id);
  if (!fs.existsSync(dir)) { console.log(id + ": no pose folder"); continue; }
  const poses = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".png") && !f.endsWith(".eyes.png"))
    .map((f) => f.slice(0, -4))
    .filter((f) => !["source", "combat-source", "flight-source", "ground-source"].includes(f));
  let total = 0, lines = [];
  for (const pose of poses) {
    const { data, info } = await sharp(path.join(dir, pose + ".png"))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, C = info.channels;
    const buf = Buffer.alloc(W * H * 4, 0);
    let n = 0;
    for (let q = 0; q < W * H; q++) {
      const s = q * C, o = q * 4;
      if (data[s + 3] < 24) continue;
      const d = Math.abs(data[s] - EYE[0]) + Math.abs(data[s + 1] - EYE[1]) + Math.abs(data[s + 2] - EYE[2]);
      if (d > EYE_TOL) continue;
      n++;
      const k = 1 - d / EYE_TOL;
      buf[o] = 255; buf[o + 1] = Math.round(64 * (1 - k)); buf[o + 2] = Math.round(44 * (1 - k));
      buf[o + 3] = Math.round(255 * Math.min(1, k * 1.6));
    }
    const eyeFile = path.join(dir, pose + ".eyes.png");
    if (!n) { if (fs.existsSync(eyeFile)) fs.unlinkSync(eyeFile); lines.push(pose + ":0"); continue; }
    // the glow, drawn rather than derived - see the note in cut-mob-sheet.mjs
    const lab = new Int32Array(W * H).fill(-1), st = new Int32Array(W * H), blobs = [];
    for (let q = 0; q < W * H; q++) {
      if (buf[q * 4 + 3] < 24 || lab[q] >= 0) continue;
      const gid = blobs.length; let c = 0, sx = 0, sy = 0, sp = 0;
      st[sp++] = q; lab[q] = gid;
      while (sp) {
        const p0 = st[--sp]; c++; sx += p0 % W; sy += (p0 / W) | 0;
        const cx = p0 % W, cy = (p0 / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nq = ny * W + nx;
          if (lab[nq] >= 0 || buf[nq * 4 + 3] < 24) continue;
          lab[nq] = gid; st[sp++] = nq;
        }
      }
      blobs.push({ x: sx / c, y: sy / c, r: Math.max(2, Math.sqrt(c / Math.PI)) });
    }
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
        if (a <= buf[o + 3]) continue;
        buf[o] = 255;
        buf[o + 1] = Math.round(40 + 150 * (1 - t));
        buf[o + 2] = Math.round(28 + 120 * (1 - t));
        buf[o + 3] = a;
      }
    }
    await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(eyeFile);
    total += n; lines.push(pose + ":" + blobs.length);
  }
  console.log(id.padEnd(22) + total + " marker px   eyes per pose: " + lines.join("  "));
}
console.log("\nnext: node scripts/build-mob-strips.mjs <id> --patch  (then bump MOB_V)");
