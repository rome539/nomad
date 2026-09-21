// AUDIT THE CREATURE STRIPS against what the client believes about them.
//
//   node scripts/audit-mob-strips.mjs
//
// Exits non-zero if anything is wrong. Run it after every strip rebuild - all
// four checks below exist because each one silently shipped broken art once.
//
//  1 width divisible by n        - a strip window lands between frames otherwise
//  2 declared aspect == measured - a wrong aspect stretches EVERY frame
//  3 every frame is named         - counted by INDEX, not by name, since two
//                                  names may share one drawing on purpose
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
  // EVERY FRAME IS NAMED AND NO FRAME IS ORPHANED - counted by INDEX, not by
  // name, because two names may deliberately share one drawing. The bird sheets
  // do exactly that: `up` and `down` are one wingbeat frame, which is the cell
  // that paid for their feeding pose. Counting names instead flagged all eleven
  // as broken while the strips were perfectly correct.
  const used = new Set(Object.values(f));
  if (used.size !== N) bad.push(`${id}: ${used.size} frames named for n=${N}`);
  for (const k in f) if (f[k] < 0 || f[k] >= N) bad.push(`${id}: ${k}=${f[k]} is outside the strip`);

  if (STRIKE.some((k) => f[k] !== undefined)) strike++;
  if (f.death !== undefined) die++;
  if (SLEEP.some((k) => f[k] !== undefined)) sleep++;
  if (f.hit !== undefined) recoil++;

  const dir = artDir(id);
  if (fs.existsSync(dir)) {
    // ...but not "<pose>.eyes.png". Those are the blood-moon eye overlays the
    // cutter splits off a hollow creature's sheet: a second LAYER of the poses
    // already here, not six more poses. Counted as art the strip fails to carry,
    // they report every dead thing in the crossing as half unshipped.
    const drawn = fs.readdirSync(dir).filter((x) => x.endsWith(".png") && !x.endsWith(".eyes.png"))
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
  "box.EAT = EAT_POSES;",
].join("\n"))(box, { getElementById: () => null });

const spare = [];
for (const [id, { f }] of Object.entries(anim)) {
  const blows = box.STRIKE_POSES.filter((k) => f[k] !== undefined);
  const seen = new Set();
  const first = (list, dflt) => list.find((k) => f[k] !== undefined) || dflt;
  const acts = Object.keys(f).filter((k) => k !== "idle");
  const mk = (o) => Object.assign({
    spec: { f, acts: acts.length ? acts : ["idle"] },
    id, phase: "idle", t: 0, state: "",
    // EVERY calm pose, not the first - the driver cycles them (2026-09-21), so
    // an audit that passed only one would go on calling the rest dead.
    calm: first(box.CALM, ""), calms: box.CALM.filter((k) => f[k] !== undefined),
    sleep: first(box.SLEEP, "idle"),
    strike: blows[0], strikes: blows, blow: blows[0],
    recoil: first(box.HIT, "idle"), watch: first(box.WATCH, "idle"),
    // The eating frame the client resolves. Without this the feed phase falls
    // back to the literal name "feed" and every grazer's `graze` reads as dead.
    eat: f["feed"] !== undefined ? "feed" : first(box.EAT, ""),
    // ...and the grazing frame, which is a DIFFERENT act now (2026-09-21): the
    // server sends "grazed" for an animal nosing the ground and "fed" for one on
    // a kill, so a creature drawn with both reaches both.
    grazeAt: f["graze"] !== undefined ? "graze" : "",
    asleep: false, rot: 0,
  }, o);
  const rec = (a) => { const r = box.poseAt(a, 0); if (r && r.k !== undefined) seen.add(r.k); };
  for (const blow of blows.length ? blows : [null])
    for (let t = 0; t <= 1.8; t += 0.01) rec(mk({ phase: "attack", blow, t }));
  // TRAVEL IS SAMPLED ACROSS SUCCESSIVE TRAVELS, not one. A creature with no gait
  // and no wings spends a travel working through its spare poses one per second,
  // and TRAVEL_MS only buys 2.6 of them - so which poses it reaches depends on
  // where the cycle started, and the driver now advances that start each time.
  // Sweeping the offset is what asks the real question: does this pose EVER come
  // round, rather than does it come round on the creature's first ever walk.
  for (let off = 0; off < acts.length + 1; off++)
    for (let t = 0; t <= 2.7; t += 0.01) rec(mk({ phase: "travel", t, actOff: off }));
  // ...and the idle states are swept across the calm offset too, for the same
  // reason travel is: which calm pose comes round depends on where the rotation
  // started, so asking only offset 0 asks whether it comes round on this
  // creature's first ever breath rather than whether it comes round at all.
  for (const st of ["", "hunt", "fight", "flee", "reel", "hurt", "eyeing", "watch"])
    for (let off = 0; off < (box.CALM.filter((k) => f[k] !== undefined).length || 1); off++)
      for (let t = 0; t < 40; t += 0.05) rec(mk({ state: st, t, actOff: off }));   // the idle cycle is slow
  for (let t = 0; t < 2; t += 0.05) {
    rec(mk({ phase: "hit", t })); rec(mk({ phase: "death", t }));
    rec(mk({ phase: "feed", t, eatAs: f["feed"] !== undefined ? "feed" : first(box.EAT, "") }));
    rec(mk({ phase: "feed", t, eatAs: f["graze"] !== undefined ? "graze" : "" }));
    rec(mk({ asleep: true, t }));
  }
  // BY INDEX, because `up` and `down` may be one drawing: keying this by name
  // made the alias look dead, since only one of the two names can be recovered
  // from a frame index.
  const never = Object.keys(f).filter((k) => !seen.has(f[k]));
  if (never.length) spare.push(`${id}: ${never.join(" ")}`);
}

// PACKED BUT NOT SIZED, which is packed and INVISIBLE (rome, 2026-09-21: the
// road's new mobs were not showing). The strip builder patches MOB_ANIM and
// nothing else. mobVh reads its height out of MOB_SPRITE, and a creature that
// table has never heard of comes back NaN - so all twenty-two of the road's
// creatures had art, a strip, a pose map and a row in the roster, and rendered
// at no size at all. Nothing anywhere said so; the page simply had holes in it.
const sprite = new Set([...src.slice(src.indexOf("var MOB_SPRITE = {"),
  src.indexOf("\n};", src.indexOf("var MOB_SPRITE = {"))).matchAll(/"([a-z0-9-]+)":\s*\d+/g)].map((m) => m[1]));
const unsized = Object.keys(anim).filter((id) => !sprite.has(id));

console.log(`${n} animated · ${strike} strike · ${die} die · ${sleep} lie up · ${recoil} drawn recoil`);
if (left.length) {
  console.log("\nDRAWN BUT NOT SHIPPED (art exists, the strip does not carry it):");
  for (const l of left) console.log("  " + l);
}
if (unsized.length) {
  console.log("\nPACKED BUT NOT SIZED (in the strip and in MOB_ANIM, with no MOB_SPRITE height - it draws at NaN and is invisible):");
  for (const id of unsized) console.log("  " + id);
}
if (spare.length) {
  console.log("\nSHIPPED BUT NEVER DRAWN (in the strip, the driver cannot select it):");
  for (const l of spare) console.log("  " + l);
}
if (bad.length) {
  console.log("\nBROKEN:");
  for (const b of bad) console.log("  " + b);
}
// An unsized creature is as broken as a bad frame index - it is simply invisible
// instead of wrong - so it fails the gate rather than only printing.
if (bad.length || unsized.length) process.exit(1);
console.log("\nevery strip matches its map, every frame index in range");
