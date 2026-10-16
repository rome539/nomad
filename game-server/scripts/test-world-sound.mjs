// Exercise the served audio code and room rules without a server or speakers.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build, transform } from 'esbuild';
import ts from 'typescript';
import { parse } from 'acorn';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

async function bundled(path) {
  const result = await build({ entryPoints: [new URL(path, import.meta.url).pathname], bundle: true,
    platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const { PAGE } = await bundled('../src/public.ts');
const roomSound = await bundled('../src/sound.ts');
const { soundscapeOf, placeOfRow } = roomSound;
const script = PAGE.slice(PAGE.indexOf('<script type="module">') + '<script type="module">'.length, PAGE.lastIndexOf('</script>'));
const ast = parse(script, { ecmaVersion: 'latest', sourceType: 'module' });
const functionSource = name => {
  const node = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name);
  assert(node, name);
  return script.slice(node.start, node.end);
};
const sound = script.slice(script.indexOf('var actx = null;'), script.indexOf('// ---- the conversation follows you into your kit'));

// Record Web Audio scheduling, including the buffer exhaustion that stop()
// cannot prevent. No claim about timbre or perceived loudness is made here.
function fixture() {
  const sources = [], timers = [], calls = [];
  class Param {
    value = 0;
    events = [];
    cancelScheduledValues(t) { this.events.push(['cancel', t]); }
    setValueAtTime(v, t) { assert(Number.isFinite(v) && Number.isFinite(t)); this.events.push(['set', v, t]); this.value = v; }
    linearRampToValueAtTime(v, t) { assert(Number.isFinite(v) && Number.isFinite(t)); this.events.push(['linear', v, t]); this.value = v; }
    exponentialRampToValueAtTime(v, t) { assert(v > 0 && Number.isFinite(v) && Number.isFinite(t)); this.events.push(['exp', v, t]); this.value = v; }
    setTargetAtTime(v, t, tau) { this.events.push(['target', v, t, tau]); this.value = v; }
  }
  class Node {
    gain = new Param(); frequency = new Param(); Q = new Param(); pan = new Param(); delayTime = new Param();
    connect(other) { return other; }
    disconnect() {}
    start(t = 0, offset = 0) { this.startAt = t; this.offset = offset; }
    stop(t) { this.stopAt = t; }
  }
  class AudioContext {
    sampleRate = 1000; currentTime = 10; state = 'running'; destination = new Node();
    createBuffer(channels, length, rate) {
      const data = new Float32Array(length);
      return { duration: length / rate, length, getChannelData: () => data };
    }
    createBufferSource() { const n = new Node(); sources.push(n); return n; }
    createOscillator() { return new Node(); }
    createGain() { return new Node(); }
    createBiquadFilter() { return new Node(); }
    createStereoPanner() { return new Node(); }
    createDelay() { return new Node(); }
  }
  const context = vm.createContext({ AudioContext,
    localStorage: { getItem: () => '2', setItem() {} },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    setInterval: () => 1, clearTimeout() {}, clearInterval() {},
    anims: [], mobsEl: null, sceneEl: null, lastCombat: false, inGatehouseNow: false,
    thrCtx: null, thrMaster: null, thrOut: null, thrTimers: [], thrFading: [],
    lastPlace: '', MOB_SPRITE: {}, STAGGER_S: 1, renderSnd() {},
  });
  vm.runInContext(sound + '\n' + functionSource('setSound') + '\n' + functionSource('thrMusicStop'), context);
  context.sndInit();
  context.mobVoice = (id, mode, el, wait) => calls.push({ id, mode, el, wait });
  return { c: context, sources, timers, calls };
}
let failures = 0;
function check(name, fn) {
  try { fn(); console.log('PASS', name); }
  catch (e) { failures++; console.error('FAIL', name, '\n ', e.message); }
}
check('text combat voices follow actual swings without requiring sprites', () => {
  const { c, calls } = fixture(); c.mobCalls([], ['grey-wolf']);
  assert.equal(calls.length, 1); assert.equal(calls[0].mode, 1);
});
check('unrelated beats do not replay an attack animation as a fresh call', () => {
  const { c, calls } = fixture(); c.anims = [{ id: 'grey-wolf', phase: 'attack', t: -0.2 }];
  c.mobCalls([], []); assert.equal(calls.length, 0);
});
check('crowded rounds retain every death and limit attack calls', () => {
  const { c, calls } = fixture();
  c.mobCalls(['rat', 'rat', 'rat'], ['grey-wolf', 'dire-wolf']);
  assert.equal(calls.filter(x => x.mode === 2).length, 3);
  assert.equal(calls.filter(x => x.mode === 1).length, 0);
  calls.length = 0;
  c.mobCalls([], ['grey-wolf', 'dire-wolf', 'hill-wolf']);
  assert.equal(calls.length, 2);
});
check('pictured voices stay at the swing time and position', () => {
  const { c, calls } = fixture(), el = {};
  c.anims = [{ id: 'grey-wolf', phase: 'attack', t: -0.6, el }];
  c.mobCalls([], ['grey-wolf']);
  assert.equal(calls.length, 1); assert.equal(calls[0].el, el); assert.equal(calls[0].wait, 0.6);
});
check('sleeping and fighting creatures do not make idle calls in text mode', () => {
  const { c } = fixture();
  c.mobsCameIn(['grey-wolf'], 'wood', ['rest']);
  assert.equal(c.mobIdle(), '');
  c.mobsCameIn(['grey-wolf'], 'wood', ['fight']);
  assert.equal(c.mobIdle(), '');
  c.mobsCameIn(['grey-wolf'], 'wood', ['']);
  assert.equal(c.mobIdle(), 'grey-wolf');
});
check('arrival tracking distinguishes movement, duplicate creatures and shelter', () => {
  const { c, calls } = fixture();
  c.mobsCameIn(['rat'], 'first', ['']); assert.equal(calls.length, 0);
  c.mobsCameIn(['rat', 'rat'], 'first', ['', '']); assert.equal(calls.length, 1);
  c.mobsCameIn(['grey-wolf'], 'second', ['']); assert.equal(calls.length, 1);
  c.mobsCameIn(undefined, undefined); assert.equal(c.mobIdle(), '');
});
check('a held picture cannot make creatures outside sound inside the gatehouse', () => {
  const { c } = fixture();
  c.anims = [{ id: 'grey-wolf', phase: 'idle', state: '' }];
  c.inGatehouseNow = true;
  assert.equal(c.mobIdle(), '');
});
check('every creature voice, idle, movement and distant event schedules valid audio', () => {
  const { c } = fixture();
  for (const id of Object.keys(c.VOICE_OF)) {
    for (const mode of [0, 1, 2]) c.asVoice(id, () => c.VOICES[c.VOICE_OF[id]](11, mode, c.amaster));
  }
  for (const fn of Object.values(c.IDLE)) fn(11, c.amaster);
  for (const fn of Object.values(c.MOVES)) fn(11, c.amaster, 4, 0.3);
  for (const fn of Object.values(c.FAR)) fn(11, c.amaster);
});
check('long noise envelopes do not run out of samples before their fades', () => {
  const { c, sources } = fixture();
  c.scapeThunder(false, 1, false);
  c.SND._burst(11, { dur: 3, gain: 0.3 });
  c.VOX.voc(11, { d: 3, n: 0.8 }, c.amaster);
  for (const s of sources) {
    assert(s.loop || s.buffer.duration - s.offset >= s.stopAt - s.startAt,
      `buffer ends after ${s.buffer.duration - s.offset}s, envelope needs ${s.stopAt - s.startAt}s`);
  }
});
check('off silences entrance music both before and during its crossing fade', () => {
  const { c } = fixture();
  const ctx = c.actx, out = ctx.createGain(); out.gain.value = 1;
  c.thrCtx = ctx; c.thrMaster = ctx.createGain(); c.thrOut = out;
  c.thrMusicStop(); // crossing detached the context, but it still plays
  assert.equal(c.thrCtx, null); assert.equal(c.thrFading.length, 1);
  c.setSound(0);
  assert.deepEqual(Array.from(out.gain.events.at(-1)), ['linear', 0, ctx.currentTime + .04]);
  const activeOut = ctx.createGain(); activeOut.gain.value = 1;
  c.thrCtx = ctx; c.thrMaster = ctx.createGain(); c.thrOut = activeOut;
  c.setSound(0);
  assert.equal(c.thrCtx, null);
  assert.deepEqual(Array.from(activeOut.gain.events.at(-1)), ['linear', 0, ctx.currentTime + .04]);
});
check('sound-setting sync does not write back or play a confirmation chime', () => {
  const { c } = fixture();
  c.localStorage.setItem = () => { throw new Error('storage echo'); };
  c.playSounds = () => { throw new Error('unsolicited chime'); };
  c.setSound(0, true); assert.equal(c.soundOn, false);
  c.setSound(1, true); assert.equal(c.soundOn, true);
});
check('off fades the master, including voices and thunder already scheduled', () => {
  const { c } = fixture(); c.setSound(0);
  assert(c.amaster.gain.events.some(e => e[0] === 'linear' && e[1] === 0));
  c.setSound(2);
  assert.equal(c.amaster.gain.events.at(-1)[1], 0.5);
});

const weather = { rain: 2, windUp: true, snow: false, mud: false, seaUp: false, runUp: false };
check('solid rock excludes rain and outside wind, while a surface roof hears rain', () => {
  for (const p of [
    { roomId: 'hall', band: 'upper', open: false, inside: false },
    { roomId: 'the-kept-room', band: 'mountain', open: false, inside: false },
    { roomId: 'the-mine-gallery', band: 'mountain', open: false, inside: false },
    { roomId: 'the-chain-well', band: 'deep', open: false, inside: false },
  ]) { const a = soundscapeOf(p, weather); assert.equal(a.rain, 0, p.roomId); assert.equal(a.wind, 0, p.roomId); }
  const house = soundscapeOf({ roomId: 'the-mill-loft', band: 'road', open: false, inside: false }, weather);
  assert.equal(house.rain, 2); assert.equal(house.roof, 1); assert.equal(house.wind, 1);
});
check('gatehouse keeps its hearth and excludes the water outside', () => {
  const a = soundscapeOf({ roomId: 'the-ferry-house', band: 'crossing', open: false, inside: true },
    { ...weather, seaUp: true, runUp: true });
  assert.equal(a.fire, 1); assert(a.fireSide < 0); assert.equal(a.water, ''); assert.equal(a.ground, '');
});
check('explicit action cues override cosmetic gain, unlock and damage classes', () => {
  const { c } = fixture();
  for (const [cls, expected] of [['gain sfx-eat','eat'], ['gain sfx-bandage','bandage'], ['gain sfx-ignite','ignite'], ['unlock sfx-keyunlock','keyunlock'], ['unlock sfx-lastkey','lastkey'], ['unlock sfx-bell','bell'], ['dmgin big sfx-dice','dice'], ['sfx-whistle','whistle'], ['sfx-handle','handle'], ['sfx-box','box']]) {
    assert.equal(c.sndFor('An action succeeded.', cls), expected);
    c.SND[expected](10);
  }
  assert.equal(c.sndFor('An ordinary reward.', 'gain'), 'chime');
  assert.equal(c.sndFor('You have nothing to light.', ''), null);
  assert.equal(c.sndFor("Keys clink at the carrier's belt.", ''), 'keys');
});
check('food, bandage and ignition retain one delayed reward chime', () => {
  const { c } = fixture(), chimes = [];
  c.SND.chime = t => chimes.push(t);
  for (const name of ['eat','bandage','ignite']) c.SND[name](10);
  assert.deepEqual(chimes, [10.55,10.55,10.55]);
});
check('nearby keys, whistles and bells use the wall-filtered channel', () => {
  const { c } = fixture(), out = {}, heard = [];
  c.VOX.wall = () => out;
  for (const name of ['keys','whistle','bell','wetbell']) {
    c.ACTION_SOUNDS[name] = (t, o) => heard.push([name, o]);
    c.heardSound({ act: name, dir: 'east' });
  }
  assert.equal(heard.length, 4);
  assert(heard.every(x => x[1] === out));
});
check('casting follows bodies rather than ominous names or occupations', () => {
  const { c } = fixture();
  const expected = {
    'the-milker': 'human', 'the-butter-wife': 'human', 'the-woodward': 'woodward',
    'charcoal-burner': 'burner', 'the-keeper-of-the-holding': 'holdingkeeper',
    'road-carrier': 'human', 'the-fowler': 'fowler', 'the-drover': 'drover', 'the-eel-cutter': 'eelcutter', 'the-bridge-mason': 'mason', 'bone-knight': 'boneknight', 'drowned-hulk': 'hulk', 'drowned-god': 'drownedgod', 'dire-hyena': 'direhyena', 'grave-hyena': 'hyena', 'the-herd': 'human',
    'the-one-who-stayed': 'human', 'the-drove-master': 'dog', 'the-miller': 'drowned',
    'glutton': 'badger', 'the-old-glutton': 'badger', 'ermine': 'stoat',
    'the-dancer': 'stoat', 'otter': 'otter', 'dog-otter': 'otter',
    'two-hound': 'twohound', 'three-hound': 'threehound',
    'wrack-crab': 'crab', 'the-great-crab': 'greatcrab', 'the-great-devil-crab': 'greatdevilcrab',
  };
  for (const [id, family] of Object.entries(expected)) assert.equal(c.VOICE_OF[id], family, id);
  const ids = Object.values(c.VOICE_FAMILY).flatMap(s => s.split(' '));
  assert.equal(new Set(ids).size, ids.length, 'creatures must have exactly one casting');
  assert(!Object.values(c.VOICE_OF).includes('shade'));
});
check('multiheaded hounds use independent overlapping throats and the lion gives no warning', () => {
  const { c } = fixture(), calls = [];
  c.VOX.voc = (t, recipe) => calls.push({ t, recipe });
  for (const [family, heads] of [['twohound', 2], ['threehound', 3]]) {
    for (const mode of [0, 1, 2]) {
      calls.length = 0; c.VOICES[family](10, mode, c.amaster);
      assert.equal(calls.length, heads);
      assert.equal(new Set(calls.map(x => x.recipe.f[0][1])).size, heads);
      assert(calls[1].t < calls[0].t + calls[0].recipe.d, 'throats overlap');
    }
  }
  calls.length = 0; c.VOICES.beast(10, 0, c.amaster); assert.equal(calls.length, 0);
});
check('great crabs strike with one or two heavy claws rather than a small-crab rattle', () => {
  const { c } = fixture(), impacts = [];
  c.VOX.blip = (...args) => impacts.push(args);
  c.VOICES.greatcrab(10, 1, c.amaster); assert.equal(impacts.length, 1);
  impacts.length = 0; c.VOICES.greatdevilcrab(10, 1, c.amaster);
  assert.equal(impacts.length, 2); assert(impacts[1][0] > impacts[0][0]);
});
check('every voice supports arrival, attack, death and its movement sound', () => {
  const { c } = fixture();
  for (const family of Object.keys(c.VOICE_FAMILY)) {
    assert.equal(typeof c.VOICES[family], 'function', family);
    assert.equal(typeof c.MOVES[c.MOVE_STYLE[family]], 'function', family);
    for (const pitch of [0.7, 1, 1.4]) {
      c.VOX.pitch = pitch;
      for (const mode of [0, 1, 2]) c.VOICES[family](10, mode, c.amaster);
      if (c.IDLE[family]) c.IDLE[family](10, c.amaster);
    }
  }
});
check('hollow mobs never use living human voices', () => {
  const { c } = fixture();
  for (const id of ['the-tide-warden', 'the-scaffold-hand', 'the-salt-widow', 'the-refuge-man', 'the-pilot', 'the-toll-clerk', 'the-drover', 'the-eel-cutter', 'the-bridge-mason', 'the-fowler']) assert.notEqual(c.VOICE_OF[id], 'human', id);
});
check('god has no bubbles or throat; boneless creatures have no hard clicks', () => {
  const { c } = fixture();
  c.VOX.bubbles = () => assert.fail('invented bubbles');
  c.VOX.voc = () => assert.fail('invented throat');
  for (const mode of [0, 1, 2]) c.VOICES.drownedgod(10, mode, c.amaster);
  c.IDLE.drownedgod(10, c.amaster);
  c.VOX.clicks = () => assert.fail('hard skeleton');
  for (const family of ['pale', 'stalker']) for (const mode of [0, 1, 2]) c.VOICES[family](10, mode, c.amaster);
});
check('both hares have audible call and idle components above a sub-bass thump', () => {
  const { c } = fixture(), notes = [];
  c.VOX.voc = (t, r) => notes.push(r);
  for (const id of ['mountain-hare', 'snow-hare']) {
    notes.length = 0; c.VOICES[c.VOICE_OF[id]](10, 0, c.amaster); c.IDLE[c.VOICE_OF[id]](11, c.amaster);
    assert(notes.length >= 3); assert(notes.every(r => r.f[0][1] >= 600));
  }
});
check('nearby events retain direction, body and mute controls', () => {
  const { c } = fixture(), received = [], pans = [];
  c.VOX.wall = p => { pans.push(p); return c.amaster; };
  c.VOICES.direhyena = (t, m) => received.push(['dire', m]);
  c.IDLE.mason = () => received.push(['mason']);
  c.heardSound({ mob: 'dire-hyena', act: 'call', dir: 'west' });
  c.heardSound({ mob: 'the-bridge-mason', act: 'idle', dir: 'east' });
  assert.deepEqual(received, [['dire', 0], ['mason']]); assert(pans[0] < 0 && pans[1] > 0);
  c.setSound(0); c.heardSound({ mob: 'dire-hyena', act: 'call' }); assert.equal(received.length, 2);
});
check('every AI nearby noise includes an explicit client-supported audio cue', () => {
  const { c } = fixture();
  const source = ts.createSourceFile('ai.ts', readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  let count = 0;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'roomSound') {
      count++; assert(node.arguments.length >= 6, node.getText(source));
      const cues = node.arguments[5].getText(source).match(/"([a-z]+)"/g) || [];
      for (const cue of cues.map(x => JSON.parse(x))) assert(['move','flee','call','feed','fight','idle'].includes(cue) || c.ACTION_SOUNDS[cue], cue);
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert(count > 25);
});
const verbSource = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
const verbAst = ts.createSourceFile('verbs.ts', verbSource, ts.ScriptTarget.Latest, true);
const listenCode = (await transform(verbAst.statements.filter(n => ts.isFunctionDeclaration(n) && ['heardIn','cmdListen'].includes(n.name?.text)).map(n => n.getText(verbAst).replace(/^export /, '')).join('\n'), {loader:'ts'})).code;
check('listen sends real nearby cues but sealed doors and hidden lurkers stay quiet', () => {
  const sent = [], session = { roomId:'here' }, mob = { templateId:'the-bridge-mason', roomId:'there' };
  const exit = {dir:'east',to_room:'there'};
  const c = vm.createContext({
    events: { raining:()=>false, quieted:()=>false, tideFlooded:()=>false, phaseOf:()=>'' },
    STILL_SOUNDS: {'the-bridge-mason':'a mallet on stone'}, LURKERS:new Set(['pale-stalker']),
    DROWNERS:new Set(), HOLLOW:new Set(), THIEVES:new Set(), LIGHTS_ROOMS:new Set(),
    LISTEN_DIRS:{east:'east'}, DIR_ORDER:{east:1}, HEARD_EMPTY:{upper:['nothing']},
    MOON_DOOR_KEY:'moon',TIDE_DOOR_KEY:'tide',BELL_DOOR_KEY:'bell',
    groundWord:()=> 'stone', cap:s=>s, dirPhrase:s=>s, pick:a=>a[0],
  });
  vm.runInContext(listenCode,c);
  const z = { world:{exits:new Map([['here',[exit]]])}, creatures:new Map([['m',mob]]), sessions:new Map(), openDoors:new Set(), regionOf:()=> 'upper', send:(...args)=>sent.push(args) };
  c.cmdListen(z,session,'east'); assert.equal(sent.at(-1)[4][0].mob,'the-bridge-mason'); assert.equal(sent.at(-1)[4][0].dir,'east');
  exit.key_item='locked'; c.cmdListen(z,session,'east'); assert.equal(sent.at(-1)[4].length,0);
  delete exit.key_item; mob.templateId='pale-stalker'; mob.hidden=true; c.cmdListen(z,session,'east'); assert.equal(sent.at(-1)[4].length,0);
});
check('armoured movement follows each written tell without the old pitched clank', () => {
  const { c } = fixture(), events = [];
  c.SND._burst = (t, r) => events.push({t, kind:'foot', r});
  c.VOX.hiss = (t, r) => events.push({t, kind:'friction', r});
  c.VOX.clicks = (t, r) => events.push({t, kind:'contacts', r});
  c.VOX.ring = c.VOX.blip = c.VOX.step = () => assert.fail('old clank/tonal footstep');
  const patterns = new Set();
  for (const id of ['warden','warden-captain','last-watchman','warden-surface','the-long-warden','bone-knight']) {
    events.length=0; c.heardSound({mob:id, act:'move', dir:'west'});
    assert(events.length > 0, id);
    patterns.add(JSON.stringify(events));
    if (id === 'warden') assert(events.every(e => e.kind === 'foot'));
    if (id === 'warden-surface') assert(events.every(e => e.kind === 'friction'));
    if (id === 'bone-knight') assert(events.some(e => e.kind === 'contacts') && events.some(e => e.kind === 'friction'));
    if (id === 'last-watchman') {
      const feet = events.filter(e => e.kind === 'foot');
      assert(feet[2].t - feet[0].t > .7, 'measured pace');
    }
    const end = Math.max(...events.map(e => e.t));
    events.length=0; c.heardSound({mob:id, act:'flee', dir:'west'});
    assert(Math.max(...events.map(e => e.t)) < end, 'flee cadence speeds up');
  }
  assert.equal(patterns.size,6,'six distinct movement constructions');
});
check('hyena attack is a distinct short action, not the call with different gain', () => {
  const { c } = fixture(), notes = [];
  c.VOX.voc = (t,r) => { const {g,...shape}=r; notes.push({t,shape}); };
  for (const family of ['hyena','direhyena']) {
    notes.length=0; c.VOICES[family](10,0,c.amaster); const call=JSON.stringify(notes);
    const callEnd=Math.max(...notes.map(n=>n.t+n.shape.d));
    notes.length=0; c.VOICES[family](10,1,c.amaster);
    assert.notEqual(JSON.stringify(notes),call);
    assert.equal(notes.length,1,'one attack, no repeated calling');
    assert(Math.max(...notes.map(n=>n.t+n.shape.d)) < callEnd);
  }
});
check('human effort is brief and breath-led without periodic growl modulation', () => {
  const { c } = fixture(), notes=[], breath=[];
  c.VOX.voc=(t,r)=>notes.push(r); c.VOX.hiss=(t,r)=>breath.push(r);
  c.VOICES.human(10,1,c.amaster);
  assert.equal(notes.length,1); assert(notes[0].d<.25); assert(!notes[0].r);
  assert(breath.length>0); assert(notes[0].fm.some(f=>f[2]));
});
check('wolf call holds and changes vowel shape without periodic siren vibrato', () => {
  const { c } = fixture(), notes=[];
  c.VOX.voc=(t,r)=>notes.push(r); c.VOICES.wolf(10,0,c.amaster);
  assert.equal(notes.length,1); assert(notes[0].d>=3); assert(!notes[0].vib);
  assert(notes[0].f.length>5); assert(notes[0].fm.every(f=>f[2]));
});
check('inland drainage, still pools and dry stores respect their descriptions', () => {
  for (const [id, expected] of [
    ['the-drain-cut', 'run'], ['the-outfall', 'run'], ['the-flashes', ''],
    ['the-wet-carr', ''], ['the-burn-flats', ''], ['the-peat-cuts', ''], ['the-open-water', 'lap'],
    ['the-cold-pantry', ''], ['the-lock-keepers-room', ''], ['the-flood-mark', ''],
    ['the-mid-causeway', 'surf'], ['the-sea-cave', 'cave'],
  ]) {
    const deep = ['the-cold-pantry', 'the-lock-keepers-room', 'the-flood-mark'].includes(id);
    assert.equal(soundscapeOf({ roomId: id, band: deep ? 'deep' : 'crossing', open: !deep, inside: false }, weather).water, expected, id);
  }
});
check('dry hollow rooms never invent a drip', () => {
  const { c } = fixture();
  c.scapeAmb = { hollow: 1, water: '' };
  c.actx.createOscillator = () => { throw new Error('invented water'); };
  for (let i = 0; i < 100; i++) c.scapeDrop();
});
check('environment distinguishes falls, sheltered water, canopy and floor materials', () => {
  const dry = { ...weather, rain: 0, windUp: false };
  const at = (roomId, band = 'wood') => soundscapeOf({ roomId, band, open: true, inside: false }, dry);
  assert.equal(at('the-force', 'mountain').water, 'falls');
  assert.equal(at('the-open-water', 'den').water, 'lap');
  assert.equal(at('the-sea-cave', 'crossing').water, 'cave');
  assert.equal(at('the-heart-of-it').ground, 'leaves');
  assert.equal(at('the-first-clearing').ground, 'grass');
  assert.equal(at('the-plank-bridge', 'road').ground, 'wood');
  assert.equal(at('the-white-ground').ground, 'quiet');
  assert.equal(at('the-heart-of-it').leaves, 1);
  assert.equal(at('the-force', 'mountain').leaves, 0);
  const p = { roomId: 'the-heart-of-it', band: 'wood', open: true, inside: false };
  assert.equal(soundscapeOf(p, { ...dry, snow: true }).ground, 'snow');
  assert.equal(soundscapeOf(p, weather).ground, 'mud');
});
check('the deep stops dripping while drawing breath and resumes afterward', () => {
  const p = { roomId: 'the-chain-well', band: 'deep', open: false, inside: false };
  const before = soundscapeOf(p, weather);
  const during = soundscapeOf(p, { ...weather, dripsStopped: true });
  assert.equal(before.water, 'drip'); assert.equal(during.water, '');
  assert.notEqual(roomSound.soundKey(before), roomSound.soundKey(during));
  const { c } = fixture();
  c.scapeSet(before); assert.equal(c.scapeAmb.water, 'drip');
  c.scapeSet(during); assert.equal(c.scapeAmb.water, '');
  c.scapeSet(before); assert.equal(c.scapeAmb.water, 'drip');
});
check('new layers fade out on room changes and full mode excludes the universal cave bed', () => {
  const { c } = fixture();
  c.soundLevel = 1; c.startAmb(); assert(c.ambNodes);
  c.soundLevel = 2; c.startAmb(); assert.equal(c.ambNodes, null);
  c.scapeSet({ water: 'falls', leaves: 1, wind: 2 });
  assert(c.scape.falls.gain.gain.value > 0); assert(c.scape.leaves.gain.gain.value > 0);
  c.scapeSet({ water: 'lap', wind: 0 });
  assert.equal(c.scape.falls.gain.gain.value, 0); assert.equal(c.scape.leaves.gain.gain.value, 0);
  assert(c.scape.lap.gain.gain.value > 0);
  c.scapeSet({ water: '', wind: 0 }); assert.equal(c.scape.lap.gain.gain.value, 0);
  for (const ground of ['wood','leaves','grass','quiet']) c.SND._stepOn(11, ground);
  for (const name of ['rubble','stoneshift','scurry']) c.SND[name](11);
  c.scapeStop(); assert.equal(c.scape, null);
});
check('authored creature voices and soundscape room IDs cover the migrated world', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
    const dir = new URL('../migrations/', import.meta.url);
    for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file, dir), 'utf8'));
    const { c } = fixture();
    const missing = db.prepare('SELECT id FROM mob_templates').all().filter(r => !c.VOICE_OF[r.id]);
    assert.deepEqual(missing, []);
    const rooms = db.prepare('SELECT id, region, is_entry FROM rooms').all();
    const roomIds = new Set(rooms.map(r => r.id));
    for (const [name, ids] of Object.entries(roomSound)) {
      if (!name.endsWith('_ROOMS')) continue;
      for (const id of ids) assert(roomIds.has(id), `${name}: missing room ${id}`);
    }
    for (const row of rooms) {
      const a = soundscapeOf(placeOfRow(row), weather);
      assert(Number.isFinite(a.wind) && a.wind >= 0 && a.wind <= 3, row.id);
    }
  } finally { db.close(); }
});
if (failures) process.exitCode = 1;
