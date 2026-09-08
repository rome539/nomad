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
const code = grab("MOB_SPRITE")+"\n"+grab("MOB_ANIM")+"\n"+block("MOB_P")+"\n"+fn("mobVh")+"\n"
  +block("CALM_POSES")+"\n"+block("ATTACK_S")+"\n"
  +'var viewMode="image", lastMobs="", anims=[], animTimer=null, stillness=false, ART_V="13";\n'
  +'function runAnims(){}\n'
  +fn("paintMobs")+"\n"+fn("applyState")+"\n"+fn("fitMobRow")+"\n"
  +"mobsEl = _stub;   // the lifted block declares its own, which the stub must win\n"
  +"ctx.paintMobs=paintMobs; ctx.made=()=>made;";
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

console.log(fail?"\n"+fail+" FAILED":"\nall pass");
process.exit(fail?1:0);
