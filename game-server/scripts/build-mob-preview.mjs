// BUILD THE MOB PREVIEW PAGE from public.ts.
//
//   node scripts/build-mob-preview.mjs [outdir]      # default: ./preview
//   then serve outdir over http and open mobs.html
//
// THE TABLES, THE TIMINGS, THE TINT FILTERS AND THE DRIVER ITSELF are lifted out
// of the client verbatim - poseAt, mobBeat, stepAnims and applyRest are pulled
// whole by brace-matching, and the constant blocks by slicing to the next
// function. The page therefore CANNOT show an animation the game does not have.
//
// That is the entire point. An earlier version of this page hand-copied the
// driver, drifted from the client, and spent a session showing animations that
// were not in the game and hiding ones that were. Never hand-copy anything into
// this file: if the preview needs something from the client, extract it.
//
// The page has buttons for attack / take a hit / die / sleep because the preview
// has no combat to drive them - in the game those come off the wire.
import fs from "node:fs"; import path from "node:path";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, "..");
const SRC = path.join(GAME, "src/public.ts");
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
// A TRIMMED BUILD, for publishing rather than for working (2026-09-09).
//
//   --mountain   offer only the mountain's grounds, doors, rooms and creatures
//   --cut-only   offer only the hours whose plate is CUT (day, night, torch)
//   --copy       copy the assets in rather than symlinking to public/
//
// The three together are the nsite recipe. --copy exists because the working
// preview reaches the art through symlinks into public/, which is right for a
// page you are editing against and useless for a tree you are going to hash and
// upload: a publisher needs real files.
//
// NOTHING HERE TOUCHES THE DRIVER. The lifted tables and paintScene go across
// whole, exactly as in the working build, and the trim only decides what the
// pickers OFFER. That keeps the property the page is built on — it cannot show
// a plate the game could not — and means the trimmed page behaves identically
// on everything it does offer, rather than being a second, simpler page.
//
// --cut-only IS NOT A SIZE CUT FIRST. fog, rain and snow are whole photographs
// carrying their own sky; only day, night and night-torch are cut and have a
// shared sky drawn behind them. So the three conditions that weigh the most are
// also the three that show the two-layer trick least.
const ONLY_MOUNTAIN = flag("--mountain");
const CUT_ONLY = flag("--cut-only");
const COPY = flag("--copy");
// The mountain's four doors. The relay house is the east road's and goes.
const MOUNTAIN_GATES = new Set(["the-shieling", "the-stell", "the-slabs", "the-shelter-crag"]);
const WHOLE_PHOTOGRAPH = new Set(["fog", "rain", "snow"]);
const DROP_HOUR_LIST = CUT_ONLY ? [...WHOLE_PHOTOGRAPH] : [];
const DIR = path.resolve(argv.find((a) => !a.startsWith("--")) ?? path.join(GAME, "preview"));
fs.mkdirSync(DIR, { recursive: true });
// the page asks for mob/<id>.webp; point that at the real art rather than copying it
if (!COPY) for (const dir of ["mob", "room-bg", "sky"]) {
  const link = path.join(DIR, dir);
  try { if (fs.lstatSync(link)) fs.unlinkSync(link); } catch {}
  fs.symlinkSync(path.join(GAME, "public", dir), link, "dir");
}
const OUT = path.join(DIR, "mobs.html");
const src = fs.readFileSync(SRC, "utf8");
const src2 = src;   // the same text, named for use inside the staging block below
const grab = n => { const i = src.indexOf("var " + n + " = {"); return src.slice(i, src.indexOf("\n};", i)); };
// a top-level function, brace-matched, exactly as written
const fn = n => {
  const i = src.indexOf("\nfunction " + n + "(");
  if (i < 0) throw new Error("no function " + n);
  let d = 0, j = src.indexOf("{", i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}" && --d === 0) return src.slice(i + 1, k + 1);
  }
};
// A CONTIGUOUS RUN of top-level constants, from its first line to the function
// that follows it — the driver constants live in two such blocks and taking
// them whole is the only way the preview cannot miss one.
const block = first => {
  const i = src.search(new RegExp("^var " + first + " = ", "m"));
  if (i < 0) throw new Error("no var " + first);
  return src.slice(i, src.indexOf("\nfunction ", i)).trimEnd();
};

// ---- WHERE A CREATURE CAN ACTUALLY BE FOUND STANDING ----------------------
//
// Hand-listed three times and wrong three times: first it covered only "room:"
// values so every gate walked past it, then it called the Kept Room a sanctuary,
// then it still stood something in the Summit Gate. The reason is always the
// same — a list is a snapshot of what somebody thought of, and the world is a
// graph. So this asks the world.
//
// THE MODEL IS IDLE PRESENCE: where can something be found standing when nothing
// is happening. Chases and routs push creatures through doors they would never
// choose, and they are transient; this is about what the room normally holds.
//
//   creatures spread from every NON-BOSS spawn, along exits with no key on them
//   (ai.ts: creatures cannot open locked doors), and never into a sanctuary
//   (world.safeRooms is filtered out for every creature, boss included) and
//   never into a gate (entry rooms are filtered out for everything but a boss).
//   a BOSS does not idly wander at all - zone.ts gates the wander call on
//   (!is_boss || PATROLS) and no boss has a route - so a boss holds its spawn
//   room and reaches nothing else.
//
// The Summit Gate falls out of this rather than being noticed: its only two
// neighbours are the Summit, whose only occupant is a boss that never leaves,
// and the Last Shelter, which is a sanctuary and therefore empty. Nothing can
// walk in from either.
//
// D1 IS OPTIONAL. Without it the page simply does not filter, and says so, which
// is the honest failure: a build on a machine with no local world should not
// quietly invent an answer.
const REACH = (() => {
  const q = (sql) => JSON.parse(execFileSync("./node_modules/.bin/wrangler",
    ["d1", "execute", "nomad", "--local", "--json", "--command", sql],
    { cwd: GAME, stdio: ["ignore", "pipe", "ignore"] }))[0].results;
  try {
    const rooms = q("SELECT id, is_safe, is_entry FROM rooms;");
    const exits = q("SELECT room_id, to_room, key_item FROM exits;");
    const spawns = q("SELECT s.room_id, t.is_boss FROM mob_spawns s JOIN mob_templates t ON t.id = s.template_id;");
    const safe = new Set(rooms.filter((r) => r.is_safe).map((r) => r.id));
    const entry = new Set(rooms.filter((r) => r.is_entry).map((r) => r.id));
    const adj = new Map();
    for (const e of exits) { if (e.key_item) continue; if (!adj.has(e.room_id)) adj.set(e.room_id, []); adj.get(e.room_id).push(e.to_room); }
    const open = (id) => !safe.has(id) && !entry.has(id);
    const seen = new Set(spawns.filter((s) => !s.is_boss).map((s) => s.room_id).filter(open));
    const queue = [...seen];
    for (let h = 0; h < queue.length; h++) for (const to of adj.get(queue[h]) ?? [])
      if (!seen.has(to) && open(to)) { seen.add(to); queue.push(to); }
    for (const s of spawns) if (s.is_boss) seen.add(s.room_id);
    return { why: (id) => safe.has(id) ? "a sanctuary \u2014 nothing that walks can follow you in"
      : entry.has(id) ? "nothing idles in a doorway"
      : seen.has(id) ? "" : "nothing can reach this room" };
  } catch { return null; }
})();

const SPRITE = {}; for (const m of grab("MOB_SPRITE").matchAll(/"([a-z-]+)":\s*(\d+)/g)) SPRITE[m[1]] = +m[2];
const ANIM = {};
for (const m of grab("MOB_ANIM").matchAll(/"([a-z-]+)":\s*\{\s*n:\s*(\d+),\s*aspect:\s*([\d.]+),\s*f:\s*(\{[^}]*\})\s*\}/g))
  ANIM[m[1]] = { n:+m[2], aspect:+m[3], f: JSON.parse(m[4]) };
const ART_V = (src.match(/var ART_V = "(\d+)"/)||[,"1"])[1];
// THE ROSTER IS TRIMMED HERE, before it is serialised, so the page never learns
// about a creature whose strip is not in the tree beside it. Read off the world
// rather than typed: whatever stands in a mountain room is a mountain creature,
// and a roster edited in a migration turns up here without this file changing.
const MOUNTAIN_MOBS = new Set(String.raw`a-fold-dog bone-breaker brooding-vulture carrion-vulture
cave-lion eagle-owl ermine eyrie-holder feral-goat gill-adder glutton hill-eagle hill-fox hill-wolf
lynx mountain-chough mountain-hare ptarmigan red-hind scarp-raven snow-fox stone-adder the-drake
the-herd the-milker wildcat`.split(/\s+/).filter(Boolean));
if (ONLY_MOUNTAIN) {
  for (const id of Object.keys(SPRITE)) if (!MOUNTAIN_MOBS.has(id)) delete SPRITE[id];
  for (const id of Object.keys(ANIM))   if (!MOUNTAIN_MOBS.has(id)) delete ANIM[id];
}
const SIZE = block("MAN_VH") + "\n" + fn("mobVh");   // the size curve, lifted like the driver

const CONSTS = block("CALM_POSES") + "\n" + block("ATTACK_S");
const DRIVER = [fn("poseAt"), fn("mobBeat"), fn("stepAnims"), fn("applyState")].join("\n");

// THE OTHER TWO LAYERS. A creature on a flat brown field is half a preview: the
// game is a sky, a keyed ground in front of it, and the animals standing on
// that — and which ground gets asked for is a decision with as many branches as
// the animation driver has. So paintScene comes across the same way everything
// else does, whole and unedited, with its tables.
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
const SCENE_TABLES = depsFor(fn("paintScene"), "paintScene");
const SCENE_DRIVER = fn("paintScene");
// And its stylesheet, rule by rule, straight out of the served page: the tints,
// the blood moon's masked multiply, the scrims. Anything whose selector names
// the scene or the sky comes over; the page's own overrides go after these and
// win on order, which is the only edit made to any of it.
const styleSrc = src.slice(src.indexOf("<style>"), src.indexOf("</style>"));
const SCENE_CSS = (() => {
  const out = [];
  const clean = styleSrc.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    const sel = m[1].trim();
    // #mobs BELONGS IN THIS LIFT TOO, and leaving it out was the whole of the
    // stage's first bug: the row got its position from the page and everything
    // else - display:flex, the centring, top:55% - from nowhere at all, so the
    // creature stood in the top-left corner instead of on the horizon. The rule
    // that puts an animal in the right place is as much a part of the view as
    // the rule that tints it.
    if (!/#scene|#sky\b|#mobs/.test(sel)) continue;
    if (/^#(scene|sky|mobs) \{/.test(sel + " {")) continue;      // the display:none defaults
    out.push(sel.replace(/body\[data-view="image"\]/g, "#stage") + " {" + m[2] + "}");
  }
  return out.join("\n ");
})();

// THE HYPHEN. This read [a-z]+ and therefore stopped at the first dash, so
// t-after-rain and t-night-torch were silently dropped and the preview showed
// those two hours with no tint at all — the exact failure this page exists to
// prevent, hiding in the page itself. A tint the client has and the preview
// does not is worse than no preview.
const tints = {};
for (const m of src.matchAll(/#mobs\.t-([a-z-]+) +img[^{]*\{ filter: ([^;]+);/g)) tints[m[1]] = m[2];
const STAMP = new Date().toISOString().slice(11,19);
const withDeath = Object.values(ANIM).filter(a=>a.f.death!==undefined).length;
const STRIKE = ["attack","bite","sweep","breath"];
const withAtk   = Object.values(ANIM).filter(a=>STRIKE.some(k=>a.f[k]!==undefined)).length;

// THE SHARE CARD, and it is only in the published build. The working preview has
// no og.png beside it and a card pointing at a file that is not there is worse
// than no card. The image is ROOT-RELATIVE: the published URL is not known until
// the site is deployed, and most scrapers resolve a relative og:image against the
// document. If one refuses, the fix is to bake the absolute URL in on the next
// cut, not to guess it now.
const OG = COPY ? `
<meta property="og:type" content="website">
<meta property="og:title" content="NOMAD — The Mountain">
<meta property="og:description" content="Room and creature art from NOMAD, a MUD that runs on Nostr.">
<meta property="og:image" content="/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">` : "";
fs.writeFileSync(OUT, `<!doctype html><meta charset="utf-8"><title>NOMAD mobs</title>
<meta http-equiv="cache-control" content="no-store">${OG}
<style>
 body{margin:0;background:#16120c;color:#ede3cc;font:13px ui-monospace,Menlo,monospace}
 #bar{position:sticky;top:0;z-index:5;background:#1e1912;border-bottom:1px solid #3a3020;padding:10px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
 select,button{background:#241e15;color:#ede3cc;border:1px solid #3a3020;padding:5px 9px;font:inherit;cursor:pointer}
 button:hover,select:hover{border-color:#d8a94e;color:#d8a94e}
 button.on{border-color:#d8a94e;color:#d8a94e;background:#2e2517}
 /* THE HOUR IS THE CONTROL YOU TOUCH MOST, so it is not behind a menu:
    twelve values, all of them visible, one click each. */
 .seg{display:flex;gap:0;border:1px solid #3a3020}
 .seg button{border:0;border-right:1px solid #3a3020;padding:5px 8px;font-size:11px}
 .seg button:last-child{border-right:0}
 .seg button.on{background:#3a2f1c;color:#f0d089}
 kbd{background:#241e15;border:1px solid #3a3020;border-radius:3px;padding:0 4px;font:inherit;font-size:10px;color:#9a8b66}
 #grid{display:flex;flex-wrap:wrap;gap:6px;padding:18px;align-items:flex-end}
 .cell{border:1px solid #2c2418;background:#100d09;padding:8px;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:150px}
 .stage{height:300px;display:flex;align-items:center;justify-content:center}
 .mob{background-repeat:no-repeat;background-position-y:center;image-rendering:pixelated;
      filter:drop-shadow(0 3px 6px rgba(0,0,0,.75))}
 .n{color:#9a8b66;font-size:11px;text-align:center;line-height:1.5}
 .n b{color:#ede3cc;font-weight:400}
 .no{color:#8a5a4a}
 /* ---- the scene's own stylesheet, lifted ---- */
 ${SCENE_CSS}
 /* ---- end lifted; the four rules below are the only edits: the game's
    layers are fixed to the window and here they line a panel ---- */
 /* FULL WIDTH, like the game — the game's window IS the whole browser, so the
    stage is too. Constraining this to the plate's own ratio shrank it to a
    centred box, which was worse than the crop it was fixing; the crop is
    answered by the "whole plate" button and nowhere else.
    AND IT ENDS WHERE THE WINDOW ENDS. The bar is sticky, so any part of the
    stage that does not fit on screen goes UNDER it the moment you scroll to
    look at it. So the bar and the stage share one viewport-tall box and the
    stage takes whatever the bar leaves — nothing to scroll, nothing covered,
    whatever the bar wraps to. */
 #top{height:100dvh;display:flex;flex-direction:column}
 #bar{flex:0 0 auto}
 /* THE READOUT LIVES INSIDE THE VIEWPORT BOX. It sat after </div>, outside #top,
    which is 100dvh — so it began exactly at the bottom edge of the screen and
    had to be scrolled to. That is fallout from the fix that stopped the bar
    covering the picture: #top became a full-height column and the shelf, already
    outside it, was pushed off the bottom. It reports which plate and which sky
    are up, which day the pool is on, both tints, and why nothing is standing
    here — none of which is any use one scroll below the thing it describes. */
 #shelf{flex:0 0 auto;border-bottom:0;border-top:1px solid #2c2418}
 #stage{position:relative;flex:1 1 auto;min-height:0;
        overflow:hidden;background:#0b0906;border-bottom:1px solid #3a3020}
 /* ...and "whole plate" gives up the crop entirely and letterboxes it, for
    looking at the art rather than at the room. */
 #stage.whole #scene,#stage.whole #sky{background-size:contain!important;background-position:center!important}
 #stage #scene,#stage #sky{position:absolute}
 #stage #mobs{position:absolute}
 #stage.bare::before{content:"no plate for this ground — the world paints bare here too";
   position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#6b5c40}
 #shelf{padding:8px 14px;color:#9a8b66;font-size:11px;border-bottom:1px solid #2c2418;
        display:flex;gap:14px;flex-wrap:wrap;align-items:baseline}
 #shelf b{color:#d8a94e;font-weight:400}
 #shelf .miss{color:#8a5a4a}
 ${Object.entries(tints).map(([k,v])=>`.t-${k} .mob{filter:${v}}`).join("\n ")}
</style>
<div id="top">
<div id="bar">
 <span style="color:#d8a94e">NOMAD</span>
 <label>ground <select id="gnd"></select></label>
 <span id="hours" class="seg"></span><select id="hour" hidden></select>
 <button id="torch">torch</button>
 <span class="seg" id="tides"><button data-sea="0" class="on">dry</button><button data-sea="1">awash</button><button data-sea="2">half</button><button data-sea="3">high</button></span>
 <button id="roll">next sky</button>
 <label>sky <select id="pick"></select></label>
 <button id="fit">whole plate</button>
 <label>standing <select id="who"></select></label>
 <label>scale <select id="sc"></select></label>
 <button id="fire">move</button>
 <button id="atk">attack</button>
 <button id="hit">take a hit</button>
 <button id="die">die</button>
 <button id="slp" data-st="rest">sleep</button>
 <button data-st="hunt">hunting you</button>
 <button data-st="flee">fleeing</button>
 <button data-st="hurt">wounded</button>
 <button data-st="reel">reeling</button>
 <span class="n">build ${STAMP} · ART_V ${ART_V} · ${Object.keys(ANIM).length} animated · ${withAtk} strike · ${withDeath} die</span>
</div>
<div id="stage"><div id="sky"></div><div id="scene"></div><div id="mobs"></div></div>
<div id="shelf"></div>
</div>
<div id="grid"></div>
<script>
var MOB_SPRITE=${JSON.stringify(SPRITE)}, MOB_ANIM=${JSON.stringify(ANIM)}, ART_V="${ART_V}";
// THE ANSWER, WORKED OUT ABOVE, for exactly the grounds this build offers. null
// means the world could not be read and the page will not pretend to know.
var BARREN=${(() => {
  if (!REACH) return "null";
  const t = {};
  new Function("t", SCENE_TABLES + "\nt.gate=GATE_PLATE; t.room=ROOM_PLATE;")(t);
  const out = { gatehouse: "you are behind the door \u2014 nothing is in the world with you" };
  for (const id of [...Object.keys(t.room), ...Object.keys(t.gate)]) {
    const why = REACH.why(id);
    if (why) out[id] = why;
  }
  return JSON.stringify(out);
})()};
// What this build OFFERS. null means everything, which is the working preview.
var ONLY_GATE=${ONLY_MOUNTAIN ? JSON.stringify([...MOUNTAIN_GATES]) : "null"};
var DROP_HOUR=${CUT_ONLY ? JSON.stringify([...WHOLE_PHOTOGRAPH]) : "null"};
/* ---- the scene, lifted verbatim from public.ts ---- */
${SCENE_TABLES}
var sceneEl=document.getElementById("scene"), skyEl=document.getElementById("sky"),
    mobsEl=document.getElementById("mobs"), viewMode="image",
    lastBand="", lastSky="", lastTerrain="", lastRoomKey="", lastPlace="", lastTorch=false, skyRoll=0,
    lastSea=0, scenePainted="", sceneSeq=0;
${SCENE_DRIVER}
/* ---- end lifted ---- */
var SPRITE=MOB_SPRITE, ANIM=MOB_ANIM;   // the page's own shorthand
${SIZE}

/* ---- lifted verbatim from public.ts ---- */
${CONSTS}
${DRIVER}
/* ---- end lifted ---- */

// the preview has no room to repaint, so the body simply stays down
function releaseMobs(){ mobHold = 0; }

var anims=[], hour=document.getElementById("hour"), sc=document.getElementById("sc"), grid=document.getElementById("grid");
var gnd=document.getElementById("gnd"), who=document.getElementById("who"),
    torchBtn=document.getElementById("torch"), rollBtn=document.getElementById("roll"),
    pick=document.getElementById("pick"), fitBtn=null, whole=false,
    stage=document.getElementById("stage"),
    shelf=document.getElementById("shelf"), torch=false, stageAnim=null;
// THE HOURS ARE THE SKIES THE CLIENT KNOWS, read off its own table rather than
// typed here — the list was hand-written before and was two short, missing the
// hour after the rain entirely for as long as that sky has existed.
var HOURS=Object.keys(SKY_KNOWN).filter(function(h){ return !DROP_HOUR||DROP_HOUR.indexOf(h)<0; });
HOURS.forEach(function(h){
  var o=document.createElement("option");o.textContent=h;o.selected=(h==="dusk");hour.appendChild(o);});
// AND THE SAME LIST AGAIN AS BUTTONS. The select is kept and hidden rather than
// removed, because a dozen places read hour.value and every one of them goes on
// working; this is a second face on the same control, not a replacement for it.
var hourBar=document.getElementById("hours");
HOURS.forEach(function(h){
  var b=document.createElement("button"); b.textContent=h; b.dataset.h=h;
  b.onclick=function(){ hour.value=h; repaint(); };
  hourBar.appendChild(b);});
function markHour(){
  var kids=hourBar.children;
  for(var i=0;i<kids.length;i++) kids[i].className=(kids[i].dataset.h===hour.value)?"on":"";
}
// AND THE GROUNDS ARE THE ONES WITH PLATES, likewise read off the tables: a
// ground that gets painted tomorrow appears here the day it is declared.
Object.keys(TERRAIN_PLATE).sort().forEach(function(t){
  var o=document.createElement("option");o.value=t;o.textContent=t;o.selected=(t==="scree");gnd.appendChild(o);});
Object.keys(GATE_PLATE).sort().forEach(function(g){
  if(ONLY_GATE&&ONLY_GATE.indexOf(g)<0) return;
  var o=document.createElement("option");o.value="gate:"+g;o.textContent="gate \u00b7 "+g;gnd.appendChild(o);});
// THE THIRD TABLE. Rooms that are one of one are picked the same way as the
// other two — this list was built from terrains and gates alone, so a room plate
// could be installed and declared and still be unreachable here.
Object.keys(ROOM_PLATE).sort().forEach(function(r){
  var o=document.createElement("option");o.value="room:"+r;o.textContent="room \u00b7 "+r;gnd.appendChild(o);});
Object.keys(MOB_ANIM).sort().forEach(function(id){
  var o=document.createElement("option");o.textContent=id;o.selected=(id==="hill-wolf");who.appendChild(o);});
[0.6,0.8,1,1.4].forEach(function(v){var o=document.createElement("option");o.textContent=v;o.selected=(v==1);sc.appendChild(o);});

function build(){
  grid.innerHTML=""; anims=[];
  var scale=parseFloat(sc.value);
  Object.keys(SPRITE).sort().forEach(function(id){
    var a=ANIM[id], cell=document.createElement("div"); cell.className="cell";
    var stage=document.createElement("div"); stage.className="stage";
    var el=document.createElement("div"); el.className="mob";
    el.style.height=(mobVh(id)*scale*3)+"px";
    if(a){
      el.style.width=(mobVh(id)*scale*3*a.aspect)+"px"; el.style.flex="0 0 auto";
      el.style.backgroundImage="url(mob/"+id+".webp?v="+ART_V+")";
      el.style.backgroundSize=(a.n*100)+"% 100%"; el.style.backgroundPositionX="0%";
      // the client's own choices, made the same way
      var calm=""; for(var q=0;q<CALM_POSES.length;q++) if(a.f[CALM_POSES[q]]!==undefined&&!calm) calm=CALM_POSES[q];
      var acts=[]; for(var w in a.f) if(w!=="idle") acts.push(w); a.acts=acts.length?acts:["idle"];
      var sleep="idle"; for(var z=0;z<SLEEP_POSES.length;z++) if(a.f[SLEEP_POSES[z]]!==undefined){sleep=SLEEP_POSES[z];break;}
      var watch="idle"; for(var z9=0;z9<WATCH_POSES.length;z9++) if(a.f[WATCH_POSES[z9]]!==undefined){watch=WATCH_POSES[z9];break;}
      var rate=a.f["move-a"]!==undefined?7000:a.f.up!==undefined?11000:20000;
      // EVERY blow, the way the client collects them: the drakes have three and
      // a preview that kept only the first would show two frames it cannot draw.
      var strikes=[]; for(var y=0;y<STRIKE_POSES.length;y++) if(a.f[STRIKE_POSES[y]]!==undefined) strikes.push(STRIKE_POSES[y]);
      var strike=strikes[0]||"";
      var recoil="idle"; for(var v=0;v<HIT_POSES.length;v++) if(a.f[HIT_POSES[v]]!==undefined){recoil=HIT_POSES[v];break;}
      anims.push({el:el,spec:a,id:id,phase:"idle",t:0,state:"",calm:calm,sleep:sleep,
                  strike:strike,strikes:strikes,blow:strike,recoil:recoil,watch:watch,rate:rate,
                  slot:anims.length, lift:Math.max(0,(mobVh(id)-MAN_VH)/2)/mobVh(id),
                  next:Date.now()+2000+Math.random()*9000});
    } else {
      el.style.aspectRatio="1"; el.style.backgroundImage="url(mob/"+id+".webp?v="+ART_V+")";
      el.style.backgroundSize="contain"; el.style.backgroundPositionX="center";
    }
    stage.appendChild(el); cell.appendChild(stage);
    var n=document.createElement("div"); n.className="n";
    var flags=[]; if(a){ if(!STRIKE_POSES.some(function(k){return a.f[k]!==undefined})) flags.push("<span class=no>no attack frame</span>");
                         if(a.f.death===undefined)  flags.push("<span class=no>no death frame</span>"); }
    n.innerHTML="<b>"+id+"</b><br>"+mobVh(id).toFixed(0)+"vh"+(a?" · "+a.n+" frames":" · still")
      +(a?"<br>"+Object.keys(a.f).join(" "):"")+(flags.length?"<br>"+flags.join("<br>"):"");
    cell.appendChild(n); grid.appendChild(cell);
  });
}
// THE STAGE. One creature, sized the way the game sizes it — mobVh is a
// fraction of the WINDOW height there and of the panel height here, which is
// the same number scaled by how much of the window the panel takes.
var STAGE_VH = 62;
// WHY NOTHING IS STANDING HERE, or "" if something can. One lookup for all three
// kinds of ground, and the answer was computed from the world rather than typed.
function barren(){
  if(!BARREN) return "";
  var v=gnd.value;
  if(v==="gatehouse") return BARREN.gatehouse||"";
  var c=v.indexOf(":");
  return (c<0?"":BARREN[v.slice(c+1)])||"";
}
function dress(){
  var id=who.value, a=MOB_ANIM[id];
  mobsEl.innerHTML=""; 
  if(stageAnim){var k=anims.indexOf(stageAnim);if(k>=0)anims.splice(k,1);stageAnim=null;}
  if(!a||barren()!=="") return;
  var el=document.createElement("div"); el.className="mob";
  var h=mobVh(id)*STAGE_VH/100;
  el.style.height=h+"vh"; el.style.width=(h*a.aspect)+"vh"; el.style.flex="0 0 auto";
  el.style.backgroundImage="url(mob/"+id+".webp?v="+ART_V+")";
  el.style.backgroundSize=(a.n*100)+"% 100%"; el.style.backgroundPositionX="0%";
  el.style.backgroundRepeat="no-repeat"; el.style.backgroundPositionY="center";
  mobsEl.appendChild(el);
  // Built exactly the way the grid builds one, so the action buttons reach it.
  var calm=""; for(var q=0;q<CALM_POSES.length;q++) if(a.f[CALM_POSES[q]]!==undefined&&!calm) calm=CALM_POSES[q];
  var acts=[]; for(var w in a.f) if(w!=="idle") acts.push(w); a.acts=acts.length?acts:["idle"];
  var sleep="idle"; for(var z=0;z<SLEEP_POSES.length;z++) if(a.f[SLEEP_POSES[z]]!==undefined){sleep=SLEEP_POSES[z];break;}
  var watch="idle"; for(var z9=0;z9<WATCH_POSES.length;z9++) if(a.f[WATCH_POSES[z9]]!==undefined){watch=WATCH_POSES[z9];break;}
  var strikes=[]; for(var y=0;y<STRIKE_POSES.length;y++) if(a.f[STRIKE_POSES[y]]!==undefined) strikes.push(STRIKE_POSES[y]);
  var strike=strikes[0]||"";
  var recoil="idle"; for(var v=0;v<HIT_POSES.length;v++) if(a.f[HIT_POSES[v]]!==undefined){recoil=HIT_POSES[v];break;}
  stageAnim={el:el,spec:a,id:id,phase:"idle",t:0,state:"",calm:calm,sleep:sleep,
             strike:strike,strikes:strikes,blow:strike,
             recoil:recoil,watch:watch,rate:a.f["move-a"]!==undefined?7000:a.f.up!==undefined?11000:20000,
             slot:anims.length, lift:Math.max(0,(mobVh(id)-MAN_VH)/2)/mobVh(id),
             next:Date.now()+2000+Math.random()*9000};
  anims.push(stageAnim);
}
// WHAT THE CLIENT DECIDED, read back off the elements rather than recomputed —
// a shelf that worked out the answer a second time could agree with itself and
// still be wrong about the page.
function shelfLine(){
  // Browsers serialise this as url("...") WITH the quotes, so they have to come
  // off or the shelf prints a stray " in front of every path.
  var url=function(v){ v=v||""; var a=v.indexOf("(")+1, b=v.indexOf("?v=");
    if(a<=0) return "\u2014";
    return v.slice(a, b>0?b:v.length-1).replace(/^["']|["']$/g,""); };
  var sc=url(sceneEl.style.backgroundImage), sk=url(skyEl.style.backgroundImage);
  var missing=(sc!=="\u2014"&&torch&&SKY_BASE[hour.value]==="night"&&sc.indexOf("night-torch")<0);
  stage.className = (sc==="\u2014" ? "bare " : "") + (whole ? "whole" : "");
  var pool=SKY_POOL[hour.value], many=!!(pool&&pool.length>1);
  // THE POOL, NAMED AND PICKABLE. Stepping is how the game does it — once a
  // cycle, in order — and it is the wrong tool for judging one sky against
  // another, which is a thing you do by flipping back and forth. So the pool
  // lists itself and any entry can be pinned. It is the SAME index the day
  // count would land on, so nothing here can show a sky the world could not.
  if(pick.dataset.hour!==hour.value){
    pick.dataset.hour=hour.value; pick.replaceChildren();
    (pool||[hour.value]).forEach(function(e,i){
      var o=document.createElement("option"); o.value=i; o.textContent=e; pick.appendChild(o);});
  }
  // The day no longer INDEXES the pool, it is hashed into it, so the current
  // entry has to be asked for the same way the client asks.
  pick.value=String(pool&&pool.length?mix32(plateHash(hour.value+":"+skyRoll))%pool.length:0);
  pick.disabled=!many;
  rollBtn.disabled=!many;
  rollBtn.textContent=many?"next sky \u00b7 "+(mix32(plateHash(hour.value+":"+skyRoll))%pool.length+1)+"/"+pool.length:"next sky";
  // The turn is invisible in a URL and it is half of what a pool entry says.
  var t=skyEl.style.transform;
  var turn=t.indexOf("-1, -1")>0?" upside down":t?" mirrored":"";
  rollBtn.title=many?"walks the world-day forward to the next day this hour shows a different sky":"this hour owns one sky";
  shelf.innerHTML="ground <b>"+sc+"</b>  sky <b>"+sk+turn+"</b>"
    +"  day <b>"+skyRoll+"</b>"+(pool&&pool.length>1?" of "+pool.length+" skies":" \u00b7 one sky")
    +"  scene tint <b>"+(sceneEl.className||"none")+"</b>  creature tint <b>"+(mobsEl.className||"none")+"</b>"
    +(missing?"  <span class=miss>no torch plate for this ground yet</span>":"")
    +(barren()?"  <span class=miss>"+barren()+"</span>":"");
  markHour();                        // the strip is a view of hour.value, however it changed
  grid.className=mobsEl.className;   // the roster wears whatever the stage's animals wear
}
function repaint(){
  var v=gnd.value, room=v.slice(0,5)==="room:"?v.slice(5):"";
  // Walking ONTO a sanctuary must clear the animal and walking off must bring it
  // back, so this is re-asked on every paint rather than only when you pick one.
  if((barren()!=="")!==(mobsEl.children.length===0)) dress();
  // A room plate is passed as the place and the terrain is left as it was, which
  // is exactly how the wire carries it: place BESIDE terrain, never instead.
  paintScene("mountain", hour.value, room?"scree":v, v, torch?1:0, undefined, room, sea);
  shelfLine();
}
// STEPPING THE WORLD-DAY. In the game this comes off the clock and moves once
// a cycle; here it is a button, because an hour whose pool has two skies in it
// is the one thing you cannot see by waiting.
//
// IT STEPS TO THE NEXT SKY, NOT THE NEXT DAY, and the difference is the whole
// reason it was worth touching. The day is HASHED into the pool rather than
// indexing it, so consecutive days land on the same entry about a quarter of the
// time (measured across 20,000 days: 24.6-25.4% for all five pools, which is
// exactly chance for a pool of four, and is correct — a sky genuinely does
// repeat two days running out on the hill). But a button that does nothing on
// one press in four does not read as the world being honest, it reads as a
// broken button, and runs of three and four identical days exist in the first
// thirty for every hour.
//
// So it walks forward to the next day that shows a DIFFERENT sky, which keeps
// the one property that matters and the picker below already has: every day it
// lands on is a real world-day, so it can never show a sky the game could not.
// The shelf still prints the day count, so a jump of three is visible as one.
rollBtn.onclick=function(){
  var pool=SKY_POOL[hour.value];
  if(!pool||pool.length<2){ skyRoll++; repaint(); return; }
  var now=mix32(plateHash(hour.value+":"+skyRoll))%pool.length;
  for(var d=skyRoll+1;d<skyRoll+9999;d++)
    if(mix32(plateHash(hour.value+":"+d))%pool.length!==now){ skyRoll=d; break; }
  repaint();
};
// PINNING MEANS FINDING A DAY THAT SHOWS IT. The picker used to set the day
// count to the entry's index, which worked only while the day indexed the pool
// directly. It is hashed now, so this walks forward until it finds a real day
// the world would show the chosen sky on — which keeps the property the picker
// had from the start: it can never show you a sky the game could not.
pick.onchange=function(){
  var want=+pick.value, pool=SKY_POOL[hour.value];
  if(!pool||!pool.length) return;
  for(var d=0;d<9999;d++) if(mix32(plateHash(hour.value+":"+d))%pool.length===want){ skyRoll=d; break; }
  repaint();
};
fitBtn=document.getElementById("fit");
fitBtn.onclick=function(){ whole=!whole; fitBtn.className=whole?"on":""; shelfLine(); };
gnd.onchange=repaint; hour.onchange=repaint;
// NOTHING HERE SHOULD NEED A MENU AND A CLICK. Stepping ground and hour from the
// keyboard is the difference between comparing two plates and giving up on it:
// the whole value of this page is flicking back and forth, and a dropdown puts
// three actions in front of every comparison.
function step(sel,d){
  var n=sel.options.length; if(!n) return;
  sel.selectedIndex=(sel.selectedIndex+d+n)%n; repaint();
}
document.addEventListener("keydown",function(e){
  // Never steal a key from something being typed into, and never from a
  // shortcut the browser owns.
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  var t=e.target, tag=t&&t.tagName;
  if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||(t&&t.isContentEditable)) return;
  var k=e.key;
  if(k==="ArrowRight"){ step(gnd,1); }
  else if(k==="ArrowLeft"){ step(gnd,-1); }
  else if(k==="ArrowDown"){ step(hour,1); }
  else if(k==="ArrowUp"){ step(hour,-1); }
  else if(k==="t"||k==="T"){ torchBtn.onclick(); }
  else if(k==="n"||k==="N"||k===" "){ if(!rollBtn.disabled) rollBtn.onclick(); }
  else if(k==="f"||k==="F"){ fitBtn.onclick(); }
  else return;
  e.preventDefault();
});
who.onchange=function(){ dress(); repaint(); };   // a gate answers differently for a boss
torchBtn.onclick=function(){ torch=!torch; torchBtn.className=torch?"on":""; repaint(); };
// THE TIDE, WHICH THE GAME TAKES OFF ITS OWN CLOCK. Here it is a strip, because
// the whole point of looking is to step the four states over one ground and see
// where the waterline lands. 0 is dry and draws no sheet at all.
var sea=0;
var tideWrap=document.getElementById("tides");
Array.prototype.forEach.call(tideWrap.children,function(b){
  b.onclick=function(){
    sea=+b.getAttribute("data-sea");
    Array.prototype.forEach.call(tideWrap.children,function(x){ x.className = x===b?"on":""; });
    repaint();
  };
});

var ids=function(){return anims.map(function(a){return a.id})};
document.getElementById("fire").onclick=function(){anims.forEach(function(a){if(a.phase!=="death"){a.phase="travel";a.t=0;}})};
document.getElementById("atk").onclick=function(){mobBeat(ids(),null,null)};
document.getElementById("hit").onclick=function(){mobBeat(null,ids(),null)};
document.getElementById("die").onclick=function(){mobBeat(null,null,ids())};
// BY SLOT. The client indexes states by a sprite's position in the room list,
// not by what kind of creature it is — three wolves in a den are three slots.
function mkState(v){var o=[];anims.forEach(function(a){o[a.slot]=v});return o}
var state="";
function setState(v){
  state = state===v ? "" : v;
  document.querySelectorAll("[data-st]").forEach(function(b){b.className=b.dataset.st===state?"on":""});
  anims.forEach(function(a){if(a.phase==="death"){a.phase="idle";a.t=0;}});
  mobHold=0; applyState(state?mkState(state):{});
}
document.querySelectorAll("[data-st]").forEach(function(b){
  b.onclick=function(){ setState(b.dataset.st) };
});
// THE SHELF WAITS FOR THE PICTURE. repaint() called shelfLine() straight after
// paintScene, and paintScene does not paint straight away: it holds the previous
// room up behind a preloader and swaps the background on the image's load event.
// So on any plate that was not already cached the shelf read the element BEFORE
// it was set and reported "ground —  sky —" over a room that was plainly on the
// screen — and never corrected itself, because nothing called it again. A warm
// cache hid it completely (the preloader completes synchronously then), which is
// why it survived: it only ever lied on the first look at a plate.
//
// Rather than guess a delay, watch what actually happened. The shelf's whole
// design is to read back off the elements instead of recomputing the answer, so
// this is the same idea one step further: when what the elements say changes,
// say it again.
var shelfWas = "";
setInterval(function(){
  var now = (sceneEl.style.backgroundImage||"") + "|" + (skyEl.style.backgroundImage||"")
          + "|" + (sceneEl.className||"") + "|" + (mobsEl.className||"");
  if (now !== shelfWas) { shelfWas = now; shelfLine(); }
}, 120);
// THE SHELF WAITS FOR THE PICTURE. repaint() called shelfLine() straight after
// paintScene, and paintScene does not paint straight away: it holds the previous
// room up behind a preloader and swaps the background on the image's load event.
// So on any plate not already cached the shelf read the element BEFORE it was
// set, reported "ground —  sky —" over a room plainly on the screen, and never
// corrected itself because nothing called it again. A warm cache hid it
// completely — the preloader completes synchronously then — which is why it
// survived: it only ever lied on the first look at a plate.
//
// Rather than guess a delay, watch what actually happened. The shelf's whole
// design is to read back off the elements instead of recomputing the answer;
// this is that idea one step further — when what the elements say changes, say
// it again.
var shelfWas = "";
setInterval(function(){
  var now = (sceneEl.style.backgroundImage||"") + "|" + (skyEl.style.backgroundImage||"")
          + "|" + (sceneEl.className||"") + "|" + (mobsEl.className||"") + "|" + gnd.value;
  if (now !== shelfWas) { shelfWas = now; shelfLine(); }
}, 120);
setInterval(stepAnims,60);
// THE SCALE REBUILDS THE ROSTER, AND THE ROSTER OWNS THE ANIMATION LIST.
// build() starts with anims=[], which throws away the stage animal's entry while
// leaving the animal itself on screen — so after touching the scale the creature
// looked perfectly normal and every action button silently did nothing to it,
// because ids(), mkState() and setState() all walk anims. It has to be dressed
// again, in that order, or the stage is a picture rather than an animal.
sc.onchange=function(){ build(); dress(); };
build();
dress();
repaint();
</script>
`);

// ---------------------------------------------------------------------------
// AND THEN RUN IT. A syntax check cannot see a blank page, and this file has
// produced one twice: once when the lifted size curve read a table under a name
// the page did not use, and once when a template expression was written with an
// escaped dollar so the whole tint block landed in the CSS as literal text.
// Both parse perfectly. So the page's own script is executed here against a DOM
// stub and asked the only question that matters — did anything come out.
const page = fs.readFileSync(OUT, "utf8");
const script = page.slice(page.indexOf("<script>") + 8, page.lastIndexOf("</script>"));
const mk = (id) => {
  const el = { id, className: "", textContent: "", value: "", dataset: {}, children: [],
    disabled: false, title: "",
    style: { setProperty() {} },
    appendChild(c) { el.children.push(c); if (c.selected) el.value = c.value || c.textContent; },
    replaceChildren() { el.children.length = 0; },
    querySelectorAll: () => [] };
  // innerHTML="" CLEARS CHILDREN, as it does in a browser. It did not here, and a
  // stub that keeps children a real DOM would have dropped reports rooms as
  // occupied when they are empty — which had this check calling a fixed bug
  // broken and, worse, would let a real one through the other way.
  let html = "";
  Object.defineProperty(el, "innerHTML", { get: () => html, set(v) { html = v; if (v === "") el.children.length = 0; } });
  // A SELECT IS A LIST WITH A FINGER ON IT. The keyboard steps grounds and hours
  // by moving selectedIndex, so a stub whose selects have neither options nor an
  // index can only ever prove that a listener was REGISTERED — which is the kind
  // of check that passes while the feature does nothing.
  let si = 0;
  Object.defineProperty(el, "options", { get: () => el.children });
  Object.defineProperty(el, "selectedIndex", {
    get: () => si,
    set(i) { si = i; const c = el.children[i]; if (c) el.value = c.value || c.textContent; },
  });
  return el;
};
const nodes = {};
const heard = {};
const doc = {
  getElementById: (id) => (nodes[id] || (nodes[id] = mk(id))),
  createElement: () => mk(""),
  querySelectorAll: () => [],
  // The page listens for keys now. A stub that cannot take a listener throws on
  // load, which is how this was found rather than shipped.
  addEventListener: (ev, fn) => { (heard[ev] = heard[ev] || []).push(fn); },
};
function FakeImage() { this.complete = true;
  Object.defineProperty(this, "src", { set() { this.onload && this.onload(); } }); }
let ran = true, why = "";
const probe = {};
try {
  // The page hands back the three things a behaviour check needs. Appended here
  // rather than written into the page, so the shipped file carries no test hook.
  new Function("document", "Image", "setInterval", "requestAnimationFrame", "probe",
    script + "\nprobe.driven=function(){return anims.indexOf(stageAnim)>=0};"
           + "\nprobe.scale=function(v){ sc.value=v; sc.onchange(); };")(
    doc, FakeImage, () => 0, () => 0, probe);
} catch (e) { ran = false; why = e.message; }
// CHANGING THE SCALE MUST NOT ORPHAN THE STAGE ANIMAL. It did: build() resets
// anims and the creature stayed on screen answering none of the action buttons.
const drivenBefore = ran && probe.driven();
if (ran) probe.scale("1.4");
const drivenAfter = ran && probe.driven();

const seen = (k) => (nodes[k] ? (nodes[k].style.backgroundImage || "") : "");
// WHAT THE PAGE REFERS TO AND NEVER DECLARES. Every lifted table is SHOUTED, so
// they are findable, and a lift that missed one leaves the name here with no
// var behind it — which is a page that works until the branch reading it runs.
const KNOWN = new Set(["JSON", "Math", "Date", "NaN", "URL", "Infinity", "Object", "Image"]);
// Prose first: this file's comments SHOUT, and every shouted word looked like a
// table. Only a name that is indexed or dotted is a name being used as one.
const bare = script.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const declared = new Set([
  ...[...bare.matchAll(/\b([A-Z][A-Z0-9_]{2,})\s*=/g)].map((m) => m[1]),
  ...[...bare.matchAll(/\bfunction\s+([A-Z][A-Z0-9_]{2,})\b/g)].map((m) => m[1]),
]);
const undeclared = [...new Set([...bare.matchAll(/\b([A-Z][A-Z0-9_]{2,})\s*[[.]/g)].map((m) => m[1]))]
  .filter((n) => !declared.has(n) && !KNOWN.has(n));
// PRESS A KEY AT IT. Registering a handler proves nothing; this drives the real
// one and asks whether the hour actually moved.
const press = (key) => {
  let stopped = false;
  for (const fn of heard.keydown ?? [])
    fn({ key, target: { tagName: "BODY" }, preventDefault() { stopped = true; } });
  return stopped;
};
const hourBefore = nodes.hour?.value;
const keyStopped = ran ? press("ArrowDown") : false;
const hourAfter = nodes.hour?.value;

const checks = [
  ["the script runs at all", ran, why],
  // THE HOUR IS A STRIP OF BUTTONS, not a menu, and every hour the client knows
  // has one — built from the same table the select is, so neither can drift.
  ["the hour strip has every hour the select has", (nodes.hours?.children.length ?? 0) > 0
    && (nodes.hours?.children.length ?? 0) === (nodes.hour?.children.length ?? -1),
    (nodes.hours?.children.length ?? 0) + " buttons, " + (nodes.hour?.children.length ?? 0) + " options"],
  ["the action buttons reach the stage animal", drivenBefore, "on load"],
  ["...and still reach it after the scale changes", drivenAfter, "after sc.onchange"],
  ["a key press moves the hour", keyStopped && hourAfter !== undefined && hourAfter !== hourBefore,
    hourBefore + " -> " + hourAfter],
  ["the stage got a ground", /room-bg\/\w[\w-]*\.webp/.test(seen("scene")), seen("scene")],
  ["...and a sky behind it", /sky\/\w[\w-]*\.webp/.test(seen("sky")), seen("sky")],
  ["a creature was dressed", (nodes.mobs?.children.length ?? 0) > 0],
  // A LAYOUT CHECK, because the first version of the stage passed every other
  // one of these while standing the animal in a corner: the rules that place it
  // were simply never lifted, and nothing here asked whether they had been.
  ["...on the horizon, laid out", /#stage #mobs \{[^}]*top: 55%/.test(page) && /#stage #mobs \{[^}]*display: flex/.test(page)],
  ["the roster was built", (nodes.grid?.children.length ?? 0) > 20, (nodes.grid?.children.length ?? 0) + " cells"],
  ["every tint reached the CSS", Object.keys(tints).every((k) => page.includes(".t-" + k + " .mob{")), Object.keys(tints).join(" ")],
  ["nothing was left uninterpolated", !page.includes("${")],
  // A LIFT THAT RUNS TWICE. Harmless while the two copies agree and quietly
  // wrong the day they stop, so it is a build error either way.
  ["nothing was lifted twice", (() => {
    const seen = {}, dupes = [];
    for (const m of script.matchAll(/^function ([a-zA-Z_$][\w$]*)\(/gm))
      if (seen[m[1]]++) dupes.push(m[1]);
    return dupes.length === 0 || dupes.join(" ");
  })() === true, ""],
  ["every table the page uses was lifted", undeclared.length === 0, undeclared.join(" ")],
  // THE TORCH IS A SECOND STATE and it has to be entered, not assumed. The check
  // above ran only the unlit page, and the one branch that reads TORCH_HOURS
  // sits behind a short-circuit that an unlit page never passes — so the build
  // called a page verified while its torch button threw on every click.
  ["the torch button changes the ground", (() => {
    try {
      const before = seen("scene");
      nodes.torch.onclick();
      return /night-torch/.test(seen("scene")) && seen("scene") !== before;
    } catch (e) { return false; }
  })(), "was " + seen("scene")],
];
let bad = 0;
for (const [name, ok, note] of checks) { if (!ok) { bad++; console.log("  FAIL " + name + (note ? "   " + note : "")); } }

console.log("wrote " + path.relative(GAME, OUT) + " — " + Object.keys(ANIM).length + " animated, "
  + withAtk + " strike, " + withDeath + " die, " + Object.keys(tints).length + " tints"
  + (bad ? "  \u2014 " + bad + " CHECKS FAILED" : "  \u2014 verified in a DOM stub"));
if (bad) process.exit(1);

// ---- THE ASSETS, FOR A TREE THAT HAS TO STAND ON ITS OWN --------------------
//
// Worked out from the tables rather than by copying folders, because the whole
// risk of a trimmed build is a page that offers a plate the tree does not carry:
// on a gateway that is a broken picture with nothing to explain it. So the list
// is derived from exactly what the pickers were just given, and anything the
// tables name and the disk does not have is reported as a hole, loudly, rather
// than discovered later by a stranger looking at the site.
if (COPY) {
  const tables = {};
  // PLATE_OF too: a room may name a picture that belongs to another room, so the
  // file to stage is the STEM, not the id. Without this the staging asks for
  // the-bone-ground-day.webp, which has never existed and never will.
  new Function("t", SCENE_TABLES + "\nt.terrain=TERRAIN_SCENES; t.gate=GATE_PLATE; t.room=ROOM_PLATE; t.sky=SKY_PAINTED; t.alias=(typeof PLATE_OF==='object'?PLATE_OF:{});")(tables);
  const drop = new Set(DROP_HOUR_LIST);
  const conds = (declared) => declared.split(/\s+/).filter((c) => c && !drop.has(c));
  const want = new Set(["mobs.html"]);
  for (const id of Object.keys(ANIM)) want.add("mob/" + id + ".webp");
  for (const h of Object.keys(tables.sky)) want.add("sky/" + h + ".webp");
  for (const [t, decl] of Object.entries(tables.terrain)) for (const c of conds(decl)) want.add("room-bg/" + t + "-" + c + ".webp");
  for (const [g, decl] of Object.entries(tables.gate)) {
    if (ONLY_MOUNTAIN && !MOUNTAIN_GATES.has(g)) continue;
    for (const c of conds(decl)) want.add("room-bg/gate-" + g + "-" + c + ".webp");
  }
  for (const [r, decl] of Object.entries(tables.room)) for (const c of conds(decl)) want.add("room-bg/" + (tables.alias[r] || r) + "-" + c + ".webp");

  let n = 0, bytes = 0; const holes = [];
  for (const rel of [...want].sort()) {
    if (rel === "mobs.html") continue;
    const from = path.join(GAME, "public", rel), to = path.join(DIR, rel);
    if (!fs.existsSync(from)) { holes.push(rel); continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    n++; bytes += fs.statSync(to).size;
  }
  // THE CARD IS DRAWN, NOT SCREENSHOTTED. It is composited out of the same three
  // layers the page itself stacks — a shared sky, a scene with its sky cut out,
  // and a creature stood on the near ground at the size the curve gives it — so
  // the thing a link preview shows IS the feature rather than a picture of a
  // browser window. Redrawn on every staged build, so it can never fall behind
  // the art or the size curve the way a saved screenshot would.
  //
  // THE 55% LINE SURVIVES THE CROP. A card is 1200x630 and a plate is 1584x993,
  // which are not the same shape, so the layers are scaled to width and then cut
  // about the horizon rather than centred — the same thing the page's
  // background-position: center 55% does, for the same reason.
  await (async () => {
    const W = 1200, H = 630;
    const src = (rel) => path.join(GAME, "public", rel);
    const crop = async (rel) => {
      const h = Math.round(W * 993 / 1584);
      return sharp(src(rel)).resize(W, h, { fit: "fill" })
        .extract({ left: 0, top: Math.max(0, Math.round(0.55 * h - 0.55 * H)), width: W, height: H })
        .toBuffer();
    };
    const id = "cave-lion", n = ANIM[id] ? ANIM[id].n : 6, aspect = ANIM[id] ? ANIM[id].aspect : 1.696;
    const units = SPRITE[id] ?? 19;
    const P = Number((src2.match(/var MOB_P = ([\d.]+)/) || [, "0.45"])[1]);
    const tall = Math.round((42 / Math.pow(22, P)) * Math.pow(units, P) / 100 * H);
    const wide = Math.round(tall * aspect);
    const m = await sharp(src("mob/" + id + ".webp")).metadata();
    // AND IT WEARS THE LIGHT IT IS STANDING IN. The page puts a filter on every
    // creature to match the hour, and t-night-torch is the one that goes BRIGHTER
    // and warmer than its own scene, because a carried flame is low and near and
    // falls on the upright thing in front of you first. Compositing the raw strip
    // instead produced an animal lit for a different light than the ground under
    // it — a creature stuck onto a photograph, which is what the tints exist to
    // stop. This is that filter, as near as a raster pass gets it.
    const beast = await sharp(src("mob/" + id + ".webp"))
      .extract({ left: 0, top: 0, width: Math.round(m.width / n), height: m.height })
      .resize(wide, tall, { fit: "fill" })
      .modulate({ brightness: 0.86, saturation: 1.04 })
      .tint({ r: 255, g: 226, b: 188 })
      .toBuffer();
    const sky = await crop("sky/night.webp");
    const scene = await crop("room-bg/the-dry-bones-night-torch.webp");
    await sharp(sky).composite([
      { input: scene, top: 0, left: 0 },
      { input: beast, top: Math.round(0.55 * H - tall / 2), left: Math.round((W - wide) / 2) },
    ]).png({ palette: true, colours: 256, effort: 10 }).toFile(path.join(DIR, "og.png"));
    // PALETTISED, because a straight 24-bit PNG of this came out at 1.7MB and a
    // share card that heavy is one a scraper may simply decline to fetch. The
    // art is pixel art with a limited palette to begin with, so 256 colours
    // costs it almost nothing and takes about four fifths off the file.
    const kb = Math.round(fs.statSync(path.join(DIR, "og.png")).size / 1024);
    console.log("  drew og.png  1200x630  " + kb + "KB  (night sky, torchlit bone ground, the cave lion)");
  })();

  // The page is served at the root by a gateway, so it has to BE the root.
  fs.copyFileSync(OUT, path.join(DIR, "index.html"));
  bytes += fs.statSync(OUT).size;
  console.log("  staged " + (n + 2) + " files, " + (bytes / 1048576).toFixed(1) + "MB, into " + path.relative(GAME, DIR));
  console.log("  (mobs.html copied to index.html — a gateway serves the root)");
  if (holes.length) {
    console.log("  " + holes.length + " PLATES NAMED BUT NOT ON DISK — the page would offer these and show nothing:");
    for (const h of holes) console.log("    " + h);
    process.exit(1);
  }
}
