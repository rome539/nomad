// Isolated SQLite and mocked relays: no local player keys or public posts.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('..', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'nomad-invites-'));
const db = new DatabaseSync(':memory:');
const saved = new DatabaseSync(':memory:');
try {
  await build({stdin:{contents:"export {ZoneDO} from './zone'; export * as invites from './invites'; export * as world from './world'; export * as verbs from './verbs'; export {parse} from './parser'; export {PAGE} from './public';",resolveDir:join(root,'src'),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:join(dir,'test.mjs'),logLevel:'silent',plugins:[{name:'text',setup(b){b.onLoad({filter:/(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/},a=>({contents:readFileSync(a.path,'utf8'),loader:'text'}));}}]});
  const {ZoneDO,invites,world,verbs,parse,PAGE}=await import(pathToFileURL(join(dir,'test.mjs')));
  db.exec(readFileSync(join(root,'schema.sql'),'utf8'));
  for(const f of readdirSync(join(root,'migrations')).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(join(root,'migrations',f),'utf8'));
  const statement=(q,args=[])=>({bind:(...a)=>statement(q,a),all:async()=>({results:db.prepare(q).all(...args)}),first:async()=>db.prepare(q).get(...args)??null,run:async()=>({meta:db.prepare(q).run(...args)})});
  const storage={sql:{exec(q,...a){const rows=saved.prepare(q).all(...a);rows.toArray=()=>rows;return rows;}},get:async()=>undefined,delete:async()=>{},transactionSync:f=>f(),getAlarm:async()=>null,setAlarm:async()=>{}};
  const env={DB:{prepare:statement,batch:async rows=>Promise.all(rows.map(r=>r.all()))},RELAYS:''};
  const z=new ZoneDO({storage,getWebSockets:()=>[],waitUntil:()=>{}},env);
  await z.init('door');
  const frames=[];const ws={send:s=>frames.push(JSON.parse(s))};
  const make=async pk=>{const {row}=await world.getOrCreatePlayer(env.DB,pk,'gate');return z.buildSession(ws,row,await world.loadInventory(env.DB,pk));};
  const sender=await make('Geartest');sender.name='Geartest';z.sessions.set(sender.pubkey,sender);
  db.prepare('UPDATE players SET name=? WHERE pubkey=?').run('Geartest',sender.pubkey);
  assert.deepEqual(parse('invite The Road Calls'),{verb:'invite',arg:'The Road Calls'});
  await invites.command(z,sender,'  Come\u0000 Home  ');
  const first=frames.find(f=>f.t==='invite');assert.match(first.code,invites.CODE);assert.equal(first.message,'Come Home');assert.equal(first.post,false);
  await invites.command(z,sender,'');assert.equal(frames.at(-1).code,first.code);assert.equal(frames.at(-1).message,'Come Home');
  await invites.command(z,sender,'post');assert.equal(frames.at(-1).post,true);
  assert.equal(Array.from(invites.cleanMessage('🗝'.repeat(150))).length,140);
  assert.equal(await invites.claim(z,'Geartest',first.code),false);
  assert.equal(await invites.claim(z,'newcomer','bad'),false);
  const upgraded=invites.KIT.map(id=>invites.KIT_UPGRADES[id]);
  assert.deepEqual(invites.rollKit(()=>0.10),invites.KIT);
  assert.deepEqual(invites.rollKit(()=>0.099999),upgraded);
  for(let lucky=0;lucky<6;lucky++) {
    let slot=0;
    assert.deepEqual(invites.rollKit(()=>slot++===lucky?0:0.9),invites.KIT.map((id,i)=>i===lucky?upgraded[i]:id));
    assert.equal(slot,6);
    const base=z.world.itemTemplates.get(invites.KIT[lucky]),better=z.world.itemTemplates.get(upgraded[lucky]);
    assert.equal(better.slot,base.slot);
    assert.equal(better.rarity,'uncommon');
    assert.ok(better.dmg+better.armor+better.block>base.dmg+base.armor+base.block);
  }
  const newcomer=await make('newcomer');
  const originalCrypto=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  const nativeCrypto=globalThis.crypto;
  // Force every slot to upgrade, proving the awarded replacements arrive worn.
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID:()=>nativeCrypto.randomUUID(),getRandomValues:a=>a instanceof Uint32Array?a.fill(0):nativeCrypto.getRandomValues(a)}});
  let claims;
  try {
    claims=await Promise.all([invites.claim(z,'newcomer',first.code),invites.claim(z,'newcomer',first.code)]);
  } finally { Object.defineProperty(globalThis,'crypto',originalCrypto); }
  assert.deepEqual(claims.sort(),[false,true]);
  newcomer.items=await world.loadInventory(env.DB,'newcomer');
  assert.equal(newcomer.items.length,13);assert.ok(newcomer.items.some(i=>i.itemId==='surveyor-map'),'the bundle carries a surveyor\'s map');assert.equal(newcomer.items.filter(i=>i.equipped).length,6);
  assert.deepEqual(newcomer.items.filter(i=>i.equipped).map(i=>i.itemId).sort(),[...upgraded].sort());
  assert.ok(newcomer.items.every(i=>i.condition===100&&!i.rolledTraits));
  assert.equal(newcomer.items.filter(i=>i.itemId==='hardtack').length,2);
  assert.equal(frames.filter(f=>f.text?.includes('has arrived with your letter')).length,1);
  assert.equal((await world.getOrCreatePlayer(env.DB,'newcomer','gate')).created,false);
  await invites.read(z,newcomer,'letter');assert.match(frames.at(-1).text,/Come Home\n— Geartest/);
  let letter=newcomer.items.find(i=>i.inviteCode);
  await verbs.dropCarried(z,newcomer,letter);
  const inst=verbs.takeGroundInstance(z,newcomer.roomId,'letter');assert.equal(inst.inviteCode,first.code);
  await verbs.getInstanced(z,newcomer,inst);
  letter=newcomer.items.find(i=>i.inviteCode);
  await world.setContainer(env.DB,letter.rowId,'lockbox');assert.equal((await world.loadContainer(env.DB,'newcomer','lockbox'))[0].inviteCode,first.code);
  await world.withdrawContainer(env.DB,letter.rowId,'newcomer','lockbox');
  await world.transferItems(env.DB,[{rowId:letter.rowId,fromPubkey:'newcomer',toPubkey:'Geartest'}]);
  assert.equal((await world.loadInventory(env.DB,'Geartest'))[0].inviteCode,first.code);
  await world.transferItems(env.DB,[{rowId:letter.rowId,fromPubkey:'Geartest',toPubkey:'newcomer'}]);
  newcomer.items=await world.loadInventory(env.DB,'newcomer');
  await z.onPlayerDeath(newcomer,null);
  assert.equal(z.groundInstances.get('gate').find(i=>i.inviteCode).inviteCode,first.code);
  console.log('PASS: standing code, clean message, explicit post frame, self/invalid/duplicate claims, 10% independent slot upgrades and plain worn upgraded kit, letter read/drop/pickup/container/trade/death and online notice.');
  // Reuse the one isolated newcomer fixture for each claim case.
  const reset=()=>db.exec("DELETE FROM player_items WHERE pubkey='newcomer'; DELETE FROM invite_claims;");
  const now=Math.floor(Date.now()/1000);
  const seed=(key,at)=>db.prepare('INSERT INTO invite_claims VALUES (?,?,?,?,?)').run(key,first.code,'Geartest',1,at);
  // NO DAILY CAP (rome, 2026-10-23): a third newcomer the same day still gets
  // the whole kit, since the claim is once per soul and a missed kit is gone.
  reset();seed('prior-one',now);seed('prior-two',now);
  await invites.claim(z,'newcomer',first.code);
  assert.equal((await world.loadInventory(env.DB,'newcomer')).length,13,'a third newcomer in a day still gets the kit');
  assert.match(frames.at(-1).text,/the bundle you sent went with it/);
  reset();seed('prior-one',now);seed('prior-two',now-86401);
  await invites.claim(z,'newcomer',first.code);assert.equal((await world.loadInventory(env.DB,'newcomer')).length,13);
  { const line=invites.arrivalLine(z,await world.loadInventory(env.DB,'newcomer'));
    assert.match(line,/dressed you for the road/);assert.match(line,/You are wearing .+\./);assert.match(line,/In your pack: 2 x .*hardtack/); }
  console.log('PASS: every newcomer gets the kit, however many arrive in a day.');
  // A wanderer already on the road: a line and a day's supplies, once ever
  // (rome, 2026-10-23), the overflow banked in the vault; your own letter gives nothing.
  const rowsOf=async(pk)=>[...(await world.loadInventory(env.DB,pk)),...(await world.loadContainer(env.DB,pk,'vault'))];
  const countOf=(rows,id)=>rows.filter(i=>i.itemId===id).length;
  { const vet=await make('Rustpilgrim');vet.name='Rustpilgrim';
    await invites.returning(z,vet,first.code);
    assert.match(frames.at(-2).text,/meant for someone new to the road\. \('look letter' reads it\.\) Folded in with it, a day's supplies: 4 x .*hardtack/);
    assert.match(frames.at(-1).text,/Rustpilgrim, already on the road, has read your letter\./);
    assert.ok(vet.items.some(i=>i.itemId==='invite-letter'&&i.inviteCode===first.code));
    const rows=await rowsOf(vet.pubkey);
    for(const [id,min,max] of invites.ROAD_SUPPLIES){const n=countOf(rows,id);assert.ok(n>=min&&n<=max,id+' '+n+' outside '+min+'-'+max);}
    assert.equal(await invites.read(z,vet,'letter'),true);assert.match(frames.at(-1).text,/— Geartest$/);
    const n=frames.length,had=(await rowsOf(vet.pubkey)).length;await invites.returning(z,vet,first.code);
    assert.equal(frames.length,n);assert.equal((await rowsOf(vet.pubkey)).length,had,'a second link gives nothing');
    const n2=frames.length;await invites.returning(z,sender,first.code);
    assert.equal(frames.length,n2+1);assert.match(frames.at(-1).text,/in your own hand/); }
  // A full pack: everything goes to the vault, and the line says so.
  { const full=await make('Fullpack');full.name='Fullpack';
    const grant=z.grantItem;z.grantItem=async()=>null;
    try{await invites.returning(z,full,first.code);}finally{z.grantItem=grant;}
    const said=frames.filter(f=>/a day's supplies|went to your vault/.test(f.text||'')).at(-1).text;
    assert.match(said,/Your pack is full, so it all went to your vault: 4 x .*hardtack/);
    const vault=await world.loadContainer(env.DB,full.pubkey,'vault');
    assert.equal(countOf(vault,'hardtack'),4);assert.equal(countOf(vault,'torch'),2); }
  console.log('PASS: a wanderer already on the road gets a day\'s supplies once, a full pack banks them in the vault; the sender is told; your own letter gives nothing.');
  // THE CAP FOR THOSE ALREADY PLAYING (rome, 2026-10-23): three a letter a day.
  // Rustpilgrim and Fullpack took two places above; a third is paid, a fourth
  // is told to come back, keeps no claim, and is paid once the day has passed.
  { const third=await make('Thirdvet');third.name='Thirdvet';
    await invites.returning(z,third,first.code);
    assert.ok((await rowsOf(third.pubkey)).some(i=>i.itemId==='hardtack'),'the third returning player is paid');
    const fourth=await make('Fourthvet');fourth.name='Fourthvet';
    await invites.returning(z,fourth,first.code);
    assert.match(frames.at(-1).text,/gone to others already today\. Follow it again tomorrow\./);
    assert.equal((await rowsOf(fourth.pubkey)).some(i=>i.itemId==='hardtack'),false,'past the cap, nothing');
    assert.equal(db.prepare("SELECT COUNT(*) n FROM invite_claims WHERE newcomer='Fourthvet'").get().n,0,'past the cap, no claim is burned');
    db.prepare("UPDATE invite_claims SET claimed_at = claimed_at - 86401 WHERE inviter='Geartest'").run();
    await invites.returning(z,fourth,first.code);
    assert.ok((await rowsOf(fourth.pubkey)).some(i=>i.itemId==='hardtack'),'a day later the fourth is paid'); }
  console.log('PASS: three returning players a letter a day; the fourth keeps its claim and is paid the next day.');
  const capture=PAGE.slice(PAGE.indexOf('var pendingInvite = "";'),PAGE.indexOf('if (!/^[A-Za-z0-9]{10}$/.test(pendingInvite)) pendingInvite = "";') + 'if (!/^[A-Za-z0-9]{10}$/.test(pendingInvite)) pendingInvite = "";'.length);
  for(const blocked of [false,true]) {
    const stored=new Map();let cleaned='';
    const ctx={URL,location:{href:'https://nomadmud.com/?invite='+first.code+'&keep=1#door'},history:{state:null,replaceState:(_s,_t,url)=>{cleaned=url;}},localStorage:{setItem:(k,v)=>{if(blocked)throw Error('blocked');stored.set(k,v);},getItem:k=>stored.get(k)}};
    vm.createContext(ctx);vm.runInContext(capture,ctx);
    assert.equal(ctx.pendingInvite,first.code);assert.equal(cleaned,'/?keep=1#door');
    if(!blocked) assert.match(stored.get('nomad_invite'),new RegExp('^'+first.code+'\\|\\d+$'));
  }
  // Held from an earlier visit: survives a plain reload for a week, then is let go.
  for(const [age,want] of [[3600e3,first.code],[8*86400e3,'']]) {
    const removed=[];const held={URL,location:{href:'https://nomadmud.com/'},history:{state:null,replaceState:()=>{}},localStorage:{setItem:()=>{},getItem:()=>first.code+'|'+(Date.now()-age),removeItem:k=>removed.push(k)}};
    vm.createContext(held);vm.runInContext(capture,held);assert.equal(held.pendingInvite,want);
    if(!want) assert.deepEqual(removed,['nomad_invite']);
  }
  const bad={URL,location:{href:'https://nomadmud.com/?invite=invalid'},history:{state:null,replaceState:()=>{}},localStorage:{setItem:()=>assert.fail('invalid code stored'),getItem:()=>null}};
  vm.createContext(bad);vm.runInContext(capture,bad);assert.equal(bad.pendingInvite,'');
  db.prepare('UPDATE players SET name=? WHERE pubkey=?').run('Roadsender','Geartest');
  newcomer.items=await world.loadInventory(env.DB,'newcomer');
  await invites.read(z,newcomer,'letter');assert.match(frames.at(-1).text,/— Roadsender$/);
  console.log('PASS: URL capture and cleanup before login, invalid code rejection, blocked storage fallback, and current sender signature.');
  const script=PAGE.slice(PAGE.indexOf('async function postInvite('),PAGE.indexOf('var SPEECH_RELAYS ='));
  for(const method of ['guest','ext','bunker']){
    const posts=[];const signed=[];const signer=async e=>{signed.push(e);return {...e,sig:'test'};};
    const ctx={identityEpoch:1,method,sk:'test',finalizeEvent:signer,window:{nostr:{signEvent:signer}},ensureBunkerClient:async()=>({signEvent:signer}),gpubPool:{publish:(relays,e)=>{posts.push(e);return [Promise.resolve()];}},SPEECH_RELAYS:['mock'],print:()=>{}};
    vm.createContext(ctx);vm.runInContext(script,ctx);await ctx.postInvite(first);
    assert.equal(posts.length,1);assert.equal(signed[0].kind,1);assert.equal(signed[0].tags[0].join(),'t,nomad');assert.equal(signed[0].tags.length,1);assert.equal(signed[0].content,'Come Home\n\nNew to NOMAD? Claim your beginner\'s kit: gear on your back, food and water, a torch, linen and a surveyor\'s map.\nAlready playing? The first three each day get a day\'s supplies and some makings, once per character.\n\nhttps://nomadmud.com/i/'+first.code);
  }
  console.log('PASS: guest, extension and bunker client signing publish the requested kind-1 note to mocked relays.');
} finally {db.close();saved.close();rmSync(dir,{recursive:true,force:true});}
