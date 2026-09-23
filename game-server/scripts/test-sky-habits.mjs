// Exercise the actual habit selector with every closed room set, both day and night.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,transformSync} from 'esbuild';
const bundled=await build({stdin:{contents:'export * from "./zone-data"; export {skyLook} from "./events";',resolveDir:new URL('../src',import.meta.url).pathname},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const data=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const src=readFileSync(new URL('../src/zone.ts',import.meta.url),'utf8');
const start=src.indexOf('  private drawHabit('),end=src.indexOf('\n  }',start)+4;
const method=src.slice(start,end).replace('private drawHabit','function drawHabit');
const js=transformSync(method,{loader:'ts',format:'cjs'}).code;
const deps=['HABITS','HABIT_SKY','HABIT_NIGHT','HABIT_FIRE','HABIT_DEEP','HABIT_GRAVES','OUTDOOR_ROOMS','INDOOR_ROOMS','DEEP_ROOMS','WARRENS_ROOMS'];
const draw=new Function(...deps,'isNight','pick',js+';return drawHabit;');
for(const night of [false,true]) {
 const select=draw(...deps.map(n=>data[n]),()=>night,pool=>pool);
 const context={outOfWorld:()=>false,roomHasFirekeeper:()=>false,roomLit:()=>false};
 for(const id of new Set([...data.INDOOR_ROOMS,...data.DEEP_ROOMS,...data.WARRENS_ROOMS])) {
  const pool=select.call(context,{roomId:id});
  assert.ok(pool.length);
  for (const word of ['sky','weather','sun','moon','stars']) {
   assert.equal(data.skyLook({events:new Map()},id,word),null,id+': '+word);
  }
  assert.ok(!pool.some(h=>/sky|stars|The night has/.test(h.line)),id);
 }
 const id=[...data.OUTDOOR_ROOMS].find(id=>!data.INDOOR_ROOMS.has(id));
 const pool=select.call(context,{roomId:id});
 assert.ok(pool.some(h=>h.line.includes("It hasn't changed.")));
 assert.equal(pool.some(h=>h.line.includes('naming the stars')),night);
 const inside=select.call({...context,outOfWorld:()=>true},{roomId:id});
 assert.ok(!inside.some(h=>/sky|stars/.test(h.line)),'gatehouse at an outdoor gate');
}
// Exercise the real initialization rules: named-building gates stay outside.
const foldStart=src.indexOf('      if (world.entryRooms.has(room.id)) OUTDOOR_ROOMS.add(room.id);');
const foldEnd=src.indexOf('      // Same fold for the larder',foldStart);
assert.ok(foldStart>=0 && foldEnd>foldStart);
const fold=new Function('world','room','OUTDOOR_ROOMS','INDOOR_ROOMS','OUTDOOR_REGIONS',src.slice(foldStart,foldEnd));
const world={entryRooms:new Set(['the-relay-house','the-withy-hut'])};
for(const id of [...world.entryRooms,'the-carters-rest']) {
 fold(world,{id,region:'road'},data.OUTDOOR_ROOMS,data.INDOOR_ROOMS,data.OUTDOOR_REGIONS);
 assert.equal(data.OUTDOOR_ROOMS.has(id),world.entryRooms.has(id));
}
const select=draw(...deps.map(n=>data[n]),()=>true,pool=>pool);
for(const id of world.entryRooms) {
 const context={outOfWorld:()=>false,roomHasFirekeeper:()=>false,roomLit:()=>false};
 assert.ok(select.call(context,{roomId:id}).some(h=>h.line.includes('sky')));
 assert.ok(!select.call({...context,outOfWorld:()=>true},{roomId:id}).some(h=>/sky|stars/.test(h.line)));
}
console.log('PASS: underground and roofs exclude sky habits; exterior gates retain sky habits; their gatehouse interiors exclude them.');
