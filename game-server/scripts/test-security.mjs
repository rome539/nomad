// Security regressions. Synthetic keys only; no network, accounts, or production data.
// Run with Node >=22.13 after rebuilding the browser bundles.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const {build}=await import(pathToFileURL(join(root,'game-server/node_modules/esbuild/lib/main.js')));
const {parse}=await import(pathToFileURL(join(root,'game-server/node_modules/acorn/dist/acorn.mjs')));
globalThis.crypto ??= webcrypto;
const dir=await mkdtemp(join(tmpdir(),'nomad-crypto-'));
try {
 const out=join(dir,'api.mjs');
 await build({stdin:{contents:`export {default as worker} from './index';export * from './auth';export * from './jwt';export {PAGE} from './public';export {handleGatehouse,cmdTell,benchTake,handleBench} from './gate';export {handleSwap} from './trade';export {transferItems} from './world';export {EventQueue} from './security';export {PrivateMessages} from './private-messages';export {ZoneDO} from './zone';export {generateSecretKey,getPublicKey,finalizeEvent,verifyEvent,nip19,nip44} from 'nostr-tools';`,resolveDir:join(root,'game-server/src'),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:out,logLevel:'silent',plugins:[{name:'worker-text',setup(b){b.onLoad({filter:/(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/},async args=>({contents:await readFile(args.path,'utf8'),loader:'text'}));}}]});
 const api=await import(pathToFileURL(out));
 const sk=api.generateSecretKey(), pk=api.getPublicKey(sk), nsec=api.nip19.nsecEncode(sk);
 const spent=new Set();
 const env={AUTH_RATE_LIMITER:{limit:async()=>({success:true})},JWT_SECRET:'audit-only-random-secret-'+crypto.randomUUID(),DB:{prepare(sql){return {bind(...args){return {async run(){if(sql.startsWith('INSERT')){const fresh=!spent.has(args[0]);spent.add(args[0]);return {meta:{changes:fresh?1:0}};}return {meta:{changes:0}};}};}};}}};
 const challenge=async()=> (await (await api.handleChallenge(env)).json()).challenge;
 const makeEvent=async(extra={})=>api.finalizeEvent({kind:27235,created_at:Math.floor(Date.now()/1000),tags:[],content:await challenge(),...extra},sk);
 const verify=ev=>api.handleVerify(new Request('https://audit.invalid/auth/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event:ev})}),env);
 let ev=await makeEvent();let res=await verify(ev);assert.equal(res.status,200);
 const session=(await res.json()).token;assert.equal((await api.verifyJwt(session,env.JWT_SECRET)).sub,pk);
 assert.equal((await verify(ev)).status,401);
 ev=await makeEvent();assert.deepEqual((await Promise.all([verify(ev),verify(ev)])).map(r=>r.status).sort(),[200,401]);
 assert.equal((await verify(await makeEvent({kind:1}))).status,401);
 assert.equal((await verify(await makeEvent({created_at:1}))).status,401);
 ev=await makeEvent();ev.sig='0'.repeat(128);assert.equal((await verify(ev)).status,401);
 ev=await makeEvent();ev.pubkey=api.getPublicKey(api.generateSecretKey());assert.equal((await verify(ev)).status,401);
 const expired=await api.signJwt({purpose:'challenge',jti:crypto.randomUUID()},env.JWT_SECRET,-10);
 assert.equal((await verify(await makeEvent({content:expired}))).status,401);
 assert.equal(await api.verifyJwt(session+'x',env.JWT_SECRET),null);
 const unsigned=Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:pk,exp:9999999999})).toString('base64url')+'.';
 assert.equal(await api.verifyJwt(unsigned,env.JWT_SECRET),null);
 assert.equal(await api.verifyJwt(session,'wrong-secret'),null);
 assert.equal((await api.handleVerify(new Request('https://audit.invalid/auth/verify',{method:'POST',body:'null'}),env)).status,400);
 assert.equal((await api.handleVerify(new Request('https://audit.invalid/auth/verify',{method:'POST',body:'x'.repeat(16385)}),env)).status,413);
 console.log('PASS: valid signed login, wrong signature/pubkey/kind, stale event, expired challenge, replay and concurrent replay, JWT tampering/unsigned/wrong key.');

 // Test the exact committed bundle served as /vault.js, not just its TS source.
 const vaultPath=join(dir,'vault.mjs');await writeFile(vaultPath,await readFile(join(root,'game-server/src/vault-bundle.js')));
 const vault=await import(pathToFileURL(vaultPath));
 const pin='audit synthetic long passphrase 2026';
 const {backup,dek}=await vault.createBackup(nsec,pin);
 assert.equal(await vault.unlockWithPin(backup,pin),nsec);
 await assert.rejects(vault.unlockWithPin(backup,'wrong'));
 const tampered=structuredClone(backup);const buf=Buffer.from(tampered.key.ct,'base64');buf[40]^=1;tampered.key.ct=buf.toString('base64');
 await assert.rejects(vault.unlockWithPin(tampered,pin));
 const prf=crypto.getRandomValues(new Uint8Array(32));
 const wrap=await vault.wrapDekWithPasskey(dek,prf,'synthetic-id',crypto.getRandomValues(new Uint8Array(32)));
 const withBio=vault.withPasskeyWrap(backup,wrap);
 assert.equal(await vault.decryptNsecFromDek(withBio,await vault.unlockDekWithPasskey(withBio,prf)),nsec);
 await assert.rejects(vault.unlockDekWithPasskey(withBio,crypto.getRandomValues(new Uint8Array(32))));
 const changed=await vault.rewrapPin(withBio,dek,'replacement synthetic passphrase');
 await assert.rejects(vault.unlockWithPin(changed,pin));
 assert.equal(await vault.unlockWithPin(changed,'replacement synthetic passphrase'),nsec);
 assert.equal(await vault.decryptNsecFromDek(changed,await vault.unlockDekWithPasskey(changed,prf)),nsec);
 console.log('PASS: shipped vault bundle round trip, wrong PIN, tampered ciphertext, correct/wrong PRF, PIN change and preserved recovery.');
 await assert.rejects(vault.createBackupWithPin(nsec,'7'), /passphrase/);
 await assert.rejects(vault.rewrapPin(withBio,dek,'1234567890123456'), /passphrase/);
 // Build historical fixtures independently: weak v2 and legacy AES-GCM remain recoverable.
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const base=await crypto.subtle.importKey('raw',new TextEncoder().encode('7'),'PBKDF2',false,['deriveBits']);
 const kek=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:600000,salt},base,256));
 const b64=b=>Buffer.from(b).toString('base64url');
 const oldV2={...backup,wraps:[{type:'pin',kdf:'pbkdf2-sha256',iter:600000,salt:b64(salt),ct:api.nip44.v2.encrypt(Buffer.from(dek).toString('hex'),kek)}]};
 assert.equal(await vault.unlockWithPin(oldV2,'7'),nsec);
 const aes=async(key,data)=>{const iv=crypto.getRandomValues(new Uint8Array(12));const k=await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);return {iv:b64(iv),ct:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,data))};};
 const legacy={v:1,nsec:await aes(dek,new TextEncoder().encode(nsec)),wraps:{pin:{salt:b64(salt),iter:600000,...await aes(kek,dek)}}};
 assert.equal(await vault.unlockWithPin(legacy,'7'),nsec);
 const repairedLegacy=await vault.rewrapPin(legacy,dek,'three unrelated synthetic words');
 assert.equal(await vault.unlockWithPin(repairedLegacy,'three unrelated synthetic words'),nsec);
 await assert.rejects(vault.unlockWithPin(repairedLegacy,'7'));
 console.log('PASS: weak new vaults refused; historical weak-v2 and legacy AES-GCM backups still recover and upgrade.');

 // Provider boundaries in the shipped bundle. No real account, credential,
 // popup, or network: inspect browser/HTTP requests and use synthetic PRF data.
 const savedGlobals=new Map(['navigator','window','localStorage','fetch'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 try {
   const memory=new Map(),requests=[];let createOptions,getOptions;
   const credential={rawId:new Uint8Array([1,2,3]).buffer,getClientExtensionResults:()=>({prf:{results:{first:prf.buffer}}})};
   const credentials={create:async opts=>{createOptions=opts;return credential;},get:async opts=>{getOptions=opts;return credential;}};
   const setGlobal=(k,value)=>Object.defineProperty(globalThis,k,{configurable:true,writable:true,value});
   setGlobal('navigator',{credentials});setGlobal('window',{location:{hostname:'audit.invalid'}});
   setGlobal('localStorage',{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)});
   vault.configureNostrAuth({appName:'Synthetic audit',googleClientId:'synthetic-client',driveVaultName:'synthetic-vault.json'});
   const recovery=await vault.createRecoveryPasskey('Synthetic');
   assert.equal(createOptions.publicKey.rp.id,'audit.invalid');
   assert.equal(createOptions.publicKey.authenticatorSelection.userVerification,'required');
   assert.equal(createOptions.publicKey.challenge.length,32);
   const saltUrl=Buffer.from(recovery.prfSalt).toString('base64url');
   assert.deepEqual(await vault.getRecoveryPasskeyPrf(recovery.credentialId,saltUrl),prf);
   assert.equal(getOptions.publicKey.userVerification,'required');
   assert.deepEqual(new Uint8Array(getOptions.publicKey.allowCredentials[0].id),new Uint8Array([1,2,3]));
   assert.deepEqual(new Uint8Array(getOptions.publicKey.extensions.prf.eval.first),recovery.prfSalt);
   assert.equal(memory.size,0,'recovery PRF is never persisted locally');
   credentials.get=async()=>null;await assert.rejects(vault.getRecoveryPasskeyPrf(recovery.credentialId,saltUrl),/cancelled/);
   credentials.get=async()=>({getClientExtensionResults:()=>({})});
   await assert.rejects(vault.getRecoveryPasskeyPrf(recovery.credentialId,saltUrl),/PRF_NOT_SUPPORTED/);
   let oauthOptions;
   window.google={accounts:{oauth2:{initTokenClient:opts=>{oauthOptions=opts;return {requestAccessToken:()=>opts.callback({access_token:'synthetic-token',scope:opts.scope})};}}}};
   assert.equal((await vault.requestGoogleAuth()).accessToken,'synthetic-token');
   assert.deepEqual(oauthOptions.scope.split(' ').sort(),['https://www.googleapis.com/auth/drive.appdata','https://www.googleapis.com/auth/drive.file'].sort());
   assert.equal(memory.size,0,'OAuth token is not stored locally');
   setGlobal('fetch',async(url,options)=>{requests.push({url,options});return Response.json({id:'synthetic-created'});});
   vault.setVaultId('remembered-unopened');
   assert.equal(await vault.writeVault('synthetic-token',backup,null),'synthetic-created');
   assert.equal(requests[0].options.method,'POST');assert.ok(!requests[0].url.includes('remembered-unopened'));
   await vault.writeVault('synthetic-token',backup,'explicit-opened');
   assert.equal(requests[1].options.method,'PATCH');assert.ok(requests[1].url.includes('/explicit-opened?'));
   for(const {url,options} of requests){assert.equal(new URL(url).origin,'https://www.googleapis.com');assert.ok(!url.includes('synthetic-token'));assert.equal(options.headers.Authorization,'Bearer synthetic-token');assert.ok(!options.body.includes(nsec));assert.ok(!options.body.includes(pin));}
   setGlobal('fetch',async()=>Response.json({error:{message:'synthetic denied'}},{status:403}));
   await assert.rejects(vault.writeVault('synthetic-token',backup,'different-file'),/403/);
   assert.equal(vault.getVaultId(),'explicit-opened','failed writes cannot replace remembered file');
   assert.ok(![...memory.values()].includes('synthetic-token'));
   console.log('PASS: shipped Google/Drive and passkey boundaries enforce scoped requests, verified-user prompts, explicit vault writes, and no stored OAuth/PRF secrets.');
 } finally {
   for(const [key,descriptor] of savedGlobals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 }

 // Extract exact served functions through an AST; mock only browser side effects.
 const moduleText=api.PAGE.split('<script type="module">')[1].split('</script>')[0];
 const ast=parse(moduleText,{ecmaVersion:'latest',sourceType:'module'});
 const fn=name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(n,name);return moduleText.slice(n.start,n.end);};
 // Hold each authentication boundary, switch identity, then release the old reply.
 for (const boundary of ['login','ticket','ticket-json']) {
   let release;const held=new Promise(r=>release=r);const sockets=[];
   const dial={identityEpoch:0,stilled:false,crossed:true,connecting:false,ws:null,method:'guest',sessionToken:boundary==='login'?null:'old-session',
     login:()=>held,fetch:()=>boundary==='ticket'?held:Promise.resolve({ok:true,status:200,json:()=>held}),setTimeout(){},
     scheduleRetry(){},print(){},location:{protocol:'https:',host:'audit.invalid'},pageId:'page',dialAttempt:0,freshLoad:true,CONNECT_STALL_MS:10000,
     WebSocket:class {constructor(url){sockets.push(url);}}};
   vm.createContext(dial);vm.runInContext(fn('connect'),dial);
   const pending=vm.runInContext('connect()',dial);await Promise.resolve();await Promise.resolve();
   dial.identityEpoch++;dial.sessionToken='new-session';dial.connecting=false;
   release(boundary==='login'?'old-session':boundary==='ticket'?{ok:true,status:200,json:async()=>({ticket:'old-ticket'})}:{ticket:'old-ticket'});
   await pending;assert.equal(dial.sessionToken,'new-session',boundary);assert.equal(sockets.length,0,boundary);
 }
 console.log('PASS: stale login and ticket responses cannot restore the previous identity.');
 for (const cancelPicker of [false,true]) {
   const writes=[];
   const kit={requestGoogleAuth:async()=>({accessToken:'synthetic'}),findVault:async()=>null,readLegacyAppData:async()=>null,
     getVaultId:()=> 'existing-unopened-vault',pickDriveFile:async()=>null,createBackup:async()=>({backup:{},dek:new Uint8Array(32)}),
     writeVault:async(_token,_backup,id)=>{writes.push(id);return 'new-file';}};
   const vaultCtx={vaultBusy:false,identityEpoch:0,identityChoice:0,cancelPendingBunker(){},sk,nip19:api.nip19,getPublicKey:api.getPublicKey,idpanel:{classList:{remove(){}}},
     vaultKit:async()=>kit,print(){},verr:String,askConfirm:async()=>cancelPicker,askNewPassphrase:async()=>pin,askSecret:async()=>pin,
     localStorage:{setItem(){}},offerPasskeyRecovery:async()=>{}};
   vm.createContext(vaultCtx);vm.runInContext(fn('continueWithGoogle'),vaultCtx);await vm.runInContext('continueWithGoogle()',vaultCtx);
   assert.deepEqual(writes,cancelPicker?[]:[null]);assert.equal(vaultCtx.vaultBusy,false);
 }
 // A key change while backup crypto is pending must not overwrite the old vault.
 let finishBackup;const backupWait=new Promise(r=>finishBackup=r);const replacementWrites=[];
 const replacement={identityEpoch:0,identityChoice:0,sk,nip19:api.nip19,askNewPassphrase:async()=>pin,askSecret:async()=>pin,print(){},
   kit:{createBackup:()=>backupWait,writeVault:async(...args)=>replacementWrites.push(args)},found:{fileId:'old-file'}};
 vm.createContext(replacement);vm.runInContext(fn('replaceVault'),replacement);
 const replacing=vm.runInContext('replaceVault(kit,"synthetic",found)',replacement);await Promise.resolve();await Promise.resolve();await Promise.resolve();
 replacement.identityEpoch++;finishBackup({backup:{},dek:new Uint8Array(32)});
 await assert.rejects(replacing,/identity changed/);assert.equal(replacementWrites.length,0);
 console.log('PASS: new vaults cannot overwrite remembered unopened files; picker cancellation and identity changes perform no write.');
 for (const operation of ['offerNewPin','offerPasskeyRecovery']) {
   for (const change of ['none','epoch','choice']) {
     const writes=[],original={version:'original'},updated={version:'updated'};
     const ctx={identityEpoch:0,identityChoice:0,lastName:'synthetic',askConfirm:async()=>true,
       askNewPassphrase:async()=>pin,askSecret:async()=>pin,print(){},verr:String};
     const changeIdentity=()=>{if(change==='epoch')ctx.identityEpoch++;if(change==='choice')ctx.identityChoice++;return updated;};
     const kit={isPasskeySupported:async()=>true,createRecoveryPasskey:async()=>({}),
       wrapDekWithPasskey:async()=>changeIdentity(),withPasskeyWrap:()=>updated,
       rewrapPin:async()=>changeIdentity(),writeVault:async(...args)=>{writes.push(args);return 'existing-file';}};
     vm.createContext(ctx);vm.runInContext(fn(operation),ctx);
     const found={fileId:'existing-file',backup:original};
     await ctx[operation](kit,'synthetic',found,new Uint8Array(32));
     assert.equal(writes.length,change==='none'?1:0,operation+' '+change+' must stop stale recovery writes');
     assert.equal(found.backup,change==='none'?updated:original);
   }
 }
 console.log('PASS: passphrase upgrades and passkey enrollment stop before writing when the active identity changes.');
 let answerExtension;const extensionAnswer=new Promise(r=>answerExtension=r);const adopted=[];
 const extension={identityChoice:0,pendingSignerCard:null,pendingBunker:null,window:{nostr:{getPublicKey:()=>extensionAnswer}},print(){},
   burnPocketIfGraduated:pk=>adopted.push(pk),localStorage:{setItem(){}},reconnect(){}};
 vm.createContext(extension);vm.runInContext(fn('cancelPendingBunker')+'\n'+fn('loginExtension'),extension);
 const signingIn=vm.runInContext('loginExtension()',extension);
 vm.runInContext('cancelPendingBunker()',extension);answerExtension(pk);await signingIn;assert.equal(adopted.length,0);
 await vm.runInContext('loginExtension()',extension);assert.deepEqual(adopted,[pk]);
 let finishBunker;const bunkerReply=new Promise(r=>finishBunker=r);const signerWrites=[];
 const pendingClient={cancel(){},connectBunkerUrl:()=>bunkerReply,saveSession:()=>signerWrites.push('saved')};
 const selection={identityChoice:0,pendingSignerCard:null,pendingBunker:null,makeBunkerClient:async()=>pendingClient,print(){},
   burnPocketIfGraduated:()=>signerWrites.push('adopted'),localStorage:{setItem:()=>signerWrites.push('stored')},reconnect(){}};
 vm.createContext(selection);vm.runInContext(fn('cancelPendingBunker')+'\n'+fn('startBunker'),selection);
 vm.runInContext('startBunker("bunker://synthetic")',selection);await Promise.resolve();await Promise.resolve();
 vm.runInContext('cancelPendingBunker()',selection);finishBunker(pk);await Promise.resolve();await Promise.resolve();
 assert.deepEqual(signerWrites,[]);assert.equal(selection.pendingBunker,null);
 console.log('PASS: a superseded extension selection cannot change the active identity.');
 const wire=[],printed=[],imports=[];
 const ctx={history:[],histAt:-1,inGatehouseNow:true,ws:{readyState:1,send:s=>wire.push(JSON.parse(s))},print:s=>printed.push(s),guideCommand:()=>false,importKey:s=>imports.push(s)};
 const declarations=['SPEECH_VERBS','GATEHOUSE_CMDS','GATEHOUSE_NOARG_CMDS'].map(name=>{const n=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));assert.ok(n);return moduleText.slice(n.start,n.end);}).join('\n');
 vm.createContext(ctx);vm.runInContext(declarations+'\n'+fn('isSpeech')+'\n'+fn('sendCmd')+'\n'+fn('localCmd'),ctx);
 for(const verb of ['login','LOGIN','Login']) for(const sep of [' ', '\t', '\u00a0', '\n', '  ']) {
   ctx.input=verb+sep+nsec;vm.runInContext('sendCmd(input)',ctx);
 }
 assert.equal(wire.length,0);assert.equal(imports.length,15);
 assert.equal(ctx.history.length,0);assert.ok(printed.every(line=>!line.includes(nsec)));
 ctx.input='please use '+nsec;vm.runInContext('sendCmd(input)',ctx);assert.equal(wire.length,0);
 const speaker={pubkey:'speaker',name:'speaker'},listener={pubkey:'listener',name:'listener'};const messages=[];
 const z={sessions:new Map([['speaker',speaker],['listener',listener]]),outOfWorld:()=>true,send:(s,text)=>messages.push({to:s.pubkey,text})};
 await api.handleGatehouse(z,speaker,'login\t'+nsec);
 assert.ok(!messages.some(m=>m.text.includes(nsec)));
 const tellMessages=[];z.send=(s,text)=>tellMessages.push({to:s.pubkey,text});z.tellOut=()=>assert.fail('plaintext relay publication');
 api.cmdTell(z,speaker,'listener synthetic-private-words');
 assert.ok(!tellMessages.some(m=>m.to==='listener'||m.text.includes('synthetic-private-words')));
 console.log('PASS: all login whitespace/case variants stay local and out of history; legacy server plaintext paths fail closed.');

 // Browser private-message path: exercise the served functions with real crypto.
 const sk2=api.generateSecretKey(), pk2=api.getPublicKey(sk2);
 const privateWire=[], timers=[];
 Object.assign(ctx,{crypto,method:'guest',sk,nip44mod:api.nip44,finalizeEvent:(e,key)=>api.finalizeEvent(JSON.parse(JSON.stringify(e)),key),verifyEvent:e=>api.verifyEvent(JSON.parse(JSON.stringify(e))),getPublicKey:api.getPublicKey,verr:String,identityEpoch:0,pendingTells:new Map(),TELL_KIND:24915,setTimeout:fn=>timers.push(fn)});
 ctx.ws={readyState:1,send:s=>privateWire.push(JSON.parse(s))};
 vm.runInContext(fn('queuePrivateTell')+'\n'+fn('sealTo')+'\n'+fn('sendPrivateTell')+'\n'+fn('receivePrivateTell'),ctx);
 assert.equal(vm.runInContext('queuePrivateTell("tell friend synthetic-private-words")',ctx),true);
 assert.ok(!JSON.stringify(privateWire).includes('synthetic-private-words'));
 const req=privateWire[0];ctx.reply={id:req.id,to:pk2,name:'friend'};await vm.runInContext('sendPrivateTell(reply)',ctx);
 assert.ok(privateWire[1],printed.filter(s=>s.startsWith('Quiet word:')).join('; '));
 assert.equal(privateWire[1].t,'sealed-tell');assert.ok(!JSON.stringify(privateWire).includes('synthetic-private-words'));
 const sealed=privateWire[1].event;
 assert.equal(api.nip44.v2.decrypt(sealed.content,api.nip44.v2.utils.getConversationKey(sk2,pk)),'synthetic-private-words');
 // A missing extension capability must never silently encrypt under a pocket key.
 ctx.method='ext';ctx.window={nostr:{}};await assert.rejects(vm.runInContext('sealTo(reply.to,"message")',ctx),/does not support/);ctx.method='guest';
 const incoming=[];const outbound=[];
 const sender={pubkey:pk,sealedTell:true,name:'sender',ws:{send:s=>outbound.push(JSON.parse(s))}};
 const recipient={pubkey:pk2,sealedTell:true,name:'friend',ws:{send:s=>incoming.push(JSON.parse(s))}};
 const pz={sessions:new Map([[pk,sender],[pk2,recipient]]),outOfWorld:()=>true};
 const privateMessages=new api.PrivateMessages();
 privateMessages.handle(pz,sender,req);privateMessages.handle(pz,sender,privateWire[1]);
 assert.equal(incoming.length,1);assert.equal(outbound.at(-1).t,'tell-sent');
 assert.ok(!JSON.stringify([...outbound,...incoming]).includes('synthetic-private-words'));
 privateMessages.handle(pz,sender,privateWire[1]);assert.equal(incoming.length,1);
 const badId=crypto.randomUUID();privateMessages.handle(pz,sender,{t:'tell-key',id:badId,who:'friend'});
 privateMessages.handle(pz,sender,{t:'sealed-tell',id:badId,event:{...JSON.parse(JSON.stringify(sealed)),sig:'0'.repeat(128)}});
 assert.equal(incoming.length,1);
 ctx.sk=sk2;ctx.incoming=incoming[0];await vm.runInContext('receivePrivateTell(incoming)',ctx);
 assert.ok(printed.some(p=>p.includes('synthetic-private-words')));
 console.log('PASS: private words stay out of all socket frames; recipient decrypts; wrong signatures and replay are refused.');

 // Real SQLite exercises the actual conditional SQL, not a mock success count.
 const sql=new DatabaseSync(':memory:');
 sql.exec("CREATE TABLE player_items(id TEXT PRIMARY KEY,item_id TEXT,pubkey TEXT,container TEXT,condition INTEGER DEFAULT 100,equipped INTEGER DEFAULT 0,signed_serial INTEGER,journal_id TEXT,lore_id TEXT,acquired_at INTEGER DEFAULT 1,rolled_traits TEXT,container_at INTEGER); CREATE TABLE auth_spent(jti TEXT PRIMARY KEY,exp INTEGER);");
 let reads=0;
 const sqliteDB={prepare(query){return {bind(...args){return {async all(){reads++;return {results:sql.prepare(query).all(...args)};},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}};}};}};
 const item=id=>({rowId:id,itemId:id,serial:null,equipped:false,condition:100});
 const gs=(pk,items=[])=>({pubkey:pk,name:pk,items,roomId:'gate',away:true,ws:{send(){}}});
 const gz=db=>({env:{DB:db},world:{entryRooms:new Set(['gate']),itemTemplates:new Map(['gem','sword'].map(id=>[id,{id,name:id}]))},foodCapped:()=>false,torchCapped:()=>false,dressingCapped:()=>false,packRoom:()=>true,packCap:()=>12,hasRoom:()=>true,inCombat:()=>false,outOfWorld:()=>false,send(){},sendCtx(){},roomFeed(){},tradeLocked:new Set()});
 sql.prepare("INSERT INTO player_items(id,item_id,pubkey,container) VALUES ('gem','gem','owner','lockbox')").run();
 const player=gs('owner'), wz=gz(sqliteDB);
 await Promise.all([api.benchTake(wz,player,'gem'),api.benchTake(wz,player,'gem')]);assert.equal(player.items.length,1);
 assert.equal(sql.prepare('SELECT container FROM player_items WHERE id=?').get('gem').container,'');
 const before=reads;await api.handleBench(wz,player,{action:'take',rows:Array(100).fill('missing')});assert.equal(reads,before);
 console.log('PASS: concurrent withdrawals deliver exactly one item; oversized batches perform zero database reads.');
 sql.prepare("UPDATE player_items SET pubkey='victim' WHERE id='gem'").run();
 sql.prepare("INSERT INTO player_items(id,item_id,pubkey,container) VALUES ('sword','sword','attacker','')").run();
 let release;const wait=new Promise(r=>release=r);let first=true;
 const delayDB={prepare(query){return {bind(...args){const stmt=sqliteDB.prepare(query).bind(...args);return {...stmt,async all(){if(first){first=false;await wait;}return stmt.all();}};}};}};
 const a=gs('victim',[item('gem')]),b=gs('attacker',[item('sword')]);
 const tz=gz(delayDB);tz.sessions=new Map([['victim',a],['attacker',b]]);
 const deal={id:'deal',aPk:a.pubkey,bPk:b.pubkey,accepted:true,roomId:'gate',gatehouse:false,offerA:[{rowId:'gem',itemId:'gem'}],offerB:[{rowId:'sword',itemId:'sword'}],confirmA:true,confirmB:false};
 tz.deals=new Map([[deal.id,deal]]);a.dealId=b.dealId=deal.id;
 const settling=api.handleSwap(tz,b,{action:'confirm'});
 await api.handleSwap(tz,b,{action:'unoffer',row:'sword'});assert.equal(deal.offerB.length,1);
 release();await settling;
 assert.deepEqual(a.items.map(i=>i.itemId),['sword']);assert.deepEqual(b.items.map(i=>i.itemId),['gem']);
 assert.equal(sql.prepare('SELECT pubkey FROM player_items WHERE id=?').get('gem').pubkey,'attacker');
 // If one expected owner is wrong, neither side moves.
 await assert.rejects(api.transferItems(sqliteDB,[{rowId:'gem',fromPubkey:'attacker',toPubkey:'third'},{rowId:'sword',fromPubkey:'wrong',toPubkey:'third'}]),/ownership/);
 assert.equal(sql.prepare('SELECT pubkey FROM player_items WHERE id=?').get('gem').pubkey,'attacker');
 assert.equal(sql.prepare('SELECT pubkey FROM player_items WHERE id=?').get('sword').pubkey,'victim');
 // A failed settlement must preserve both caches and release the deal locks.
 const failedDeal={...deal,id:'failed-deal',offerA:[{rowId:'sword',itemId:'sword'}],offerB:[{rowId:'gem',itemId:'gem'}],confirmA:true,confirmB:false};
 tz.deals.set(failedDeal.id,failedDeal);a.dealId=b.dealId=failedDeal.id;
 tz.env.DB={prepare(query){if(query.includes('WITH eligible'))throw new Error('synthetic database failure');return sqliteDB.prepare(query);}};
 await assert.rejects(api.handleSwap(tz,b,{action:'confirm'}),/synthetic database failure/);
 assert.deepEqual(a.items.map(i=>i.itemId),['sword']);assert.deepEqual(b.items.map(i=>i.itemId),['gem']);
 assert.equal(tz.deals.get(failedDeal.id),failedDeal);assert.equal(failedDeal.settling,false);
 assert.equal(failedDeal.confirmA,false);assert.equal(failedDeal.confirmB,false);assert.equal(tz.tradeLocked.size,0);
 console.log('PASS: offer changes cannot race settlement; real SQLite exchanges both items atomically and refuses stale ownership.');
 const ticketEnv={...env,DB:sqliteDB};
 const ticketResponse=await api.handleTicket(new Request('https://audit.invalid/auth/ticket',{headers:{authorization:'Bearer '+session}}),ticketEnv);
 const {ticket}=await ticketResponse.json();
 const redemption=await Promise.all([api.consumeTicket(ticket,ticketEnv),api.consumeTicket(ticket,ticketEnv)]);
 assert.equal(redemption.filter(v=>v===pk).length,1);assert.equal(redemption.filter(v=>v===null).length,1);
 assert.equal(await api.consumeTicket(session,ticketEnv),null);
 const tokenFromTicket=await api.handleTicket(new Request('https://audit.invalid/auth/ticket',{headers:{authorization:'Bearer '+ticket}}),ticketEnv);assert.equal(tokenFromTicket.status,401);
 console.log('PASS: one concurrent ticket redemption succeeds; session tokens cannot open sockets and tickets cannot mint tickets.');
 const forwarded=[];
 const routeEnv={...ticketEnv,ADMIN_TOKEN:'synthetic-admin-secret',ZONE:{idFromName:n=>n,get:()=>({fetch:async req=>{forwarded.push(req);return new Response('{}');}})}};
 const rateKeys=[];
 const limitedEnv={...routeEnv,AUTH_RATE_LIMITER:{limit:async({key})=>{rateKeys.push(key);return {success:false};}},DB:{prepare(){assert.fail('rate-limited request reached D1');}}};
 for(const path of ['/auth/challenge','/auth/verify','/auth/ticket','/ws']) {
   const result=await api.worker.fetch(new Request('https://audit.invalid'+path,{method:path==='/ws'?'GET':'POST',headers:{'CF-Connecting-IP':'192.0.2.7','X-Forwarded-For':crypto.randomUUID()}}),limitedEnv);
   assert.equal(result.status,429);assert.equal(result.headers.get('retry-after'),'60');
 }
 assert.equal(new Set(rateKeys).size,1);assert.match(rateKeys[0],/^[a-f0-9]{64}$/);assert.ok(!rateKeys[0].includes('192.0.2.7'));
 assert.equal((await api.worker.fetch(new Request('https://audit.invalid/auth/challenge',{method:'POST'}),{...routeEnv,AUTH_RATE_LIMITER:undefined})).status,503);
 assert.equal((await api.worker.fetch(new Request('https://audit.invalid/auth/challenge',{method:'POST'}),{...routeEnv,AUTH_RATE_LIMITER:{limit:async()=>{throw Error('offline');}}})).status,503);
 console.log('PASS: authentication rate limits run before D1, use private counter keys, ignore forwarded-header rotation, and fail closed on missing/broken bindings.');
 for(const route of ['publish-profile','publish-deletion','retire-score','reseed']) {
   assert.equal((await api.worker.fetch(new Request('https://audit.invalid/admin/'+route,{method:'POST',headers:{'x-admin':'reseed','x-admin-token':'wrong'}}),routeEnv)).status,401);
 }
 const routeTicket=await (await api.handleTicket(new Request('https://audit.invalid/auth/ticket',{headers:{authorization:'Bearer '+session}}),ticketEnv)).json();
 const hostile=new Request('https://audit.invalid/ws?ticket='+routeTicket.ticket,{headers:{Upgrade:'websocket','x-admin':'reseed','x-world':'1','x-pubkey':'forged'}});
 assert.equal((await api.worker.fetch(hostile,routeEnv)).status,200);assert.equal(forwarded.length,1);
 assert.equal(forwarded[0].headers.get('x-pubkey'),pk);assert.equal(forwarded[0].headers.get('x-admin'),null);assert.equal(forwarded[0].headers.get('x-world'),null);
 assert.equal((await api.worker.fetch(hostile,routeEnv)).status,401);assert.equal(forwarded.length,1);
 assert.equal((await api.worker.fetch(new Request('https://audit.invalid/ws?token='+session,{headers:{Upgrade:'websocket'}}),routeEnv)).status,401);
 const qrResponse=await api.worker.fetch(new Request('https://audit.invalid/qrcode.js'),routeEnv);
 assert.equal(qrResponse.status,200);assert.equal(await qrResponse.text(),await readFile(join(root,'game-server/src/qrcode-bundle.js'),'utf8'));
 assert.equal((await api.worker.fetch(new Request('https://audit.invalid/index.js.map'),routeEnv)).status,404);
 assert.ok(!moduleText.includes('https://esm.sh/'));
 console.log('PASS: actual Worker routes reject admin bypass, strip privileged socket headers, reject old/replayed credentials, and serve the local QR bundle.');
 // Exercise actual DO entry points with delayed work to verify the wiring.
 const queueEvents=[];let free;const barrier=new Promise(r=>free=r);
 const zone=new api.ZoneDO({},{});
 zone.handleFetch=async()=>{queueEvents.push('fetch-start');await barrier;queueEvents.push('fetch-end');return new Response('ok');};
 zone.handleAlarm=async()=>{queueEvents.push('alarm');};
 zone.handleWebSocketMessage=async()=>{queueEvents.push('message');};
 const fetching=zone.fetch(new Request('https://audit.invalid'));
 const alarm=zone.alarm();const socket={close(){},send(){}};const message=zone.webSocketMessage(socket,'{"t":"cmd","text":"look"}');
 await Promise.resolve();assert.deepEqual(queueEvents,['fetch-start']);free();await Promise.all([fetching,alarm,message]);assert.deepEqual(queueEvents,['fetch-start','fetch-end','alarm','message']);
 const queue=new api.EventQueue();await assert.rejects(queue.run(async()=>{throw new Error('expected');}));assert.equal(await queue.run(async()=>7),7);assert.equal(queue.pending,0);
 let closeCode;await zone.webSocketMessage({close:c=>closeCode=c},'x'.repeat(8193));assert.equal(closeCode,1009);
 console.log('PASS: fetch, alarm, and socket work serialize across awaits; queue recovers after exceptions; oversized frames close before handling.');
 sql.close();

 // Run the real QR flow with a synthetic relay and real NIP-44 encryption.
 globalThis.__nip44mod=api.nip44;
 class Socket {static OPEN=1;static CONNECTING=0;readyState=1;send(){}close(){}}
 globalThis.WebSocket=Socket;
 const bunkerPath=join(dir,'bunker.mjs');await writeFile(bunkerPath,await readFile(join(root,'nostr-auth/nip46-bunker.js')));
 const {BunkerClient}=await import(pathToFileURL(bunkerPath));
 const urls=[];const bunker=new BunkerClient({NostrTools:api,relays:['wss://audit.invalid'],storageKey:null,heartbeatMs:0,onAuthUrl:u=>urls.push(u)});
 const flow=await bunker.startClientFlow();let rejected=false;flow.waitForConnect.catch(()=>{rejected=true;});
 const adversary=api.generateSecretKey();const ckey=api.nip44.v2.utils.getConversationKey(adversary,bunker._clientPk);
 const callback=bunker._rawPool._listeners[0].onEvent;
 const event=payload=>api.finalizeEvent({kind:24133,created_at:Math.floor(Date.now()/1000),tags:[['p',bunker._clientPk]],content:api.nip44.v2.encrypt(JSON.stringify(payload),ckey)},adversary);
 await callback(event({result:'auth_url',error:'https://audit.invalid/approve'}),'wss://audit.invalid');assert.equal(urls.length,0);
 await callback(event({error:'synthetic-denial'}),'wss://audit.invalid');await Promise.resolve();assert.equal(rejected,false);
 assert.equal(bunker.connected,false);assert.equal(bunker._connecting,true);
 // A valid secret echo still pairs; invalid signed envelopes never reach pairing.
 const socket2=[...bunker._rawPool._sockets.values()][0];
 const secret=new URL(flow.connectUri).searchParams.get('secret');
 const oldPk=bunker._clientPk;
 bunker._rawPool._queue.set('wss://audit.invalid',[JSON.stringify(['EVENT',{id:'queued-request'}]),JSON.stringify(['REQ','old-sub',{}])]);
 bunker.resumeConnection();
 assert.deepEqual(bunker._rawPool._queue.get('wss://audit.invalid').map(JSON.parse),[['EVENT',{id:'queued-request'}]]);
 assert.equal(bunker._clientPk,oldPk);assert.equal(bunker._rawPool._listeners[0].onEvent,callback);
 assert.notEqual([...bunker._rawPool._sockets.values()][0],socket2);
 // A delayed close from the suspended socket must not remove its replacement.
 socket2.onclose();assert.equal(bunker._rawPool._sockets.size,1);
 const forged={...JSON.parse(JSON.stringify(event({result:secret}))),sig:'0'.repeat(128)};
 await socket2.onmessage({data:JSON.stringify(['EVENT',bunker._rawPool._listeners[0].subId,forged])});assert.equal(bunker.connected,false);
 bunker._request=async(method)=>{assert.equal(method,'get_public_key');return pk;};
 await callback(event({result:secret}),'wss://audit.invalid');assert.equal(await flow.waitForConnect,pk);assert.equal(bunker.connected,true);bunker.destroy();
 const cancelled=new BunkerClient({NostrTools:api,relays:['wss://audit.invalid'],storageKey:null,heartbeatMs:0});
 const cancelledFlow=await cancelled.startClientFlow();
 const cancellation=assert.rejects(cancelledFlow.waitForConnect,/cancelled/);
 cancelled.cancel();await cancellation;
 // Cancellation after approval but before get_public_key returns must not
 // resurrect a connected client or persist its session.
 const late=new BunkerClient({NostrTools:api,relays:['wss://audit.invalid'],storageKey:null,heartbeatMs:0});
 const lateFlow=await late.startClientFlow();
 const lateCallback=late._rawPool._listeners[0].onEvent;
 let finishIdentity,identityStarted;
 const startedIdentity=new Promise(r=>identityStarted=r);
 late._request=async()=>{identityStarted();return new Promise(r=>finishIdentity=r);};
 let lateSaves=0;late.saveSession=()=>lateSaves++;
 const lateKey=api.nip44.v2.utils.getConversationKey(adversary,late._clientPk);
 const approval=api.finalizeEvent({kind:24133,created_at:Math.floor(Date.now()/1000),tags:[['p',late._clientPk]],content:api.nip44.v2.encrypt(JSON.stringify({result:new URL(lateFlow.connectUri).searchParams.get('secret')}),lateKey)},adversary);
 const handling=lateCallback(approval);await startedIdentity;
 const lateCancellation=assert.rejects(lateFlow.waitForConnect,/cancelled/);
 late.cancel();finishIdentity(pk);await handling;await lateCancellation;
 assert.equal(late.connected,false,'cancelled approval cannot restore connected state');
 assert.equal(late.userPubkey,null);assert.equal(lateSaves,0);late.destroy();
 for (const useSimplePool of [false,true]) {
   let published,receive,finish,started;
   const sent=new Promise(r=>published=r),identityPending=new Promise(r=>started=r);
   const pool={ensureRelay:async()=>({publish:async ev=>published(ev)}),subscribeMany(_relays,_filters,handlers){receive=handlers.onevent;return {close(){}};}};
   const urlClient=new BunkerClient({NostrTools:api,storageKey:null,heartbeatMs:0,...(useSimplePool?{simplePool:pool}:{})});
   urlClient._request=async()=>{started();return new Promise(r=>finish=r);};
   let saves=0;urlClient.saveSession=()=>saves++;
   const login=urlClient.connectBunkerUrl('bunker://'+api.getPublicKey(adversary)+'?relay=wss%3A%2F%2Faudit.invalid');
   const rejectedLogin=assert.rejects(login,/cancelled/);
   if(!useSimplePool){urlClient._rawPool.publish=ev=>published(ev);receive=urlClient._rawPool._listeners[0].onEvent;}
   const requestEvent=await sent;
   const key=api.nip44.v2.utils.getConversationKey(adversary,urlClient._clientPk);
   const request=JSON.parse(api.nip44.v2.decrypt(requestEvent.content,key));
   const reply=api.finalizeEvent({kind:24133,created_at:Math.floor(Date.now()/1000),tags:[['p',urlClient._clientPk]],content:api.nip44.v2.encrypt(JSON.stringify({id:request.id,result:'ack'}),key)},adversary);
   const receiving=receive(reply);await identityPending;
   urlClient.cancel();finish(pk);await receiving;await rejectedLogin;
   assert.equal(urlClient.connected,false);assert.equal(urlClient.userPubkey,null);assert.equal(saves,0);urlClient.destroy();
 }
 console.log('PASS: cancellation during identity lookup cannot resurrect or save QR, raw-relay, or SimplePool signer sessions.');
 console.log('PASS: QR secret binding, signature checks, resumed subscriptions, stale socket close, and cancellation.');
} finally {await rm(dir,{recursive:true,force:true});}
