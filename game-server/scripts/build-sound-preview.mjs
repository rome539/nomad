// Audition the served recipes, including their real sprite-based pitch.
// Run from game-server: node scripts/build-sound-preview.mjs
import { build } from 'esbuild';
import { parse } from 'acorn';
import { mkdirSync, writeFileSync } from 'node:fs';
const result = await build({ entryPoints: [new URL('../src/public.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false });
const { PAGE } = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const js = PAGE.slice(PAGE.indexOf('<script type="module">') + '<script type="module">'.length, PAGE.lastIndexOf('</script>'));
const ast = parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
const sizes = ast.body.find(n => n.type === 'VariableDeclaration' && n.declarations.some(d => d.id.name === 'MOB_SPRITE'));
const sound = js.slice(js.indexOf('var actx = null;'), js.indexOf('// ---- the conversation follows you into your kit'));
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>NOMAD · Voice audition</title>
<style>body{background:#171819;color:#e5dccb;font:18px Georgia;max-width:850px;margin:40px auto;padding:20px}button,select{font:inherit;padding:10px;margin:5px;background:#292c2d;color:inherit;border:1px solid #706859}p{line-height:1.5}#status{color:#b5a67f}button[aria-pressed="true"]{background:#625339;border-color:#d8b877}.mob-nav{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.mob-nav select{min-width:220px;flex:1}#position{font-size:15px;color:#b5a67f}</style>
<h1>NOMAD · Voice audition</h1><p>The actual game recipes and creature pitches. Select a creature, then hear its call, attack, death or idle sound. The world buttons isolate the environmental layers. Audition audio is separate from game options; Stop all audio mutes this page. It stops when you leave this tab. Nothing is saved to your game.</p>
<div class="mob-nav"><button id="previous" aria-label="Previous mob">← Previous</button><select id="mob" aria-label="Creature"></select><button id="next" aria-label="Next mob">Next →</button></div><p id="position" aria-live="polite"></p><div id="calls"></div><p><label><input id="autoplay" type="checkbox" checked> Play when changing mob</label> · ← / → to cycle</p><h2>Heard from another room</h2><p><select id="direction" aria-label="Sound direction"><option value="west">West / left</option><option value="east">East / right</option><option value="north">North / ahead</option></select></p><div id="nearby"></div><h2>Actions</h2><div id="actions"></div><h2>World layers</h2><div id="world"></div><p><button id="stop">Stop all audio</button></p><p id="status">Audio starts only when you press a button.</p>
<script>
${js.slice(sizes.start, sizes.end)}
var anims=[], lastPlace='', inGatehouseNow=false, lastCombat=false, mobsEl=null, sceneEl=null;
${sound.replace('localStorage.getItem("nomad_sound")', '"2"')}
var picker=document.getElementById('mob'), statusEl=document.getElementById('status');
Object.keys(VOICE_OF).sort().forEach(function(id){var opt=document.createElement('option');opt.value=id;opt.textContent=id.replaceAll('-',' ')+' · '+VOICE_OF[id];picker.appendChild(opt);});
picker.value='ptarmigan';
async function ready(){soundOn=true;soundLevel=2;sndInit();await actx.resume();}
var selectedMode=0, selectedNearby=null, mobChannel=null, playRequest=0, modeLabels=['Call','Attack','Death','Idle'];
function updatePosition(){document.getElementById('position').textContent=(picker.selectedIndex+1)+' / '+picker.options.length+' · '+picker.options[picker.selectedIndex].textContent;}
function silenceMob(){
  if(!mobChannel)return;
  var old=mobChannel;mobChannel=null;
  old.gain.cancelScheduledValues(actx.currentTime);
  old.gain.setValueAtTime(old.gain.value,actx.currentTime);
  old.gain.linearRampToValueAtTime(0,actx.currentTime+.025);
  setTimeout(function(){old.disconnect();},40);
}
async function playMob(){
  var request=++playRequest, id=picker.value, mode=selectedMode;
  await ready();if(request!==playRequest)return;
  scapeStop();stopAmb();silenceMob();
  mobChannel=actx.createGain();mobChannel.connect(aout());
  if(selectedNearby){heardSound({mob:id,act:selectedNearby[1],dir:document.getElementById('direction').value},0,mobChannel);statusEl.textContent=id.replaceAll('-',' ')+' · '+selectedNearby[0]+' · from '+document.getElementById('direction').value;return;}
  var silent=mode===3&&(!IDLE[VOICE_OF[id]]||IDLE_SILENT[id]);
  asVoice(id,function(){if(mode===3){if(!silent)IDLE[VOICE_OF[id]](actx.currentTime+.05,mobChannel);}else VOICES[VOICE_OF[id]](actx.currentTime+.05,mode,mobChannel);});
  statusEl.textContent=id.replaceAll('-',' ')+' · '+modeLabels[mode]+(silent?' (silent)':'');
}
modeLabels.forEach(function(label,mode){
  var b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(mode===selectedMode));
  b.onclick=function(){selectedNearby=null;selectedMode=mode;document.querySelectorAll('#calls button').forEach(function(button,i){button.setAttribute('aria-pressed',String(i===mode));});playMob();};
  document.getElementById('calls').appendChild(b);
});
function changedMob(){updatePosition();silenceMob();++playRequest;if(document.getElementById('autoplay').checked)playMob();else statusEl.textContent='Selected '+picker.options[picker.selectedIndex].textContent;}
function cycleMob(step){picker.selectedIndex=(picker.selectedIndex+step+picker.options.length)%picker.options.length;changedMob();}
document.getElementById('previous').onclick=function(){cycleMob(-1);};
document.getElementById('next').onclick=function(){cycleMob(1);};
picker.onchange=changedMob;
document.addEventListener('keydown',function(e){
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.matches('select,input,textarea')||e.target.isContentEditable)return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();cycleMob(e.key==='ArrowLeft'?-1:1);}
});
updatePosition();
[['Call','call'],['Moving','move'],['Idle / listen','idle'],['Feeding','feed'],['Fighting','fight'],['Fleeing','flee']].forEach(function(pair){
  var b=document.createElement('button');b.textContent='Nearby: '+pair[0];
  b.onclick=function(){selectedNearby=pair;document.querySelectorAll('#calls button').forEach(function(button){button.setAttribute('aria-pressed','false');});playMob();};
  document.getElementById('nearby').appendChild(b);
});
var actionLabels={rubble:'Wall collapse',stoneshift:'Shifting stone',scurry:'Fleeing feet',keys:'Key ring',keyunlock:'Try keys and unlock',lastkey:'Last key / empty ring',whistle:'Whistle',bell:'Bell',wetbell:'Drowned bell',dice:'Roll dice',handle:'Handle equipment',box:'Lockbox',eat:'Eat + reward',bandage:'Bandage + reward',ignite:'Light + reward'};
Object.keys(actionLabels).forEach(function(name){var b=document.createElement('button');b.textContent=actionLabels[name];b.onclick=async function(){await ready();scapeStop();stopAmb();sndOne(name);statusEl.textContent=actionLabels[name];};document.getElementById('actions').appendChild(b);});
['wood','leaves','grass','stone','snow','mud'].forEach(function(ground){var b=document.createElement('button');b.textContent='Walk on '+ground;b.onclick=async function(){await ready();scapeStop();stopAmb();for(var i=0;i<3;i++)SND._stepOn(actx.currentTime+.05+i*.45,ground==='stone'?'':ground);statusEl.textContent='Walk on '+ground;};document.getElementById('actions').appendChild(b);});
var beds={'Sea':{water:'surf'},'Waterfall':{water:'falls'},'Sheltered water':{water:'lap'},'Sea cave':{water:'cave',hollow:1},'Forest canopy':{leaves:1,wind:1},'Running water':{water:'run'},'Wet cavern':{water:'drip',hollow:1},'Dry cavern':{hollow:1},'Exposed rain':{rain:2,wind:1},'Rain on a roof':{rain:2,roof:1,shut:1},'Mountain wind':{wind:2},'Gatehouse hearth':{fire:1,fireSide:-.6,creak:1,shut:1}};
Object.keys(beds).forEach(function(label){var b=document.createElement('button');b.textContent=label;b.onclick=async function(){await ready();scapeSet(beds[label]);statusEl.textContent=label+' · continuous';};document.getElementById('world').appendChild(b);});
async function stopAudition(){++playRequest;silenceMob();if(actx)await actx.suspend();statusEl.textContent='Stopped';}
document.getElementById('stop').onclick=stopAudition;
document.addEventListener('visibilitychange',function(){if(document.hidden)stopAudition();});
window.addEventListener('pagehide',stopAudition);
</script>`;
const dir = new URL('../preview/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('sound.html', dir), html);
console.log('Built preview/sound.html from the served audio code.');
