// AUDIT THE CREATURE STRIPS against what the client believes about them.
//
//   node scripts/audit-mob-strips.mjs
//
// Exits non-zero if anything is wrong. Run it after every strip rebuild - all
// four checks below exist because each one silently shipped broken art once.
//
//  1 width divisible by n        - a strip window lands between frames otherwise
//  2 declared aspect == measured - a wrong aspect stretches EVERY frame
//  3 one name per frame          - a name count that disagrees with n means the
//                                  map and the file have drifted apart
//  4 every index inside the file - an out-of-range index shows blank
//
// It also reports DRAWN BUT NOT SHIPPED: poses that exist as art and are missing
// from the strip. That check is what found both drakes shipping 8 of 14 poses,
// which is why neither boss could strike or flinch.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

sharp.cache(false);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, "..");
const REPO = path.resolve(GAME, "..");
const MOB  = path.join(GAME, "public/mob");

// kept in step with the client's own preference lists
const STRIKE = ["attack", "bite", "sweep", "breath"];
const SLEEP  = ["rest", "bask", "hold-warm-ground", "hold-ground", "feed"];
const NOT_A_POSE = new Set(["source", "combat-source", "flight-source",
                            "ground-source", "approved-ground-source"]);
const artDir = (id) => id === "the-drake"
  ? path.join(REPO, "output/drake-moves")
  : path.join(REPO, "output/mountain-mobs", id);

const src = fs.readFileSync(path.join(GAME, "src/public.ts"), "utf8");
let blk = src.slice(src.indexOf("var MOB_ANIM = {"));
blk = blk.slice(0, blk.indexOf("\n};"));

const bad = [], left = [];
let n = 0, strike = 0, die = 0, sleep = 0, recoil = 0;
for (const m of blk.matchAll(/^\s*"([a-z0-9-]+)":\s*\{ n: (\d+), aspect: ([\d.]+), f: (\{[^}]*\}) \}/gm)) {
  const id = m[1], N = +m[2], aspect = +m[3], f = JSON.parse(m[4]);
  n++;
  const file = path.join(MOB, id + ".webp");
  if (!fs.existsSync(file)) { bad.push(`${id}: no strip file`); continue; }
  const md = await sharp(file).metadata();
  if (md.width % N) bad.push(`${id}: width ${md.width} is not divisible by n=${N}`);
  const real = +((md.width / N) / md.height).toFixed(3);
  if (Math.abs(real - aspect) > 0.01) bad.push(`${id}: aspect ${aspect} but the file measures ${real}`);
  if (Object.keys(f).length !== N) bad.push(`${id}: ${Object.keys(f).length} pose names for n=${N}`);
  for (const k in f) if (f[k] < 0 || f[k] >= N) bad.push(`${id}: ${k}=${f[k]} is outside the strip`);

  if (STRIKE.some((k) => f[k] !== undefined)) strike++;
  if (f.death !== undefined) die++;
  if (SLEEP.some((k) => f[k] !== undefined)) sleep++;
  if (f.hit !== undefined) recoil++;

  const dir = artDir(id);
  if (fs.existsSync(dir)) {
    const drawn = fs.readdirSync(dir).filter((x) => x.endsWith(".png"))
      .map((x) => x.slice(0, -4)).filter((x) => !NOT_A_POSE.has(x));
    const missing = drawn.filter((p) => f[p] === undefined);
    if (missing.length) left.push(`${id}: ${missing.join(" ")}`);
  }
}

console.log(`${n} animated · ${strike} strike · ${die} die · ${sleep} lie up · ${recoil} drawn recoil`);
if (left.length) {
  console.log("\nDRAWN BUT NOT SHIPPED (art exists, the strip does not carry it):");
  for (const l of left) console.log("  " + l);
}
if (bad.length) {
  console.log("\nBROKEN:");
  for (const b of bad) console.log("  " + b);
  process.exit(1);
}
console.log("\nevery strip matches its map, every frame index in range");
