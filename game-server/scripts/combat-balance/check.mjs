// Production combat checks: real ZoneDO, migrated SQLite data, normal equipment
// and movement commands. No injected damage, fatigue or recovery implementation.
// Node 22: node --disable-warning=ExperimentalWarning scripts/combat-balance/check.mjs
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile, readdir, mkdtemp, rm, writeFile, copyFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';


const root=fileURLToPath(new URL('../../',import.meta.url));
const proposal=JSON.parse(await readFile(new URL('./proposal.json',import.meta.url),'utf8'));
const playerMaxHp=100,balance='production';
const drakeDamage=proposal.creatureDamageCandidates.find(x=>x.id==='the-drake').candidate;
const equippedFatigueRate=weight=>(20+3*weight)/20;
const temp=await mkdtemp(join(tmpdir(),'nomad-runtime-combat-'));
const realNow=Date.now,originalCrypto=Object.getOwnPropertyDescriptor(globalThis,'crypto'),nativeCrypto=globalThis.crypto;
let now=1_800_000_000_000,rng=1,serial=0;
function random(){let t=rng=(rng+0x6D2B79F5)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
const cases=[];let lifecycleDone=false,fixtureId=0;
try {
 const output=join(temp,'game.mjs');
 await build({stdin:{contents:"export {ZoneDO} from './zone'; export * as world from './world'; export * as verbs from './verbs'; export * as gate from './gate'; export * as rules from './zone-data'; export * as E from './exhaustion';",resolveDir:join(root,'src'),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',plugins:[{name:'worker-text',setup(b){b.onLoad({filter:/(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/},async a=>({contents:await readFile(a.path,'utf8'),loader:'text'}));}}]});
 const {ZoneDO,world,verbs,gate,rules:R,E}=await import(pathToFileURL(output));
 const seedPath=join(temp,'seed.sqlite'),seedDb=new DatabaseSync(seedPath);
 seedDb.exec(await readFile(join(root,'schema.sql'),'utf8'));
 for(const name of (await readdir(join(root,'migrations'))).filter(n=>n.endsWith('.sql')).sort())seedDb.exec(await readFile(join(root,'migrations',name),'utf8'));
 const roster=seedDb.prepare('SELECT * FROM mob_templates ORDER BY id').all();
 assert.equal(roster.length,proposal.creatureDamageCandidates.length);
 for(const t of roster){
  assert.ok(E.CREATURE_ENDURANCE[t.id],t.id+' has an explicit endurance profile');
  assert.deepEqual([t.dmg_min,t.dmg_max],proposal.creatureDamageCandidates.find(x=>x.id===t.id).candidate);
  const p=proposal.creatureBalanceStudy.profiles.find(x=>x.id===t.id);
  assert.deepEqual(E.CREATURE_ENDURANCE[t.id],[p.fullEffortRounds,p.maxRawDamageLoss,p.recoverySeconds,p.stopHeavyKnockAfter||0]);
 }
 seedDb.close();
 Date.now=()=>now;
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:nativeCrypto.subtle,getRandomValues(a){for(let i=0;i<a.length;i++)a[i]=Math.floor(random()*4294967296);return a;},randomUUID(){return `00000000-0000-4000-8000-${(++serial).toString(16).padStart(12,'0')}`;}}});
 async function run({seed=80013,stance='guarded',condition=100,policy='stand',kit,supplies='none',mobId='the-drake',kitName=kit?.[0],maxTicks=800}){
  now=1_800_000_000_000;rng=seed;serial=0;
  const path=join(temp,`case-${++fixtureId}.sqlite`);await copyFile(seedPath,path);
  const db=new DatabaseSync(path), saved=new DatabaseSync(':memory:');
  const statement=(query,args=[])=>({bind:(...values)=>statement(query,values),
   all:async()=>({results:db.prepare(query).all(...args)}),
   first:async column=>{const row=db.prepare(query).get(...args);return column?row?.[column]??null:row??null;},
   run:async()=>({success:true,meta:db.prepare(query).run(...args)}),
  });
  const kv=new Map();
  const storage={sql:{exec(query,...args){const rows=saved.prepare(query).all(...args);rows.toArray=()=>rows;return rows;}},get:async k=>structuredClone(kv.get(k)),put:async(k,v)=>kv.set(k,structuredClone(v)),list:async({prefix})=>new Map([...kv].filter(([k])=>k.startsWith(prefix)).map(([k,v])=>[k,structuredClone(v)])),delete:async k=>kv.delete(k),transactionSync:fn=>fn(),getAlarm:async()=>null,setAlarm:async()=>{}};
  const frames=[];let attachment={};
  const ws={send:raw=>frames.push({at:now,...JSON.parse(raw)}),serializeAttachment:x=>attachment=x,deserializeAttachment:()=>attachment,close:()=>{}};
  const state={storage,getWebSockets:()=>[],waitUntil:()=>{}};
  const env={DB:{prepare:statement,batch:async rows=>Promise.all(rows.map(s=>s.all()))},RELAYS:'',GAME_SK_HEX:''};
  const z=new ZoneDO(state,env);
  try{
   await z.init('door');
   let drake=[...z.creatures.values()].find(c=>c.templateId===mobId);
   const naturalSpawn=!!drake;
   if(!drake){
    const baseId=z.world.mobVariants.find(v=>v.variantId===mobId)?.baseId;
    const spawn=z.world.mobSpawns.find(s=>s.template_id===mobId||s.template_id===baseId)??(mobId===R.CHAINMAN_TMPL?{room_id:z.world.mobSpawns.find(s=>s.template_id==='road-carrier').room_id}:undefined)??(mobId===R.ESCAPE_TMPL?{room_id:[...z.world.rooms.keys()].find(r=>z.regionOf(r)==='deep'&&!z.world.safeRooms.has(r))}:undefined);
    assert.ok(spawn,`No habitat available for ${mobId}`);
    const tmpl=z.world.mobTemplates.get(mobId),roomId=R.VARIANT_HOMES.get(mobId)??spawn.room_id;
    drake={id:'study-'+mobId,templateId:mobId,roomId,home:roomId,hp:tmpl.max_hp,hunger:0,grudges:[],nextWanderAt:now+R.WANDER_MAX_MS,target:null,carries:z.rollCarry(tmpl),hidden:R.LURKERS.has(mobId)||undefined};
   }
   const drakeTemplate=z.world.mobTemplates.get(drake.templateId);
   if(mobId==='the-drake'){
    assert.deepEqual([drakeTemplate.dmg_min,drakeTemplate.dmg_max],drakeDamage);
    assert.equal(drakeTemplate.max_hp,150);assert.equal(drakeTemplate.armor,3);
   }
   // Isolated, already-revealed opponent; use its native habitat.
   drake.hidden=false;
   z.creatures=new Map([[drake.id,drake]]);z.noteCreaturesChanged();
   const pk='a'.repeat(64),room=drake.roomId;
   const {row}=await world.getOrCreatePlayer(env.DB,pk,room);
   row.room_id=room;
   assert.equal(row.max_hp,playerMaxHp,'Session must use selected player HP');
   assert.equal(row.hp,playerMaxHp);
   const ids=[...kit,...Array(supplies==='full'?R.PACK_FOOD_CAP:supplies==='modest'?4:0).fill(supplies==='full'?'roast-lamprey':'dried-meat'),...Array(supplies==='full'?R.PACK_DRESSING_CAP:supplies==='modest'?2:0).fill(supplies==='full'?'linen-dressing':'linen-strips')];
   for(const [i,id] of ids.entries())db.prepare("INSERT INTO player_items (id,pubkey,item_id,equipped,condition,acquired_at) VALUES (?,?,?,0,?,?)").run('item-'+i,pk,id,i<kit.length?condition:100,Math.floor(now/1000));
   const p=z.buildSession(ws,row,await world.loadInventory(env.DB,pk));
   z.sessions.set(pk,p);
   for(const id of kit)await verbs.cmdEquip(z,p,z.world.itemTemplates.get(id).name.toLowerCase());
   assert.deepEqual(p.items.filter(i=>i.equipped).map(i=>i.itemId),kit,'Equipment must pass normal command rules');
   await verbs.cmdStance(z,p,stance);
   assert.equal(p.maxHp,playerMaxHp);
   const equippedWeight=z.wornWeight(p),initialFatigueRate=equippedFatigueRate(equippedWeight);
   {
    const items=p.items,loadBefore=z.loadOf(p);
    p.items=[...items,...Array.from({length:R.BURDEN_FREE_IRON+5},(_,i)=>({...items[0],rowId:'pack-probe-'+i,equipped:false}))];
    assert.equal(z.wornWeight(p),equippedWeight,'Unequipped pack gear must not alter exhaustion weight');
    assert.equal(equippedFatigueRate(z.wornWeight(p)),equippedFatigueRate(equippedWeight));
    assert.ok(z.loadOf(p)>loadBefore,'Probe must actually increase existing pack burden');p.items=items;
    const weapon=z.equippedItem(p,'weapon'),oldMap=weapon.carried.rolledMap,oldCondition=weapon.carried.condition;
    weapon.carried.rolledMap=new Map([['balanced',1]]);assert.equal(z.wornWeight(p),equippedWeight-1);
    weapon.carried.rolledMap=new Map([['cumbersome',1]]);assert.equal(z.wornWeight(p),equippedWeight+1);
    weapon.carried.rolledMap=new Map([['balanced',1],['cumbersome',1]]);assert.equal(z.wornWeight(p),equippedWeight);
    weapon.carried.rolledMap=oldMap;weapon.carried.condition=1;assert.equal(z.wornWeight(p),equippedWeight,'Worn-down gear does not lose weight');weapon.carried.condition=oldCondition;
   }
   const setup={equippedWeight,initialFatigueRate,roundsToFullWithoutRecovery:Math.ceil(50/initialFatigueRate),balance,mobMaxHp:drakeTemplate.max_hp,mobArmor:drakeTemplate.armor,mobDamage:[drakeTemplate.dmg_min,drakeTemplate.dmg_max],armor:z.equippedArmor(p),weaponDamage:z.effDmg(z.equippedItem(p,'weapon')),maxHp:p.maxHp,items:p.items.filter(i=>i.equipped).map(i=>({id:i.itemId,condition:i.condition}))};
   if (!lifecycleDone) {
    lifecycleDone=true;
    await chipChecks({z,p,db,frames});
    await foodChecks({z,p,db,drake,frames});
    await lifecycleChecks({z,p,ws,db,kv,state,env,world,ZoneDO,drake,command:async f=>{z.syncExhaustion(p);await f();await z.checkpointPlayers();}});
    return await run(arguments[0]); // an independent fresh world for encounter dice
   }
   // Equal combat dice start across cases; initialization is independently real.
   rng=seed;
   const command=async f=>{for(const s of z.sessions.values())z.syncExhaustion(s);await f();await z.checkpointPlayers();};
   const started=now;z.lastCombatRound=now;
   const prelitFixture=!z.litFor(p);
   if(prelitFixture)z.groundTorch.set(room,now+1_000_000);
   await command(()=>z.cmdAttack(p,z.world.mobTemplates.get(drake.templateId).name.toLowerCase()));
   if(z.creatures.has(drake.id))assert.ok(z.inCombat(p),`Fixture must enter combat: ${mobId}: ${frames.slice(-4).map(f=>f.text).join(" | ")}`);
   let activeRounds=0,elapsedRounds=0,retreats=0,restingTicks=0,result='timeout';
   let playerFatiguePoints=0,peakPlayerFatigue=0,roundsAtFullFatigue=0;
   let retreatRoom,returnDir;
   const timeline=[];
   for(let tick=1;tick<=maxTicks;tick++){
    now=started+tick*R.TICK_MS;
    const combatBeat=now-z.lastCombatRound>=R.COMBAT_ROUND_MS;
    if(combatBeat){elapsedRounds++;if(z.inCombat(p))activeRounds++;}
    const from=frames.length;
    await z.tick();
    playerFatiguePoints=p.exhaustion.units/20;
    peakPlayerFatigue=Math.max(peakPlayerFatigue,playerFatiguePoints);
    if(combatBeat&&playerFatiguePoints===50)roundsAtFullFatigue++;
    assert.ok(playerFatiguePoints>=0&&playerFatiguePoints<=50);
    if(p.deaths>0){result='death';break;}
    if(!z.creatures.has(drake.id)){result='kill';break;}
    if(drake.roomId!==room){result='creature-fled';break;}
    if(policy==='retreat'&&p.roomId===room&&p.hp<=p.maxHp/2){
     const exit=z.world.exits.get(p.roomId)?.find(e=>{
      if(e.key_item||!z.world.exits.get(e.to_room)?.some(back=>back.to_room===p.roomId))return false;
      {
       const treasury=R.TREASURY_DOORS.get(e.to_room);
       if(treasury&&[...z.creatures.values()].some(c=>(z.variantBase.get(c.templateId)??c.templateId)===treasury))return false;
       if(R.SENTINELS.has(drake.templateId)&&z.sentinelAwake(drake)&&R.DEEP_ROOMS.has(e.to_room))return false;
      }
      return true;
     });
     if(!exit){result='no-retreat-route';break;}
     await command(()=>verbs.cmdGo(z,p,exit.dir));
     if(p.deaths>0){result='death';break;}
     if(p.roomId!==room){retreats++;retreatRoom=p.roomId;returnDir=z.world.exits.get(retreatRoom).find(e=>e.to_room===room)?.dir;assert.ok(returnDir);await command(()=>verbs.cmdRest(z,p));}
    }else if(policy==='retreat'&&p.roomId===retreatRoom){
     restingTicks++;
     if(p.hp===p.maxHp&&playerFatiguePoints===0){p.resting=false;await command(()=>verbs.cmdGo(z,p,returnDir));if(p.deaths>0){result='death';break;}if(!z.inCombat(p))await command(()=>z.cmdAttack(p,z.world.mobTemplates.get(drake.templateId).name.toLowerCase()));}
     else if(!p.resting&&!z.inCombat(p))await command(()=>verbs.cmdRest(z,p));
    }
    if(combatBeat||frames.slice(from).some(f=>/flees|rest|parting/.test(f.text??'')))timeline.push({seconds:(now-started)/1000,playerHp:p.hp,mobHp:drake.hp,room:p.roomId,phase:drake.phase??0,activeRounds});
   }
   const combatFrames=frames.filter(f=>f.at>=started&&typeof f.text==='string');
   assert.ok(activeRounds<=elapsedRounds);
   assert.equal(elapsedRounds,Math.floor((now-started)/R.COMBAT_ROUND_MS));
   if(retreats>0&&restingTicks>2)assert.ok(activeRounds<elapsedRounds,'Recovery time must not be reported as active combat');
   const rowOut={kitName,mobId,playerFatiguePoints,peakPlayerFatigue,roundsAtFullFatigue,naturalSpawn,prelitFixture,mobEffort:drake.exertion?.effort ?? 0,seed,stance,condition,policy,kit,supplies,setup,result,activeRounds,elapsedRounds,elapsedSeconds:(now-started)/1000,retreats,restingTicks,outcomeHp:result==='death'?0:p.hp,respawnHp:result==='death'?p.hp:null,mobHp:drake.hp,foodUsed:combatFrames.filter(f=>f.text?.startsWith('Your hand goes to the pack')).length,frames:frames.filter(f=>f.text).map(f=>({seconds:(f.at-started)/1000,text:f.text,cls:f.cls})),timeline};
   cases.push(rowOut);return rowOut;
  }finally{db.close();saved.close();}
 }

 async function chipChecks({z,p,db,frames}) {
  const room=p.roomId,creatures=z.creatures,events=z.events;
  z.creatures=new Map();z.noteCreaturesChanged();z.events=new Map();
  let serial=0;
  async function give(itemId,age=0){
   const rowId='chip-check-'+(++serial);
   db.prepare('INSERT INTO player_items (id,pubkey,item_id,equipped,condition,acquired_at) VALUES (?,?,?,0,100,?)').run(rowId,p.pubkey,itemId,Math.floor(now/1000)-age);
   p.items=await world.loadInventory(z.env.DB,p.pubkey);return p.items.find(c=>c.rowId===rowId);
  }
  function current(){return frames.findLast(f=>f.t==='ctx').suggest;}
  function before(chip){z.sendCtx(p);assert.ok(current().includes(chip),'fixture offers '+chip);}
  async function act(verb,arg){
   const first=frames.length;await z.dispatch(p,{verb,arg});
   const ctx=frames.slice(first).findLast(f=>f.t==='ctx');
   assert.ok(ctx,verb+' '+arg+' must send updated chips immediately');return ctx.suggest;
  }
  p.roomId=[...R.ALTAR_ROOMS][0];
  await give(R.DEEP_HEART);await give(R.DEEP_HEART);
  before('offer heart');
  let chips=await act('offer','heart');
  assert.ok(!chips.includes('offer heart'),'store disappears even with a second heart in hand');assert.ok(chips.includes('take heart'));
  assert.ok(z.altarHearts.has(p.pubkey));
  chips=await act('get','heart');
  assert.ok(!chips.includes('take heart'));assert.ok(chips.includes('offer heart'));
  // Normal storage uses the same inventory-derived chips.
  chips=await act('stash','heart');
  assert.ok(chips.includes('offer heart'),'remaining fresh heart remains actionable');
  chips=await act('stash','heart');assert.ok(!chips.includes('offer heart'),'last stored heart removes offer');
  chips=await act('unstash','heart');assert.ok(chips.includes('offer heart'));
  chips=await act('burn','heart');assert.ok(!chips.includes('offer heart'),'burned heart removes offer');
  await give(R.DEEP_HEART,R.HEART_FRESH_SEC+1);z.sendCtx(p);assert.ok(!current().includes('offer heart'),'spoiled heart never offered');
  p.roomId=[...R.TOLL_STONES][0];p.markedUntil=now+60000;await give('toll-token');before('offer toll-token');
  chips=await act('offer','toll-token');assert.ok(!chips.includes('offer toll-token'));assert.equal(p.markedUntil,undefined);
  p.roomId=[...R.WHETSTONE_ROOMS][0];
  const weapon=p.items.find(c=>c.equipped&&z.world.itemTemplates.get(c.itemId).slot==='weapon');
  const condition=weapon.condition;weapon.condition=R.WHET_CAP-R.WHET_GAIN;
  z.sendCtx(p);const repair=current().find(c=>c.startsWith('repair '));assert.ok(repair);
  chips=await act('repair',repair.slice(7));assert.ok(!chips.includes(repair),'repair disappears at whetstone cap');
  weapon.condition=condition;db.prepare('UPDATE player_items SET condition=? WHERE id=?').run(condition,weapon.rowId);
  await give('dried-meat');z.sendCtx(p);const eat=current().find(c=>c.startsWith('eat '));assert.ok(eat);
  chips=await act('burn','dried meat');assert.ok(!chips.includes(eat),'burning last food removes eat');
  // Shared one-use room actions must refresh observers too.
  p.roomId=R.GIBBET_ROOM;const cut=z.gibbetCut;z.gibbetCut=false;
  const observer={...p,pubkey:'chip-observer',ws:{send:raw=>frames.push({...JSON.parse(raw),observer:true})}};
  z.sessions.set(observer.pubkey,observer);before('cut gibbet');
  const first=frames.length;chips=await act('unlock','gibbet');assert.ok(!chips.includes('cut gibbet'));
  assert.ok(frames.slice(first).some(f=>f.observer&&f.t==='ctx'&&!f.suggest.includes('cut gibbet')),'gibbet clears for observers');
  z.sessions.delete(observer.pubkey);z.gibbetCut=cut;
  // Cached gate chips must also disappear when their last ingredient burns.
  p.roomId=[...z.world.entryRooms][0];p.away=true;
  await give('gull-egg');await give('rat-meat');
  for(let i=0;i<R.SMELT_SCRAP_PER_IRON;i++)await give(R.SCRAP_ID);
  await z.sendGateCtx(p);
  const cook=current().find(c=>c.startsWith('cook ')),cure=current().find(c=>c.startsWith('cure '));
  assert.ok(cook&&cure&&current().includes('smelt'));
  chips=await act('burn','gull egg');assert.ok(!chips.includes(cook),'burn removes cached cook ingredient');
  chips=await act('burn','rat meat');assert.ok(!chips.includes(cure),'burn removes cached cure ingredient');
  chips=await act('burn',z.world.itemTemplates.get(R.SCRAP_ID).name.toLowerCase());assert.ok(!chips.includes('smelt'),'burn removes cached smelt affordability');
  p.away=false;
  // The existing room-light path already refreshes its one-use chip.
  p.roomId='the-lantern-stump';const fire=z.groundTorch.get(p.roomId);z.groundTorch.delete(p.roomId);
  await give(R.TORCH_ITEM);before('light stump');
  chips=await act('light','stump');assert.ok(!chips.includes('light stump'));
  if(fire===undefined)z.groundTorch.delete(p.roomId);else z.groundTorch.set(p.roomId,fire);
  // Restore the original equipped inventory for the existing encounter checks.
  db.prepare('DELETE FROM player_items WHERE pubkey=? AND equipped=0').run(p.pubkey);
  p.items=await world.loadInventory(z.env.DB,p.pubkey);p.roomId=room;
  z.creatures=creatures;z.noteCreaturesChanged();z.events=events;
  console.log('PASS immediate chip refresh: altar offer/take, remaining hearts, stash/retrieve, burning heart/food, spoiled heart, toll payment, whetstone cap, shared gibbet, gate cooking/curing/smelting and stump lighting.');
 }

 async function foodChecks({z,p,db,drake,frames}) {
  const foods=[...z.world.itemTemplates.values()].filter(t=>t.edible);
  const expected={2:3,3:5,4:7,5:8,6:10,7:12,8:13,9:15,11:18,12:20,13:22,14:23,15:25,16:27,19:32,20:33,21:35,25:42};
  const start=now,events=z.events,room=p.roomId,bounties=z.bounties;
  z.events=new Map();
  let foodId=0;
  async function give(id,age=0){
   const rowId='food-check-'+(++foodId);
   db.prepare('INSERT INTO player_items (id,pubkey,item_id,equipped,condition,acquired_at) VALUES (?,?,?,0,100,?)').run(rowId,p.pubkey,id,Math.floor(now/1000)-age);
   p.items=await world.loadInventory(z.env.DB,p.pubkey);
   return p.items.find(c=>c.rowId===rowId);
  }
  function consumed(c){
   assert.ok(!p.items.some(i=>i.rowId===c.rowId),'food removed from pack');
   assert.equal(db.prepare('SELECT id FROM player_items WHERE id=?').get(c.rowId),undefined,'food removed from D1');
  }
  assert.equal(foods.length,40,'all existing edible items covered');
  for(const t of foods){
   const heal=expected[t.heal];assert.ok(heal,t.id+' has a reviewed healing value');
   p.target=null;drake.target=null;p.hp=1;
   const manual=await give(t.id);await verbs.cmdEat(z,p,'');
   assert.equal(p.hp,1+heal,t.id+' manual healing');consumed(manual);
   assert.equal(db.prepare('SELECT hp FROM players WHERE pubkey=?').get(p.pubkey).hp,p.hp,'manual healing saved');
   p.hp=1;p.target=drake.id;drake.target=p.pubkey;
   const auto=await give(t.id);
   // A tick between attack rounds isolates the actual auto-eat path.
   z.lastCombatRound=now;now+=R.TICK_MS;
   await z.tick();
   assert.equal(p.hp,1+heal,t.id+' automatic healing');consumed(auto);
   assert.equal(db.prepare('SELECT hp FROM players WHERE pubkey=?').get(p.pubkey).hp,p.hp,'automatic healing saved');
  }
  p.target=null;drake.target=null;
  for(const [id,age,hp,heal,fever] of [
   ['roast-lamprey',0,90,10,false], // max HP cap
   ['roast-lamprey',100000,1,21,false], // half of 42 when spoiled
   ['dried-meat',100000,1,13,false], // preserved food stays full strength
   ['roast-lamprey',0,1,15,true], // 42 * .35 rounded
   ['roast-lamprey',100000,1,7,true], // spoilage before fever
  ]){
   p.roomId=fever?[...z.world.rooms.values()].find(r=>r.region==='den').id:room;
   z.events=fever?new Map([['fever',{phase:'active',until:now+100000}]]):new Map();
   p.hp=hp;const food=await give(id,age);await verbs.cmdEat(z,p,'');
   assert.equal(p.hp,hp+heal,id+' cap/spoilage/fever');consumed(food);
  }
  z.bounties=[['otter-pelt','dried-meat',2]];
  await gate.sendBounty(z,p);
  assert.equal(frames.findLast(f=>f.t==='bounty').board[0].heal,26,'board rounds per meal, not per stack');
  z.bounties=bounties;z.events=events;p.roomId=room;p.hp=100;now=start;
  z.lastCombatRound=now;z.lastTickAt=0;p.exhaustion={units:0,at:now,mode:'passive'};
  console.log('PASS: all 40 foods through manual and automatic eating, D1 saves/removal, HP cap, spoilage, preserved food, fever, bounty healing display.');
 }

 async function lifecycleChecks({z,p,ws,db,kv,state,env,world,ZoneDO,drake,command}) {
  const originalRoom=p.roomId, originalCreatures=z.creatures, start=now;
  z.creatures=new Map();z.noteCreaturesChanged();
  p.hp=1;p.exhaustion={units:1000,at:now,mode:'passive'};
  await command(()=>verbs.cmdRest(z,p));
  for(let i=0;i<10;i++){now+=2000;await z.tick();}
  assert.equal(p.exhaustion.units,0,'ordinary rest clears fatigue in 20 seconds');
  assert.equal(p.hp,51,'ordinary rest heals 50 HP in 20 seconds');
  assert.equal(p.resting,true,'wounds keep rest active');
  for(let i=0;i<10;i++){now+=2000;await z.tick();}
  assert.equal(p.hp,100,'ordinary rest heals to full within 40 seconds');
  p.hp=100;p.exhaustion={units:1000,at:now,mode:'passive'};
  await command(()=>verbs.cmdRest(z,p));
  now+=2000;await z.tick();assert.equal(p.resting,true,'full HP does not end fatigue recovery');
  now+=18000;await z.tick();assert.equal(p.exhaustion.units,0);assert.equal(p.resting,false);
  p.exhaustion={units:1000,at:now,mode:'passive'};
  for(let i=0;i<6;i++){now+=15000;await z.tick();}
  assert.equal(p.exhaustion.units,100,'idle cadence recovers 45 fatigue in 90 seconds');
  now+=10000;await z.tick();assert.equal(p.exhaustion.units,0,'passive recovery takes 100 seconds');
  const weather=new Map(z.events);
  z.events.set('cold',{phase:'active',until:now+100000});z.events.set('wind',{phase:'active',until:now+100000});z.events.set('rain',{phase:'active',until:now+100000});
  p.hp=50;p.resting=true;p.exhaustion={units:1000,at:now,mode:'rest'};
  now+=20000;await z.tick();
  assert.equal(p.exhaustion.units,0,'weather cannot block fatigue recovery');
  z.events=weather;p.resting=false;p.healingDue=0;
  // Four engaged attackers still charge one player round; the fourth creature
  // waits outside the dogpile cap and must not spend attack effort.
  const rats=Array.from({length:4},(_,i)=>({id:'fatigue-rat-'+i,templateId:'rat',roomId:p.roomId,hp:z.world.mobTemplates.get('rat').max_hp,hunger:0,grudges:[],target:p.pubkey,nextWanderAt:now+100000}));
  z.creatures=new Map(rats.map(c=>[c.id,c]));z.noteCreaturesChanged();
  p.hp=100;p.stunned=true;p.target=rats[0].id;p.exhaustion={units:0,at:now,mode:'combat'};
  now+=4000;await z.tick();
  assert.equal(p.exhaustion.units,20+3*z.wornWeight(p),'dogpile charges a single player round even when stunned');
  assert.equal(rats.filter(c=>c.exertion?.effort>0).length,3,'only creatures allowed to attempt spend effort');
  z.creatures=new Map();z.noteCreaturesChanged();p.target=null;p.stunned=false;p.bleedTicks=0;p.bleedDmg=0;
  // The two PvP bodies use the same once-per-round clock as PvE.
  const qrow=await world.getOrCreatePlayer(env.DB,'b'.repeat(64),p.roomId);
  const q=z.buildSession(ws,qrow.row,[]);q.roomId=p.roomId;
  z.sessions.set(q.pubkey,q);p.pvpTarget=q.pubkey;q.pvpTarget=p.pubkey;
  p.hp=100;p.exhaustion={units:0,at:now,mode:'combat'};q.exhaustion={units:0,at:now,mode:'combat'};
  now+=4000;await z.tick();
  assert.equal(p.exhaustion.units,20+3*z.wornWeight(p));assert.equal(q.exhaustion.units,20);
  q.exhaustion.units=1000;await z.onPlayerDeath(q,null);
  assert.equal(q.hp,100);assert.equal(q.exhaustion.units,0,'death restores the body');
  z.sessions.delete(q.pubkey);kv.delete('body:'+q.pubkey);z.bodyJournal.delete(q.pubkey);
  p.pvpTarget=null;p.hp=100;p.target=null;p.staggered=false;p.openedHeavy=false;p.bleedTicks=0;p.bleedDmg=0;
  // Gatehouse follows existing outOfWorld predicate; use its production flags.
  const originalOut=z.outOfWorld.bind(z);z.outOfWorld=()=>true;
  for(const [mode,seconds] of [['shelter',20],['fire',10]]){
   p.hp=1;p.resting=mode==='fire';p.exhaustion={units:1000,at:now,mode};
   now+=seconds*1000;await z.tick();
   assert.equal(p.exhaustion.units,0,mode+' fatigue duration');
   assert.equal(p.hp,51,mode+' HP heals at corresponding rate');
  }
  z.outOfWorld=originalOut;
  // Checkpoint is authoritative even if D1 has not flushed. Restore a parked
  // socket exactly as a new Durable Object would, then account elapsed rest.
  p.hp=80;p.resting=true;p.target=null;p.exhaustion={units:800,at:now,mode:'rest'};
  await z.checkpointPlayers();ws.serializeAttachment({pubkey:p.pubkey,la:now});
  const rebuilt=new ZoneDO({...state,getWebSockets:()=>[ws]},env);await rebuilt.init('door');
  await rebuilt.hydrateSessions();
  const r=rebuilt.sessions.get(p.pubkey);assert.equal(r.hp,80);assert.equal(r.exhaustion.units,800);assert.equal(r.resting,true);
  now+=4000;rebuilt.syncExhaustion(r);assert.equal(r.exhaustion.units,600);
  rebuilt.syncExhaustion(r);assert.equal(r.exhaustion.units,600,'wake cannot replay elapsed recovery');
  // A live fight never gets offline recovery. Journal restores target, body,
  // and the exact original disconnect deadline after a cold restart.
  p.hp=70;p.resting=false;p.target=drake.id;p.exhaustion={units:1000,at:now,mode:'combat'};
  z.creatures=originalCreatures;drake.target=p.pubkey;z.noteCreaturesChanged();
  await z.onLeave(p);const deadline=p.linkdeadUntil;assert.ok(deadline>now);
  const restarted=new ZoneDO(state,env);await restarted.init('door');await restarted.hydrateSessions();
  const held=restarted.sessions.get(p.pubkey);assert.ok(held);assert.equal(held.linkdeadUntil,deadline);assert.equal(held.exhaustion.units,1000);
  now=deadline;await restarted.releaseLinkdead(now);assert.ok(!restarted.sessions.has(p.pubkey));
  const row=await world.getOrCreatePlayer(env.DB,p.pubkey,originalRoom);
  now+=100000;const offline=restarted.buildSession(ws,row.row,[]);
  assert.equal(offline.exhaustion.units,0,'offline starts only when body fades');assert.equal(offline.hp,70,'offline never heals HP');
  // D1 failure leaves a durable explicit offline snapshot, even though the
  // session is gone. A subsequent wake drains it rather than losing fatigue.
  const normalDB=z.env.DB;z.env.DB={prepare(){throw Error('expected D1 outage');}};
  p.target=null;p.pvpTarget=null;p.hp=65;p.exhaustion={units:600,at:now,mode:'passive'};
  const log=console.error;console.error=()=>{};
  try { await z.trySavePlayer(p.pubkey,p.roomId,p.hp,p); } finally {console.error=log;z.env.DB=normalDB;}
  assert.equal(kv.get('body:'+p.pubkey).exhaustion.units,600);
  const retry=new ZoneDO(state,env);await retry.init('door');await retry.hydrateSessions();
  assert.ok(!kv.has('body:'+p.pubkey));
  assert.equal(JSON.parse(db.prepare('SELECT exhaustion FROM players WHERE pubkey=?').get(p.pubkey).exhaustion).units,600);
  // Return the encounter to a fresh, equipped character.
  now=start;p.hp=100;p.resting=false;p.target=null;p.pvpTarget=null;p.exhaustion={units:0,at:now,mode:'passive'};p.healingDue=0;p.linkdeadUntil=undefined;
  z.creatures=originalCreatures;drake.target=null;z.sessions.set(p.pubkey,p);z.noteCreaturesChanged();
  z.bodyJournal.clear();kv.clear();z.lastCombatRound=now;z.lastTickAt=0;
  console.log('PASS: real rest/gate/idle recovery, dogpile/PvP round effort, death, parked-socket wake, disconnected body restart, offline recovery, D1 failure journal.');
 }

 const kits=[['poleaxe','barbed-warplate','marrow-crown','pale-tread','chain-lined-mantle'],['the-long-crossing','riveted-warplate','padded-greathelm','shadow-treads','sentinels-mantle']];
 const mobs=process.env.CREATURE_MOBS?.split(',')??['the-drake','the-pale-drake','three-hound','two-hound','marsh-hound','the-baited-bear','the-chain-breaker','cave-lion','glutton','the-old-glutton','the-gaunt','the-great-crab','the-great-devil-crab','forgotten-king','drowned-god','marrow-king','the-drowned-ferryman','the-keeper-of-the-holding','the-woodward'];
 for(const mobId of mobs){
  for(const kit of kits)for(const seed of [80013,80014,80015,80016])await run({kit,seed,mobId,policy:'retreat',maxTicks:400});
  console.log(JSON.stringify({mob:mobId,cases:cases.filter(c=>c.mobId===mobId).map(c=>({kit:c.kit[0],seed:c.seed,result:c.result,rounds:c.activeRounds,seconds:c.elapsedSeconds,retreats:c.retreats,peakFatigue:c.peakPlayerFatigue}))}));
 }
 const latestPath=new URL('./latest.json',import.meta.url),latest=JSON.parse(await readFile(latestPath,'utf8'));
 latest.production={status:'Actual production modules and migrated database; no combat/recovery source injection.',cases:cases.map(({frames,timeline,...c})=>c),limitations:['Isolated revealed opponent, habitat prelit, guarded stance, pristine equipment, no carried food; creature escape ends scenario. Four seeds per kit are diagnostics, not population win rates.','Gate recovery test controls the shelter predicate; full browser interaction is not exercised.'],sourceHashes:{}};
 for(const name of ['zone.ts','world.ts','exhaustion.ts','pvp.ts','ai.ts','verbs.ts','styles.ts'])latest.production.sourceHashes[name]=createHash('sha256').update(await readFile(join(root,'src',name))).digest('hex');
 if(!process.argv.includes('--verify-only'))await writeFile(latestPath,JSON.stringify(latest,null,2)+'\n');
 console.log('PASS: '+roster.length+' migrated damage/endurance profiles; '+cases.length+' production encounters.');
} finally {
 Date.now=realNow;
 if(originalCrypto)Object.defineProperty(globalThis,'crypto',originalCrypto);
 await rm(temp,{recursive:true,force:true});
}
