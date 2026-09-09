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
// It also reports the two ways a pose can exist and never be seen, which are
// different failures with different fixes:
//
//  DRAWN BUT NOT SHIPPED  - art on disk the strip does not carry. Found both
//                           drakes shipping 8 of 14 poses, which is why neither
//                           boss could strike or flinch. Fix: rebuild the strip.
//  SHIPPED BUT NEVER DRAWN - a frame in the strip the driver cannot select. The
//                           drakes carried five of these for weeks (sweep,
//                           inhale, breath, takeoff, dive) because the strike
//                           lookup broke on the first match and nothing else
//                           named the other three. Nothing is broken when this
//                           happens and nothing looks wrong, which is exactly
//                           why it needs a machine to notice. Fix: wire it in
//                           poseAt, or admit the frame is spare.
// The second check runs the CLIENT'S OWN poseAt over every state the wire can
// report, so it cannot drift from what the game actually does.
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

const bad = [], left = [], anim = {};
let n = 0, strike = 0, die = 0, sleep = 0, recoil = 0;
for (const m of blk.matchAll(/^\s*"([a-z0-9-]+)":\s*\{ n: (\d+), aspect: ([\d.]+), f: (\{[^}]*\}) \}/gm)) {
  const id = m[1], N = +m[2], aspect = +m[3], f = JSON.parse(m[4]);
  anim[id] = { n: N, f };
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

// ---- SHIPPED BUT NEVER DRAWN ----------------------------------------------
// poseAt lifted whole, exactly as the preview lifts it, and driven through every
// phase and state the server can put a creature into.
const fnOf = (name) => {
  const i = src.indexOf("\nfunction " + name + "(");
  let d = 0;
  for (let k = src.indexOf("{", i); k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}" && --d === 0) return src.slice(i + 1, k + 1);
  }
};
const constsOf = (first) => {
  const i = src.search(new RegExp("^var " + first + " = ", "m"));
  return src.slice(i, src.indexOf("\nfunction ", i));
};
const box = {};
new Function("box", "document", [
  constsOf("CALM_POSES"), constsOf("ATTACK_S"), fnOf("poseAt"),
  (() => { const i = src.search(/^var ROOTED = /m); return src.slice(i, src.indexOf("\n", i)); })(),
  // Every preference list the client fills an anim from, so the stub below picks
  // the same poses paintMobs would. Guessing them under-reports: with watch
  // hard-coded to "idle" this check called the drakes' alert frame dead, when
  // the client takes it first out of WATCH_POSES.
  "box.poseAt = poseAt; box.STRIKE_POSES = STRIKE_POSES; box.CALM = CALM_POSES;",
  "box.SLEEP = SLEEP_POSES; box.WATCH = WATCH_POSES; box.HIT = HIT_POSES;",
].join("\n"))(box, { getElementById: () => null });

const spare = [];
for (const [id, { f }] of Object.entries(anim)) {
  const byIdx = {};
  for (const [k, v] of Object.entries(f)) byIdx[v] = k;
  const blows = box.STRIKE_POSES.filter((k) => f[k] !== undefined);
  const seen = new Set();
  const first = (list, dflt) => list.find((k) => f[k] !== undefined) || dflt;
  const acts = Object.keys(f).filter((k) => k !== "idle");
  const mk = (o) => Object.assign({
    spec: { f, acts: acts.length ? acts : ["idle"] },
    id, phase: "idle", t: 0, state: "",
    calm: first(box.CALM, ""), sleep: first(box.SLEEP, "idle"),
    strike: blows[0], strikes: blows, blow: blows[0],
    recoil: first(box.HIT, "idle"), watch: first(box.WATCH, "idle"),
    asleep: false, rot: 0,
  }, o);
  const rec = (a) => { const r = box.poseAt(a, 0); if (r && r.k !== undefined) seen.add(byIdx[r.k]); };
  for (const blow of blows.length ? blows : [null])
    for (let t = 0; t <= 1.8; t += 0.01) rec(mk({ phase: "attack", blow, t }));
  for (let t = 0; t <= 2.7; t += 0.01) rec(mk({ phase: "travel", t }));
  for (const st of ["", "hunt", "fight", "flee", "reel", "hurt", "eyeing", "watch"])
    for (let t = 0; t < 40; t += 0.05) rec(mk({ state: st, t }));   // the idle cycle is slow
  for (let t = 0; t < 2; t += 0.05) {
    rec(mk({ phase: "hit", t })); rec(mk({ phase: "death", t }));
    rec(mk({ phase: "feed", t })); rec(mk({ asleep: true, t }));
  }
  const never = Object.keys(f).filter((k) => !seen.has(k));
  if (never.length) spare.push(`${id}: ${never.join(" ")}`);
}

console.log(`${n} animated · ${strike} strike · ${die} die · ${sleep} lie up · ${recoil} drawn recoil`);
if (left.length) {
  console.log("\nDRAWN BUT NOT SHIPPED (art exists, the strip does not carry it):");
  for (const l of left) console.log("  " + l);
}
if (spare.length) {
  console.log("\nSHIPPED BUT NEVER DRAWN (in the strip, the driver cannot select it):");
  for (const l of spare) console.log("  " + l);
}
if (bad.length) {
  console.log("\nBROKEN:");
  for (const b of bad) console.log("  " + b);
  process.exit(1);
}
console.log("\nevery strip matches its map, every frame index in range");
