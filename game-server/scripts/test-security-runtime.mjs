// Real workerd + D1 + Durable Objects. Isolated state and synthetic keys only.
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from 'miniflare';
import { generateSecretKey, getPublicKey, finalizeEvent, nip44, nip19 } from 'nostr-tools';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir=await mkdtemp(join(tmpdir(),'nomad-runtime-'));
let mf;const sockets=[];
try {
 const bundle=await build({entryPoints:[join(root,'src/index.ts')],bundle:true,format:'esm',platform:'browser',write:false,logLevel:'silent',plugins:[{name:'text-modules',setup(b){b.onLoad({filter:/(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/},async a=>({contents:await readFile(a.path,'utf8'),loader:'text'}));}}]});
 mf=new Miniflare(convertV4MiniflareOptions({name:'nomad-security-local',modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-01-01',compatibilityFlags:['nodejs_compat'],
   host:'127.0.0.1',port:0,log:new Log(LogLevel.ERROR),resourcePersistencePath:dir,resourceTmpPath:join(dir,"tmp"),cf:false,
   bindings:{JWT_SECRET:crypto.randomUUID()+crypto.randomUUID(),GAME_SK_HEX:'',ADMIN_TOKEN:crypto.randomUUID(),RELAYS:''},
   ratelimits:{AUTH_RATE_LIMITER:{namespace_id:'2026091801',simple:{limit:180,period:60}}},
   d1Databases:{DB:'security-local'},durableObjects:{ZONE:{className:'ZoneDO',useSQLite:true}},
   outboundService:()=>new Response('External requests disabled by security test',{status:502})}));
 const db=await mf.getD1Database('DB');
 // SQLite's own parser separates statements, including quoted semicolons.
 const parsed=JSON.parse(execFileSync('python3',['-c',`
import sqlite3,json,pathlib,sys
root=pathlib.Path(sys.argv[1]); files=[root/'schema.sql',*sorted((root/'migrations').glob('*.sql'))];out=[]
for p in files:
 statements=[];buf=''
 for char in p.read_text():
  buf+=char
  if char==';' and sqlite3.complete_statement(buf):statements.append(buf);buf=''
 out.append({'name':p.name,'statements':statements})
print(json.dumps(out))
 `,root],{maxBuffer:32*1024*1024,encoding:'utf8'}));
 for(const file of parsed) {
   for(let i=0;i<file.statements.length;i+=80) {
     try {await db.batch(file.statements.slice(i,i+80).map(s=>db.prepare(s)));}
     catch(e){throw new Error('D1 migration failed: '+file.name+' — '+e.message);}
   }
 }
 console.log(`PASS: actual D1 applied schema and ${parsed.length-1} migrations.`);
 const request=(path,opts={})=>mf.dispatchFetch('http://localhost'+path,opts);
 const sk=generateSecretKey(),pk=getPublicKey(sk),sk2=generateSecretKey(),pk2=getPublicKey(sk2);
 for(const [key,name] of [[pk,'AuditOne'],[pk2,'AuditTwo']])await db.prepare('INSERT INTO players(pubkey,name,named,room_id,hp,max_hp,created_at,last_seen) VALUES (?,?,1,?,100,100,?,?)').bind(key,name,'gate',Math.floor(Date.now()/1000),Math.floor(Date.now()/1000)).run();
 const login=async key=>{
   const {challenge}=await (await request('/auth/challenge',{method:'POST'})).json();
   const event=finalizeEvent({kind:27235,created_at:Math.floor(Date.now()/1000),tags:[],content:challenge},key);
   const body=JSON.stringify({event});
   const results=await Promise.all([request('/auth/verify',{method:'POST',body}),request('/auth/verify',{method:'POST',body})]);
   assert.deepEqual(results.map(r=>r.status).sort(),[200,401]);return (await results.find(r=>r.status===200).json()).token;
 };
 const token=await login(sk),token2=await login(sk2);
 const ticket=async token=>(await (await request('/auth/ticket',{method:'POST',headers:{authorization:'Bearer '+token}})).json()).ticket;
 const connect=async (token,extra={})=>{
   const t=await ticket(token);const response=await request('/ws?ticket='+t+'&tell=1',{headers:{Upgrade:'websocket',...extra}});
   assert.equal(response.status,101);const ws=response.webSocket;const frames=[];const waiters=[];
   ws.addEventListener('message',e=>{let f;try{f=JSON.parse(e.data);}catch{return;}frames.push(f);for(const check of [...waiters])check();});
   ws.accept();sockets.push(ws);
   const wait=pred=>new Promise((yes,no)=>{const timer=setTimeout(()=>{waiters.splice(waiters.indexOf(check),1);no(new Error('Socket frame timeout'));},8000);const check=()=>{const f=frames.find(pred);if(f){clearTimeout(timer);const i=waiters.indexOf(check);if(i>=0)waiters.splice(i,1);yes(f);}};waiters.push(check);check();});
   return {ws,frames,wait,t,send:f=>ws.send(JSON.stringify(f))};
 };
 const a=await connect(token,{'x-admin':'reseed','x-world':'1','x-pubkey':pk2});
 const b=await connect(token2);
 await a.wait(f=>f.t==='status');await b.wait(f=>f.t==='status');
 assert.equal((await request('/ws?ticket='+a.t,{headers:{Upgrade:'websocket'}})).status,401);
 assert.equal((await request('/ws?token='+token,{headers:{Upgrade:'websocket'}})).status,401);
 console.log('PASS: signed login/replay and one-use tickets work through real HTTP/WebSocket upgrades; forged privileged headers are stripped.');
 a.send({t:'cmd',text:'in'});b.send({t:'cmd',text:'in'});
 await Promise.all([a.wait(f=>f.t==='ctx'&&f.gh===true),b.wait(f=>f.t==='ctx'&&f.gh===true)]);
 a.frames.length=0;a.send({t:'cmd',text:'look'});
 await a.wait(f=>typeof f.text==='string'&&f.text.includes('AuditTwo is here.'));
 let leftClosed=false;a.ws.addEventListener('close',()=>{leftClosed=true;});
 a.frames.length=0;b.frames.length=0;
 a.send({t:'cmd',text:'out'});await a.wait(f=>f.t==='ctx'&&!f.gh);
 b.send({t:'cmd',text:'look'});
 await b.wait(f=>typeof f.text==='string'&&f.text.includes('You have it to yourself.'));
 assert.equal(leftClosed,false);assert.equal(a.ws.readyState,1);
 a.send({t:'cmd',text:'in'});await a.wait(f=>f.t==='ctx'&&f.gh);
 b.frames.length=0;b.send({t:'cmd',text:'look'});
 await b.wait(f=>typeof f.text==='string'&&f.text.includes('AuditOne is here.'));
 console.log('PASS: look shows current gatehouse occupants after exit/re-entry; exiting keeps the same socket connected.');
 // Let the command bucket refill after the presence scenario before testing tells.
 await new Promise(resolve=>setTimeout(resolve,3100));
 const id=crypto.randomUUID();a.send({t:'tell-key',id,who:'AuditTwo'});
 const recipient=await a.wait(f=>f.t==='tell-key'&&f.id===id);assert.equal(recipient.to,pk2);
 const secret='synthetic runtime private word';
 const event=finalizeEvent({kind:24915,created_at:Math.floor(Date.now()/1000),tags:[['p',pk2]],content:nip44.v2.encrypt(secret,nip44.v2.utils.getConversationKey(sk,pk2))},sk);
 a.send({t:'sealed-tell',id,event});const delivery=await b.wait(f=>f.t==='sealed-tell');await a.wait(f=>f.t==='tell-sent'&&f.id===id);
 assert.equal(nip44.v2.decrypt(delivery.event.content,nip44.v2.utils.getConversationKey(sk2,pk)),secret);
 assert.ok(!JSON.stringify([...a.frames,...b.frames]).includes(secret));
 a.send({t:'sealed-tell',id,event});await a.wait(f=>f.t==='tell-error'&&f.id===id);
 console.log('PASS: encrypted tell delivery/decryption and replay rejection work across real sockets without plaintext frames.');
 const replaced=new Promise(resolve=>a.ws.addEventListener('close',resolve,{once:true}));
 const next=await connect(token);await next.wait(f=>f.t==='status');const close=await replaced;assert.equal(close.code,1000);
 const oversized=new Promise(resolve=>next.ws.addEventListener('close',resolve,{once:true}));next.ws.send('x'.repeat(8193));assert.equal((await oversized).code,1009);
 assert.equal((await request('/index.js.map')).status,404);
 assert.equal((await request('/auth/google',{method:'POST',body:'{}'})).status,404);
 assert.equal((await request('/admin/reseed',{method:'POST'})).status,401);
 console.log('PASS: reconnect displaces the old socket, oversized frames close, and retired/private/admin routes fail closed.');
 if(process.argv.includes('--browser')) {
   const {default:puppeteer}=await import(pathToFileURL(resolve(root,'../promo/capture/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')));
   const guestKey=generateSecretKey(),extensionKey=generateSecretKey();
   for(const [key,name] of [[getPublicKey(guestKey),'AuditBrowser'],[getPublicKey(extensionKey),'AuditExtension']]) {
     await db.prepare('INSERT INTO players(pubkey,name,named,room_id,hp,max_hp,created_at,last_seen) VALUES (?,?,1,?,100,100,?,?)').bind(key,name,'gate',Math.floor(Date.now()/1000),Math.floor(Date.now()/1000)).run();
   }
   const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,userDataDir:join(dir,'browser'),args:['--disable-background-networking','--no-first-run']});
   try {
     const page=await browser.newPage();const browserErrors=[];page.on('pageerror',e=>browserErrors.push(e.message));
     const origin=(await mf.ready).origin;
     await page.setRequestInterception(true);
     page.on('request',r=>r.url().startsWith(origin+'/')||r.url().startsWith('data:')||r.url().startsWith('blob:')?r.continue():r.abort());
     await page.exposeFunction('__auditSign',event=>finalizeEvent(event,extensionKey));
     await page.evaluateOnNewDocument((hex,pk)=>{
       localStorage.setItem('nomad_sk',hex);localStorage.setItem('nomad_login','guest');localStorage.setItem('nomad_guided','1');
       window.__auditFrames=[];window.__auditSent=[];
       const NativeSocket=window.WebSocket;
       window.WebSocket=class extends NativeSocket {
         constructor(url,...args){if(new URL(url).host!==location.host)throw Error('External sockets blocked by test');super(url,...args);this.addEventListener('message',e=>{try{window.__auditFrames.push(JSON.parse(e.data));}catch{}});}
         send(data){window.__auditSent.push(data);return super.send(data);}
       };
       window.nostr={getPublicKey:async()=>pk,signEvent:event=>window.__auditSign(event)};
     },Buffer.from(guestKey).toString('hex'),getPublicKey(extensionKey));
     await page.goto(origin,{waitUntil:'domcontentloaded'});
     await page.click('#thr-enter');
     const named=async name=>page.waitForFunction(name=>window.__auditFrames.filter(f=>f.t==='status').at(-1)?.name===name,{timeout:15000},name);
     const command=async text=>{await page.$eval('#cmd',(el,text)=>{el.value=text;el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));},text);};
     await named('AuditBrowser');await command('login extension');await named('AuditExtension');
     await command('logout');await named('AuditBrowser');
     const secret=nip19.nsecEncode(sk);await command('LOGIN\t'+secret);await named('AuditOne');
     assert.equal(await page.evaluate(secret=>JSON.stringify(window.__auditSent).includes(secret)||document.querySelector('#log').textContent.includes(secret),secret),false);
     assert.deepEqual(browserErrors,[]);
     console.log('PASS: actual browser boot, guest login, extension signing, logout, and uppercase/tab key import; no key in socket frames or rendered history.');
   } finally {await browser.close();}
 }
 const burst=await Promise.all(Array.from({length:185},()=>request('/auth/challenge',{method:'POST'})));
 assert.ok(burst.some(r=>r.status===429));assert.ok(burst.every(r=>r.status===200||r.status===429));
 console.log('PASS: the real rate-limit binding throttles an authentication burst.');
} catch(e) {
 console.error(String(e?.stack||e).replaceAll(homedir(),'[local-home]'));
 process.exitCode=1;
} finally {
 for(const ws of sockets)try{ws.close();}catch{}
 if(mf)await mf.dispose();
 await rm(dir,{recursive:true,force:true});
}
