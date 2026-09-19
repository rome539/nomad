// TEST WHAT paintMobs ACTUALLY BUILDS.
//
//   node scripts/test-mob-paint.mjs
//
// Lifts paintMobs out of public.ts and runs it against a DOM stub. A syntax
// check cannot see a blank page or a body that never gets an element, which is
// exactly the class of bug this catches.
import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(HERE,"..","src/public.ts"),"utf8");
const grab=(n)=>{const i=src.indexOf("var "+n+" = {");return src.slice(i,src.indexOf("\n};",i))+"\n};"};
const fn=(n)=>{const i=src.indexOf("\nfunction "+n+"(");let d=0;
  for(let k=src.indexOf("{",i);k<src.length;k++){if(src[k]==="{")d++;else if(src[k]==="}"&&--d===0)return src.slice(i+1,k+1);}};
const block=(f)=>{const i=src.search(new RegExp("^var "+f+" = ","m"));return src.slice(i,src.indexOf("\nfunction ",i));};

const made=[];
// dataset is part of the stub because the paint uses it: each sprite carries its
// width as a share of the picture box, which is what fitMobRow measures the row
// with now that the style holds a calc() no parseFloat can read.
const el=()=>({style:{},dataset:{},className:"",appendChild(){},children:[],
  set _c(v){}, getBoundingClientRect:()=>({width:50})});
const mobsEl={firstChild:null,removeChild(){},children:made,
  appendChild(e){made.push(e)},style:{}};
const ctx={};
const code = grab("MOB_SPRITE")+"\n"+grab("MOB_ANIM")+"\n"+block("MAN_VH")+"\n"+fn("mobVh")+"\n"+fn("boxPct")+"\n"+fn("picBoxPx")+"\n"
  +block("CALM_POSES")+"\n"+block("ATTACK_S")+"\n"
  +block("NOT_AN_IDLE")+"\n"+fn("mobActs")+"\n"
  +block("ROOTED")+"\n"
  +grab("MOB_EYES")+"\n"
  +'var viewMode="image", lastMobs="", anims=[], animTimer=null, stillness=false, MOB_V="13";\n'
  +'var lastSky="day", lastRed=0;\n'
  // setSky now sets BOTH, because the tests were written when one value carried
  // both facts. setRed below is what a blood moon behind weather looks like: the
  // painted sky is fog, and the moon is still red.
  +'ctx.setSky=function(s){ lastSky=s; lastRed = (s==="blood")?1:0; };\n'
  +'ctx.setRed=function(r){ lastRed = r?1:0; };\n'
  +'function runAnims(){}\n'
  +fn("paintMobs")+"\n"+fn("applyState")+"\n"+fn("fitMobRow")+"\n"
  +"mobsEl = _stub;   // the lifted block declares its own, which the stub must win\n"
  +"ctx.clearAnims=function(){ anims.length=0; }; ctx.paintMobs=paintMobs; ctx.made=()=>made; ctx.anims=()=>anims; ctx.mobVh=mobVh;";
new Function("ctx","_stub","document","window",code)(ctx,mobsEl,
  {createElement:()=>el(), getElementById:()=>null}   /* no #scene: picBoxPx falls back to the window, its text-mode path */,{innerWidth:1512,innerHeight:850});

let fail=0; const t=(n,c,e)=>{console.log((c?"  ok   ":"  FAIL ")+n+(e?"   "+e:""));if(!c)fail++;};

ctx.paintMobs(["hill-wolf"], null, ["red-hind"]);
t("a corpse gets its own element", made.length===2, made.length+" elements");
const body=made.find(e=>e.className==="mob dead");
t("...marked as dead", !!body);
t("...frozen on the death frame", body && body.style.backgroundPositionX==="100%", body&&body.style.backgroundPositionX);
t("...and it is the right animal", body && body.style.backgroundImage.indexOf("red-hind")>0);
t("the living one is still animated", made.some(e=>e.className==="mob"));

made.length=0;
ctx.paintMobs(["hill-wolf"], null, ["_nosuch"]);
t("an unknown body is skipped, not drawn blank", !made.some(e=>e.className==="mob dead"));

// ---- THE RED NIGHT ---------------------------------------------------------
// A hollow thing is drawn with cold pale eyes and gets a second strip of red
// ones laid over it on a blood moon. Both live on ONE element as two stacked
// backgrounds, so a single background-position steps them together; the test is
// that the overlay is there, is FIRST (on top of the base), and that nothing
// alive ever gets one.
made.length=0; ctx.setSky("night"); ctx.paintMobs(["the-tide-warden"], null, null);
let w = made.find(e=>e.className==="mob");
t("on an ordinary night the dead carry one image", w && w.style.backgroundImage.indexOf(".eyes.webp")<0,
  w && w.style.backgroundImage);

made.length=0; ctx.setSky("blood"); ctx.paintMobs(["the-tide-warden"], null, null);
w = made.find(e=>e.className==="mob");
t("on a blood moon the red eyes are laid on", w && w.style.backgroundImage.indexOf(".eyes.webp")>=0);
t("...on top of the creature, not under it",
  w && w.style.backgroundImage.indexOf(".eyes.webp") < w.style.backgroundImage.indexOf("the-tide-warden.webp"));
t("...and the two layers are stepped as one",
  w && w.style.backgroundSize.split(",").length===2 && w.style.backgroundPositionX==="0%",
  w && w.style.backgroundSize);

// A BLOOD MOON BEHIND WEATHER STILL LIGHTS THEM (2026-09-18). The sky slot and
// the red night used to be one value, and weather won it - so on the coast,
// where it is usually fog or rain, the crossing's dead stayed cold-eyed through
// every red moon. The picture is still the weather; the eyes are the moon.
// (paint something else between cases: an unchanged row is deliberately skipped,
//  so the key has to move or the second paint builds nothing at all.)
const bust = function(){ ctx.paintMobs(["hill-wolf"], null, null); made.length = 0; };
bust(); ctx.setSky("fog"); ctx.setRed(1); ctx.paintMobs(["the-tide-warden"], null, null);
w = made.find(e=>e.className==="mob");
t("a blood moon behind fog still lights the eyes",
  w && w.style.backgroundImage.indexOf(".eyes.webp") >= 0, w && w.style.backgroundImage);
bust(); ctx.setSky("fog"); ctx.setRed(0); ctx.paintMobs(["the-tide-warden"], null, null);
w = made.find(e=>e.className==="mob");
t("...and ordinary fog leaves them cold",
  w && w.style.backgroundImage.indexOf(".eyes.webp") < 0, w && w.style.backgroundImage);
made.length=0; ctx.setSky("blood"); ctx.paintMobs(["hill-wolf"], null, null);
w = made.find(e=>e.className==="mob");
t("a living creature gets no eyes on the red night", w && w.style.backgroundImage.indexOf(".eyes.webp")<0);

// AND THE SKY IS PART OF THE CACHE KEY. paintMobs skips its work when the row is
// unchanged, and the row IS unchanged when only the moon turns - so without the
// sky in the key the creature in front of you keeps cold eyes until something
// else happens to reflow the row.
made.length=0; ctx.setSky("night"); ctx.paintMobs(["the-tide-warden"], null, null);
made.length=0; ctx.setSky("blood"); ctx.paintMobs(["the-tide-warden"], null, null);
t("the moon turning red repaints a row that did not otherwise change", made.length===1,
  made.length+" elements rebuilt");

// EVERYTHING STANDS ON THE SAME GROUND. The lift used to be clamped at zero, so
// only creatures TALLER than a man moved and everything shorter was left merely
// centred on the line - feet stopping short of the ground by half the difference.
// Unclamped it goes negative for a short creature and pushes it DOWN instead, so
// a crab, a gull and a drowned man in one room all put their feet in the same
// place. The test for it is not the sign of the number, it is where the feet land.
made.length=0;
ctx.paintMobs(["hill-wolf"], null, null);
t("a wolf is pushed DOWN, not left floating", ctx.anims()[0].lift < 0,
  String(ctx.anims()[0].lift.toFixed(4)));
{
  // The same arithmetic the drake case uses below, on the shortest thing shipped:
  // centre = line - lift*vh, feet = centre + vh/2. It must come out at the man's
  // line whatever the creature is, which is the whole point of unclamping.
  const LINE=55, vh=ctx.mobVh("stone-adder"), lift=ctx.anims()[0] && 0;
  made.length=0; ctx.paintMobs(["stone-adder"], null, null);
  const a=ctx.anims()[0], feet=LINE - a.lift*vh + vh/2;
  t("...and an adder's feet land exactly where a man's do", Math.abs(feet-76)<0.05,
    "feet at "+feet.toFixed(1)+"%");
}
made.length=0;
ctx.paintMobs(["the-drake"], null, null);
const drake=ctx.anims()[0];
t("the drake is lifted", drake.lift>0, drake.lift.toFixed(4));
{
  // ASK THE CODE FOR THE HEIGHT, DO NOT REDERIVE IT. This line used to compute
  // the drake's size from a hand-copied curve with the exponent written into it,
  // and the exponent is a tuning dial: MOB_P moved from 0.85 to 0.45 and the
  // copy did not, so the test went on measuring a 75.7-unit drake against a lift
  // computed for a 57.4-unit one and reported feet at 82.7% forever. The code
  // was right the whole time. A test that recomputes a constant its subject owns
  // does not check that subject, it checks whether anybody remembered to update
  // the test - and a gate that is always red teaches you to stop reading it.
  const h=ctx.mobVh("the-drake");
  const feet=55+h/2-drake.lift*h;
  t("...to stand its feet where a man's are", Math.abs(feet-76)<0.5, "feet at "+feet.toFixed(1)+"%");
}
made.length=0;
ctx.paintMobs([], null, ["the-drake"]);
const bigBody=made.find(e=>e.className==="mob dead");
t("a dead one is lifted the same way", !!bigBody && /translateY\(-\d/.test(bigBody.style.transform||""),
  bigBody && bigBody.style.transform);

// THE HEAP (rome, 2026-09-08). Three wolves in a den are three sprites and were
// one key in a map of states, so the first one to wake spoke for all of them and
// the sleepers got up with it. The state is per SPRITE now, and this is the
// arrangement that proves it: same creature three times, doing three things.
made.length=0;
ctx.paintMobs(["hill-wolf","hill-wolf","hill-wolf"], ["rest","hunt","rest"], null);
const wolves = ctx.anims();
t("three of one kind are three sprites", wolves.length===3, wolves.length+" anims");
const states = wolves.map(a=>a.state).sort();
t("...and they keep three separate states", states.join(",")==="hunt,rest,rest", states.join(","));
const asleep = wolves.filter(a=>a.asleep);
t("...two of them asleep, one not", asleep.length===2, asleep.length+" asleep");
// and each sprite kept the slot it arrived in, whatever the size-sort did to the row
t("every sprite remembers its slot", wolves.map(a=>a.slot).sort().join(",")==="0,1,2",
  wolves.map(a=>a.slot).join(","));

function mkVh(id){ return ctx.mobVh(id); }
function mkLift(id){
  made.length = 0; ctx.clearAnims();
  ctx.paintMobs([id], null, null);
  return ctx.anims()[0].lift;
}


console.log(fail?"\n"+fail+" FAILED":"\nall pass");
process.exit(fail?1:0);
