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
const el=()=>({style:{},className:"",appendChild(){},children:[],
  set _c(v){}, getBoundingClientRect:()=>({width:50})});
const mobsEl={firstChild:null,removeChild(){},children:made,
  appendChild(e){made.push(e)},style:{}};
const ctx={};
const code = grab("MOB_SPRITE")+"\n"+grab("MOB_ANIM")+"\n"+block("MAN_VH")+"\n"+fn("mobVh")+"\n"
  +block("CALM_POSES")+"\n"+block("ATTACK_S")+"\n"
  +'var viewMode="image", lastMobs="", anims=[], animTimer=null, stillness=false, ART_V="13";\n'
  +'function runAnims(){}\n'
  +fn("paintMobs")+"\n"+fn("applyState")+"\n"+fn("fitMobRow")+"\n"
  +"mobsEl = _stub;   // the lifted block declares its own, which the stub must win\n"
  +"ctx.paintMobs=paintMobs; ctx.made=()=>made; ctx.anims=()=>anims;";
new Function("ctx","_stub","document","window",code)(ctx,mobsEl,
  {createElement:()=>el(), getElementById:()=>null},{innerWidth:1512,innerHeight:850});

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

// NOTHING PUTS ITS FEET THROUGH THE PROSE. Everything up to a man's 42vh is
// centred on the horizon and untouched; anything taller grows upward out of his
// line instead of downward past it.
made.length=0;
ctx.paintMobs(["hill-wolf"], null, null);
t("a wolf is not lifted", (ctx.anims()[0].lift||0)===0, String(ctx.anims()[0].lift));
made.length=0;
ctx.paintMobs(["the-drake"], null, null);
const drake=ctx.anims()[0];
t("the drake is lifted", drake.lift>0, drake.lift.toFixed(4));
{
  const h=42/Math.pow(22,0.85)*Math.pow(44,0.85);
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

console.log(fail?"\n"+fail+" FAILED":"\nall pass");
process.exit(fail?1:0);
