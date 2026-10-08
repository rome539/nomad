// A parked socket must not keep a lockbox stance after its UI is closed on wake.
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
 await build({stdin:{contents:"export {ZoneDO} from './zone'; export * as world from './world'; export * as gate from './gate'; export {handleLoadout} from './loadouts';",resolveDir:join(root,'src'),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',plugins:[{name:'worker-text',setup(b){b.onLoad({filter:/(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/},async a=>({contents:await readFile(a.path,'utf8'),loader:'text'}));}}]});
 const {ZoneDO,world,gate,handleLoadout}=await import(pathToFileURL(output));
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
 // Reproduce the exact failure: bench open, journal saved, DO replaced while
 // its WebSocket remains connected, then a world command from the main screen.
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
 assert(frames.some(f=>f.t==='bench'&&f.open===false),'server closes the stale inventory');
 await next.onMessage(restored,JSON.stringify({t:'cmd',text:'look'}));
 assert(!frames.some(f=>f.text?.includes('Close it to get your head up')),'main-screen look must not remain blocked by the closed lockbox');
 assert.equal(restored.away,false);assert.equal(restored.stepText,false);
 assert.equal(restored.hp,61);assert.equal(restored.bleedTicks,2);assert.equal(restored.bleedDmg,3);
 assert.equal(restored.exhaustion.units,p.exhaustion.units,'wake does not reset stamina');
 await gate.handleBench(next,restored,{action:'open'});
 assert.equal(frames.at(-1).open,true,'inventory can reopen without a browser reboot');
 await gate.handleBench(next,restored,{action:'close'});assert.equal(restored.away,false);
 console.log('PASS outside inventory wake: modal closes, look works, inventory reopens, HP/wounds/stamina survive');
 // Crouching AT a gate is still outside; actual sanctuary membership is what
 // must survive a restart, never the transient inventory flag on its own.
 for(const inside of [false,true]) {
   restored.roomId=gateRoom;restored.away=false;restored.stepText=false;
   if(inside){next.inGatehouse.add(pk);restored.away=true;restored.stepText=true;}
   await gate.handleBench(next,restored,{action:'open'});await next.checkpointPlayers();
   const woken=await restart(next),r=woken.sessions.get(pk);
   assert.equal(r.away,inside,'only actual gatehouse occupants remain away');
   assert.equal(r.stepText,inside,'gatehouse occupant returns to its text interface');
   assert.equal(woken.inGatehouse.has(pk),inside);
   assert.equal(woken.outOfWorld(r),inside,'gate-side crouch does not become sanctuary membership');
   assert(!r.sorting&&!r.trading&&!r.forging&&!r.bountying,'no dead modal stance survives');
   assert.equal(r.hp,61);
   await gate.handleBench(woken,r,{action:'open'});assert.equal(frames.at(-1).open,true);
   await gate.handleBench(woken,r,{action:'close'});assert.equal(r.away,inside);
   next=woken;restored=r;
 }
 console.log('PASS gate-side inventory resumes outside; inside inventory stays safely inside and remains usable');
 // Ordinary combat state is unrelated to the panel cleanup.
 next.inGatehouse.delete(pk);restored.away=false;restored.stepText=false;restored.roomId=outside;
 restored.target='live-opponent';restored.pvpTarget='other-player';restored.stunned=2;
 await next.checkpointBody(restored);
 const combat=await restart(next),fighter=combat.sessions.get(pk);
 assert.equal(fighter.target,'live-opponent');assert.equal(fighter.pvpTarget,'other-player');assert.equal(fighter.stunned,2);assert.equal(fighter.hp,61);
 console.log('PASS panel recovery preserves combat targets and status');
} finally {db.close();saved.close();await rm(temp,{recursive:true,force:true});}
