// Exercise the actual client's animation lifecycle without a browser or art assets.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('var weatherCanvas ='), source.indexOf('function paintScene('));
const queued = new Map(), listeners = {};
let id = 0, strokes = 0, flakes = 0;
const ctx = {clearRect(){},setTransform(){},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes++},arc(){},fill(){flakes++}};
const canvas = {style:{},width:0,height:0,getContext:()=>ctx};
const motion = {matches:false,addEventListener:(_,fn)=>listeners.motion=fn};
const env = {document:{hidden:false,getElementById:()=>canvas,addEventListener:(name,fn)=>listeners[name]=fn},
 window:{matchMedia:()=>motion},viewMode:'image',sceneEl:{getBoundingClientRect:()=>({left:0,top:0,width:1920,height:900})},
 requestAnimationFrame:fn=>{queued.set(++id,fn);return id},cancelAnimationFrame:n=>queued.delete(n)};
vm.createContext(env);vm.runInContext(code,env);
function step(t){const pending=[...queued.values()];queued.clear();pending.forEach(fn=>fn(t));}
env.setWeather('rain');step(100);step(150);assert(strokes>0);assert.equal(canvas.width,1280);
const elapsed=env.weatherTime;env.setWeather('rain');step(200);assert(env.weatherTime>elapsed);assert.equal(queued.size,1);
env.setWeather('snow');step(250);assert(flakes>0);
for(const weather of ['day','fog','after-rain','in','']){env.setWeather(weather);assert.equal(queued.size,0);assert.equal(canvas.style.display,'none');}
env.setWeather('rain');motion.matches=true;listeners.motion();assert.equal(queued.size,0);
motion.matches=false;listeners.motion();assert.equal(queued.size,1);
env.document.hidden=true;listeners.visibilitychange();assert.equal(queued.size,0);
env.document.hidden=false;listeners.visibilitychange();assert.equal(queued.size,1);
env.viewMode='text';env.runWeather();assert.equal(queued.size,0);
env.viewMode='image';env.runWeather();assert.equal(queued.size,1);
console.log('Weather particles: drawing, density cap, continuity, clear weather, reduced motion, hidden tabs and text view pass.');
