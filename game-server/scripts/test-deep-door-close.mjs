import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
const start = ai.indexOf('// What lives behind the black door has reformed');
const end = ai.indexOf('} else if (!silent)', start);
const boss = new Function('z', 'world', 'roomId', 'silent', 'SURFACE_BANDS', 'FORTRESS_BANDS', ai.slice(start, end));
const timerStart = zone.indexOf('    for (const [key, at] of this.doorCloseAt)');
const timerEnd = zone.indexOf('\n\n    // Bodies and appetites', timerStart);
const timer = new Function('now', 'FORTRESS_BANDS', zone.slice(timerStart, timerEnd));
const surface = new Set(['wood']), fortress = new Set(['deep']);
const world = {exits: new Map([['door', [{dir:'down',to_room:'boss',key_item:'heart'}]]])};
function fixture(open=true) {
 const lines=[];
 return {lines, openDoors:new Set(open?['door:down']:[]), doorCloseAt:new Map([['door:down',100]]),
 regionOf:()=> 'deep', roomFeedBands:(_,line)=>lines.push(line)};
}
function respawn(z,silent=false){boss(z,world,'boss',silent,surface,fortress)}
let z=fixture();timer.call(z,100,fortress);respawn(z);assert.equal(z.lines.length,1,'timer then respawn announces once');
z=fixture();respawn(z);assert.equal(z.doorCloseAt.size,0,'respawn clears the closure timer');timer.call(z,100,fortress);respawn(z);assert.equal(z.lines.length,1,'respawn then timer announces once');
z=fixture(false);respawn(z);assert.equal(z.lines.length,0,'already closed door is silent');
z=fixture();respawn(z,true);assert.equal(z.lines.length,0);assert.equal(z.openDoors.size,0,'silent catch-up still closes door');
z=fixture(false);z.regionOf=()=> 'wood';respawn(z);assert.equal(z.lines.length,1,'surface boss keeps its return announcement');
z=fixture();timer.call(z,99,fortress);assert.equal(z.lines.length,0);assert.equal(z.openDoors.size,1,'timer cannot close early');
timer.call(z,100,fortress);z.openDoors.add('door:down');z.doorCloseAt.set('door:down',200);timer.call(z,200,fortress);assert.equal(z.lines.length,2,'a later real closure gets its own announcement');
console.log('Deep door: both closure orders, closed state, catch-up, surface boss, and reopening pass.');
