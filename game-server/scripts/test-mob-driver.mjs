// TEST THE MOB DRIVER without a browser.
//
//   node scripts/test-mob-driver.mjs
//
// Runs the client's REAL poseAt / mobBeat / stepAnims / applyRest - lifted into
// the preview page by build-mob-preview.mjs, which extracts them verbatim from
// public.ts - against fake creatures, and asserts what each state should look
// like. It proves the mechanism, not the feel: nothing here has ever talked to
// a live server, and the wire half (zone.ts sending "beat", chips.ts sending
// "rest") is not covered.
//
// mk() below stands in for paintMobs and MUST pick sleep / strike / recoil the
// same way it does, or the tests fail for the wrong reason.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.join(HERE, "..", "preview", "mobs.html");
// Always extract the current driver; an ignored preview can survive source edits.
execFileSync(process.execPath, [path.join(HERE, "build-mob-preview.mjs")], { stdio: "inherit" });

const h = fs.readFileSync(PAGE, "utf8");
let js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
js = js.slice(0, js.indexOf("var anims=[], hour="));   // constants + driver only
const ctx = {};
new Function("ctx", "document", js + `
  ctx.poseAt=poseAt; ctx.mobBeat=mobBeat; ctx.stepAnims=stepAnims; ctx.applyState=applyState;
  ctx.ANIM=ANIM; ctx.mobActs=mobActs; ctx.SLEEP_POSES=SLEEP_POSES; ctx.STRIKE_POSES=STRIKE_POSES;
  ctx.HIT_POSES=HIT_POSES;ctx.WATCH_POSES=WATCH_POSES; ctx.ATTACK_S=ATTACK_S; ctx.STAGGER_S=STAGGER_S; ctx.CALM=CALM_POSES;
  ctx.EAT_POSES=EAT_POSES;
  ctx.set=function(v){anims=v}; ctx.hold=function(){return mobHold}; ctx.clr=function(){mobHold=0};
`)(ctx, { getElementById: () => null });

// A sprite's slot is its place in the room list the server sent, which is what
// states are indexed by — see applyState. Most fixtures here are the only thing
// in their room, so slot 0; the den below passes its own.
function mk(id, slot) {
  const spec = Object.assign({}, ctx.ANIM[id]);
  const acts = ctx.mobActs(spec.f);   // the CLIENT's own list, not a copy of it
  spec.acts = acts;
  let sleep = "idle"; for (const p of ctx.SLEEP_POSES) if (spec.f[p] !== undefined) { sleep = p; break; }
  let calm = "";     for (const p of ctx.CALM)        if (spec.f[p] !== undefined && !calm) calm = p;
  const strikes = ctx.STRIKE_POSES.filter((p) => spec.f[p] !== undefined);
  const strike = strikes[0] || "";
  let recoil = "idle"; for (const p of ctx.HIT_POSES) if (spec.f[p] !== undefined) { recoil = p; break; }
  let watch = "idle"; for (const p of ctx.WATCH_POSES) if (spec.f[p] !== undefined) { watch = p; break; }
  // The eating frame, resolved the same way the client resolves it. A grazer's
  // pose is called `graze`, not `feed`, so the fed beat has to go through the
  // list rather than the literal name.
  let eat = "";       for (const p of ctx.EAT_POSES)   if (spec.f[p] !== undefined) { eat = p; break; }
  const rate = spec.f["move-a"] !== undefined ? 7000 : spec.f.up !== undefined ? 11000 : 20000;
  return { el: { style: {} }, spec, id, phase: "idle", t: 0, state: "", calm, sleep,
    strike, strikes, blow: strike, recoil, watch, rate, eat,
    slot: slot === undefined ? 0 : slot, next: Date.now() + 1e9 };
}
// A CREATURE WITH ALMOST NOTHING DRAWN, invented here on purpose. These two
// cases used to point at the ptarmigan, which then had its attack and death
// drawn and quietly stopped testing anything. A fixture that improves out from
// under the test is not a fixture.
ctx.ANIM["_bare"] = { n: 2, aspect: 1, f: { idle: 0, "move-a": 1 } };

const inv = {};
// FIRST NAME WINS A FRAME. Two names may share an index (see ALIAS in
// build-mob-strips), so a last-wins map renamed the glide frame "down" and the
// arc test stopped recognising its own pose.
for (const id in ctx.ANIM) { inv[id] = {}; const f = ctx.ANIM[id].f;
  for (const k in f) if (inv[id][f[k]] === undefined) inv[id][f[k]] = k; }
function into(a, secs) { while (a.t < secs) { ctx.set([a]); ctx.stepAnims(); } }
function run(a, n) { const o = []; for (let i = 0; i < n; i++) { ctx.set([a]); ctx.stepAnims(); o.push(inv[a.id][ctx.poseAt(a, Date.now()).k]); } return o; }

const ATTACK_S_OF=ctx.ATTACK_S, STAG_OF=ctx.STAGGER_S;
let fail=0;const t = (n, c, e) =>{console.log((c?"  ok   ":"  FAIL ")+n+(e?"   "+e:""));if(!c)fail++;};

let a=mk("hill-wolf");ctx.set([a]);ctx.mobBeat(null,null,["hill-wolf"]);
t("death sets the phase",a.phase==="death");
t("death holds the row",ctx.hold()>Date.now());
let fr=run(a,40);
t("it stays down and never gets up",fr.every(x=>x==="death"),"poses seen: "+[...new Set(fr)].join(","));
ctx.clr();

a=mk("hill-wolf");ctx.set([a]);ctx.mobBeat(["hill-wolf"],null,null);
fr=run(a,40);
t("a blow winds up, lands, and comes off it",fr.includes("attack")&&fr.indexOf("attack")>0,
  "["+fr.slice(0,3).join(" ")+" … "+fr.slice(-2).join(" ")+"]");
// the whole movement has to fit inside one four-second round
t("...and it fits inside the round",ATTACK_S_OF+STAG_OF<4,"attack "+ATTACK_S_OF+"s + up to "+STAG_OF+"s stagger");

a=mk("_bare");ctx.set([a]);let was=a.phase;ctx.mobBeat(["_bare"],null,null);
t("no strike pose drawn = pose untouched",a.phase===was);
a=mk("_bare");ctx.set([a]);ctx.mobBeat(null,null,["_bare"]);
t("no death frame drawn = it just goes, no hold",a.phase!=="death"&&!(ctx.hold()>Date.now()));

a=mk("red-hind");ctx.set([a]);ctx.mobBeat(null,["red-hind"],null);
const p=ctx.poseAt(a,Date.now());
t("hit recoils on the idle pose",a.phase==="hit"&&inv["red-hind"][p.k]==="idle");
t("a blow lands the instant it happens, not on the spread",a.t===0);
t("...and it is big enough to see",Math.abs(p.x)>0.05,"knocked back "+(Math.abs(p.x)*100).toFixed(1)+"% of its width");
t("...and twists with it",Math.abs(a.rot)>0.02,(Math.abs(a.rot)*57.3).toFixed(1)+" degrees");

a=mk("hill-wolf");ctx.set([a]);ctx.applyState(["rest"]);
t("asleep flagged",a.asleep===true);
t("a sleeping wolf curls up",inv["hill-wolf"][ctx.poseAt(a,Date.now()).k]==="rest");
a.next=0;ctx.stepAnims();
t("a sleeper never sets off walking",a.phase!=="travel","phase="+a.phase);
ctx.mobBeat(null,["hill-wolf"],null);
t("a blow still reads on a sleeper",a.phase==="hit");
ctx.applyState([]);t("waking clears it",a.asleep===false);

// A SLEEPING FRAME IS ONLY FOR SLEEPING (2026-09-18). CALM_POSES led with "rest"
// and the rooted cycle stepped through it, so thirty-four creatures lay down
// curled up with their eyes shut every few seconds while wide awake. The same
// now goes for the eating frames, which have a real trigger of their own.
{
  const BANNED = ["rest", "feed", "graze"];
  const wrong = [];
  for (const id in ctx.ANIM) {
    if (id[0] === "_") continue;
    const b = mk(id);
    const seen = new Set();
    // the whole idle rotation, and a rooted travel long enough to come round
    for (let t = 0; t < 60; t += 0.05) { b.phase = "idle"; b.t = t; seen.add(inv[id][ctx.poseAt(b, Date.now()).k]); }
    for (let off = 0; off < 10; off++)
      for (let t = 0; t <= 3; t += 0.05) { b.phase = "travel"; b.t = t; b.actOff = off; seen.add(inv[id][ctx.poseAt(b, Date.now()).k]); }
    const shown = BANNED.filter((k) => seen.has(k));
    if (shown.length) wrong.push(id + ":" + shown.join(","));
  }
  t("an awake creature never shows sleep or eating", wrong.length === 0, wrong.slice(0, 6).join(" "));
}
// ...and it still sleeps when it is actually asleep.
a=mk("hill-wolf");ctx.set([a]);ctx.applyState(["rest"]);
t("a napper still lies down when it sleeps",inv["hill-wolf"][ctx.poseAt(a,Date.now()).k]==="rest");

a=mk("stone-adder");ctx.set([a]);ctx.applyState(["rest"]);
const sp=inv["stone-adder"][ctx.poseAt(a,Date.now()).k];
t("a sleeping adder uses its dedicated resting frame",sp==="rest","pose="+sp);
// Retain coverage for sheets with a basking pose but no dedicated rest frame.
ctx.ANIM["_basking"] = { n: 2, aspect: 1, f: { idle: 0, bask: 1 } };
a=mk("_basking");ctx.set([a]);ctx.applyState(["rest"]);
t("basking remains the sleep fallback without a rest frame",ctx.poseAt(a,Date.now()).k===1);

a=mk("cave-lion");ctx.set([a]);ctx.mobBeat(null,["cave-lion"],["cave-lion"]);
t("the killing blow reads as death, not a flinch",a.phase==="death");ctx.clr();


// THE DRAKE HAS THREE BLOWS AND USES ALL OF THEM (2026-09-08). The strike
// lookup used to break on the first match, so bite was the only one it could
// ever throw and sweep and breath sat in the sheet unused.
{
  const thrown = new Set();
  for (let n = 0; n < 200; n++) {
    a = mk("the-drake"); ctx.set([a]); ctx.mobBeat(["the-drake"], null, null);
    into(a, ctx.ATTACK_S * 0.50);
    if (a.phase === "attack") thrown.add(inv["the-drake"][ctx.poseAt(a, Date.now()).k]);
  }
  t("the drake throws every blow it was drawn", ["bite","sweep","breath"].every((k)=>thrown.has(k)),
    "saw: " + [...thrown].join(" "));
  // and the breath is a longer, different shape than a lunge: it holds the
  // windup frame well past the point a bite would already have landed.
  a = mk("the-drake"); ctx.set([a]); ctx.mobBeat(["the-drake"], null, null);
  a.blow = "breath"; into(a, ctx.ATTACK_S * 0.25);
  t("the breath draws in first", inv["the-drake"][ctx.poseAt(a, Date.now()).k]==="inhale",
    "pose=" + inv["the-drake"][ctx.poseAt(a, Date.now()).k]);
  a.t = ctx.ATTACK_S * 0.55;
  t("...and then lets go", inv["the-drake"][ctx.poseAt(a, Date.now()).k]==="breath",
    "pose=" + inv["the-drake"][ctx.poseAt(a, Date.now()).k]);
  // a bite at the same instant is already back on its guard
  a = mk("the-drake"); ctx.set([a]); ctx.mobBeat(["the-drake"], null, null);
  a.blow = "bite"; a.t = ctx.ATTACK_S * 0.25;
  t("a bite at that moment has already landed", inv["the-drake"][ctx.poseAt(a, Date.now()).k]==="bite",
    "pose=" + inv["the-drake"][ctx.poseAt(a, Date.now()).k]);
}
// AND THE FLIGHT HAS ITS TWO ENDS. takeoff at the very start, dive on the way
// down, both drake-only; a bird still climbs out on the beat and glides home.
{
  const arc = (id, at) => { const b = mk(id); b.phase="travel"; b.t = 2.6*at;
    return inv[id][ctx.poseAt(b, Date.now()).k]; };
  t("the drake shoves off the ground", arc("the-drake",0.05)==="takeoff", arc("the-drake",0.05));
  t("...glides", arc("the-drake",0.45)==="glide", arc("the-drake",0.45));
  t("...stoops before it lands", arc("the-drake",0.70)==="dive", arc("the-drake",0.70));
  t("...and puts them out at the end", arc("the-drake",0.92)==="landing", arc("the-drake",0.92));
  // BY FRAME, NOT BY NAME. The down-beat shares the glide's drawing, so asking
  // for the name back gets "glide" - correct behaviour, wrong question.
  {
    const b = mk("hill-eagle"); b.phase = "travel"; b.t = 2.6 * 0.05;
    const k = ctx.poseAt(b, Date.now()).k, f = ctx.ANIM["hill-eagle"].f;
    t("a bird has no takeoff and beats instead", k === f.up || k === f.down, "frame " + k);
  }
  t("...and glides straight to the landing", arc("hill-eagle",0.80)==="landing", arc("hill-eagle",0.80));
}

// A HEAP KEEPS ITS OWN HEADS. States arrive one per sprite, indexed by the slot
// the creature held in the room list — keyed by name, one wolf waking woke all.
{
  const w0 = mk("hill-wolf", 0), w1 = mk("hill-wolf", 1), w2 = mk("hill-wolf", 2);
  ctx.set([w0, w1, w2]);
  ctx.applyState(["rest", "hunt", "rest"]);
  t("the one that woke is the only one awake",
    w0.asleep === true && w1.asleep === false && w2.asleep === true,
    [w0.asleep, w1.asleep, w2.asleep].join(","));
  // and the sleepers must not set off walking behind it
  w0.next = w2.next = Date.now() - 1;
  for (let n = 0; n < 40; n++) ctx.stepAnims();
  t("...and the sleepers never set off walking",
    w0.phase !== "travel" && w2.phase !== "travel", w0.phase + "/" + w2.phase);
}
a=mk("the-pale-drake");ctx.set([a]);ctx.mobBeat(null,["the-pale-drake"],null);into(a,0.1);
t("the drake uses its own drawn recoil",inv["the-pale-drake"][ctx.poseAt(a,Date.now()).k]==="hit","pose="+inv["the-pale-drake"][ctx.poseAt(a,Date.now()).k]);
a=mk("hill-wolf");ctx.set([a]);ctx.mobBeat(null,["hill-wolf"],null);into(a,0.1);
t("everything else still flinches on idle",inv["hill-wolf"][ctx.poseAt(a,Date.now()).k]==="idle");

a=mk("great-vulture");ctx.set([a]);ctx.mobBeat(null,null,null,["great-vulture"]);
t("a scavenger drops its head to the body",a.phase==="feed"&&inv["great-vulture"][ctx.poseAt(a,Date.now()).k]==="feed");
// A GRAZER EATS TOO, AND ITS FRAME IS NOT CALLED "feed" (2026-09-18). The fed
// beat used to name that pose literally, so everything drawn with its head down
// in the ground was sent the signal and had nothing to answer it with.
a=mk("ford-eel");ctx.set([a]);ctx.mobBeat(null,null,null,["ford-eel"]);
t("a grazer eats with its own graze frame",a.phase==="feed"&&inv["ford-eel"][ctx.poseAt(a,Date.now()).k]==="graze",
  "pose="+inv["ford-eel"][ctx.poseAt(a,Date.now()).k]);
// AND THE BIRDS' WINGBEAT IS ONE DRAWING UNDER TWO NAMES, which is the cell that
// paid for their meal. Both names must land on the same frame, and the flight
// arc must still be intact around it.
// THE BEAT NEEDS TWO DIFFERENT PICTURES (2026-09-18). Sharing a cell between up
// and down bought the meal its cell, but pointing BOTH names at one frame meant
// the wings never moved - the birds crossed a room like paper cutouts. The
// downstroke and the level glide are two drawings the sheet already has, so the
// beat alternates those and nothing had to be redrawn.
{
  const wrong = [];
  for (const id in ctx.ANIM) {
    const f = ctx.ANIM[id].f;
    if (f.up === undefined) continue;                  // not a flyer
    if (f.down === undefined || f.down === f.up) wrong.push(id);
  }
  t("every flyer beats between two different frames", wrong.length === 0, wrong.join(" "));
  const f = ctx.ANIM["great-gull"].f;
  t("...and still has the arc to glide and land", f.glide !== undefined && f.landing !== undefined);
  t("...and was drawn eating", f.feed !== undefined);
  // and the wings actually change picture over a flight
  const a2 = mk("great-gull"); const seen = new Set();
  for (let t2 = 0; t2 <= 3; t2 += 0.02) { a2.phase = "travel"; a2.t = t2; seen.add(ctx.poseAt(a2, Date.now()).k); }
  t("...and a bird in flight shows more than one wing pose", seen.size > 1, "frames seen: " + seen.size);
}
a=mk("ptarmigan");ctx.set([a]);a.phase="travel";a.t=0;
let seen=new Set(); for(let i=0;i<45;i++){ctx.set([a]);ctx.stepAnims();seen.add(inv["ptarmigan"][ctx.poseAt(a,Date.now()).k]);}
t("a bird flies a whole arc, not just a wingbeat",seen.has("glide")&&seen.has("landing"),[...seen].join(" "));

a=mk("hill-wolf");ctx.set([a]);ctx.applyState(["hunt"]);
t("a wolf that has you stops wandering",a.state==="hunt");
a.next=0;ctx.stepAnims();
t("...and will not stroll off mid-hunt",a.phase!=="travel","phase="+a.phase);
const hp=ctx.poseAt(a,Date.now());
t("...it holds you with its watch pose",inv["hill-wolf"][hp.k]===a.watch,"pose="+inv["hill-wolf"][hp.k]);
a=mk("red-hind");ctx.set([a]);a.phase="travel";a.t=0;ctx.applyState(["flee"]);
t("a fleeing creature drops the stroll at once",a.phase!=="travel");
ctx.stepAnims();t("...and moves away, not across",ctx.poseAt(a,Date.now()).x<0,"x="+ctx.poseAt(a,Date.now()).x.toFixed(3));
a=mk("hill-wolf");ctx.set([a]);ctx.applyState([]);
t("nothing on the wire = it is free to wander",a.state==="");

let w1=mk("hill-wolf"),w2=mk("cave-lion");ctx.set([w1,w2]);ctx.mobBeat(["hill-wolf","cave-lion"],null,null);
t("two creatures in one round do not swing together",w1.t!==w2.t,"offsets "+w1.t.toFixed(2)+"s / "+w2.t.toFixed(2)+"s");


// A ROOTED CREATURE MUST NOT ACT OUT ITS OWN DEATH WHILE NOTHING IS HAPPENING.
// The rooted path cycles spec.acts one per second, and acts used to be every
// pose but idle - so a conger lying in its hole rolled over dead, held it a
// beat and got up, roughly twice a minute. Six creatures did it. The whole
// reason it survived the suite is that the fixture above built its own copy of
// the list and agreed with the broken client; it now calls the client's own
// mobActs, so this assertion is about the shipped code and not about a copy.
const ROOTED_IDS = Object.keys(ctx.ANIM).filter(function (id) {
  const f = ctx.ANIM[id].f;
  return f["move-a"] === undefined && f.up === undefined;
});
t("there are rooted creatures to check at all", ROOTED_IDS.length > 0, ROOTED_IDS.length + " of them");
const NEVER_IDLE = ["death","attack","bite","sweep","breath","inhale","recover","hit","feed"];
let actedOut = [];
for (const id of ROOTED_IDS) {
  const a2 = mk(id);
  const inv2 = {}; for (const k in a2.spec.f) inv2[a2.spec.f[k]] = k;
  const shown = new Set();
  for (let off = 0; off < Math.max(1, a2.spec.acts.length); off++) {
    a2.phase = "travel"; a2.actOff = off;
    for (let ms = 0; ms < 2600; ms += 100) { a2.t = ms / 1000; shown.add(inv2[ctx.poseAt(a2, Date.now()).k]); }
  }
  const bad = [...shown].filter((n) => NEVER_IDLE.indexOf(n) >= 0);
  if (bad.length) actedOut.push(id + "[" + bad.join(",") + "]");
}
t("a rooted creature never idles through a blow or its own death",
  actedOut.length === 0, actedOut.join(" ") || "all " + ROOTED_IDS.length + " clean");

// ...and the work a creature was DRAWN doing still survives that exclusion,
// which is the thing it must not take away with it.
//
// This named the salt widow and her two work poses. She was the only rooted
// creature that owned two, so she was the natural example - and then she was
// redrawn with a gait, gave up work-the-pan for it, and the assertion was left
// testing a creature that no longer fits its own description and a frame that
// no longer exists (2026-09-21). A test pinned to one creature goes stale the
// day that creature is redrawn, and it fails pointing at the roster instead of
// at the rule. So it asks the rule of EVERY creature instead: a work pose that
// is drawn must come back out of mobActs, whatever else changes about who owns
// one. The count is printed so the gate cannot quietly end up with no subjects
// the way the old one did.
let workless = [], subjects = 0;
for (const id of Object.keys(ctx.ANIM)) {
  const spec2 = mk(id).spec;
  const works = ctx.CALM.filter((c) => spec2.f[c] !== undefined);
  if (!works.length) continue;
  subjects++;
  const lost = works.filter((c) => spec2.acts.indexOf(c) < 0);
  if (lost.length) workless.push(id + "[" + lost.join(",") + "]");
}
t("the work a creature was drawn doing survives into its act list",
  subjects > 0 && workless.length === 0,
  workless.join(" ") || "all " + subjects + " workers clean");

// AN ALERT IS NOT AN IDLE. "alert" sat in CALM_POSES as well as WATCH_POSES, so
// a creature whose only spare frame was one cut to it every three seconds and
// then had nothing left to change to when it actually saw you.
const seal = mk("bull-seal");
t("an alert frame is what it shows you, not what it does alone",
  seal.calm !== "alert" && seal.watch === "alert", "calm=" + (seal.calm || "(none)") + " watch=" + seal.watch);

// A TAKEOFF THAT NOBODY COULD EVER SEE. The takeoff branch used to sit INSIDE
// the full-arc one, so a creature only reached it if it ALSO owned a glide AND
// a landing. That was the drakes and nobody else - meaning a bird drawn leaving
// the ground, cut, packed and shipped, would jump straight to a wingbeat and the
// frame would never once appear. Nothing caught it: the strip audit passes,
// because the frame IS in the strip and its index IS valid.
//
// The fixture is synthetic on purpose. Pointing this at a real creature is how
// the ptarmigan cases above rotted - the moment somebody draws that animal a
// glide, the test starts passing for the wrong reason and stops guarding this.
ctx.ANIM["_launcher"] = { n: 4, aspect: 1, f: { idle: 0, takeoff: 1, up: 2, down: 3 } };
const lift = mk("_launcher");
lift.phase = "travel";
lift.t = 0.13 * (2600 / 1000) * 0.5;                  // inside the first 13% of TRAVEL_MS
const off = { 0: "idle", 1: "takeoff", 2: "up", 3: "down" }[ctx.poseAt(lift, Date.now()).k];
t("a bird drawn leaving the ground is shown leaving the ground, arc or no arc",
  off === "takeoff", "pose=" + off);
lift.t = 2.0;                                         // well past it
const flying = { 0: "idle", 1: "takeoff", 2: "up", 3: "down" }[ctx.poseAt(lift, Date.now()).k];
t("...and then gets on with the beat", flying === "up" || flying === "down", "pose=" + flying);
// The coast's gulls are the control: redrawn this batch with a beat and NO
// takeoff drawn, so they must not acquire one.
const gull = mk("great-gull");
gull.phase = "travel"; gull.t = 0.1;
const gp = inv["great-gull"][ctx.poseAt(gull, Date.now()).k];
t("a bird with no takeoff drawn does not invent one", gp !== "takeoff", "pose=" + gp);

console.log(fail?"\n"+fail+" FAILED":"\nall pass");process.exit(fail?1:0);
