import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {build,transform} from 'esbuild';
const dir=await mkdtemp(join(tmpdir(),'nomad-moon-'));
try {
 const outfile=join(dir,'clock.mjs');
 await build({stdin:{contents:'export * from "./zone-util";export {DAY_CYCLE_MS,MOON_FULL_EVERY,BLOOD_MOON_EVERY} from "./zone-data";',resolveDir:new URL('../src',import.meta.url).pathname},bundle:true,platform:'node',format:'esm',outfile,logLevel:'silent'});
 const clock=await import(pathToFileURL(outfile));
 const zone=await readFile(new URL('../src/zone.ts',import.meta.url),'utf8');
 assert.ok(zone.includes('? moonriseLine(now)'),'nightfall uses the tested calendar announcement');
 const method=zone.match(/  public artSkyFor\(session: Session\): string \| undefined \{[\s\S]*?^  \}/m)[0];
 const {code}=await transform(method.replace('public artSkyFor','function artSkyFor'),{loader:'ts'});
 let now=0,weather='';
 const c={ART_KEYS:new Set(['synthetic']),OUTDOOR_ROOMS:new Set(['outside']),events:{weatherNow:()=>weather,snowed:()=>weather==='snow',foggy:()=>weather==='fog',raining:()=>weather==='rain',phaseOf:()=>''}};
 for(const name of ['isNight','isFullMoon','isBloodMoon','isDawn','isDusk','eclipsePhase'])c[name]=()=>clock[name](now);
 vm.createContext(c);vm.runInContext(code,c);
 const z={outOfWorld:()=>false,world:{entryRooms:new Set()}},session={pubkey:'synthetic',roomId:'outside'};
 let red=0,white=0;
 for(let day=0;day<clock.MOON_FULL_EVERY*clock.BLOOD_MOON_EVERY*2;day++) {
  now=day*clock.DAY_CYCLE_MS+clock.DAY_CYCLE_MS*.75;
  const sky=c.artSkyFor.call(z,session),line=clock.moonriseLine(now);
  if(clock.isBloodMoon(now)){red++;assert.equal(sky,'blood');assert.match(line,/blood moon/i);assert.ok(!line.includes('white'));}
  else if(clock.isFullMoon(now)){white++;assert.equal(sky,'moon');assert.match(line,/white/);assert.ok(!line.includes('blood'));}
  else assert.equal(sky,'night');
 }
 assert.ok(red>0&&white>0);
 now=clock.DAY_CYCLE_MS*.75;
 for(weather of ['rain','fog','snow'])assert.equal(c.artSkyFor.call(z,session),weather,'weather retains priority');
 weather='';session.roomId='inside';assert.equal(c.artSkyFor.call(z,session),'in');
 console.log('PASS: full and blood moon announcements match sky selection across two blood-moon cycles; weather and interiors retain priority.');
}finally{await rm(dir,{recursive:true,force:true});}
