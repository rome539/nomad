// Parked sockets keep usable panels through wake; closing never leaves a stance.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url)),temp=await mkdtemp(join(tmpdir(),'nomad-inventory-lifecycle-'));
const db=new DatabaseSync(':memory:'),saved=new DatabaseSync(':memory:');
try {
 const output=join(temp,'game.mjs');
 await build({stdin:{contents:"export {ZoneDO} from './zone'; export * as world from './world'; export * as gate from './gate'; export {handleLoadout} from './loadouts'; export {selfExamine} from './verbs';",resolveDir:join(root,'src'),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',plugins:[{name:'worker-text',setup(b){b.onLoad({filter:/(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/},async a=>({contents:await readFile(a.path,'utf8'),loader:'text'}));}}]});
 const {ZoneDO,world,gate,handleLoadout,selfExamine}=await import(pathToFileURL(output));
 db.exec(await readFile(join(root,'schema.sql'),'utf8'));
 for(const name of (await readdir(join(root,'migrations'))).filter(n=>n.endsWith('.sql')).sort())db.exec(await readFile(join(root,'migrations',name),'utf8'));
 const statement=(query,args=[])=>({bind:(...values)=>statement(query,values),all:async()=>({results:db.prepare(query).all(...args)}),first:async col=>{const r=db.prepare(query).get(...args);return col?r?.[col]??null:r??null;},run:async()=>({success:true,meta:db.prepare(query).run(...args)})});
 const kv=new Map(),storage={sql:{exec(query,...args){const rows=saved.prepare(query).all(...args);rows.toArray=()=>rows;return rows;}},get:async k=>structuredClone(kv.get(k)),put:async(k,v)=>kv.set(k,structuredClone(v)),list:async({prefix})=>new Map([...kv].filter(([k])=>k.startsWith(prefix))),delete:async k=>kv.delete(k),transactionSync:fn=>fn(),getAlarm:async()=>null,setAlarm:async()=>{}};
 const state={storage,getWebSockets:()=>[],waitUntil:()=>{}},env={DB:{prepare:statement,batch:async rows=>Promise.all(rows.map(s=>s.all()))},RELAYS:'',GAME_SK_HEX:''};
 const z=new ZoneDO(state,env);await z.init('door');
 const pk='a'.repeat(64),gateRoom=[...z.world.entryRooms][0],outside=[...z.world.rooms.keys()].find(id=>!z.world.entryRooms.has(id)&&z.world.exits.get(id)?.length),frames=[];
 assert(z.world.rooms.has(outside)&&!z.world.entryRooms.has(outside));
 let attachment={pubkey:pk,la:Date.now()};
 const ws={send:raw=>frames.push(JSON.parse(raw)),serializeAttachment(v){attachment=v},deserializeAttachment(){return attachment},close(){}};
 const {row}=await world.getOrCreatePlayer(env.DB,pk,outside);
 const p=z.buildSession(ws,row,[]);z.sessions.set(pk,p);
 for(const [hp,expected] of [[61.75,61],[99.99,99],[100,100],[0.25,1],[0,0],[-2,0]]) {
  p.hp=hp;p.maxHp=100;frames.length=0;z.sendStatus(p);
  const status=frames.find(f=>f.t==='status');assert(status);
  assert.equal(status.hp,expected);assert.equal(status.max_hp,100);
  assert.equal(z.sheetFor(p).hp,expected);
  assert(selfExamine(z,p).includes('['+expected+'/100 hp]'));
  assert.equal(p.hp,hp,'formatting must not change combat or recovery state');
 }
 p.hp=61.75;await z.checkpointBody(p);
 assert.equal(z.bodySnapshot(p).hp,61.75,'restart persistence retains accrued fractional healing');
 console.log('PASS whole HP in status, inventory sheet and self-examine without changing recovery or persistence');

 // Reproduce the exact failure: bench open, journal saved, DO replaced while
 // its WebSocket remains connected. No close or repaint may interrupt the UI.
 await gate.handleBench(z,p,{action:'open'});
 assert.equal(p.away,true);assert(frames.some(f=>f.t==='bench'&&f.open));
 p.hp=61;p.exhaustion.units=420;p.bleedTicks=2;p.bleedDmg=3;
 await z.checkpointPlayers();
 const restart=async(source)=>{
   // The gatehouse set is persisted separately from the player body journal.
   const next=new ZoneDO({...state,getWebSockets:()=>[ws]},env);await next.init('door');
   next.inGatehouse=new Set(source.inGatehouse);frames.length=0;
   await next.hydrateSessions();return next;
 };
 let next=await restart(z),restored=next.sessions.get(pk);
 assert(!frames.some(f=>['bench','trade','forge','bounty'].includes(f.t)),'wake must not close or repaint panels');
 assert.equal(restored.away,true,'open inventory keeps its working stance');
 assert.equal(restored.hp,61);assert.equal(restored.bleedTicks,2);assert.equal(restored.bleedDmg,3);
 assert.equal(restored.exhaustion.units,p.exhaustion.units,'wake does not reset stamina');
 await next.webSocketMessage(ws,JSON.stringify({t:'bench',action:'close'}));
 next=await restart(next);restored=next.sessions.get(pk);
 await next.onMessage(restored,JSON.stringify({t:'cmd',text:'look'}));
 assert(!frames.some(f=>f.text?.includes('Close it to get your head up')),'closed lockbox must not return after another wake');
 assert.equal(restored.away,false);assert.equal(restored.stepText,false);
 await gate.handleBench(next,restored,{action:'open'});
 assert.equal(frames.at(-1).open,true,'inventory can reopen without a browser reboot');
 await gate.handleBench(next,restored,{action:'close'});assert.equal(restored.away,false);
 console.log('PASS inventory stays open on wake; explicit close survives another wake; HP/wounds/stamina survive');
 // Crouching AT a gate is still outside; actual sanctuary membership is what
 // must survive a restart, never the transient inventory flag on its own.
 for(const inside of [false,true]) {
   restored.roomId=gateRoom;restored.away=false;restored.stepText=false;
   if(inside){next.inGatehouse.add(pk);restored.away=true;restored.stepText=true;}
   await gate.handleBench(next,restored,{action:'open'});await next.checkpointPlayers();
   const woken=await restart(next),r=woken.sessions.get(pk);
   assert.equal(r.away,true,'inventory remains open');
   assert.equal(r.stepText,restored.stepText,'the original command mode survives');
   assert.equal(woken.inGatehouse.has(pk),inside);
   assert(!frames.some(f=>f.t==='bench'),'wake leaves the existing inventory view untouched');
   assert.equal(r.hp,61);
   await gate.handleBench(woken,r,{action:'close'});assert.equal(r.away,inside);
   assert.equal(woken.outOfWorld(r),inside,'closing gate-side inventory does not enter the gatehouse');
   next=woken;restored=r;
 }
 console.log('PASS gate-side inventory resumes outside; inside inventory stays safely inside and remains usable');
 // Each counter must accept actions after repeated cold wakes, not merely
 // leave its browser visible. Barter also keeps the selected cart and offers.
 for(const [type,flag,handler,action] of [
   ['trade','trading',gate.handleTrade,{action:'cancel'}],
   ['forge','forging',gate.handleForge,{action:'craft',row:'missing-recipe'}],
   ['bounty','bountying',gate.handleBounty,{action:'refresh'}],
 ]) {
   if(type==='bounty') { next.nextBountyChurnAt=0;gate.tickBounty(next,Date.now());await next.persist(); }
   await handler(next,restored,{action:'open'});
   assert.equal(restored[flag],true,type+' opens: '+JSON.stringify(frames.filter(f=>f.text).map(f=>f.text)));
   if(type==='trade') {
     const stock=[...next.world.fenceStock].filter(s=>gate.inStock(next,s.itemId)).sort((a,b)=>b.cost-a.cost)[0];assert(stock);
     await handler(next,restored,{action:'buy',row:stock.itemId});
     assert(restored.buying?.wants.length);
     const tender=[...next.world.itemTemplates.values()].find(t=>t.barter>0&&t.barter*2<stock.cost);assert(tender);
     await world.insertLoot(env.DB,'wake-tender',pk,tender.id,null);
     restored.items=await world.loadInventory(env.DB,pk);
     await handler(next,restored,{action:'offer',row:tender.id});
     assert(restored.buying?.paid>0&&restored.buying.escrow.length===1,'partial offer is on the counter');
   }
   const cart=structuredClone(restored.buying);
   await next.checkpointPlayers();
   for(let wake=0;wake<2;wake++) {
     next=await restart(next);restored=next.sessions.get(pk);
     assert.equal(restored[flag],true);assert.deepEqual(restored.buying,cart);
     assert(!frames.some(f=>['bench','trade','forge','bounty'].includes(f.t)));
     await next.checkpointPlayers();
   }
   await next.webSocketMessage(ws,JSON.stringify({t:type,...action}));
   assert(frames.some(f=>f.t===type&&f.open),'panel action still responds after wake');
   await next.webSocketMessage(ws,JSON.stringify({t:type,action:'close'}));
   assert.equal(restored[flag],false);assert.equal(restored.away,true,'close stays inside the gatehouse');
 }
 console.log('PASS barter cart, forge and bounty panels survive repeated wakes and still accept actions and close');
 // Deployment from the old journal format still clears the invisible lockbox.
 next.inGatehouse.delete(pk);restored.roomId=outside;restored.away=true;restored.stepText=false;
 const legacy=next.bodySnapshot(restored);delete legacy.gateUI;
 await storage.put('body:'+pk,legacy);
 next=await restart(next);restored=next.sessions.get(pk);
 assert(frames.some(f=>f.t==='bench'&&f.open===false));assert.equal(restored.away,false);
 await next.onMessage(restored,JSON.stringify({t:'cmd',text:'look'}));
 assert(!frames.some(f=>f.text?.includes('Close it to get your head up')));
 console.log('PASS older journals still recover without an invisible lockbox');
 // Ordinary combat state is unrelated to the panel cleanup.
 next.inGatehouse.delete(pk);restored.away=false;restored.stepText=false;restored.roomId=outside;
 restored.target='live-opponent';restored.pvpTarget='other-player';restored.stunned=2;
 await next.checkpointBody(restored);
 const combat=await restart(next),fighter=combat.sessions.get(pk);
 assert.equal(fighter.target,'live-opponent');assert.equal(fighter.pvpTarget,'other-player');assert.equal(fighter.stunned,2);assert.equal(fighter.hp,61);
 console.log('PASS panel recovery preserves combat targets and status');
} finally {db.close();saved.close();await rm(temp,{recursive:true,force:true});}
