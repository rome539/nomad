// Local-only audit reproductions. No production calls or actual player data.
import {createRequire} from 'node:module';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(new URL('..',import.meta.url).pathname),require=createRequire(join(root,'package.json'));
const {build}=require('esbuild');
const dir=await mkdtemp(join(tmpdir(),'nomad-audit-'));
try {
 const out=join(dir,'audit.mjs');
 await build({stdin:{contents:"export {default as worker} from './index';export {ZoneDO} from './zone';export {EventQueue} from './security';",resolveDir:join(root,'src'),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:out,logLevel:'silent',plugins:[{name:'text',setup(b){b.onLoad({filter:/(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/},async a=>({contents:await readFile(a.path,'utf8'),loader:'text'}));}}]});
 const {worker,ZoneDO,EventQueue}=await import(pathToFileURL(out));
 let puts=0,alarms=0,syncs=0,attachments=0;
 const ws={serializeAttachment(){attachments++;},send(){},close(){}};
 const attacker={pubkey:'synthetic-0',ws,tokens:0,tokensAt:Date.now(),items:[],hp:100,roomId:'synthetic-room'};
 const z=Object.create(ZoneDO.prototype);
 Object.assign(z,{state:{storage:{put:async()=>{puts++;}}},sessions:new Map(),creatures:new Map(),bodyJournal:new Map(),socketPending:new WeakMap(),eventQueue:new EventQueue(),hydrateSessions:async()=>{},wsPubkey:()=>attacker.pubkey,wsAttachment:()=>({cid:'synthetic'}),syncExhaustion(){syncs++;},ensureAlarm:async()=>{alarms++;},send(){}});
 for(let i=0;i<20;i++)z.sessions.set('synthetic-'+i,i===0?attacker:{...attacker,pubkey:'synthetic-'+i});
 for(let i=0;i<6;i++)await z.webSocketMessage(ws,'not-json');
 assert.equal(puts,0);assert.equal(syncs,0);assert.equal(attachments,0);assert.equal(attacker.tokens,0);
 console.log(JSON.stringify({case:'six malformed frames, twenty sessions',storagePuts:puts,alarmChecks:alarms,commandTokensConsumed:0}));
 for(const raw of ['{}','null','[]',JSON.stringify({t:'unknown'}),JSON.stringify({t:'cmd',text:'x'.repeat(513)}),JSON.stringify({t:'bench',rows:Array(21).fill('synthetic')}),JSON.stringify({t:'cmd',text:'login extension'})])await z.webSocketMessage(ws,raw);
 assert.equal(puts,0);assert.equal(syncs,0);assert.equal(attachments,0);
 puts=0;alarms=0;
 for(let i=0;i<6;i++){attacker.tokens=0;attacker.tokensAt=Date.now();await z.webSocketMessage(ws,JSON.stringify({t:'cmd',text:'look'}));}
 assert.equal(puts,0);assert.equal(syncs,0);assert.equal(attachments,0);
 console.log(JSON.stringify({case:'six rate-limited commands, twenty sessions',storagePuts:puts,alarmChecks:alarms}));
 // Admitted mutations retain their durability, even if a handler throws.
 attacker.tokens=6;attacker.tokensAt=Date.now();
 z.privateMessages={handle(){}};
 await z.webSocketMessage(ws,JSON.stringify({t:'tell-key',id:'synthetic'}));
 assert.equal(puts,20);assert.equal(alarms,1);assert.equal(attachments,1);
 puts=0;z.privateMessages.handle=()=>{throw new Error('synthetic handler failure')};
 const oldError=console.error;console.error=()=>{};
 try{await z.webSocketMessage(ws,JSON.stringify({t:'tell-key',id:'synthetic'}));}finally{console.error=oldError;}
 assert.equal(puts,20,'partially completed commands still checkpoint');
 console.log('PASS rejected frames do not sync, persist or restamp presence; admitted and failing handlers still checkpoint');
 let forwarded=0,limited=0;const rateKeys=[];
 const env={JWT_SECRET:'synthetic-only',AUTH_RATE_LIMITER:{limit:async({key})=>{limited++;rateKeys.push(key);return {success:false}}},ZONE:{idFromName:x=>x,get:()=>({fetch:async()=>{forwarded++;return new Response('{}')}})},DB:{prepare(){assert.fail('rejected public request reached database')}}};
 for(const route of ['/build','/world.json','/mints','/sheet']) {
  assert.equal((await worker.fetch(new Request('https://audit.invalid'+route),env)).status,429);
  assert.equal((await worker.fetch(new Request('https://audit.invalid'+route),{...env,AUTH_RATE_LIMITER:undefined})).status,503);
 }
 assert.equal(forwarded,0);
 await worker.fetch(new Request('https://audit.invalid/auth/challenge',{method:'POST'}),env);
 assert.notEqual(rateKeys[0],rateKeys.at(-1),'public requests must not exhaust the auth counter');
 env.AUTH_RATE_LIMITER.limit=async()=>({success:true});
 for(let i=0;i<12;i++)assert.equal((await worker.fetch(new Request('https://audit.invalid/build'),env)).status,200);
 assert.equal(forwarded,1,'build polling tells the world of a new build, but only once per window');
 forwarded=0;
 const entries=new Map();const previous=globalThis.caches;
 globalThis.caches={default:{match:async key=>entries.get(key.url)?.clone(),put:async(key,value)=>{entries.set(key.url,value)}}};
 try {
  for(let i=0;i<12;i++)assert.equal((await worker.fetch(new Request('https://audit.invalid/world.json?junk='+i),env)).status,200);
  assert.equal(forwarded,1,'world snapshots are cached with a canonical query');
  entries.clear();env.ZONE.get=()=>({fetch:async()=>{forwarded++;return new Response('busy',{status:503})}});
  for(let i=0;i<2;i++)assert.equal((await worker.fetch(new Request('https://audit.invalid/world.json'),env)).status,503);
  assert.equal(forwarded,3,'failed snapshots are not cached or relabeled as successful');
 } finally {if(previous===undefined)delete globalThis.caches;else globalThis.caches=previous;}
 console.log('PASS public rate limits fail closed, auth has a separate budget, build pings are throttled, and world caching preserves failures');
}finally{await rm(dir,{recursive:true,force:true})}
