// TEST WHICH PLATE paintScene ASKS FOR.
//
//   node scripts/test-scene-torch.mjs
//
// Lifts paintScene and its tables out of public.ts and runs them against a DOM
// stub, then reads back the three things the function decides: the SCENE url,
// the SKY url, and the two tint classes. The torch is the case that motivated
// this — a carried flame swaps the ground and must leave the sky alone — but
// every branch it could have broken is checked alongside it, because the way a
// change like this fails is somewhere it was not aiming.
import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, "..", "src/public.ts"), "utf8");
const fn = (n) => { const i = src.indexOf("\nfunction " + n + "("); let d = 0;
  for (let k = src.indexOf("{", i); k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}" && --d === 0) return src.slice(i + 1, k + 1); } };
// WHAT paintScene ACTUALLY NEEDS, read off paintScene. The list of tables used
// to be typed by hand here, and it drifted every single time the client gained
// one — TORCH_HOURS and NO_GROUND_TINT both reached the page as references to
// something that did not exist. A lifted function knows its own dependencies:
// every table in this client is SHOUTED and every use of one indexes it, so
// they can simply be collected.
const lift = (n) => {
  const i = src.search(new RegExp("^var " + n + " = ", "m"));
  if (i < 0) throw new Error("no var " + n);
  const nl = src.indexOf("\n", i), brace = src.indexOf("{", i);
  if (brace < 0 || brace > nl) return src.slice(i, nl);              // a one-liner
  let d = 0;
  for (let k = brace; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}" && --d === 0) return src.slice(i, src.indexOf(";", k) + 1);
  }
  throw new Error("unclosed " + n);
};
// FUNCTIONS TOO, AND RECURSIVELY. Tables were not the whole dependency: the
// client factored the sky choice into skyFile(), paintScene called it, and the
// lift brought neither the function nor the table it reads. So this walks —
// whatever the lifted code indexes or calls, it takes, then asks the same of
// what it just took. Mutable view state (lastSky, sceneEl, skyRoll) is the one
// thing it does not chase: the harness stubs those on purpose.
const fnSrc = (n) => {
  const i = src.indexOf("\nfunction " + n + "(");
  if (i < 0) return null;
  let d = 0;
  for (let k = src.indexOf("{", i); k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}" && --d === 0) return src.slice(i + 1, k + 1);
  }
  return null;
};
const depsFor = (body, self) => {
  const tables = [], fns = [], seen = new Set(self ? [self] : []);
  const walk = (code) => {
    const bare = code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of bare.matchAll(/\b([A-Z][A-Z0-9_]{2,})\s*\[/g)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]); tables.push(lift(m[1]));
    }
    for (const m of bare.matchAll(/\b([a-z][A-Za-z0-9_]*)\s*\(/g)) {
      if (seen.has(m[1])) continue;
      const body2 = fnSrc(m[1]);
      if (!body2) continue;                       // a stub, a built-in, or a local
      seen.add(m[1]); fns.push(body2); walk(body2);
    }
  };
  walk(body);
  return tables.concat(fns).join("\n");
};
const style = () => ({ setProperty() {} });
const sceneEl = { style: style(), className: "", setProperty() {} };
sceneEl.style.setProperty = () => {};
const skyEl = { style: style() };
const mobsEl = { className: "" };
const ctx = {};
const code = [
  depsFor(fn("paintScene"), "paintScene"),
  'var viewMode = "image";',
  'var lastBand = "", lastSky = "", lastTerrain = "", lastRoomKey = "", lastTorch = false, skyRoll = 0;',
  'var scenePainted = "", sceneSeq = 0;',
  // The preloader is the one thing a stub cannot supply: on the page an Image
  // holds the old room up until the new plate has decoded. Here it lands at once,
  // which is the same path a cached picture takes.
  'function Image(){ this.complete = true; Object.defineProperty(this, "src", { set: function(){ this.onload && this.onload(); } }); }',
  'var ART_V = "0";',
  fn("paintScene"),
  // The lifted block declares its own elements from getElementById; the stubs win.
  "sceneEl = _scene; skyEl = _sky; mobsEl = _mobs;",
  "ctx.paint = paintScene; ctx.pools = SKY_POOL;",
].join("\n");
new Function("ctx", "_scene", "_sky", "_mobs", "document", code)(
  ctx, sceneEl, skyEl, mobsEl, { getElementById: () => null });

const strip = (v) => (v || "").replace(/^url\(|\?v=\d+\)$/g, "");
// A fresh room every time: paintScene remembers, and a test that leaned on the
// previous call's leftovers would pass for the wrong reason.
let room = 0;
function paint(sky, terrain, torch) {
  ctx.paint("mountain", sky, terrain, "room-" + room++, torch);
  return { scene: strip(sceneEl.style.backgroundImage), sky: strip(skyEl.style.backgroundImage),
           tint: sceneEl.className, mobs: mobsEl.className };
}

let fail = 0;
const t = (n, c, e) => { console.log((c ? "  ok   " : "  FAIL ") + n + (e ? "   " + e : "")); if (!c) fail++; };

console.log("a torch on painted ground");
let r = paint("night", "scree", 1);
t("takes the torch plate", r.scene === "/room-bg/scree-night-torch.webp", r.scene);
t("...under the ordinary night sky", r.sky === "/sky/night.webp", r.sky);
t("...with no dimming correction on it", r.tint === "", "class=" + r.tint);
t("...and the creatures in the firelight", r.mobs === "t-night-torch", r.mobs);

console.log("the same ground with the torch out");
r = paint("night", "scree", 0);
t("goes back to the dark plate", r.scene === "/room-bg/scree-night.webp", r.scene);
t("...same sky either way", r.sky === "/sky/night.webp", r.sky);
t("...and the creatures go dark with it", r.mobs === "t-night", r.mobs);

console.log("a ground with no torch plate cut yet");
r = paint("night", "gully", 1);
t("keeps its plain night", r.scene === "/room-bg/gully-night.webp", r.scene);
t("...and nothing on it is lit", r.mobs === "t-night", r.mobs);

console.log("a torch under the other night skies");
r = paint("moon", "cairn", 1);
t("full moon: torch ground, moon sky", r.scene === "/room-bg/cairn-night-torch.webp" && r.sky === "/sky/moon.webp", r.scene + " + " + r.sky);
t("...and no correction on a lit plate", r.tint === "", "class=" + r.tint);
r = paint("blood", "cairn", 1);
t("blood moon: torch ground, blood sky", r.scene === "/room-bg/cairn-night-torch.webp" && r.sky === "/sky/blood.webp", r.scene + " + " + r.sky);
r = paint("eclipse", "cairn", 1);
t("totality: torch ground, eclipse sky", r.scene === "/room-bg/cairn-night-torch.webp" && r.sky === "/sky/eclipse.webp", r.scene + " + " + r.sky);

console.log("the last of the evening — a light is struck before full dark");
for (const hour of ["dusk", "dawn"]) {
  r = paint(hour, "snow", 1);
  t(hour + ": the torch ground", r.scene === "/room-bg/snow-night-torch.webp", r.scene);
  t("...under its own sky, not night's", r.sky === "/sky/" + hour + ".webp", r.sky);
  t("...undimmed by the hour", r.tint === "", "class=" + r.tint);
  // THE GROUND GOES BEFORE THE SKY DOES. Unlit, these two stand on the NIGHT
  // plate under their own sky — a dark hillside under a burning one — and not
  // on a noon photograph turned down.
  r = paint(hour, "snow", 0);
  t("...and the night ground when unlit", r.scene === "/room-bg/snow-night.webp", r.scene);
  // NO CORRECTION ON THE GROUND. The night plate is the right dark ground for a
  // dark hour; the sky behind it is what carries the evening.
  t("...and takes the plate raw", r.tint === "", "class=" + r.tint);
  t("...under its own sky still", r.sky === "/sky/" + hour + ".webp", r.sky);
}

console.log("a torch is not a weather");
for (const [sky, want] of [["day", "day"], ["rain", "rain"], ["fog", "fog"], ["snow", "snow"], ["after-rain", "day"]]) {
  r = paint(sky, "snow", 1);
  t("burning at " + sky + " changes nothing", r.scene === "/room-bg/snow-" + want + ".webp", r.scene);
}

console.log("a gate door");
r = paint("night", "gate:the-stell", 1);
t("takes its own torch plate", r.scene === "/room-bg/gate-the-stell-night-torch.webp", r.scene);
t("...under the night sky", r.sky === "/sky/night.webp", r.sky);
t("...uncorrected", r.tint === "", "class=" + r.tint);
r = paint("night", "gate:the-stell", 0);
t("and its dark one when unlit", r.scene === "/room-bg/gate-the-stell-night.webp", r.scene);

console.log("one sky, turned, is more than one sky");
{
  // Read off the table rather than counted here, so growing a pool never leaves
  // a stale number in a test — which is exactly what happened when night went
  // from three entries to four.
  const pool = ctx.pools.night;
  const seen = [];
  for (let d = 0; d <= pool.length; d++) {
    ctx.paint("mountain", "night", "scree", "r" + d, 0, d);
    seen.push(strip(skyEl.style.backgroundImage) + "|" + (skyEl.style.transform || "-"));
  }
  t("night walks every entry in its pool", new Set(seen.slice(0, pool.length)).size === pool.length, seen.join("  "));
  t("...and comes back round after " + pool.length, seen[0] === seen[pool.length], seen[0] + " vs " + seen[pool.length]);
  // The four turns, each asked for by the day that selects it.
  for (const [day, want] of [[0, ""], [1, "scaleX(-1)"], [2, "scaleY(-1)"], [3, "scale(-1, -1)"]]) {
    ctx.paint("mountain", "night", "scree", "r@" + day, 0, day);
    t("day " + day + " keeps the file and turns the layer" + (want ? " " + want : " not at all"),
      strip(skyEl.style.backgroundImage) === "/sky/night.webp" && skyEl.style.transform === want,
      strip(skyEl.style.backgroundImage) + " " + JSON.stringify(skyEl.style.transform));
  }
  // ALL FOUR TURNS, and each a different arrangement: /y is not /xy, it is /xy
  // mirrored, which is why three variants was one short.
  const turns = [];
  for (let d = 0; d < 4; d++) {
    ctx.paint("mountain", "day", "scree", "t" + d, 0, d);
    turns.push(skyEl.style.transform || "none");
  }
  t("a day owns all four turns of its sky", new Set(turns).size === 4, turns.join("  "));

  // A CALENDAR SKY MAY NOT BE SWAPPED. Swapping is the move that can lie — a
  // full moon lights the ground and shuts a door, so its picture is a statement
  // about the world. Turning cannot lie and is a separate permission.
  for (const state of ["moon", "blood", "eclipse", "after-rain"]) {
    const files = [];
    for (let d = 0; d < 4; d++) {
      ctx.paint("mountain", state, "scree", "c" + state + d, 0, d);
      files.push(strip(skyEl.style.backgroundImage));
    }
    t(state + " is never swapped for another sky", new Set(files).size === 1, files.join(" "));
  }
  // ...and the three that are also never turned, against the one that is.
  for (const locked of ["moon", "blood", "eclipse"]) {
    const got = [];
    for (let d = 0; d < 4; d++) {
      ctx.paint("mountain", locked, "scree", "k" + locked + d, 0, d);
      got.push(skyEl.style.transform || "none");
    }
    t(locked + " is never turned either", new Set(got).size === 1, got.join(" "));
  }
  const ar = [];
  for (let d = 0; d < 4; d++) {
    ctx.paint("mountain", "after-rain", "scree", "a" + d, 0, d);
    ar.push(skyEl.style.transform || "none");
  }
  t("after-rain turns without ever changing picture", new Set(ar).size === 4, ar.join("  "));
}

console.log("the flag is sticky");
paint("night", "scree", 1);
ctx.paint(null, null, null, null);             // what applyView does
t("a repaint with no news keeps the flame", strip(sceneEl.style.backgroundImage) === "/room-bg/scree-night-torch.webp", strip(sceneEl.style.backgroundImage));
ctx.paint(null, null, null, null, 0);
t("and 0 puts it out", strip(sceneEl.style.backgroundImage) === "/room-bg/scree-night.webp", strip(sceneEl.style.backgroundImage));

console.log("no weather indoors");
r = paint("in", "gatehouse", 1);
t("the gatehouse ignores the torch", r.tint === "" && r.mobs === "", "class=" + r.tint + " mobs=" + r.mobs);

console.log(fail ? "\n" + fail + " FAILED" : "\nall good");
process.exit(fail ? 1 : 0);
