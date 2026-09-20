// The actual look command must name everyone, including a crowded shared gatehouse.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const dir = await mkdtemp(join(tmpdir(), 'nomad-look-'));
try {
  const outfile = join(dir, 'gate.mjs');
  await build({stdin:{contents:'export {handleGatehouse} from "./gate"; export {PAGE} from "./public";',resolveDir:new URL('../src',import.meta.url).pathname},bundle:true,format:'esm',platform:'node',outfile,logLevel:'silent'});
  const {handleGatehouse,PAGE}=await import(pathToFileURL(outfile));
  assert.ok(!PAGE.includes('gate-roster'),'no people panel');
  const folk=Array.from({length:250},(_,i)=>({pubkey:String(i),name:'Wanderer '+String(i).padStart(3,'0'),roomId:'gate-'+i%10,away:true,ws:{readyState:1}}));
  const z={sessions:new Map(folk.map(s=>[s.pubkey,s])),outOfWorld:s=>s.away,send:(s,text)=>{s.text=text;},world:{rooms:new Map()},wallOf:()=>new Set(),board:[],events:new Map()};
  await handleGatehouse(z,folk[0],'look');
  for(const s of folk.slice(1)) assert.ok(folk[0].text.includes('  '+s.name),s.name);
  assert.ok(!folk[0].text.includes('Wanderer 000'),'does not list yourself');
  assert.ok(!folk[0].text.includes('people list'));
  folk[1].away=false;folk[2].ws.readyState=3;folk[3].linkdeadUntil=123;
  await handleGatehouse(z,folk[0],'look');
  for(const s of folk.slice(1,4))assert.ok(!folk[0].text.includes(s.name));
  z.sessions=new Map([[folk[0].pubkey,folk[0]]]);
  await handleGatehouse(z,folk[0],'look');assert.ok(folk[0].text.includes('You have it to yourself.'));
  z.sessions.set(folk[4].pubkey,folk[4]);folk[4].resting=true;
  await handleGatehouse(z,folk[0],'look');assert.ok(folk[0].text.includes('Wanderer 004 (dozing) is here.'));
  console.log('PASS: look lists all 249 other occupants across gates, excludes absent players, preserves postures and handles an empty room; no people panel.');
} finally {await rm(dir,{recursive:true,force:true});}
