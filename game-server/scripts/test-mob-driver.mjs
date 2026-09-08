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
  ctx.poseAt=poseAt; ctx.mobBeat=mobBeat; ctx.stepAnims=stepAnims; ctx.applyRest=applyRest;
  ctx.ANIM=ANIM; ctx.SLEEP_POSES=SLEEP_POSES; ctx.STRIKE_POSES=STRIKE_POSES;
  ctx.HIT_POSES=HIT_POSES; ctx.CALM=CALM_POSES;
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
  return { el: { style: {} }, spec, id, phase: "idle", t: 0, calm, sleep, strike, recoil, next: Date.now() + 1e9 };
}
const inv = {};
for (const id in ctx.ANIM) { inv[id] = {}; const f = ctx.ANIM[id].f; for (const k in f) inv[id][f[k]] = k; }
function run(a, n) { const o = []; for (let i = 0; i < n; i++) { ctx.set([a]); ctx.stepAnims(); o.push(inv[a.id][ctx.poseAt(a, Date.now()).k]); } return o; }

let fail=0;const t = (n, c, e) =>{console.log((c?"  ok   ":"  FAIL ")+n+(e?"   "+e:""));if(!c)fail++;};

let a=mk("hill-wolf");ctx.set([a]);ctx.mobBeat(null,null,["hill-wolf"]);
t("death sets the phase",a.phase==="death");
t("death holds the row",ctx.hold()>Date.now());
let fr=run(a,40);
t("it stays down and never gets up",fr.every(x=>x==="death"),"poses seen: "+[...new Set(fr)].join(","));
ctx.clr();

a=mk("hill-wolf");ctx.set([a]);ctx.mobBeat(["hill-wolf"],null,null);
fr=run(a,26);
t("attack strikes then returns",fr[0]==="attack"&&fr[fr.length-1]==="idle","["+fr[0]+" … "+fr[fr.length-1]+"]");

a=mk("ptarmigan");ctx.set([a]);let was=a.phase;ctx.mobBeat(["ptarmigan"],null,null);
t("no strike pose drawn = pose untouched",a.phase===was);
a=mk("ptarmigan");ctx.set([a]);ctx.mobBeat(null,null,["ptarmigan"]);
t("no death frame drawn = it just goes, no hold",a.phase!=="death"&&!(ctx.hold()>Date.now()));

a=mk("red-hind");ctx.set([a]);ctx.mobBeat(null,["red-hind"],null);ctx.stepAnims();
const p=ctx.poseAt(a,Date.now());
t("hit recoils on the idle pose",a.phase==="hit"&&inv["red-hind"][p.k]==="idle");
t("hit actually shakes it",Math.abs(p.x)>0||Math.abs(a.rot)>0,"x="+p.x.toFixed(4)+" rot="+(a.rot||0).toFixed(4));

a=mk("hill-wolf");ctx.set([a]);ctx.applyRest(["hill-wolf"]);
t("asleep flagged",a.asleep===true);
t("a sleeping wolf curls up",inv["hill-wolf"][ctx.poseAt(a,Date.now()).k]==="rest");
a.next=0;ctx.stepAnims();
t("a sleeper never sets off walking",a.phase!=="travel","phase="+a.phase);
ctx.mobBeat(null,["hill-wolf"],null);
t("a blow still reads on a sleeper",a.phase==="hit");
ctx.applyRest([]);t("waking clears it",a.asleep===false);

a=mk("stone-adder");ctx.set([a]);ctx.applyRest(["stone-adder"]);
const sp=inv["stone-adder"][ctx.poseAt(a,Date.now()).k];
t("an adder lies out flat to bask",sp==="bask","pose="+sp);

a=mk("cave-lion");ctx.set([a]);ctx.mobBeat(null,["cave-lion"],["cave-lion"]);
t("the killing blow reads as death, not a flinch",a.phase==="death");ctx.clr();


a=mk("the-drake");ctx.set([a]);ctx.mobBeat(["the-drake"],null,null);
t("the drake can finally strike",a.phase==="attack"&&inv["the-drake"][ctx.poseAt(a,Date.now()).k]==="bite","pose="+inv["the-drake"][ctx.poseAt(a,Date.now()).k]);
a=mk("the-pale-drake");ctx.set([a]);ctx.mobBeat(null,["the-pale-drake"],null);
t("the drake uses its own drawn recoil",inv["the-pale-drake"][ctx.poseAt(a,Date.now()).k]==="hit","pose="+inv["the-pale-drake"][ctx.poseAt(a,Date.now()).k]);
a=mk("hill-wolf");ctx.set([a]);ctx.mobBeat(null,["hill-wolf"],null);
t("everything else still flinches on idle",inv["hill-wolf"][ctx.poseAt(a,Date.now()).k]==="idle");

console.log(fail?"\n"+fail+" FAILED":"\nall pass");process.exit(fail?1:0);
