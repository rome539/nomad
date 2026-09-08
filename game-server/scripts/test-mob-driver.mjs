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
if (!fs.existsSync(PAGE)) execFileSync(process.execPath, [path.join(HERE, "build-mob-preview.mjs")], { stdio: "inherit" });

const h = fs.readFileSync(PAGE, "utf8");
let js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
js = js.slice(0, js.indexOf("var anims=[], hour="));   // constants + driver only
const ctx = {};
new Function("ctx", "document", js + `
  ctx.poseAt=poseAt; ctx.mobBeat=mobBeat; ctx.stepAnims=stepAnims; ctx.applyState=applyState;
  ctx.ANIM=ANIM; ctx.SLEEP_POSES=SLEEP_POSES; ctx.STRIKE_POSES=STRIKE_POSES;
  ctx.HIT_POSES=HIT_POSES;ctx.WATCH_POSES=WATCH_POSES; ctx.ATTACK_S=ATTACK_S; ctx.STAGGER_S=STAGGER_S; ctx.CALM=CALM_POSES;
  ctx.set=function(v){anims=v}; ctx.hold=function(){return mobHold}; ctx.clr=function(){mobHold=0};
`)(ctx, { getElementById: () => null });

function mk(id) {
  const spec = Object.assign({}, ctx.ANIM[id]);
  const acts = []; for (const w in spec.f) if (w !== "idle") acts.push(w);
  spec.acts = acts;
  let sleep = "idle"; for (const p of ctx.SLEEP_POSES) if (spec.f[p] !== undefined) { sleep = p; break; }
  let calm = "";     for (const p of ctx.CALM)        if (spec.f[p] !== undefined && !calm) calm = p;
  let strike = "";   for (const p of ctx.STRIKE_POSES) if (spec.f[p] !== undefined) { strike = p; break; }
  let recoil = "idle"; for (const p of ctx.HIT_POSES) if (spec.f[p] !== undefined) { recoil = p; break; }
  let watch = "idle"; for (const p of ctx.WATCH_POSES) if (spec.f[p] !== undefined) { watch = p; break; }
  const rate = spec.f["move-a"] !== undefined ? 7000 : spec.f.up !== undefined ? 11000 : 20000;
  return { el: { style: {} }, spec, id, phase: "idle", t: 0, state: "", calm, sleep, strike, recoil, watch, rate, next: Date.now() + 1e9 };
}
// A CREATURE WITH ALMOST NOTHING DRAWN, invented here on purpose. These two
// cases used to point at the ptarmigan, which then had its attack and death
// drawn and quietly stopped testing anything. A fixture that improves out from
// under the test is not a fixture.
ctx.ANIM["_bare"] = { n: 2, aspect: 1, f: { idle: 0, "move-a": 1 } };

const inv = {};
for (const id in ctx.ANIM) { inv[id] = {}; const f = ctx.ANIM[id].f; for (const k in f) inv[id][f[k]] = k; }
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

a=mk("red-hind");ctx.set([a]);ctx.mobBeat(null,["red-hind"],null);into(a,0.12);
const p=ctx.poseAt(a,Date.now());
t("hit recoils on the idle pose",a.phase==="hit"&&inv["red-hind"][p.k]==="idle");
t("hit actually shakes it",Math.abs(p.x)>0||Math.abs(a.rot)>0,"x="+p.x.toFixed(4)+" rot="+(a.rot||0).toFixed(4));

a=mk("hill-wolf");ctx.set([a]);ctx.applyState({"hill-wolf":"rest"});
t("asleep flagged",a.asleep===true);
t("a sleeping wolf curls up",inv["hill-wolf"][ctx.poseAt(a,Date.now()).k]==="rest");
a.next=0;ctx.stepAnims();
t("a sleeper never sets off walking",a.phase!=="travel","phase="+a.phase);
ctx.mobBeat(null,["hill-wolf"],null);
t("a blow still reads on a sleeper",a.phase==="hit");
ctx.applyState({});t("waking clears it",a.asleep===false);

a=mk("stone-adder");ctx.set([a]);ctx.applyState({"stone-adder":"rest"});
const sp=inv["stone-adder"][ctx.poseAt(a,Date.now()).k];
t("an adder lies out flat to bask",sp==="bask","pose="+sp);

a=mk("cave-lion");ctx.set([a]);ctx.mobBeat(null,["cave-lion"],["cave-lion"]);
t("the killing blow reads as death, not a flinch",a.phase==="death");ctx.clr();


a=mk("the-drake");ctx.set([a]);ctx.mobBeat(["the-drake"],null,null);into(a,ctx.ATTACK_S*0.35);
t("the drake can finally strike",a.phase==="attack"&&inv["the-drake"][ctx.poseAt(a,Date.now()).k]==="bite","pose="+inv["the-drake"][ctx.poseAt(a,Date.now()).k]);
a=mk("the-pale-drake");ctx.set([a]);ctx.mobBeat(null,["the-pale-drake"],null);into(a,0.1);
t("the drake uses its own drawn recoil",inv["the-pale-drake"][ctx.poseAt(a,Date.now()).k]==="hit","pose="+inv["the-pale-drake"][ctx.poseAt(a,Date.now()).k]);
a=mk("hill-wolf");ctx.set([a]);ctx.mobBeat(null,["hill-wolf"],null);into(a,0.1);
t("everything else still flinches on idle",inv["hill-wolf"][ctx.poseAt(a,Date.now()).k]==="idle");

a=mk("great-vulture");ctx.set([a]);ctx.mobBeat(null,null,null,["great-vulture"]);
t("a scavenger drops its head to the body",a.phase==="feed"&&inv["great-vulture"][ctx.poseAt(a,Date.now()).k]==="feed");
a=mk("ptarmigan");ctx.set([a]);a.phase="travel";a.t=0;
let seen=new Set(); for(let i=0;i<45;i++){ctx.set([a]);ctx.stepAnims();seen.add(inv["ptarmigan"][ctx.poseAt(a,Date.now()).k]);}
t("a bird flies a whole arc, not just a wingbeat",seen.has("glide")&&seen.has("landing"),[...seen].join(" "));

a=mk("hill-wolf");ctx.set([a]);ctx.applyState({"hill-wolf":"hunt"});
t("a wolf that has you stops wandering",a.state==="hunt");
a.next=0;ctx.stepAnims();
t("...and will not stroll off mid-hunt",a.phase!=="travel","phase="+a.phase);
const hp=ctx.poseAt(a,Date.now());
t("...it holds you with its watch pose",inv["hill-wolf"][hp.k]===a.watch,"pose="+inv["hill-wolf"][hp.k]);
a=mk("red-hind");ctx.set([a]);a.phase="travel";a.t=0;ctx.applyState({"red-hind":"flee"});
t("a fleeing creature drops the stroll at once",a.phase!=="travel");
ctx.stepAnims();t("...and moves away, not across",ctx.poseAt(a,Date.now()).x<0,"x="+ctx.poseAt(a,Date.now()).x.toFixed(3));
a=mk("hill-wolf");ctx.set([a]);ctx.applyState({});
t("nothing on the wire = it is free to wander",a.state==="");

let w1=mk("hill-wolf"),w2=mk("cave-lion");ctx.set([w1,w2]);ctx.mobBeat(["hill-wolf","cave-lion"],null,null);
t("two creatures in one round do not swing together",w1.t!==w2.t,"offsets "+w1.t.toFixed(2)+"s / "+w2.t.toFixed(2)+"s");

console.log(fail?"\n"+fail+" FAILED":"\nall pass");process.exit(fail?1:0);
