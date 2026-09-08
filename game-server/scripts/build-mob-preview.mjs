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
for (const dir of ["mob", "room-bg", "sky"]) {
  const link = path.join(DIR, dir);
  try { if (fs.lstatSync(link)) fs.unlinkSync(link); } catch {}
  fs.symlinkSync(path.join(GAME, "public", dir), link, "dir");
}
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
 /* ---- the scene's own stylesheet, lifted ---- */
 ${SCENE_CSS}
 /* ---- end lifted; the four rules below are the only edits: the game's
    layers are fixed to the window and here they line a panel ---- */
 #stage{position:relative;height:62vh;min-height:340px;overflow:hidden;background:#0b0906;
        border-bottom:1px solid #3a3020}
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
<div id="bar">
 <span style="color:#d8a94e">NOMAD</span>
 <label>ground <select id="gnd"></select></label>
 <label>hour <select id="hour"></select></label>
 <button id="torch">torch</button>
 <button id="roll">next day</button>
 <label>sky <select id="pick"></select></label>
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
<div id="grid"></div>
<script>
var MOB_SPRITE=${JSON.stringify(SPRITE)}, MOB_ANIM=${JSON.stringify(ANIM)}, ART_V="${ART_V}";
/* ---- the scene, lifted verbatim from public.ts ---- */
${SCENE_TABLES}
var sceneEl=document.getElementById("scene"), skyEl=document.getElementById("sky"),
    mobsEl=document.getElementById("mobs"), viewMode="image",
    lastBand="", lastSky="", lastTerrain="", lastRoomKey="", lastTorch=false, skyRoll=0,
    scenePainted="", sceneSeq=0;
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
    pick=document.getElementById("pick"),
    stage=document.getElementById("stage"),
    shelf=document.getElementById("shelf"), torch=false, stageAnim=null;
// THE HOURS ARE THE SKIES THE CLIENT KNOWS, read off its own table rather than
// typed here — the list was hand-written before and was two short, missing the
// hour after the rain entirely for as long as that sky has existed.
Object.keys(SKY_KNOWN).forEach(function(h){
  var o=document.createElement("option");o.textContent=h;o.selected=(h==="dusk");hour.appendChild(o);});
// AND THE GROUNDS ARE THE ONES WITH PLATES, likewise read off the tables: a
// ground that gets painted tomorrow appears here the day it is declared.
Object.keys(TERRAIN_PLATE).sort().forEach(function(t){
  var o=document.createElement("option");o.value=t;o.textContent=t;o.selected=(t==="scree");gnd.appendChild(o);});
Object.keys(GATE_PLATE).sort().forEach(function(g){
  var o=document.createElement("option");o.value="gate:"+g;o.textContent="gate \u00b7 "+g;gnd.appendChild(o);});
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
// THE STAGE. One creature, sized the way the game sizes it — mobVh is a
// fraction of the WINDOW height there and of the panel height here, which is
// the same number scaled by how much of the window the panel takes.
var STAGE_VH = 62;
function dress(){
  var id=who.value, a=MOB_ANIM[id];
  mobsEl.innerHTML=""; 
  if(stageAnim){var k=anims.indexOf(stageAnim);if(k>=0)anims.splice(k,1);stageAnim=null;}
  if(!a) return;
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
  var strike=""; for(var y=0;y<STRIKE_POSES.length;y++) if(a.f[STRIKE_POSES[y]]!==undefined){strike=STRIKE_POSES[y];break;}
  var recoil="idle"; for(var v=0;v<HIT_POSES.length;v++) if(a.f[HIT_POSES[v]]!==undefined){recoil=HIT_POSES[v];break;}
  stageAnim={el:el,spec:a,id:id,phase:"idle",t:0,state:"",calm:calm,sleep:sleep,strike:strike,
             recoil:recoil,watch:watch,rate:a.f["move-a"]!==undefined?7000:a.f.up!==undefined?11000:20000,
             next:Date.now()+2000+Math.random()*9000};
  anims.push(stageAnim);
}
// WHAT THE CLIENT DECIDED, read back off the elements rather than recomputed —
// a shelf that worked out the answer a second time could agree with itself and
// still be wrong about the page.
function shelfLine(){
  var url=function(v){ v=v||""; var a=v.indexOf("(")+1, b=v.indexOf("?v=");
    return a>0 ? v.slice(a, b>0?b:v.length-1) : "\u2014"; };
  var sc=url(sceneEl.style.backgroundImage), sk=url(skyEl.style.backgroundImage);
  var missing=(sc!=="\u2014"&&torch&&SKY_BASE[hour.value]==="night"&&sc.indexOf("night-torch")<0);
  stage.className = sc==="\u2014" ? "bare" : "";
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
  pick.value=String(pool?skyRoll%pool.length:0);
  pick.disabled=!many;
  rollBtn.disabled=!many;
  rollBtn.textContent=many?"next day \u00b7 "+(skyRoll%pool.length+1)+"/"+pool.length:"next day";
  // The turn is invisible in a URL and it is half of what a pool entry says.
  var t=skyEl.style.transform;
  var turn=t.indexOf("-1, -1")>0?" upside down":t?" mirrored":"";
  rollBtn.title=many?"":"this hour owns one sky";
  shelf.innerHTML="ground <b>"+sc+"</b>  sky <b>"+sk+turn+"</b>"
    +"  day <b>"+skyRoll+"</b>"+(pool&&pool.length>1?" of "+pool.length+" skies":" \u00b7 one sky")
    +"  scene tint <b>"+(sceneEl.className||"none")+"</b>  creature tint <b>"+(mobsEl.className||"none")+"</b>"
    +(missing?"  <span class=miss>no torch plate for this ground yet</span>":"");
  grid.className=mobsEl.className;   // the roster wears whatever the stage's animals wear
}
function repaint(){
  paintScene("mountain", hour.value, gnd.value, gnd.value, torch?1:0);
  shelfLine();
}
// STEPPING THE WORLD-DAY. In the game this comes off the clock and moves once
// a cycle; here it is a button, because an hour whose pool has two skies in it
// is the one thing you cannot see by waiting.
rollBtn.onclick=function(){ skyRoll++; repaint(); };
pick.onchange=function(){ skyRoll=+pick.value; repaint(); };
gnd.onchange=repaint; hour.onchange=repaint;
who.onchange=function(){ dress(); repaint(); };
torchBtn.onclick=function(){ torch=!torch; torchBtn.className=torch?"on":""; repaint(); };

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
sc.onchange=build;
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
  const el = { id, className: "", innerHTML: "", textContent: "", value: "", dataset: {}, children: [],
    disabled: false, title: "",
    style: { setProperty() {} },
    appendChild(c) { el.children.push(c); if (c.selected) el.value = c.value || c.textContent; },
    replaceChildren() { el.children.length = 0; },
    querySelectorAll: () => [] };
  return el;
};
const nodes = {};
const doc = {
  getElementById: (id) => (nodes[id] || (nodes[id] = mk(id))),
  createElement: () => mk(""),
  querySelectorAll: () => [],
};
function FakeImage() { this.complete = true;
  Object.defineProperty(this, "src", { set() { this.onload && this.onload(); } }); }
let ran = true, why = "";
try {
  new Function("document", "Image", "setInterval", "requestAnimationFrame", script)(
    doc, FakeImage, () => 0, () => 0);
} catch (e) { ran = false; why = e.message; }

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
const checks = [
  ["the script runs at all", ran, why],
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

console.log("wrote preview/mobs.html — " + Object.keys(ANIM).length + " animated, "
  + withAtk + " strike, " + withDeath + " die, " + Object.keys(tints).length + " tints"
  + (bad ? "  \u2014 " + bad + " CHECKS FAILED" : "  \u2014 verified in a DOM stub"));
if (bad) process.exit(1);
