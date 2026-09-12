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
    // ANY SHOUTED NAME, not only an indexed one. This matched NAME[...] alone,
    // so a table read as a bare value slipped through — MOB_LINE_DEFAULT is a
    // number, never indexed, and the page referred to something it had not
    // been given. A name with no declaration in the client is prose from a
    // comment or a string and is simply passed over.
    for (const m of bare.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      if (src.search(new RegExp("^var " + m[1] + " = ", "m")) < 0) continue;
      tables.push(lift(m[1]));
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
const mobsEl = { className: "", style: {} };
// THE TIDE SHEET. A stub with no style bag throws the moment paintFlood sets the
// mask, and paintScene calls it on every layered paint — so leaving it out
// stopped the whole file rather than failing one check.
const floodEl = { className: "", style: style() };
const ctx = {};
const code = [
  depsFor(fn("paintScene"), "paintScene"),
  'var viewMode = "image";',
  'var lastBand = "", lastSky = "", lastTerrain = "", lastRoomKey = "", lastPlace = "", lastTorch = false, skyRoll = 0;',
  'var lastSea = 0;',
  'var scenePainted = "", sceneSeq = 0;',
  // The preloader is the one thing a stub cannot supply: on the page an Image
  // holds the old room up until the new plate has decoded. Here it lands at once,
  // which is the same path a cached picture takes.
  'function Image(){ this.complete = true; Object.defineProperty(this, "src", { set: function(){ this.onload && this.onload(); } }); }',
  'var ART_V = "0";',
  fn("paintScene"),
  // The lifted block declares its own elements from getElementById; the stubs win.
  "sceneEl = _scene; skyEl = _sky; mobsEl = _mobs; floodEl = _flood;",
  "ctx.paint = paintScene; ctx.pools = SKY_POOL; ctx.scenes = TERRAIN_SCENES; ctx.rooms = ROOM_PLATE;",
  "ctx.setSea = function(v){ lastSea = v; };",
].join("\n");
new Function("ctx", "_scene", "_sky", "_mobs", "_flood", "document", code)(
  ctx, sceneEl, skyEl, mobsEl, floodEl, { getElementById: () => null });

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
// EVERY GROUND ON THE MOUNTAIN NOW HAS ONE. The gully was the last, so the
// fallback has no real example left to point at — and it is exactly the path
// that will run the day a new terrain lands with one photograph. So the table is
// held back for the length of this check and put straight back: the code under
// test is the real code, only the world is missing a plate.
{
  const held = ctx.scenes.gully;
  ctx.scenes.gully = "day night fog rain snow";
  r = paint("night", "gully", 1);
  t("keeps its plain night", r.scene === "/room-bg/gully-night.webp", r.scene);
  t("...and nothing on it is lit", r.mobs === "t-night", r.mobs);
  ctx.scenes.gully = held;
  r = paint("night", "gully", 1);
  t("and with the plate declared it lights", r.scene === "/room-bg/gully-night-torch.webp", r.scene);
}

console.log("a torch under the other night skies");
r = paint("moon", "cairn", 1);
t("full moon: torch ground, moon sky", r.scene === "/room-bg/cairn-night-torch.webp" && r.sky === "/sky/moon.webp", r.scene + " + " + r.sky);
t("...and no correction on a lit plate", r.tint === "", "class=" + r.tint);
r = paint("blood", "cairn", 1);
t("blood moon: torch ground, blood sky", r.scene === "/room-bg/cairn-night-torch.webp" && r.sky === "/sky/blood.webp", r.scene + " + " + r.sky);
r = paint("eclipse", "cairn", 1);
t("totality: torch ground, eclipse sky", r.scene === "/room-bg/cairn-night-torch.webp" && r.sky === "/sky/eclipse.webp", r.scene + " + " + r.sky);

console.log("the last of the evening — a light is struck before full dark");
// AN HOUR MAY OWN MORE THAN ONE PICTURE, so these ask which HOUR's sky is up
// rather than which file. Pinning the filename was fine while every hour had
// exactly one, and it broke the moment dusk got a second (dusk-2): the day count
// is hashed into the pool, so three of these started failing on a change that
// was entirely correct. What they are actually checking - and what their own
// names say - is that a torch at dusk leaves you under a DUSK sky rather than
// night's, and that holds whichever of the hour's pictures the day landed on.
const skyIs = (got, hour) => got === "/sky/" + hour + ".webp" || got.indexOf("/sky/" + hour + "-") === 0;
for (const hour of ["dusk", "dawn"]) {
  r = paint(hour, "snow", 1);
  t(hour + ": the torch ground", r.scene === "/room-bg/snow-night-torch.webp", r.scene);
  t("...under its own sky, not night's", skyIs(r.sky, hour), r.sky);
  t("...undimmed by the hour", r.tint === "", "class=" + r.tint);
  // THE GROUND GOES BEFORE THE SKY DOES. Unlit, these two stand on the NIGHT
  // plate under their own sky — a dark hillside under a burning one — and not
  // on a noon photograph turned down.
  r = paint(hour, "snow", 0);
  t("...and the night ground when unlit", r.scene === "/room-bg/snow-night.webp", r.scene);
  // NO CORRECTION ON THE GROUND. The night plate is the right dark ground for a
  // dark hour; the sky behind it is what carries the evening.
  t("...and takes the plate raw", r.tint === "", "class=" + r.tint);
  t("...under its own sky still", skyIs(r.sky, hour), r.sky);
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
  // THE DAY IS HASHED INTO THE POOL, NOT AN INDEX INTO IT (rome, 2026-09-08),
  // so what is asserted here is a distribution rather than a sequence: every
  // entry gets used, none of them dominates, and there is no short period a
  // player could learn. Deterministic all the same — the same day gives the same
  // sky to everyone alive, which is the thing that may never be traded away.
  const pool = ctx.pools.night;
  const at = (d) => { ctx.paint("mountain", "night", "scree", "r" + d, 0, d);
    return strip(skyEl.style.backgroundImage) + "|" + (skyEl.style.transform || "-"); };
  const count = {};
  for (let d = 0; d < 800; d++) { const k = at(d); count[k] = (count[k] || 0) + 1; }
  const used = Object.keys(count), tally = Object.values(count);
  t("every entry in the pool gets used", used.length === pool.length, used.length + " of " + pool.length);
  t("...and none of them dominates", Math.min(...tally) > 800 / pool.length * 0.7
    && Math.max(...tally) < 800 / pool.length * 1.3, tally.join(" "));
  t("...on one file, turned", used.every((k) => k.indexOf("/sky/night.webp|") === 0), used.join(" "));
  // No short period: the old version repeated every pool.length days exactly.
  let repeats = 0;
  for (let d = 0; d < 400; d++) if (at(d) === at(d + pool.length)) repeats++;
  t("no cycle at the pool's own length", repeats > 40 && repeats < 160, repeats + "/400 match (chance is 100)");
  // ...and the same day is the same sky, every time it is asked.
  t("the same day always gives the same sky", at(37) === at(37) && at(37) === at(37));
  const now = at(37); at(38); t("...and asking again after a different day still agrees", at(37) === now);
  // ALL FOUR TURNS, and each a different arrangement: /y is not /xy, it is /xy
  // mirrored, which is why three variants was one short.
  const turns = new Set();
  for (let d = 0; d < 60; d++) {
    ctx.paint("mountain", "day", "scree", "t" + d, 0, d);
    turns.add(skyEl.style.transform || "none");
  }
  t("a day owns all four turns of its sky", turns.size === 4, [...turns].join("  "));

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
  // ...and the three that MAY be turned, but only one way (2026-09-09). They were
  // never turned at all until now. Each has a subject — a full moon, a blood
  // moon, a corona — so the mirror is worth more here than in the cloud-only
  // pools, and a vertical turn is worth less than nothing: it drops that subject
  // to the bottom of the frame where the first ridgeline eats it.
  //
  // FOUR DAYS WAS NOT ENOUGH TO ASK THIS. The old check ran d=0..3 and wanted one
  // distinct transform; when the mirror was added, eclipse happened to land on
  // /x all four days and PASSED while moon and blood failed — the same rule,
  // graded differently by luck. Sixty days, and both halves asserted: the two
  // turns that are allowed must each actually appear, and the two that are not
  // must never appear at all.
  for (const locked of ["moon", "blood", "eclipse"]) {
    const got = new Set();
    for (let d = 0; d < 60; d++) {
      ctx.paint("mountain", locked, "scree", "k" + locked + d, 0, d);
      got.add(skyEl.style.transform || "none");
    }
    const only = [...got].every((v) => v === "none" || v === "scaleX(-1)");
    t(locked + " is mirrored and never flipped", only && got.size === 2, [...got].join(" "));
  }
  const ar = new Set(); const arFiles = new Set();
  for (let d = 0; d < 60; d++) {
    ctx.paint("mountain", "after-rain", "scree", "a" + d, 0, d);
    ar.add(skyEl.style.transform || "none");
    arFiles.add(strip(skyEl.style.backgroundImage));
  }
  t("after-rain turns four ways", ar.size === 4, [...ar].join("  "));
  t("...without ever changing picture", arFiles.size === 1, [...arFiles].join(" "));
}

console.log("the flag is sticky");
paint("night", "scree", 1);
ctx.paint(null, null, null, null);             // what applyView does
t("a repaint with no news keeps the flame", strip(sceneEl.style.backgroundImage) === "/room-bg/scree-night-torch.webp", strip(sceneEl.style.backgroundImage));
ctx.paint(null, null, null, null, 0);
t("and 0 puts it out", strip(sceneEl.style.backgroundImage) === "/room-bg/scree-night.webp", strip(sceneEl.style.backgroundImage));

console.log("the three rooms at the top of the mountain");
{
  const at = (place, sky, torch) => {
    ctx.paint("mountain", sky, "scree", "T" + place + sky + torch, torch, 0, place);
    return strip(sceneEl.style.backgroundImage) + "  " + (strip(skyEl.style.backgroundImage) || "no sky")
         + (sceneEl.className ? "  " + sceneEl.className : "");
  };
  // THE SUMMIT was painted as a snowfield by a room whose text says there is no
  // snow in it — it matched the "snow" terrain rule on its own description.
  t("the summit has its own plate", at("the-summit", "day", 0) === "/room-bg/the-summit-day.webp  /sky/day.webp",
    at("the-summit", "day", 0));
  t("...not the snowfield it used to borrow", at("the-summit", "day", 0).indexOf("snow") < 0);
  t("...and a torch lights it",
    at("the-summit", "night", 1) === "/room-bg/the-summit-night-torch.webp  /sky/night.webp",
    at("the-summit", "night", 1));
  t("...its weather is its own photograph, no sky behind",
    at("the-summit", "snow", 0) === "/room-bg/the-summit-snow.webp  no sky", at("the-summit", "snow", 0));
  // THE SUMMIT GATE matched "vent" on its warm air and was handed a scree slope.
  t("the gate room has its own plate", at("the-summit-gate", "night", 0) === "/room-bg/the-summit-gate-night.webp  /sky/night.webp",
    at("the-summit-gate", "night", 0));
  t("...at dusk it stands on its night ground", /^\/room-bg\/the-summit-gate-night\.webp  \/sky\/dusk(-\d+)?\.webp$/.test(at("the-summit-gate", "dusk", 0)),
    at("the-summit-gate", "dusk", 0));
  // THE LAST SHELTER is roofed: TWO conditions, and the weather stops outside.
  // It gave up its day plate (rome, 2026-09-09) because there is no hour at
  // which the inside of a hole under a rock is a daylit room — so the interior
  // is always dark and the hour is carried by the sky in the slot.
  t("the shelter is a dark room with a grey slot in the rain",
    at("the-last-shelter", "rain", 0) === "/room-bg/the-last-shelter-night.webp  /sky/after-rain.webp",
    at("the-last-shelter", "rain", 0));
  t("...and the rain does not tint it", sceneEl.className === "", "class=" + sceneEl.className);
  // AND NOON IS THE CASE THAT WOULD HAVE 404ED. With no day plate listed, the
  // condition fallback used to resolve day -> day and ask for a file that is not
  // there. It falls back to the plate's own first condition now, so noon is the
  // dark room with the day sky in its slot — which is what being in there looks
  // like, and the reason the plate was dropped rather than reshot.
  t("...at noon it is still dark inside, with the day sky in the slot",
    at("the-last-shelter", "day", 0) === "/room-bg/the-last-shelter-night.webp  /sky/day.webp",
    at("the-last-shelter", "day", 0));
  t("...and the aftermath darkens it like the rest",
    at("the-last-shelter", "after-rain", 0) === "/room-bg/the-last-shelter-night.webp  /sky/after-rain.webp",
    at("the-last-shelter", "after-rain", 0));
  // walking out of a singular room must stop naming it
  ctx.paint("mountain", "day", "scree", "away", 0, 0, "");
  t("walking out of one drops it", strip(sceneEl.style.backgroundImage) === "/room-bg/scree-day.webp",
    strip(sceneEl.style.backgroundImage));
}

console.log("a room with a roof on it");
{
  // The Last Shelter is a hole under a fallen block. The world counts it
  // outdoors — it goes dark at night like the rest of the mountain — but the
  // PICTURE of the weather stops at the stone: rain cannot change a room with a
  // roof, only the light in the slot you see out of.
  const at = (sky, torch) => {
    ctx.paint("mountain", sky, "scree", "L" + sky + torch, torch, 0, "the-last-shelter");
    return { scene: strip(sceneEl.style.backgroundImage), sky: strip(skyEl.style.backgroundImage),
             tint: sceneEl.className, mobs: mobsEl.className };
  };
  let r = at("day", 0);
  t("its own plate is used, not the ground it stands on", r.scene === "/room-bg/the-last-shelter-night.webp", r.scene);
  t("...and a sky is drawn behind it for the slot", r.sky === "/sky/day.webp", r.sky);
  // WEATHER FROM UNDER A ROOF (rome, 2026-09-08). It takes no plate of its own,
  // but it is not nothing either: the room goes dark and the slot goes grey.
  for (const w of ["rain", "fog", "snow", "after-rain"]) {
    r = at(w, 0);
    t(w + " darkens the room to its night plate", r.scene === "/room-bg/the-last-shelter-night.webp", r.scene);
    t("...with the grey after-rain sky in the slot", r.sky === "/sky/after-rain.webp", r.sky);
    t("...and still no wash over the picture", r.tint === "" && r.mobs === "t-night", "tint=" + r.tint + " mobs=" + r.mobs);
    // a room dark enough to be drawn at night is a room a flame belongs in,
    // even though rain is not a torch hour out on the open hill
    r = at(w, 1);
    t("...and a torch lights it", r.scene === "/room-bg/the-last-shelter-night-torch.webp" && r.mobs === "t-night-torch",
      r.scene + " " + r.mobs);
  }
  // Out on the hill the aftermath is a bright grey DAY and keeps the day ground.
  ctx.paint("mountain", "after-rain", "scree", "wetday", 0, 0, "");
  t("outdoors the aftermath is still a day", strip(sceneEl.style.backgroundImage) === "/room-bg/scree-day.webp",
    strip(sceneEl.style.backgroundImage));
  // and none of this leaks outdoors: a torch in the rain on open ground does nothing
  ctx.paint("mountain", "rain", "scree", "wet", 1, 0, "");
  t("a torch in the rain outdoors still changes nothing",
    strip(sceneEl.style.backgroundImage) === "/room-bg/scree-rain.webp", strip(sceneEl.style.backgroundImage));
  r = at("blood", 0);
  t("a blood moon does not redden the inside", r.tint === "" && r.mobs === "t-night", "tint=" + r.tint + " mobs=" + r.mobs);
  t("...on the night plate", r.scene === "/room-bg/the-last-shelter-night.webp", r.scene);
  r = at("night", 1);
  t("a torch lights it", r.scene === "/room-bg/the-last-shelter-night-torch.webp" && r.mobs === "t-night-torch",
    r.scene + " " + r.mobs);
  // and an unsheltered room plate is untouched by any of this
  ctx.rooms["_open"] = "day night";
  ctx.paint("mountain", "rain", "scree", "open", 0, 0, "_open");
  t("an open room plate still takes its weather", sceneEl.className === "t-rain", "class=" + sceneEl.className);
  delete ctx.rooms["_open"];
}

console.log("the hour turns while you stand still");
{
  // Same room, same ground, only the clock moved. The scene url does not change
  // between night and dawn (both stand on the night plate), so this is the case
  // where a repaint could quietly decide it had nothing to do.
  ctx.paint("mountain", "night", "scree", "still", 0, 0);
  const wasScene = strip(sceneEl.style.backgroundImage), wasSky = strip(skyEl.style.backgroundImage);
  ctx.paint(null, "dawn", null, null);
  t("the ground is the same plate", strip(sceneEl.style.backgroundImage) === wasScene, wasScene);
  t("...and the sky follows the hour anyway",
    strip(skyEl.style.backgroundImage) === "/sky/dawn.webp" && wasSky === "/sky/night.webp",
    wasSky + " -> " + strip(skyEl.style.backgroundImage));
  ctx.paint(null, "day", null, null);
  t("...and on to day, which is a different ground", strip(sceneEl.style.backgroundImage) === "/room-bg/scree-day.webp",
    strip(sceneEl.style.backgroundImage));
  t("...with the day sky over it", strip(skyEl.style.backgroundImage) === "/sky/day.webp", strip(skyEl.style.backgroundImage));
}

console.log("where the creatures stand");
{
  const at = (terrain) => { ctx.paint("mountain", "night", terrain, "L" + terrain, 0, 0); return mobsEl.style.top; };
  t("open ground keeps the camera lock", at("scree") === "55%", at("scree"));
  // A corrie is a bowl seen from its edge: the plate looks down across water and
  // the nearest standing ground is far lower in the frame than the lock assumes.
  t("the corrie rim stands lower", at("corrie-rim") === "72%", at("corrie-rim"));
  t("...and so does the corrie floor", at("corrie-floor") === "72%", at("corrie-floor"));
  t("walking back out restores the line", at("cairn") === "55%", at("cairn"));
  // The line must be re-stated on every paint, not only when it changes.
  ctx.paint("mountain", "night", "corrie-rim", "Lx", 0, 0);
  ctx.paint("mountain", "night", "gatehouse", "Lg", 0, 0);
  t("the gatehouse does not inherit the corrie's line", mobsEl.style.top === "55%", mobsEl.style.top);
}

console.log("no weather indoors");
r = paint("in", "gatehouse", 1);
t("the gatehouse ignores the torch", r.tint === "" && r.mobs === "", "class=" + r.tint + " mobs=" + r.mobs);

// ---- THE TIDE, WHICH IS A DIFFERENT PICTURE -------------------------------
console.log("the ground with the sea over it");
const at2 = (sea, sky, torch) => {
  ctx.setSea(sea);
  ctx.paint("mountain", sky, "causeway", "C" + sea + sky + torch, torch, 0, "", sea);
  return strip(sceneEl.style.backgroundImage);
};
t("a dry causeway is the dry plate", at2(0, "day", 0) === "/room-bg/causeway-day.webp", at2(0, "day", 0));
t("...and under the sea it is a different photograph", at2(2, "day", 0) === "/room-bg/causeway-day-flood.webp", at2(2, "day", 0));
t("...at night too", at2(2, "night", 0) === "/room-bg/causeway-night-flood.webp", at2(2, "night", 0));
t("...and with a torch in your hand", at2(2, "night", 1) === "/room-bg/causeway-night-torch-flood.webp", at2(2, "night", 1));
t("walking out of the water goes back to the dry plate", at2(0, "night", 0) === "/room-bg/causeway-night.webp", at2(0, "night", 0));
// A CONDITION WITH NO FLOOD TWIN FALLS BACK TO DRY rather than asking for a file
// that is not there. Rain and snow have not been shot flooded; a hole in the
// world at that hour would be worse than a picture one state behind the prose.
t("an unshot condition keeps the dry plate", at2(2, "rain", 0) === "/room-bg/causeway-rain.webp", at2(2, "rain", 0));
// And a ground with no flood plates at all never looks for one.
ctx.setSea(3); ctx.paint("mountain", "day", "scree", "sc", 0, 0, "", 3);
t("a ground that was never shot flooded ignores the tide",
  strip(sceneEl.style.backgroundImage) === "/room-bg/scree-day.webp", strip(sceneEl.style.backgroundImage));
// The ford is the second ground shot flooded, and it exists to prove the table
// does the work rather than the causeway being special-cased somewhere.
ctx.setSea(2); ctx.paint("mountain", "day", "ford", "fd", 0, 0, "", 2);
t("the ford floods too", strip(sceneEl.style.backgroundImage) === "/room-bg/ford-day-flood.webp", strip(sceneEl.style.backgroundImage));
ctx.setSea(2); ctx.paint("mountain", "snow", "ford", "fs", 0, 0, "", 2);
t("...and keeps its dry plate at a condition nobody shot flooded", strip(sceneEl.style.backgroundImage) === "/room-bg/ford-snow.webp", strip(sceneEl.style.backgroundImage));

// THE TWO GROUNDS THAT NEVER FLOOD, and that is the thing being checked. The
// ferry and the staithe are in TERRAIN_PLATE and TERRAIN_SCENES like the other
// two, but absent from FLOOD_SCENES - so a room of theirs standing three ranks
// under the sea must still paint dry. A ground gets a flood twin by being named
// in that table and by nothing else, and the sea cave is the reason the rule is
// worth a test: it is under at every tide and is deliberately never listed.
ctx.setSea(3); ctx.paint("mountain", "day", "ferry", "fy", 0, 0, "", 3);
t("the ferry does not flood on screen, whatever the tide", strip(sceneEl.style.backgroundImage) === "/room-bg/ferry-day.webp", strip(sceneEl.style.backgroundImage));
ctx.setSea(3); ctx.paint("mountain", "night", "staithe", "st", 1, 0, "", 3);
t("nor does the staithe, torch and all", strip(sceneEl.style.backgroundImage) === "/room-bg/staithe-night-torch.webp", strip(sceneEl.style.backgroundImage));
ctx.setSea(0); ctx.paint("mountain", "snow", "staithe", "st2", 0, 0, "", 0);
t("and the staithe was shot for every condition, so snow is its own plate", strip(sceneEl.style.backgroundImage) === "/room-bg/staithe-snow.webp", strip(sceneEl.style.backgroundImage));

// THE BRIDGE IS THE ONE GROUND THAT CANNOT FLOOD BY DESIGN, not merely by not
// having been shot that way: its own region header says it is never drowned and
// never whole - four piers stand and the middle went into the water - so the
// deck is forty feet up and the tide is irrelevant to it. That is the whole
// bargain it trades against the causeway, and a flood plate here would be
// arguing with the map.
ctx.setSea(3); ctx.paint("mountain", "day", "bridge", "br", 0, 0, "", 3);
t("the bridge is forty feet up and never floods", strip(sceneEl.style.backgroundImage) === "/room-bg/bridge-day.webp", strip(sceneEl.style.backgroundImage));
ctx.setSea(2); ctx.paint("mountain", "rain", "marsh", "ma", 0, 0, "", 2);
t("nor does the marsh, whatever the sea is doing", strip(sceneEl.style.backgroundImage) === "/room-bg/marsh-rain.webp", strip(sceneEl.style.backgroundImage));
ctx.setSea(0); ctx.paint("mountain", "fog", "shell", "sh", 0, 0, "", 0);
t("and the shell was shot for every condition too", strip(sceneEl.style.backgroundImage) === "/room-bg/shell-fog.webp", strip(sceneEl.style.backgroundImage));

// THE GROUND WITH NO DAYLIGHT, which is the case the terrain fallback was
// written for and had never met. Every terrain before this one was outdoors and
// owned a day plate, so falling back to a hardcoded "day" and falling back to
// "the one it always has" were the same answer and nobody could tell them
// apart. The sea cave tells them apart: it is a black interior lit by the torch
// in your hand, shot at night and at night with a torch and nothing else. Ask
// it for noon and the old code asked the edge for sea-cave-day.webp, which has
// never existed - a hole in the world at the one room that is already dark.
ctx.setSea(0); ctx.paint("mountain", "day", "sea-cave", "sc", 0, 0, "", 0);
t("a ground with no day plate falls back to its own first condition", strip(sceneEl.style.backgroundImage) === "/room-bg/sea-cave-night.webp", strip(sceneEl.style.backgroundImage));
ctx.setSea(0); ctx.paint("mountain", "day", "sea-cave", "sc2", 1, 0, "", 0);
t("...and a torch still lights it at any hour", strip(sceneEl.style.backgroundImage) === "/room-bg/sea-cave-night-torch.webp", strip(sceneEl.style.backgroundImage));
ctx.setSea(0); ctx.paint("mountain", "snow", "sea-cave", "sc3", 0, 0, "", 0);
t("...and weather does not reach inside it either", strip(sceneEl.style.backgroundImage) === "/room-bg/sea-cave-night.webp", strip(sceneEl.style.backgroundImage));
ctx.setSea(0); ctx.paint("mountain", "rain", "shore-road", "sr", 0, 0, "", 0);
t("the shore road has all six, so rain is its own plate", strip(sceneEl.style.backgroundImage) === "/room-bg/shore-road-rain.webp", strip(sceneEl.style.backgroundImage));

// THE CROSSING'S TWO DOORS, which are the first gates painted outside the hill.
// A gate does not arrive as a place - it comes in the TERRAIN slot with a
// "gate:" prefix on it, which is worth writing down because getting it wrong
// looks exactly like the gate not being wired: the room falls through to the
// band fallback and paints a hillside.
ctx.paint("mountain", "day", "gate:the-ferry-house", "gh1", 0, 0, "");
t("the ferry house is a painted gate now", strip(sceneEl.style.backgroundImage) === "/room-bg/gate-the-ferry-house-day.webp", strip(sceneEl.style.backgroundImage));
ctx.paint("mountain", "night", "gate:the-crossing-house", "gh2", 1, 0, "");
t("...and its twin takes a torch at night", strip(sceneEl.style.backgroundImage) === "/room-bg/gate-the-crossing-house-night-torch.webp", strip(sceneEl.style.backgroundImage));

// AND THE CRAB'S LAIR, a room plate with no daylight in it - the same shape of
// case the sea cave made for grounds, proving the ROOM branch handles it too.
// That branch already did, by a different route: it falls back to the plate's
// own first condition, and then counts a plate that resolved to "night" as dark
// enough for a flame. Two tables, two mechanisms, one answer.
ctx.paint("mountain", "day", "", "sp1", 0, 0, "the-salt-pool");
t("the salt pool has no day, so noon falls to its night", strip(sceneEl.style.backgroundImage) === "/room-bg/the-salt-pool-night.webp", strip(sceneEl.style.backgroundImage));
ctx.paint("mountain", "day", "", "sp2", 1, 0, "the-salt-pool");
t("...and a torch lights the cave at noon", strip(sceneEl.style.backgroundImage) === "/room-bg/the-salt-pool-night-torch.webp", strip(sceneEl.style.backgroundImage));
ctx.paint("mountain", "snow", "", "sp3", 0, 0, "the-salt-pool");
t("...and no weather reaches the back of it", strip(sceneEl.style.backgroundImage) === "/room-bg/the-salt-pool-night.webp", strip(sceneEl.style.backgroundImage));

// AND THE BAND IS ON. This is the line that made eighty-four plates reachable:
// terrain resolves to "" for any band not in BANDS_WITH_PLATES, so until the
// crossing was named there every room in it asked for no picture and got none -
// the art had been shipping for a day and reaching nobody. Paint a crossing
// ground and a mountain ground the same way and both must answer.
ctx.setSea(0); ctx.paint("crossing", "day", "staithe", "bx1", 0, 0, "", 0);
t("a crossing room paints its own ground now", strip(sceneEl.style.backgroundImage) === "/room-bg/staithe-day.webp", strip(sceneEl.style.backgroundImage));
ctx.paint("mountain", "day", "scree", "bx2", 0, 0, "", 0);
t("...and the mountain is unchanged beside it", strip(sceneEl.style.backgroundImage) === "/room-bg/scree-day.webp", strip(sceneEl.style.backgroundImage));
// A ground with no plate in a band that HAS plates falls to that band's own
// stand-in rather than to nothing - the crossing's is the shingle shore.
ctx.paint("crossing", "day", "no-such-ground", "bx3", 0, 0, "", 0);
t("an unpainted crossing ground falls back to the shore, not to bare colour", strip(sceneEl.style.backgroundImage) === "/room-bg/shell-day.webp", strip(sceneEl.style.backgroundImage));
ctx.setSea(0);

t("the gatehouse ignores the torch", r.tint === "" && r.mobs === "", "class=" + r.tint + " mobs=" + r.mobs);

// ---- THE TIDE, DRAWN OVER THE GROUND -------------------------------------
console.log(fail ? "\n" + fail + " FAILED" : "\nall good");
process.exit(fail ? 1 : 0);
