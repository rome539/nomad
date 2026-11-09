// THE REGION, RUN FORWARD. Not a test: a reading. Runs the real ZoneDO and its real
// beat on a private copy of the local D1, with no players and a false clock, and
// prints one region's animals at intervals. See living-regions.md at the repo root.
//   node --no-warnings scripts/sim-mountain.mjs old|new|hunted [hours]
// old = with every rule from living-regions.md switched off, new = as written, hunted = new
// with two wanderers' worth of kills and a wiped pack every 12 hours. Each run starts
// from a freshly placed world, not the live one. To run several at once just start
// several: each takes its own copy of the database.
import { createRequire } from 'node:module';
import { readFile, mkdtemp, readdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const [,, scenario='new', hoursArg='72'] = process.argv;
const HOURS=Number(hoursArg), root=new URL('..',import.meta.url).pathname;
const req=createRequire(join(root,'package.json')); const {build}=req('esbuild'); const {DatabaseSync}=req('node:sqlite');
const dir=await mkdtemp(join(tmpdir(),'nomad-sim-')); const out=join(dir,'b.mjs');
await build({stdin:{contents:"export {MOUNTAIN_QUARTER_ROOMS} from './detail'; export {ZoneDO} from './zone'; export * as zd from './zone-data'; export * as md from './mountain-ground'; export * as beasts from './beasts'; export * as groups from './groups'; export * as ai from './ai';",resolveDir:join(root,'src'),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:out,logLevel:'silent',external:['cloudflare:*'],
 plugins:[{name:'text',setup(b){b.onLoad({filter:/(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/},async a=>({contents:await readFile(a.path,'utf8'),loader:'text'}));}}]});
const {ZoneDO,zd,md,beasts,groups,ai,MOUNTAIN_QUARTER_ROOMS:MQ}=await import(pathToFileURL(out));
const QOF=new Map(); for(const q of ['foot','middle','cloud','high','territory','summit']) for(const r of MQ[q]??[]) if(!QOF.has(r)) QOF.set(r,q);
const RD=Date; let NOW=RD.UTC(2026,10,6,17);
globalThis.Date=class extends RD{constructor(...a){a.length?super(...a):super(NOW);} static now(){return NOW;}};
const log=console.log; console.log=()=>{}; console.warn=()=>{};
const d1=join(root,'.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const dbName=(await readdir(d1)).find(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite');
for(const f of (await readdir(d1)).filter(f=>f.startsWith(dbName))) await copyFile(join(d1,f),join(dir,f));
const sq=new DatabaseSync(join(dir,dbName));
const stmt=(s,args=[])=>({bind:(...a)=>stmt(s,a),all:async()=>({results:sq.prepare(s).all(...args)}),first:async()=>sq.prepare(s).get(...args)??null,run:async()=>({meta:{}})});
const db={prepare:(s)=>stmt(s),batch:async()=>[]};
const kv=new Map();
const storage={list:async()=>new Map(),get:async(k)=>kv.get(k),put:async(k,v)=>{kv.set(k,v)},delete:async(k)=>kv.delete(k),setAlarm:async()=>{},getAlarm:async()=>null,deleteAlarm:async()=>{},transactionSync:(f)=>f(),sql:{exec:()=>({toArray:()=>[],one:()=>null,[Symbol.iterator]:function*(){}})}};
const state={storage,getWebSockets:()=>[],blockConcurrencyWhile:(f)=>f(),setWebSocketAutoResponse(){},abort(){},acceptWebSocket(){}};
const z=new ZoneDO(state,{DB:db});
z.persist=async()=>{}; z.ensureAlarm=async()=>{};
if(scenario==='old'){ // what shipped before all of this
  zd.MOUNTAIN_ROAMERS.clear(); zd.MOUNTAIN_GROUPS.clear(); zd.FOOD_FLIERS.clear(); zd.GROUND_HOLDERS.clear();
  for(const w of ['hill-wolf','lead-wolf','grey-wolf','dire-wolf']) zd.PREYS_ON.get(w)?.delete('rat');
  for(const [h,bs] of [['lynx',['scarp-raven','mountain-chough','hill-eagle','eagle-owl','bone-breaker']],['glutton',['scarp-raven','mountain-chough','bone-breaker']],['lead-wolf',['scarp-raven','mountain-chough','bone-breaker']],['hill-wolf',['mountain-chough']],['wildcat',['mountain-chough','scarp-raven']],['the-tom',['mountain-chough','scarp-raven']]]) for(const b of bs) zd.PREYS_ON.get(h)?.delete(b);
  zd.PACK_PREY.get('hill-wolf')?.delete('scarp-raven'); zd.PACK_PREY.get('hill-wolf')?.delete('bone-breaker');
  for(const b of ['scarp-raven','the-old-raven','grey-heron','bittern','tawny-owl','great-gull','black-backed-gull','hill-eagle','eagle-owl','bone-breaker','the-bone-dropper','eyrie-holder','carrion-vulture','brooding-vulture','great-vulture']) zd.SMALL_PREY.delete(b);
}
await z.init('door');
const W=z.world; const mt=(r)=>z.regionOf(r)==='mountain';
const LINES=['rat','mountain-hare','ptarmigan','red-hind','feral-goat','mountain-chough','scarp-raven','carrion-vulture','bone-breaker','hill-fox','wildcat','ermine','snow-fox','eagle-owl','hill-eagle','lynx','glutton','hill-wolf'];
const lineOf=(c)=>LINES.includes(c.templateId)?c.templateId:(z.variantBase.get(c.templateId)??c.templateId);
const rows={}; for(const s of W.mobSpawns) if(mt(s.room_id)) rows[s.template_id]=(rows[s.template_id]??0)+1;
const HAMLET=new Set(zd.SHIELING_HAMLET_ROOMS); // the same rooms `beasts` counts
const ev={flights:{},landings:0,chase:0,caught:0,stolen:0,errors:0,deaths:{},births:0,offBody:{},mobbed:0};
const of=z.roomFeed.bind(z); z.roomFeed=function(r,t,...a){ if(typeof t==='string'){
  if(/opens its wings and is gone/.test(t)){const m=t.match(/^An? (.*?) opens/);ev.flights[m?.[1]??'?']=(ev.flights[m?.[1]??'?']??0)+1;} else if(/comes down out of the sky/.test(t))ev.landings++;
  else if(/catches .* before it can turn/.test(t))ev.caught++; else if(/over its kill/.test(t))ev.stolen++; else if(/does not wait for it, and runs/.test(t))ev.chase++;
  else if(/over the body\.|gets out of its way\./.test(t)){const m=t.match(/^An? (.*?) (?:comes at|goes for) an? (.*?)(?: over|, and)/);const k=m?m[1]+'>'+m[2]:'?';ev.offBody[k]=(ev.offBody[k]??0)+1;}
  else if(/The ravens go up at/.test(t))ev.mobbed++; }
 return of(r,t,...a); };
const snap=(h)=>{const n={},hungry={},rooms=new Map();let aloft=0;const off=[];
 for(const c of z.creatures.values()){const home=c.home??c.roomId; if(!mt(home))continue; const l=lineOf(c); if(!LINES.includes(l))continue; n[l]=(n[l]??0)+1; if(c.hunger>=50)hungry[l]=(hungry[l]??0)+1; if(c.aloft!==undefined)aloft++; else if(zd.FOOD_FLIERS.has(l)) rooms.set(c.roomId,(rooms.get(c.roomId)??0)+1);
  if(scenario!=='old'&&md.settlesOn&&zd.MOUNTAIN_ROAMERS.has(l)&&!md.settlesOn(l,home))off.push(l);}
 const packs=Object.values(z.groups.packs).filter(g=>g.line==='hill-wolf');const size=new Map();let lone=0,hamlet=0,undec=0,standing=0;
 for(const c of z.creatures.values()){if(lineOf(c)!=='hill-wolf')continue;if(c.group)size.set(c.group,(size.get(c.group)??0)+1);else if(c.lone)lone++;else undec++;if(HAMLET.has(c.home))hamlet++;if(HAMLET.has(c.roomId))standing++;}
 // Where a wolf drawing a home now would go: the hamlet's share of draws, against its share of the ground.
 let draws=0,inH=0;for(let k=0;k<400;k++){const r=groups.pickHome(z,'hill-wolf',NOW);if(r){draws++;if(HAMLET.has(r))inH++;}}
 const homes=ai.mountainHomes(z,'hill-wolf');const hShare=homes.length?homes.filter(r=>HAMLET.has(r)).length/homes.length:NaN;
 const tot={},wh={};for(const c of z.creatures.values()){const l=lineOf(c);if(!['scarp-raven','feral-goat','rat'].includes(l))continue;tot[l]=(tot[l]??0)+1;const r=z.regionOf(c.home??c.roomId);(wh[l]??={})[r]=(wh[l][r]??0)+1;}
 const allRows={},rowsBy={};for(const s of W.mobSpawns){if(['scarp-raven','feral-goat','rat'].includes(s.template_id)){allRows[s.template_id]=(allRows[s.template_id]??0)+1;const r=z.regionOf(s.room_id);(rowsBy[s.template_id]??={})[r]=(rowsBy[s.template_id][r]??0)+1;}}
 for(const l of Object.keys(tot))log(`  COUNT ${l}: whole world ${tot[l]}/${allRows[l]}  living by region ${JSON.stringify(wh[l])}  rows by region ${JSON.stringify(rowsBy[l])}`);
 const topBird=[...rooms].sort((a,b)=>b[1]-a[1])[0];
 // WHERE THEY STAND, BY HEIGHT (2026-11-08): foot / middle / cloud / high / top.
 const BY=['red-hind','red-stag','feral-goat','mountain-hare','ptarmigan','carrion-vulture','bone-breaker','lynx','hill-wolf'];const ht={};
 for(const c of z.creatures.values()){if(c.aloft!==undefined)continue;const l=lineOf(c);if(!BY.includes(l))continue;const q=QOF.get(c.roomId);if(!q)continue;(ht[l]??={})[q]=(ht[l][q]??0)+1;}
 log('  BY HEIGHT (foot/middle/cloud/high/top): '+BY.map(l=>`${l} ${['foot','middle','cloud','high','territory'].map(q=>ht[l]?.[q]??0).join('/')}`).join(' | '));
 const hh={};for(const c of z.creatures.values()){const l=lineOf(c);if(!BY.includes(l))continue;const q=QOF.get(c.home??c.roomId);if(!q)continue;(hh[l]??={})[q]=(hh[l][q]??0)+1;}
 log('  HOMES BY HEIGHT: '+BY.map(l=>`${l} ${['foot','middle','cloud','high','territory'].map(q=>hh[l]?.[q]??0).join('/')}`).join(' | '));
 log(`\n[${scenario}] hour ${h}  errors=${ev.errors}  birds up now=${aloft}  busiest bird room=${topBird?topBird[0]+' ('+topBird[1]+')':'-'}  on wrong ground (old animals)=${off.length}`);
 log('  '+LINES.map(l=>`${l} ${n[l]??0}/${rows[l]??0}${hungry[l]?` (${hungry[l]} hungry)`:''}`).join(' | '));
 log(`  wolves: packs ${[...size.values()].join(',')||'-'}  lone ${lone}  unsorted ${undec}  living in hamlet ${hamlet}  standing in hamlet ${standing}  new home draws in hamlet ${draws?Math.round(100*inH/draws):'-'}% (hamlet is ${Math.round(100*hShare)}% of wolf ground)  | flights ${JSON.stringify(ev.flights)} | pack chases ${ev.chase} caught ${ev.caught} meals stolen ${ev.stolen} | off a body ${JSON.stringify(ev.offBody)} eagles mobbed ${ev.mobbed}`);
};
const STEP=zd.SLOW_ECOLOGY_MS; const steps=HOURS*3600_000/STEP; let tk=0, worst=0; const t0=RD.now();
snap(0);
const hunted=scenario==='hunted';
let killed=0, wipes=0;
for(let i=1;i<=steps;i++){ NOW+=STEP; const a=performance.now();
 try{await z.tick();}catch(e){ev.errors++; if(ev.errors<4)log('ERROR',e?.stack?.slice(0,500));}
 const d=performance.now()-a; tk+=d; if(d>worst)worst=d;
 if(hunted){
  if(i%20===0){ // two wanderers' worth: one animal every 10 minutes
   const all=[...z.creatures.values()].filter(c=>mt(c.home??c.roomId)&&LINES.includes(lineOf(c))&&lineOf(c)!=='rat'); if(all.length){const c=all[Math.floor(Math.random()*all.length)];z.creatures.delete(c.id);z.noteCreaturesChanged();killed++;}}
  if(i%(12*120)===0){ // and every 12 hours someone wipes out a pack, leaving one
   const packs=Object.keys(z.groups.packs).filter(id=>z.groups.packs[id].line==='hill-wolf'); for(const id of packs.slice(0,1)){const m=[...z.creatures.values()].filter(c=>c.group===id);m.slice(1).forEach(c=>z.creatures.delete(c.id));if(m.length>1)wipes++;z.noteCreaturesChanged();}}
 }
 if(i%(HOURS*120/3)===0)snap(i/120);
}
log(`\n[${scenario}] ran ${steps} beats; avg beat ${(tk/steps).toFixed(1)}ms worst ${worst.toFixed(0)}ms; wall ${((RD.now()-t0)/1000).toFixed(0)}s${hunted?`; players killed ${killed}, packs wiped ${wipes}`:''}`);
log('\n'+beasts.lines(z,NOW).join('\n'));
process.exit(0);
