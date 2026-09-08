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
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, "..");
const SRC = path.join(GAME, "src/public.ts");
const DIR = path.resolve(process.argv[2] ?? path.join(GAME, "preview"));
fs.mkdirSync(DIR, { recursive: true });
// the page asks for mob/<id>.webp; point that at the real art rather than copying it
const link = path.join(DIR, "mob");
try { if (fs.lstatSync(link)) fs.unlinkSync(link); } catch {}
fs.symlinkSync(path.join(GAME, "public/mob"), link, "dir");
const OUT = path.join(DIR, "mobs.html");
const src = fs.readFileSync(SRC, "utf8");
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

const SPRITE = {}; for (const m of grab("MOB_SPRITE").matchAll(/"([a-z-]+)":\s*(\d+)/g)) SPRITE[m[1]] = +m[2];
const ANIM = {};
for (const m of grab("MOB_ANIM").matchAll(/"([a-z-]+)":\s*\{\s*n:\s*(\d+),\s*aspect:\s*([\d.]+),\s*f:\s*(\{[^}]*\})\s*\}/g))
  ANIM[m[1]] = { n:+m[2], aspect:+m[3], f: JSON.parse(m[4]) };
const ART_V = (src.match(/var ART_V = "(\d+)"/)||[,"1"])[1];
const SIZE = block("MOB_P") + "\n" + fn("mobVh");   // the size curve, lifted like the driver

const CONSTS = block("CALM_POSES") + "\n" + block("ATTACK_S");
const DRIVER = [fn("poseAt"), fn("mobBeat"), fn("stepAnims"), fn("applyState")].join("\n");

const tints = {};
for (const m of src.matchAll(/#mobs\.t-([a-z]+) +img[^{]*\{ filter: ([^;]+);/g)) tints[m[1]] = m[2];
const STAMP = new Date().toISOString().slice(11,19);
const withDeath = Object.values(ANIM).filter(a=>a.f.death!==undefined).length;
const STRIKE = ["attack","bite","sweep","breath"];
const withAtk   = Object.values(ANIM).filter(a=>STRIKE.some(k=>a.f[k]!==undefined)).length;

fs.writeFileSync(OUT, `<!doctype html><meta charset="utf-8"><title>NOMAD mobs</title>
<meta http-equiv="cache-control" content="no-store">
<style>
 body{margin:0;background:#16120c;color:#ede3cc;font:13px ui-monospace,Menlo,monospace}
 #bar{position:sticky;top:0;z-index:5;background:#1e1912;border-bottom:1px solid #3a3020;padding:10px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
 select,button{background:#241e15;color:#ede3cc;border:1px solid #3a3020;padding:5px 9px;font:inherit;cursor:pointer}
 button:hover,select:hover{border-color:#d8a94e;color:#d8a94e}
 button.on{border-color:#d8a94e;color:#d8a94e;background:#2e2517}
 #grid{display:flex;flex-wrap:wrap;gap:6px;padding:18px;align-items:flex-end}
 .cell{border:1px solid #2c2418;background:#100d09;padding:8px;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:150px}
 .stage{height:300px;display:flex;align-items:center;justify-content:center}
 .mob{background-repeat:no-repeat;background-position-y:center;image-rendering:pixelated;
      filter:drop-shadow(0 3px 6px rgba(0,0,0,.75))}
 .n{color:#9a8b66;font-size:11px;text-align:center;line-height:1.5}
 .n b{color:#ede3cc;font-weight:400}
 .no{color:#8a5a4a}
 \${Object.entries(tints).map(([k,v])=>\`.t-\${k} .mob{filter:\${v}}\`).join("\\n ")}
</style>
<div id="bar">
 <span style="color:#d8a94e">NOMAD mobs</span>
 <label>hour <select id="hour"></select></label>
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
<div id="grid"></div>
<script>
var MOB_SPRITE=${JSON.stringify(SPRITE)}, MOB_ANIM=${JSON.stringify(ANIM)}, ART_V="${ART_V}";
var SPRITE=MOB_SPRITE, ANIM=MOB_ANIM;   // the page's own shorthand
${SIZE}

/* ---- lifted verbatim from public.ts ---- */
${CONSTS}
${DRIVER}
/* ---- end lifted ---- */

// the preview has no room to repaint, so the body simply stays down
function releaseMobs(){ mobHold = 0; }

var anims=[], hour=document.getElementById("hour"), sc=document.getElementById("sc"), grid=document.getElementById("grid");
["day","night","dawn","dusk","moon","blood","eclipse","fog","rain","snow"].forEach(function(h){
  var o=document.createElement("option");o.textContent=h;hour.appendChild(o);});
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
      var strike=""; for(var y=0;y<STRIKE_POSES.length;y++) if(a.f[STRIKE_POSES[y]]!==undefined){strike=STRIKE_POSES[y];break;}
      var recoil="idle"; for(var v=0;v<HIT_POSES.length;v++) if(a.f[HIT_POSES[v]]!==undefined){recoil=HIT_POSES[v];break;}
      anims.push({el:el,spec:a,id:id,phase:"idle",t:0,state:"",calm:calm,sleep:sleep,strike:strike,recoil:recoil,watch:watch,rate:rate,
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
var ids=function(){return anims.map(function(a){return a.id})};
document.getElementById("fire").onclick=function(){anims.forEach(function(a){if(a.phase!=="death"){a.phase="travel";a.t=0;}})};
document.getElementById("atk").onclick=function(){mobBeat(ids(),null,null)};
document.getElementById("hit").onclick=function(){mobBeat(null,ids(),null)};
document.getElementById("die").onclick=function(){mobBeat(null,null,ids())};
function mkState(v){var o={};anims.forEach(function(a){o[a.id]=v});return o}
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
setInterval(stepAnims,60);
hour.onchange=function(){ grid.className=hour.value==="day"?"":"t-"+hour.value; };
sc.onchange=build;
build();
</script>
`);
console.log("wrote preview/mobs.html — " + Object.keys(ANIM).length + " animated, "
  + withAtk + " strike, " + withDeath + " die");
