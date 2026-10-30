// ONE CHECK PER BUG THAT WAS FIXED, so it can't come back unseen (rome,
// 2026-10-22). Each block names the day it was found and what went wrong.
// The real game code runs here with no network and no database: the bits of
// ZoneDO that reach outside are stubbed, the way test-combat does it.
//
//   node scripts/test-regressions.mjs
//
// A new fix gets a new block here, in the same change.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'nomad-regress-'));
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log('  ok   ' + name); };
const checkAsync = async (name, fn) => { await fn(); passed++; console.log('  ok   ' + name); };
try {
  const output = join(dir, 'regress.mjs');
  await build({
    stdin: {
      contents: [
        "export {ZoneDO} from './zone';",
        "export {parse} from './parser';",
        "export * as den from './den';",
        "export {cmdMap, copyCounts} from './lore';",
        "export {cmdGo} from './verbs';",
        "export {receiptGoods, goodsWorth, worthMark, worthPips, cmdRepair, sendTrade, glutMult, tickGlut, offerCore, cmdOffer} from './gate';",
        "export {cmdLook, keepingLines} from './verbs';",
        "export * as light from './light';",
        "export * as body from './body';",
        "export * as ratking from './ratking';",
        "export * as coughing from './cough';",
        "export * as campfire from './campfire';",
        "export {cmdCook, moveLoad} from './verbs';",
        "export {walkCost} from './exhaustion';",
        "export {COOK_RECIPES, CAMPFIRE_MS, SNOW_LOAD_KG, WET_DRY_MS} from './zone-data';",
        "export {reconcilePopulation, ate, scheduleArrivals, provokeGrudges, creatureTell, wakeListeners, creatureMoves} from './ai';",
        "export * as herds from './herds';",
        "export * as conditions from './conditions';",
        "export * as clues from './clues';",
        "export {biggestFields} from './simstore';",
        "export {wxCovers, tickEscape, tickCrabs, crabMarching, crabsOn} from './events';",
        "export * as study from './study';",
        "export {cmdStudy, cmdJournal, refreshStudied, journalKey} from './lore';",
        "export * as rising from './rising';",
        "export {loadLeaderboard} from './world';",
        "export {handleBench} from './gate';",
        "export {sendCtx} from './chips';",
        "export {PATROLS, WARRENS_ROOMS, GATEHOUSE_NOARG, MOUTHS} from './zone-data';",
        "export {WHETSTONE_ROOMS, WHET_CAP, findsVitals, BIG_VITALS, VITALS_CREATURE} from './zone-data';",
        "export {VERMIN, GRAZERS, DEN_BUILDS, DEN_BUILD_WORK, OUTDOOR_ROOMS, DAY_CYCLE_MS} from './zone-data';",
        "export {isNight, isFullMoon, terrainOf} from './zone-util';",
      ].join('\n'),
      resolveDir: root, loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'silent',
    plugins: [{ name: 'worker-text', setup(b) {
      b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ },
        async a => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' }));
    } }],
  });
  const { wxCovers, tickEscape, tickCrabs, crabMarching, crabsOn, biggestFields, clues, conditions, cmdOffer, glutMult, tickGlut, offerCore, terrainOf, MOUTHS, herds, scheduleArrivals, GATEHOUSE_NOARG, ZoneDO, parse, den, cmdMap, copyCounts, ate, study, cmdStudy, cmdJournal, refreshStudied, journalKey, rising, loadLeaderboard, handleBench, sendCtx, cmdGo, receiptGoods, goodsWorth, worthMark, worthPips, cmdRepair, sendTrade, cmdLook, keepingLines, light, body, ratking, coughing, campfire, cmdCook, moveLoad, walkCost, COOK_RECIPES, CAMPFIRE_MS, SNOW_LOAD_KG, WET_DRY_MS, reconcilePopulation, provokeGrudges, creatureTell, wakeListeners, creatureMoves, PATROLS, WARRENS_ROOMS, WHETSTONE_ROOMS, WHET_CAP, findsVitals, BIG_VITALS, VITALS_CREATURE, VERMIN, GRAZERS, DEN_BUILDS, DEN_BUILD_WORK, OUTDOOR_ROOMS, DAY_CYCLE_MS, isNight, isFullMoon } = await import(pathToFileURL(output));

  // ---------------------------------------------------------------- parser
  console.log('the parser');
  check('"soups nice" answers at once instead of looping (2026-10-22, froze the gatehouse)', () => {
    const t = Date.now();
    const r = parse('soups nice');
    assert.ok(Date.now() - t < 200, 'parse took ' + (Date.now() - t) + 'ms');
    assert.notDeepEqual(r, { verb: 'go', arg: 'south' });
  });
  check('every word near a direction still answers at once', () => {
    for (const w of ['soups', 'nort', 'wesst', 'easts', 'souths nice', 'up there', 'downs', 'norths and souths'])
      { const t = Date.now(); parse(w); assert.ok(Date.now() - t < 200, w); }
  });
  check('"bolt" and "tunnel" crawl out; "build bolthole north" is a build', () => {
    assert.equal(parse('bolt').verb, 'bolt');
    assert.equal(parse('tunnel').verb, 'bolt');
    assert.deepEqual(parse('build bolthole north'), { verb: 'build', arg: 'bolthole north' });
  });

  // ---------------------------------------------------------------- ecology
  console.log('the ecology');
  check('a deer never eats a deer (2026-10-22): no roe in VERMIN, both roe graze', () => {
    for (const id of ['roe-deer', 'white-roe']) {
      assert.equal(VERMIN.has(id), false, id + ' is back in VERMIN');
      assert.equal(GRAZERS.has(id), true, id + ' has no grazing route');
    }
  });

  // ---------------------------------------------------------------- keeper
  console.log('the keeper');
  check('a big order reads one line per kind with a count (2026-10-22)', () => {
    const wood = 'a bundle of split wood [common]';
    const r = receiptGoods([wood, wood, wood, wood, 'a bowl of soup [common]']);
    assert.equal(r.split('\n').length, 3, r);
    assert.match(r, /4 × a bundle of split wood/);
    assert.match(r, /\n  a bowl of soup/);
  });
  check('a single thing still reads as one sentence', () => {
    assert.equal(receiptGoods(['a bowl of soup [common]']), 'The keeper slides a bowl of soup [common] across the counter.');
  });

  // ---------------------------------------------------------------- the den
  console.log('the den');
  const T = {
    'rusted-pick': { id: 'rusted-pick', name: 'a rusted pick', slot: 'weapon', stun: 0, bleed: 0 },
    'hand-axe': { id: 'hand-axe', name: 'a hand axe', slot: 'weapon', stun: 0, bleed: 0 },
    'knife': { id: 'knife', name: 'a knife', slot: 'weapon', stun: 0, bleed: 1 },
  };
  function denWorld() {
    const z = new ZoneDO({}, {});
    const said = [];
    z.send = (_s, text) => { said.push(text); };
    for (const name of ['sendStatus', 'actorFeed', 'roomFeed', 'roomSound', 'refreshRoomCtx', 'sendCtx', 'markSimDirty'])
      z[name] = () => {};
    z.inCombat = () => false;
    z.world = {
      itemTemplates: new Map(Object.entries(T)),
      exits: new Map([['moor', [{ dir: 'north', to_room: 'north-moor' }, { dir: 'south', to_room: 'south-moor' }]]]),
      rooms: new Map([['moor', { id: 'moor', name: 'The Moor', region: 'out' }]]),
      entryRooms: new Set(),
    };
    const me = { pubkey: 'me', name: 'Rome', roomId: 'moor', items: [], hp: 100, maxHp: 100 };
    z.sessions = new Map([['me', me]]);
    const d = {
      roomId: 'moor', holder: 'me', claimedAt: 0, tendedAt: 0, barred: false, hearth: false, hides: false,
      rattle: false, rack: false, larder: false, smoke: false, butt: false, whet: false, frame: false,
      stakes: false, slit: false, cellar: false, bolthole: '', snares: false, snareAt: 0, water: 0, waterAt: 0,
      holderName: 'Rome', keys: new Map(),
    };
    z.dens = new Map([['me', d]]);
    z.inDen = new Map([['me', 'me']]);
    return { z, me, d, said, last: () => said.at(-1) ?? '' };
  }

  check('the den is dark at night with no light of your own (2026-10-22)', () => {
    // A dark, moonless night on open ground with a den standing on it: the
    // ground outside lights up because somebody lives there, the inside not.
    let night = 0;
    for (let day = 0; day < 400 && !night; day++) {
      const t = day * DAY_CYCLE_MS + DAY_CYCLE_MS * .75;
      if (isNight(t) && !isFullMoon(t)) night = t;
    }
    assert.ok(night, 'found no dark night to test on');
    const realNow = Date.now;
    Date.now = () => night;
    OUTDOOR_ROOMS.add('moor');
    try {
      const { z, me } = denWorld();
      z.roomLit = () => false; z.roomHasBearer = () => false;
      assert.equal(z.nightLitPicture(me), false, 'inside the den it lit up');
      z.inDen.delete('me');
      assert.equal(z.nightLitPicture(me), true, 'outside, the lived-in ground should still light (the test is not testing anything)');
    } finally { Date.now = realNow; OUTDOOR_ROOMS.delete('moor'); }
  });
  check('a gate at night shows no torch light unless you carry one (2026-10-28)', () => {
    let night = 0;
    for (let day = 0; day < 400 && !night; day++) {
      const t = day * DAY_CYCLE_MS + DAY_CYCLE_MS * .75;
      if (isNight(t) && !isFullMoon(t)) night = t;
    }
    const realNow = Date.now;
    Date.now = () => night;
    const had = OUTDOOR_ROOMS.has('weeper-arch');
    OUTDOOR_ROOMS.add('weeper-arch');
    try {
      const { z, me } = denWorld();
      z.inDen.delete('me'); z.dens = new Map();
      z.roomLit = () => false; z.roomHasBearer = () => false;
      me.roomId = 'weeper-arch';
      assert.equal(z.nightLitPicture(me), false, 'the weeper arch took the torch picture with no torch');
    } finally { Date.now = realNow; if (!had) OUTDOOR_ROOMS.delete('weeper-arch'); }
  });
  await checkAsync('a direction does not walk you out through a shut door (2026-10-22)', async () => {
    const { z, me, last } = denWorld();
    await cmdGo(z, me, 'north');
    assert.equal(me.roomId, 'moor');
    assert.match(last(), /door is shut/);
  });
  check('look inside the den describes the den, not the moor (2026-10-22)', () => {
    const { z, me, d } = denWorld();
    assert.match(den.interiorDescription(z, me), /Four walls of split timber/);
    d.cellar = true; d.bolthole = 'north-moor';
    assert.match(den.interiorDescription(z, me), /root cellar/);
    assert.match(den.interiorDescription(z, me), /bolt-hole/);
    z.inDen.delete('me');
    assert.equal(den.interiorDescription(z, me), '', 'standing outside it is the moor again');
  });
  check('isBuilt reads the bolt-hole as a room and the bar as a flag', () => {
    const { d } = denWorld();
    assert.equal(den.isBuilt(d, 'bolthole'), false);
    d.bolthole = 'north-moor'; assert.equal(den.isBuilt(d, 'bolthole'), true);
    assert.equal(den.isBuilt(d, 'barred'), false);
    d.barred = true; assert.equal(den.isBuilt(d, 'barred'), true);
  });
  check('the second level is hard-gated on its tool; the first level is only quicker with one', () => {
    for (const k of ['cellar', 'bolthole', 'snares']) assert.ok(DEN_BUILDS[k]?.require, k + ' lost its tool gate');
    for (const [k, b] of Object.entries(DEN_BUILDS))
      if (!['cellar', 'bolthole', 'snares'].includes(k)) assert.equal(b.require, undefined, k + ' is hard-gated but should only be quicker');
  });
  await checkAsync('a root cellar wants the larder first, then a pick', async () => {
    const { z, me, d, last } = denWorld();
    await den.cmdBuild(z, me, 'cellar');
    assert.match(last(), /wants the larder/);
    d.larder = true;
    await den.cmdBuild(z, me, 'cellar');
    assert.match(last(), /no work for bare hands.*pick/);
    me.items.push({ id: 'p1', itemId: 'hand-axe' });
    await den.cmdBuild(z, me, 'cellar');
    assert.match(last(), /pick/, 'an axe is not a pick');
    me.items.push({ id: 'p2', itemId: 'rusted-pick' });
    await den.cmdBuild(z, me, 'cellar');
    assert.doesNotMatch(last(), /bare hands/, 'a pick in the pack opens it');
  });
  await checkAsync('a bolt-hole has to be dug toward real ground', async () => {
    const { z, me, d, last } = denWorld();
    d.barred = true; me.items.push({ id: 'p2', itemId: 'rusted-pick' });
    await den.cmdBuild(z, me, 'bolthole');
    assert.match(last(), /which way\? The ground here goes north, south/);
    await den.cmdBuild(z, me, 'bolthole west');
    assert.match(last(), /no ground west/);
  });
  await checkAsync("'build' lists only what is left; what stands is one line (2026-10-23)", async () => {
    const { z, me, d, last } = denWorld();
    d.barred = true; d.hearth = true;
    await den.cmdBuild(z, me, '');
    const out = last();
    assert.match(out, /^Up already: a bar on the door, a hearth/);
    assert.doesNotMatch(out, /'bar'\)|'build hearth'|— built|— fitted/, 'something built is still on the list');
    assert.match(out, /'build smoke'/);
  });
  await checkAsync("'build' alone keeps at half-done work, as the busy line says (2026-10-23)", async () => {
    const { z, me, d, last } = denWorld();
    d.hearth = true;
    for (let i = 0; i < 6; i++) me.items.push({ rowId: 'w' + i, itemId: 'split-wood', serial: null });
    await den.cmdBuild(z, me, '');
    assert.match(last(), /could still have/, 'with nothing under way it is the list');
    const realNow = Date.now;
    try {
      let t = realNow();
      Date.now = () => t;
      await den.cmdBuild(z, me, 'smoke');
      assert.match(last(), /smoke rack.*slow going/);
      await den.cmdBuild(z, me, '');
      assert.match(last(), /still busy/);
      t += 60_000;
      await den.cmdBuild(z, me, '');
      assert.doesNotMatch(last(), /could still have/);
      assert.match(last(), /smoke rack/);
    } finally { Date.now = realNow; }
  });
  check('the work takes ' + DEN_BUILD_WORK + ' beats by hand and half that with the tool', () => {
    assert.equal(DEN_BUILD_WORK % 2, 0, 'a tool does two beats, so the work must be even');
  });

  // ---------------------------------------------------------------- seals
  console.log('the seals');
  // A recording database: every statement the game sends, nothing kept.
  const recorder = () => {
    const sent = [];
    const DB = { prepare(q) { const st = { bind: (...a) => { sent.push([q, a]); return st; },
      run: async () => ({ meta: { changes: 1 } }), all: async () => ({ results: [] }), first: async () => null };
      return st; } };
    return { DB, voided: () => sent.filter(([q]) => /UPDATE mints SET voided_at/.test(q)).map(([, a]) => a.at(-1)) };
  };
  await checkAsync('sealed gear that wears through cracks its seal (2026-10-23, ledger kept counting it)', async () => {
    const { z, me } = denWorld();
    const rec = recorder(); z.env = { DB: rec.DB };
    const piece = { rowId: 'r1', itemId: 'knife', serial: 77, equipped: true, condition: 1 };
    me.items.push(piece);
    await z.wear(me, piece, { ...T.knife, slot: 'weapon' }, 500);
    assert.equal(me.items.includes(piece), false, 'it should have broken');
    assert.deepEqual(rec.voided(), [77]);
  });
  check('death cracks every seal before a map or journal falls as its own copy (2026-10-23)', () => {
    // The scatter loop is too wide to run here, so this reads it: the void must
    // come before the instanced drop's continue, or maps and journals skip it.
    const src = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const loop = src.slice(src.indexOf('for (const c of scattered) {'), src.indexOf('this.armStrayDecay(fell);'));
    const v = loop.indexOf('voidMint('), d = loop.indexOf('this.dropInstance(');
    assert.ok(v >= 0 && d >= 0 && v < d, 'voidMint has to run before the dropInstance continue');
  });

  // ---------------------------------------------------------------- worth
  console.log('what goods fetch');
  const worthZone = () => {
    const z = new ZoneDO({}, {});
    z.world = { itemTemplates: new Map([
      ['sword', { id: 'sword', name: 'a sword', slot: 'weapon', barter: 10 }],
      ['tail', { id: 'tail', name: 'a rat tail', slot: '', barter: 0.1 }],
      ['tin', { id: 'tin', name: 'a tin', slot: '', barter: 20 }],
    ]) };
    z.wants = []; z.chalk = undefined;
    return z;
  };
  check('worn gear fetches less than sound, and failing gear nothing (2026-10-23)', () => {
    const z = worthZone();
    const at = (condition) => goodsWorth(z, { itemId: 'sword', condition, serial: null });
    assert.equal(at(100), 10);
    assert.equal(at(60), 6);
    assert.ok(at(60) < at(100));
    assert.equal(at(12), 0, 'at the failing mark he will not take it');
    assert.equal(goodsWorth(z, { itemId: 'tail', condition: 5, serial: null }), 0.1, 'non-gear is not scaled by condition');
  });
  check('the keeper pays less for what he is drowning in, and never for cigarettes (2026-10-25)', () => {
    const z = worthZone();
    z.glut = new Map();
    const tin = () => goodsWorth(z, { itemId: 'tin', condition: 100, serial: null });
    assert.equal(tin(), 20);
    z.glut.set('tin', 6);
    assert.equal(tin(), 20, 'a few on his stack cost nothing');
    z.glut.set('tin', 12);
    assert.equal(tin(), 10, 'twice the free stack, half the price');
    z.glut.set('tin', 500);
    assert.equal(tin(), 5, 'never below a quarter');
    z.glut.set('dry-cigarettes', 500);
    assert.equal(glutMult(z, 'dry-cigarettes'), 1, 'tender never gluts');
  });
  check('he moves the stack on over time, and a long sleep is caught up (2026-10-25)', () => {
    const z = worthZone();
    z.glut = new Map([['tin', 24], ['tail', 1]]); z.nextGlutAt = 0;
    tickGlut(z, 0); // starts the clock
    tickGlut(z, 30 * 60_000);
    assert.equal(z.glut.get('tin'), 22);
    assert.ok(!z.glut.has('tail'), 'the last one goes');
    tickGlut(z, 24 * 3_600_000);
    assert.ok(!z.glut.has('tin'), 'a day clears it');
  });
  await checkAsync('he says so across the counter, and every sale goes on his stack (2026-10-25)', async () => {
    const z = worthZone();
    z.glut = new Map([['tin', 100]]);
    z.world.itemTemplates.get('tin').slot = '';
    z.isGear = () => false;
    const session = { buying: { escrow: [], paid: 0, wants: [{ cost: 999 }] } };
    const line = await offerCore(z, session, { rowId: 'r1', itemId: 'tin', condition: 100, serial: null, equipped: false }, '');
    assert.match(line, /more of these than I can move/);
    const src = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.match(src, /for \(const \[itemId, n\] of soldKinds\) if \(!CIGARETTES\.has\(itemId\)\) z\.glut\.set/);
    assert.match(src, /export function tickFence\(z: ZoneDO, now: number\): void \{\n  tickGlut\(z, now\);/);
  });
  check('the rough mark is one to four pips by band', () => {
    assert.deepEqual([0.1, 1.9, 2, 4.9, 5, 14.9, 15, 20].map(worthMark), [1, 1, 2, 2, 3, 3, 4, 4]);
    assert.equal(worthPips(3), '\u25cf\u25cf\u25cf\u25cb');
  });

  // ---------------------------------------------------------------- the shelf
  console.log("the keeper's shelf");
  function shelfWorld() {
    const z = worthZone();
    z.world.itemTemplates.set('sword', { ...z.world.itemTemplates.get('sword'), description: 'A plain sword, nicked at the edge.', rarity: 'common' });
    z.world.fenceStock = [{ itemId: 'sword', cost: 7 }];
    z.world.entryRooms = new Set(['gate']);
    z.world.rooms = new Map([['gate', { id: 'gate', name: 'The Gate', region: 'gate' }]]);
    z.world.exits = new Map(); z.world.caches = []; z.world.mobTemplates = new Map();
    const rec = recorder(); z.env = { DB: rec.DB };
    const said = [], frames = [];
    z.send = (_s, text) => { said.push(text); };
    z.litFor = () => true; z.inCombat = () => false;
    const me = { pubkey: 'me', name: 'Rome', roomId: 'gate', items: [], ws: { send: (m) => frames.push(JSON.parse(m)) } };
    z.sessions = new Map([['me', me]]);
    return { z, me, said, frames };
  }
  await checkAsync('the barter window carries what the keeper sells, to look at (2026-10-23)', async () => {
    const { z, me, frames } = shelfWorld();
    await sendTrade(z, me);
    const f = frames.find((x) => x.t === 'trade');
    assert.equal(f.stock[0].description, 'A plain sword, nicked at the edge.');
  });
  await checkAsync('a price you know reads with what it usually fetches, window and text alike (2026-10-25)', async () => {
    const { z, me, said, frames } = shelfWorld();
    z.glut = new Map([['tin', 12]]);
    z.isGear = () => false;
    z.world.itemTemplates.set('tin', { ...z.world.itemTemplates.get('tin'), rarity: 'common', description: 'A tin.' });
    const knows = { prepare(q) { const st = { bind: () => st, run: async () => ({ meta: { changes: 1 } }), first: async () => null,
      all: async () => ({ results: /keeper_known/.test(q) ? [{ item_id: 'tin' }] : [] }) }; return st; } };
    z.env = { DB: knows };
    me.items.push({ rowId: 't1', itemId: 'tin', condition: 100, serial: null, equipped: false });
    z.fenceGuard = undefined;
    me.buying = { escrow: [], paid: 0, wants: [{ cost: 7 }] };
    await sendTrade(z, me);
    const row = frames.find((x) => x.t === 'trade').goods.pack.find((g) => g.id === 'tin');
    assert.equal(row.price, 10);
    assert.equal(row.usual, 20, 'the window carries what it usually fetches');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const fn = pub.match(/function goodsWorthText\(it\) \{[\s\S]*?\n\}/)[0].replace(/\\\\u/g, '\\u');
    const goodsWorthText = new Function(fn + '; return goodsWorthText;')();
    assert.equal(goodsWorthText(row), '10 (usually 20)', 'and the window draws it');
    assert.equal(goodsWorthText({ mark: 3, price: 20 }), '20');
    await cmdOffer(z, me, '');
    assert.match(said.join('\n'), /a tin \u2014 10 \(usually 20\)/);
    z.glut.clear();
    said.length = 0;
    await cmdOffer(z, me, '');
    assert.match(said.join('\n'), /a tin \u2014 20(?! \(usually)/, 'nothing extra when he is not full');
  });
  await checkAsync('typed look at the hatch reads the shelf', async () => {
    const { z, me, said } = shelfWorld();
    await cmdLook(z, me, 'sword');
    assert.match(said.at(-1) ?? '', /nicked at the edge/);
  });

  // ---------------------------------------------------------------- maps
  console.log('the crude map');
  // A line of 200 rooms, r0 - r1 - ... - r199, each joined east to the next.
  function mapWorld(journalId) {
    const z = new ZoneDO({}, {});
    const rooms = new Map(), exits = new Map();
    for (let i = 0; i < 200; i++) {
      rooms.set('r' + i, { id: 'r' + i, name: 'Room ' + i, region: 'mountain' });
      exits.set('r' + i, [...(i < 199 ? [{ dir: 'east', to_room: 'r' + (i + 1) }] : []), ...(i > 0 ? [{ dir: 'west', to_room: 'r' + (i - 1) }] : [])]);
    }
    z.world = { rooms, exits, entryRooms: new Set(), safeRooms: new Set(),
      itemTemplates: new Map([['crude-map', { id: 'crude-map', name: 'a crude map', slot: '' }]]) };
    z.mapGrid = { at: new Map(), bands: [] };
    z.dens = new Map(); z.inDen = new Map();
    z.send = () => {};
    const rec = recorder(); z.env = { DB: rec.DB };
    const frames = [];
    const me = { pubkey: 'me', name: 'Rome', roomId: 'r50', items: [{ rowId: 'row1', itemId: 'crude-map', serial: null, equipped: false, condition: 100, journalId }],
      ws: { send: (m) => frames.push(JSON.parse(m)) } };
    z.sessions = new Map([['me', me]]);
    return { z, me, frames };
  }
  const shownOf = (f) => f.regions.flatMap((r) => r.rooms);
  await checkAsync('a crude map shows real rooms and only true passages (2026-10-23, it used to lie)', async () => {
    const { z, me, frames } = mapWorld('map-test-a');
    await cmdMap(z, me, '');
    const rooms = shownOf(frames.at(-1));
    const ids = new Set(rooms.map((r) => r.id));
    for (const r of rooms) for (const e of r.exits) {
      assert.ok(ids.has(e.to), 'a passage to a room not on the paper');
      const n = Number(r.id.slice(1)), m = Number(e.to.slice(1));
      assert.equal(Math.abs(n - m), 1, `${r.id} -> ${e.to} is not a real passage`);
      assert.equal(e.dir, m > n ? 'east' : 'west', 'a passage drawn the wrong way');
    }
    assert.ok(ids.has('r50'), 'where you stand is always drawn');
    assert.ok(ids.size >= 200 * 0.08 && ids.size <= 200 * 0.6, 'filled about 15-45%, got ' + ids.size);
  });
  await checkAsync('the same copy shows the same rooms every time; another copy shows others', async () => {
    const a1 = mapWorld('map-test-a'); await cmdMap(a1.z, a1.me, '');
    const a2 = mapWorld('map-test-a'); await cmdMap(a2.z, a2.me, '');
    const b = mapWorld('map-test-b'); await cmdMap(b.z, b.me, '');
    const key = (w) => shownOf(w.frames.at(-1)).map((r) => r.id).sort().join(',');
    assert.equal(key(a1), key(a2));
    assert.notEqual(key(a1), key(b));
  });
  await checkAsync('what you walk with a crude map is inked onto it', async () => {
    const { z, me, frames } = mapWorld('map-test-a');
    await cmdMap(z, me, '');
    const before = new Set(shownOf(frames.at(-1)).map((r) => r.id));
    const blank = [...Array(200).keys()].map((i) => 'r' + i).find((id) => !before.has(id));
    me.roomId = blank; await cmdMap(z, me, '');
    me.roomId = 'r50'; await cmdMap(z, me, '');
    assert.ok(shownOf(frames.at(-1)).some((r) => r.id === blank), 'a walked room stays on the paper');
  });

  await checkAsync('each map says how many rooms it holds, and map <rooms> opens that one (2026-10-26)', async () => {
    const { z, me, frames } = mapWorld('map-test-a');
    me.items.push({ rowId: 'row2', itemId: 'crude-map', serial: null, equipped: false, condition: 100, journalId: 'map-test-b' });
    const said = []; z.send = (_s, t) => said.push(t);
    await cmdMap(z, me, ''); // as on every step: the ground underfoot is inked onto both
    const counts = await copyCounts(z, me, me.items);
    const n = (row) => Number(/\((\d+) rooms?\)/.exec(counts.get(row))[1]);
    const [a, b] = [n('row1'), n('row2')];
    assert.notEqual(a, b, 'two copies, two counts');
    await cmdMap(z, me, String(b));
    assert.equal(shownOf(frames.at(-1)).length, b, 'the count is the rooms the map draws');
    assert.match(said.at(-1), new RegExp(`You also carry a crude map \\(${a} rooms\\)\\. \\('map ${a}' opens it\\)`), 'and the other is named, with how to open it');
    await cmdMap(z, me, a + ' rooms');
    assert.equal(shownOf(frames.at(-1)).length, a);
    if (a > b) me.items.reverse(); // the thinner one first, so first-carried is not the answer by luck
    await cmdMap(z, me, '');
    assert.equal(shownOf(frames.at(-1)).length, Math.max(a, b), 'bare, the fullest');
    const before = frames.length;
    await cmdMap(z, me, '999');
    assert.equal(frames.length, before, 'no such map: nothing opens');
    assert.match(said.at(-1), /None of your maps has 999 rooms on it\. You carry a crude map \(\d+ rooms\), a crude map \(\d+ rooms\)\./);
    const vsrc = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(vsrc, /\$\{z\.gearName\(c\.itemId, z\.displayName\(c\)\)\}\$\{counts\?\.get\(c\.rowId\) \?\? ""\}/, 'the pack list carries it');
    assert.match(vsrc, /const counts = await lore\.copyCounts\(z, session, session\.items\);/);
    const gsrc = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.match(gsrc, /name: z\.displayName\(c\) \+ \(counts\.get\(c\.rowId\) \?\? ""\)/, 'and the pack window, the same');
  });

  // ---------------------------------------------------------------- vitals
  console.log('vital shots on you');
  check('every creature can find your vitals but the small things and the rats (2026-10-23)', () => {
    for (const [id, level] of [['hill-wolf', 3], ['footpad', 2], ['wild-boar', 3], ['the-drake', 7], ['cave-lion', 5]])
      assert.equal(findsVitals({ id, level }), true, id + ' should be able to find the gap');
    for (const [id, level] of [['rat', 1], ['brood-rat', 2], ['albino-rat', 3], ['mountain-hare', 1], ['roe-deer', 1]])
      assert.equal(findsVitals({ id, level }), false, id + ' should never');
  });
  check('the creature round asks findsVitals, not a short list', () => {
    const src = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(src, /victim\.hp > 0 && findsVitals\(tmpl\)\s*&& this\.vitalsLottery\(this\.equippedArmor\(victim\), VITALS_CREATURE\)/);
  });
  check("a creature's odds on you are four times the old list's, not the shared 1 in 3000 (2026-10-23)", () => {
    assert.equal(VITALS_CREATURE, 1 / 4650);
  });

  await checkAsync('a boss falls to a vital only by its own weapon, and the Drowned God never (2026-10-23)', async () => {
    const z = new ZoneDO({}, {});
    const spear = { tmpl: { id: 'spear', stun: 0, bleed: 0, traitMap: new Map([['piercing', 1]]) } };
    const blade = { tmpl: { id: 'blade', stun: 0, bleed: 0, traitMap: new Map() } };
    const maul = { tmpl: { id: 'maul', stun: 0.1, bleed: 0, traitMap: new Map() } };
    const rolls = (id, w, n) => { let k = 0; const c = { id: 'c', templateId: id, hp: 10, traits: [] };
      for (let i = 0; i < n; i++) if (z.playerVitals(c, { id, is_boss: 1, armor: 0 }, w)) k++; return k; };
    assert.equal(BIG_VITALS['drowned-god'], undefined);
    assert.equal(rolls('drowned-god', spear, 20000) + rolls('drowned-god', blade, 20000) + rolls('drowned-god', maul, 20000), 0);
    assert.equal(rolls('the-great-crab', blade, 50000) + rolls('the-great-crab', maul, 50000), 0, 'the wrong weapon found the crab');
    assert.ok(rolls('the-great-crab', spear, 100000) > 0, 'a point never found the crab');
    assert.ok(rolls('forgotten-king', maul, 100000) > 0, 'a maul never found the king');
    assert.ok(rolls('the-woodward', blade, 200000) > 0, 'an edge never found the woodward');
    for (const id of ['brown-bear', 'the-baited-bear', 'cave-lion']) assert.equal(BIG_VITALS[id]?.by, 'point', id);
  });

  // ---------------------------------------------------------------- the body
  console.log('a body a vital shot stiffened');
  // A real SQLite table behind a D1-shaped shim, so the rows really move.
  const { DatabaseSync } = await import('node:sqlite');
  function sqliteD1() {
    const db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE player_items(id TEXT PRIMARY KEY, item_id TEXT, pubkey TEXT, signed_serial INTEGER, equipped INTEGER DEFAULT 0,
      condition REAL DEFAULT 100, journal_id TEXT DEFAULT '', invite_code TEXT DEFAULT '', lore_id TEXT DEFAULT '', acquired_at INTEGER DEFAULT 1,
      rolled_traits TEXT DEFAULT '', container TEXT DEFAULT '', container_at INTEGER, fuel REAL);
      CREATE TABLE players(pubkey TEXT PRIMARY KEY, name TEXT, deaths INTEGER DEFAULT 0);`);
    // Like D1: at most 100 bound values, and real errors surface. Only a table
    // this test never made (mints, deeds...) is let through as a no-op.
    const go = (fn, empty) => { try { return fn(); } catch (e) { if (/no such table/.test(e.message)) return empty; throw e; } };
    const D1 = { prepare(q) { let args = []; const st = { bind: (...a) => { if (a.length > 100) throw new Error('D1: too many SQL variables (' + a.length + ')'); args = a; return st; },
      run: async () => go(() => ({ meta: { changes: db.prepare(q).run(...args).changes } }), { meta: { changes: 0 } }),
      all: async () => go(() => ({ results: db.prepare(q).all(...args) }), { results: [] }),
      first: async () => go(() => db.prepare(q).get(...args) ?? null, null) }; return st; } };
    return { db, D1 };
  }
  function bodyWorld() {
    const z = new ZoneDO({}, {});
    body.resetForTest(z);
    const keep = new Set(['constructor', 'onPlayerDeath', 'onPlayerDeathInner', 'spillCarried', 'equippedItem']);
    for (let p = Object.getPrototypeOf(z); p && p !== Object.prototype; p = Object.getPrototypeOf(p))
      for (const k of Object.getOwnPropertyNames(p)) if (!keep.has(k) && typeof p[k] === 'function') z[k] = () => undefined;
    z.foodCapped = z.torchCapped = z.dressingCapped = () => false; z.packRoom = () => true;
    const said = []; z.send = (_s, t) => said.push(t);
    const { db, D1 } = sqliteD1(); z.env = { DB: D1 };
    z.world = new Proxy({ itemTemplates: new Map([['knife', { id: 'knife', name: 'a knife', slot: 'weapon' }], ['tin', { id: 'tin', name: 'a tin', slot: '' }]]),
      rooms: new Map([['moor', { id: 'moor', name: 'The Moor' }]]) }, { get: (t, k) => k in t ? t[k] : (typeof k === 'string' ? (t[k] = new Map()) : undefined) });
    for (const k of ['creatures', 'sessions', 'ground', 'groundCond', 'groundRolled', 'groundLore', 'groundHeart', 'groundTorch', 'groundInstances', 'altarHearts', 'dens', 'inDen']) z[k] = new Map();
    z.tradeLocked = new Set(); z.rot = [];
    const me = { pubkey: 'me', name: 'Rome', roomId: 'moor', items: [], deaths: 0 };
    z.sessions.set('me', me);
    db.prepare("INSERT INTO players(pubkey, name) VALUES ('me', 'Rome')").run();
    for (const [id, itemId, serial, worn] of [['r1', 'knife', 9, 1], ['r2', 'tin', null, 0]]) {
      db.prepare("INSERT INTO player_items(id, item_id, pubkey, signed_serial, equipped) VALUES (?, ?, 'me', ?, ?)").run(id, itemId, serial, worn);
      me.items.push({ rowId: id, itemId, serial, equipped: !!worn, condition: 100 });
    }
    const wolf = { id: 'hill-wolf', name: 'a hill wolf', level: 3 };
    const where = () => db.prepare("SELECT container FROM player_items ORDER BY id").all().map((r) => r.container);
    return { z, me, db, wolf, said, where };
  }
  await checkAsync("a creature's vital shot leaves the kit on a stiff body, the owner's alone (2026-10-23)", async () => {
    const { z, me, wolf, said, where } = bodyWorld();
    await z.onPlayerDeath(me, wolf, undefined, true);
    assert.deepEqual(where(), ['body:moor', 'body:moor'], 'the rows go onto the body');
    assert.equal((z.ground.get('moor') ?? []).length, 0, 'nothing on the floor for anyone');
    assert.equal(me.items.length, 0);
    assert.match(said.join(' '), /Your body stiffens where it fell in The Moor/);
    assert.match(body.roomLines(z, 'moor', 'someone-else')[0], /Rome's body lies here/);
    assert.match(body.roomLines(z, 'moor', 'me')[0], /Your own body lies here.*'fetch'/);
    me.roomId = 'moor'; // the run back from the gate
    assert.equal(await body.reclaim(z, { ...me, pubkey: 'someone-else', items: [] }), false, 'a stranger cannot fetch it');
    assert.equal(await body.reclaim(z, me), true);
    assert.deepEqual(where(), ['', ''], 'fetch puts it all back in hand');
    assert.equal(me.items.length, 2);
    assert.equal(me.items.find((c) => c.rowId === 'r1').serial, 9, 'the seal held');
    assert.equal(body.roomLines(z, 'moor', 'me').length, 0, 'an empty body is gone');
  });
  await checkAsync('what you wore goes back on, even over a full pack (2026-10-23)', async () => {
    const { z, me, wolf, db, where } = bodyWorld();
    await z.onPlayerDeath(me, wolf, undefined, true);
    me.roomId = 'moor';
    z.packRoom = () => false; // a full pack on the way back
    assert.equal(await body.reclaim(z, me), true);
    const knife = me.items.find((c) => c.rowId === 'r1');
    assert.ok(knife && knife.equipped, 'the worn knife is back in hand');
    assert.equal(db.prepare("SELECT equipped FROM player_items WHERE id = 'r1'").get().equipped, 1, 'and stays worn after a reconnect');
    assert.deepEqual(where(), ['', 'body:moor'], 'the tin waits on the body for room');
    assert.match(body.roomLines(z, 'moor', 'me')[0], /Your own body/);
  });
  await checkAsync('a pack of 250 loose pieces goes onto the body and spills off it whole', async () => {
    const { z, me, wolf, db } = bodyWorld();
    for (let i = 0; i < 250; i++) {
      db.prepare("INSERT INTO player_items(id, item_id, pubkey) VALUES (?, 'tin', 'me')").run('w' + i);
      me.items.push({ rowId: 'w' + i, itemId: 'tin', serial: null, equipped: false, condition: 100 });
    }
    await z.onPlayerDeath(me, wolf, undefined, true);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM player_items WHERE container = 'body:moor'").get().n, 252);
    const realNow = Date.now;
    try { Date.now = () => realNow() + 61 * 60_000; await body.sweep(z, Date.now()); } finally { Date.now = realNow; }
    assert.equal(db.prepare("SELECT COUNT(*) n FROM player_items").get().n, 0);
    assert.equal((z.ground.get('moor') ?? []).length, 252);
  });
  await checkAsync('the body lets go when the hold runs out, and everything spills', async () => {
    const { z, me, wolf, where } = bodyWorld();
    await z.onPlayerDeath(me, wolf, undefined, true);
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 61 * 60_000;
      await body.sweep(z, Date.now());
    } finally { Date.now = realNow; }
    assert.deepEqual(where(), [], 'the rows are gone');
    assert.deepEqual([...(z.ground.get('moor') ?? [])].sort(), ['knife', 'tin'], 'and it lies on the floor');
  });
  await checkAsync('after a deploy the zone finds the bodies again from the database', async () => {
    const { z, me, wolf } = bodyWorld();
    await z.onPlayerDeath(me, wolf, undefined, true);
    const z2 = Object.assign(Object.create(Object.getPrototypeOf(z)), z); // a fresh zone over the same rows
    assert.equal(body.hasBody(z2, 'moor', 'me'), false, 'the new zone starts knowing nothing');
    me.roomId = 'moor';
    assert.equal(await body.reclaim(z2, me), true, 'fetch reads the database first');
    const z3 = Object.assign(Object.create(Object.getPrototypeOf(z)), z);
    await z.onPlayerDeath(me, wolf, undefined, true);
    await body.sweep(z3, Date.now());
    assert.match(body.roomLines(z3, 'moor', 'other')[0] ?? '', /Rome's body lies here/, 'the first sweep rebuilds the room lines');
  });
  await checkAsync('an ordinary death still scatters on the floor', async () => {
    const { z, me, wolf, where } = bodyWorld();
    await z.onPlayerDeath(me, wolf);
    assert.deepEqual(where(), []);
    assert.deepEqual([...(z.ground.get('moor') ?? [])].sort(), ['knife', 'tin']);
  });

  // ---------------------------------------------------------------- the rat king
  console.log('the rat king');
  function kingWorld() {
    const z = new ZoneDO({}, {});
    ratking.resetForTest(z);
    z.world = { mobTemplates: new Map([['rat-king', { id: 'rat-king', name: 'the rat king', max_hp: 60, is_boss: 1 }], ['rat', { id: 'rat', max_hp: 11 }]]),
      mobSpawns: [{ template_id: 'rat', room_id: 'the-rat-warren' }], itemTemplates: new Map() };
    z.creatures = new Map(); z.variantBase = new Map();
    for (const k of ['noteCreaturesChanged', 'refreshRoomCtx', 'roomSound', 'roomFeedBands', 'roomFeed']) z[k] = () => {};
    z.roomDist = () => 0;
    const rat = { id: 'r1', templateId: 'rat', roomId: 'the-gnaw-hollow', hp: 11 };
    z.creatures.set('r1', rat);
    return { z, rat };
  }
  check('its rats are bold only in the warrens and only while it lives (2026-10-24)', () => {
    const { z, rat } = kingWorld();
    assert.equal(ratking.bold(z, rat), false, 'no king, an ordinary rat');
    ratking.crown(z, Date.now());
    assert.equal(ratking.bold(z, rat), true);
    assert.equal(ratking.fleeMult(z, rat), 0, 'it does not run');
    rat.roomId = 'the-moor';
    assert.equal(ratking.bold(z, rat), false, 'out of the warrens it is a rat again');
  });
  check('there is only ever one, and a deploy does not cull it', () => {
    const { z } = kingWorld();
    assert.ok(ratking.crown(z, Date.now()));
    assert.equal(ratking.crown(z, Date.now()), null, 'a second never comes while one lives');
    reconcilePopulation(z, z.world);
    assert.equal([...z.creatures.values()].filter((c) => c.templateId === 'rat-king').length, 1, 'the cull kept it');
    z.creatures.set('k2', { id: 'k2', templateId: 'rat-king', roomId: 'the-rat-warren', hp: 60 });
    reconcilePopulation(z, z.world);
    assert.equal([...z.creatures.values()].filter((c) => c.templateId === 'rat-king').length, 1, 'and trims a double back to one');
  });
  check('the crown keeps every rat off its wearer; its rats rattled after it falls', () => {
    const { z, rat } = kingWorld();
    const crowned = { pubkey: 'me' }, bare = { pubkey: 'you' };
    z.wearsTrait = (s, t) => s === crowned && t === 'rat-crowned';
    assert.equal(ratking.spares(z, rat, crowned), true);
    assert.equal(ratking.spares(z, rat, bare), false);
    assert.equal(ratking.spares(z, { templateId: 'grave-hyena' }, crowned), false, 'only rats');
    ratking.fell(z);
    assert.equal(ratking.fleeMult(z, rat), 2, 'leaderless rats bolt sooner');
  });
  check('its rounds stay in the warrens and close on themselves', () => {
    const route = PATROLS['rat-king'];
    assert.ok(route.every((r) => WARRENS_ROOMS.has(r)));
    assert.ok(!route.includes('the-hyena-den'));
    for (let i = 0; i < route.length; i++) assert.notEqual(route[i], route[(i + 1) % route.length], 'a step that goes nowhere');
  });
  check('while it lives the fortress coughs, and a cough is a noise (2026-10-24)', () => {
    const { z } = kingWorld();
    ratking.crown(z, Date.now() - 4 * 3_600_000); // long enough ago that the sickness is at full
    const noise = [], heard = [], said = new Map();
    z.creatureNoise = (r) => noise.push(r);
    const voiced = [];
    z.roomSound = (r, t, _x, _c, _l, snd) => { heard.push(t); voiced.push(snd?.act); };
    z.send = (s, t, _c, _sp, snds) => { said.set(s.pubkey, [...(said.get(s.pubkey) ?? []), t]); if (snds) voiced.push(...snds.map((x) => x.act)); };
    z.inGatehouse = new Set(['hatch']);
    z.outOfWorld = () => false;
    z.regionOf = (r) => ({ 'the-cells': 'upper', 'the-moor': 'out', 'gate-room': 'gate' })[r];
    const inside = { pubkey: 'in', name: 'Rome', roomId: 'the-cells' };
    const outside = { pubkey: 'out', name: 'Astra', roomId: 'the-moor' };
    const atGate = { pubkey: 'gate', name: 'Wren', roomId: 'gate-room' };
    z.sessions = new Map([['in', inside], ['out', outside], ['gate', atGate]]);
    ratking.cough(z, inside);
    assert.deepEqual(noise, ['the-cells'], 'a cough draws the curious like any noise');
    assert.match(heard[0], /coughing \{dir\}/, 'and the next rooms hear it');
    assert.ok(voiced.length >= 2 && voiced.every((a) => a === 'cough'), 'the cougher and the wall both carry the cough sound: ' + voiced);
    noise.length = 0; said.clear();
    for (let i = 0; i < 300; i++) { ratking.resetForTest(z); ratking.roll(z, Date.now()); }
    assert.ok(noise.length > 20, 'in the fortress, about one cough in four minutes: ' + noise.length);
    assert.ok(noise.every((r) => r === 'the-cells'), 'nobody on the moor or at the gate coughs');
    assert.equal((said.get('out') ?? []).length, 0, 'the surface hears nothing of it');
  });
  check('the cough builds after the king comes and fades after he falls (2026-10-27)', () => {
    const { z } = kingWorld();
    const H = 3_600_000, t0 = Date.now();
    assert.equal(ratking.sickness(z, t0), 0, 'no king, no sickness');
    const king = ratking.crown(z, t0);
    assert.equal(ratking.sickness(z, t0), 0, 'nothing in the air the moment he comes');
    const mid = ratking.sickness(z, t0 + 1.5 * H);
    assert.ok(mid > 0.3 && mid < 0.7, 'halfway up after an hour and a half: ' + mid);
    assert.equal(ratking.sickness(z, t0 + 5 * H), 1, 'full once it has built');
    king.hp = 0; ratking.fell(z, t0 + 5 * H);
    const going = ratking.sickness(z, t0 + 6 * H);
    assert.ok(going > 0.3 && going < 0.7, 'still in the air an hour after he falls: ' + going);
    assert.equal(ratking.sickness(z, t0 + 8 * H), 0, 'and gone after that');
    const noise = [];
    z.creatureNoise = (r) => noise.push(r); z.roomSound = () => {}; z.send = () => {};
    z.inGatehouse = new Set(); z.outOfWorld = () => false; z.regionOf = () => 'upper';
    z.sessions = new Map([['in', { pubkey: 'in', name: 'Rome', roomId: 'the-cells' }]]);
    // a new king can be crowned on any roll (about 1 in 5 over 300), and his air starts clean: take him off again
    const fresh = () => { for (const [id, c] of z.creatures) if (c.templateId === 'rat-king' && c !== king) z.creatures.delete(id); };
    for (let i = 0; i < 300; i++) { ratking.resetForTest(z); ratking.fell(z, t0 + 5 * H); ratking.roll(z, t0 + 5.2 * H); fresh(); }
    assert.ok(noise.length > 10, 'the dead king\'s air still sets people coughing: ' + noise.length);
  });
  check('a light in the pack says how to light it and put it out, in the window and the typed list alike (2026-10-29)', () => {
    const T = { 'hooded-lantern': { id: 'hooded-lantern', name: 'a hooded lantern', rarity: 'common', slot: '' },
                'torch': { id: 'torch', name: 'a pitch-soaked torch', rarity: 'common', slot: '' } };
    const z = { world: { itemTemplates: new Map(Object.entries(T)) },
      gearName: (id, n) => n, displayName: (c) => T[c.itemId].name, itemStat: () => '', conditionWord: () => '', carriesLight: () => false,
      stackable: (id) => id === 'torch', isGear: () => false, isKey: () => false, isTrophy: () => false };
    const lantern = { rowId: 'L1', itemId: 'hooded-lantern', serial: null, condition: 100 };
    const torches = [{ rowId: 'T1', itemId: 'torch', serial: null }, { rowId: 'T2', itemId: 'torch', serial: null }];
    const s = { items: [lantern, ...torches] };
    const text = () => keepingLines(z, s.items, 'You carry:', s, 'pack').join('\n');
    assert.deepEqual(light.lightOffer(z, s, lantern), { lit: false, verb: 'light', arg: 'lantern', well: 'fat 0/3' }, 'a dry well says 0');
    lantern.fuel = 10 * 60_000;
    assert.equal(light.lightOffer(z, s, lantern).well, 'fat ½/3', 'a scrape still reads as something');
    lantern.fuel = 60 * 60_000;
    assert.match(text(), /a hooded lantern \[common\] — fat 2\/3 \('light lantern'\)/, 'an unlit lantern counts its fat and says how to light it');
    lantern.serial = 734;
    assert.match(text(), /a hooded lantern \[common\] — sealed #734, fat 2\/3 \('light lantern'\)/, 'one dash, the fat after the seal');
    lantern.serial = null;
    assert.match(text(), /a pitch-soaked torch \(x2\).*\('light torch'\)/, 'and the torches too');
    Object.assign(s, { litUntil: Date.now() + 60_000, litSource: 'lantern', litRow: 'L1' });
    assert.equal(light.lightOffer(z, s, lantern).verb, 'douse', 'the window offers douse on the lit one');
    assert.equal(light.lightOffer(z, s, lantern).well, 'fat ½/3', 'a burning lantern counts what the flame has left, not the fat it started with');
    assert.match(text(), /a hooded lantern.* — fat ½\/3, lit \('douse' to put it out\)/, 'and the typed list says the same words');
    Object.assign(s, { litSource: 'torch', litRow: undefined });
    assert.ok(light.torchInHand(s));
    assert.match(text(), /a torch, burning in your hand \('douse' to put it out\)/, 'a torch burning in your hand has its own line');
    assert.doesNotMatch(text(), /\('light torch'\)/, 'and the pack stops offering to light another');
    s.items = [];
    assert.match(text(), /a torch, burning in your hand/, 'even with nothing else in the pack');
  });
  await checkAsync('the crab migration comes up, takes the crossing and the road, and goes back (2026-10-28)', async () => {
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const aiSrc = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    const num = (n) => Number(new RegExp(`export const ${n} = ([0-9_ *]+);`).exec(zd)[1].replace(/_/g, '').split('*').reduce((a, b) => a * Number(b), 1));
    const pool = ev.match(/const POOL: \[string, number, string\]\[\] = \[([\s\S]*?)\n\];/)[1].replace(/\/\/.*$/gm, '');
    assert.match(pool, /\["crabs", 2, "crossing\+road"\]/, 'drawn on the roll, holding both grounds');
    assert.equal((aiSrc.match(/events\.crabMarching\(z, creature\)/g) ?? []).length >= 3, true, 'it goes for you on your entry and on its arrival');
    assert.match(aiSrc, /if \(c\.marching\) continue;\n      const line = caps\.has/, 'the march does not count against the shore\'s own crabs');
    const WAVE = num('CRAB_WAVE'), HORDE = num('CRAB_HORDE'), REACH = num('CRAB_ROAD_REACH');
    // a shore, a strand, the causey foot and a road running on past the reach
    const rooms = new Map([['the-wrack-line', { region: 'crossing' }], ['the-strand', { region: 'crossing' }], ['the-causey-foot', { region: 'road' }]]);
    const exits = new Map([['the-wrack-line', [{ to_room: 'the-strand' }]], ['the-strand', [{ to_room: 'the-wrack-line' }, { to_room: 'the-causey-foot' }]]]);
    let prev = 'the-causey-foot';
    for (let i = 1; i <= REACH + 3; i++) {
      const r = 'road-' + i; rooms.set(r, { region: 'road' });
      exits.set(prev, [...(exits.get(prev) ?? []), { to_room: r }]); exits.set(r, [{ to_room: prev }]); prev = r;
    }
    const tmpl = (id) => [id, { id, max_hp: 16 }];
    const z = { events: new Map(), creatures: new Map(), sessions: new Map(),
      world: { rooms, exits, safeRooms: new Set(), entryRooms: new Set(), mobTemplates: new Map([tmpl('wrack-crab'), tmpl('devil-crab')]),
        mobSpawns: [{ template_id: 'wrack-crab', room_id: 'the-wrack-line' }, { template_id: 'grey-wolf', room_id: 'the-strand' }] },
      roomFeedBands() {}, roomFeed() {}, noteCreaturesChanged() {}, refreshRoomCtx() {} };
    let t = 1_000_000_000_000;
    z.events.set('crabs', { phase: 'idle', until: t });
    await tickCrabs(z, t);
    assert.equal(z.events.get('crabs').phase, 'telegraph', 'the clicking first');
    assert.equal(crabsOn(z, 'the-strand'), 'telegraph', 'heard on the strand');
    assert.equal(crabsOn(z, 'the-causey-foot'), 'idle', 'not yet on the road');
    t = z.events.get('crabs').until; await tickCrabs(z, t);
    assert.equal(z.events.get('crabs').phase, 'active');
    const crabs = () => [...z.creatures.values()];
    assert.equal(crabs().length, WAVE, 'the first wave comes up');
    assert.ok(crabs().every((c) => c.roomId === 'the-wrack-line' && c.marching === 'the-wrack-line'), 'out of the shore the crabs live on');
    assert.ok(crabs().every((c) => crabsOn(z, c.walkingTo) === 'active'), 'each walking somewhere on the march\'s ground');
    assert.ok(crabs().every((c) => crabMarching(z, c)), 'and going for anyone in the way');
    assert.equal(crabsOn(z, 'road-' + REACH), 'active', 'the road up from the mouth is taken');
    assert.equal(crabsOn(z, 'road-' + (REACH + 1)), 'idle', 'only so far up it');
    for (let i = 0; i < Math.ceil(HORDE / WAVE) + 1; i++) { t += num('CRAB_WAVE_MS'); await tickCrabs(z, t); }
    assert.equal(crabs().length, HORDE, 'wave after wave, to the whole horde and no more');
    const dead = crabs()[0]; z.creatures.delete(dead.id); // somebody killed one
    for (const c of crabs()) { c.roomId = 'road-3'; c.walkingTo = 'road-5'; } // out on the road when the march turns
    t = z.events.get('crabs').until; await tickCrabs(z, t);
    assert.equal(z.events.get('crabs').phase, 'aftermath', 'the march turns');
    await tickCrabs(z, t + 1);
    assert.ok(crabs().every((c) => !crabMarching(z, c)), 'and stops going for people');
    assert.ok(crabs().every((c) => c.walkingTo === c.marching), 'every crab walks back to its shore');
    t = z.events.get('crabs').until; await tickCrabs(z, t);
    assert.equal(z.creatures.size, 0, 'what is left goes into the sea');
    assert.equal(z.events.get('crabs').phase, 'idle');
    assert.equal(crabsOn(z, 'the-strand'), 'idle');
  });
  await checkAsync('the gaunt gets loose on its own clock, about once a day, not on the roll (2026-10-27)', async () => {
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    const pool = ev.match(/const POOL: \[string, number, string\]\[\] = \[([\s\S]*?)\n\];/)[1].replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(pool, /"escape"/, 'it holds no ticket in the roll');
    const H = 3_600_000, NEVER = 9_000_000_000_000_000;
    const z = { events: new Map(), creatures: new Map(), sessions: new Map(),
      world: { mobTemplates: new Map([['the-gaunt', { id: 'the-gaunt', max_hp: 90 }]]), rooms: new Map([['the-deep-hall', {}]]), safeRooms: new Set() },
      regionOf: () => 'deep', roomFeedBands() {}, roomFeed() {}, noteCreaturesChanged() {}, refreshRoomCtx() {} };
    let t = 1_000_000_000_000;
    await tickEscape(z, t);
    const first = z.events.get('escape').until - t;
    assert.ok(first >= 1 * H && first <= 6 * H, 'the first comes within hours, not never: ' + first / H);
    t = z.events.get('escape').until; await tickEscape(z, t);
    assert.equal(z.events.get('escape').phase, 'telegraph', 'it cries out');
    t += 2 * 60_000; await tickEscape(z, t);
    assert.equal([...z.creatures.values()].filter((c) => c.templateId === 'the-gaunt').length, 1, 'and gets loose');
    t += 60 * 60_000; await tickEscape(z, t);
    assert.equal(z.creatures.size, 0, 'an hour on it goes back down');
    t += 5 * 60_000; await tickEscape(z, t);
    const st = z.events.get('escape'), next = st.until - t;
    assert.equal(st.phase, 'idle');
    assert.ok(next >= 18 * H && next <= 30 * H, 'and the next is a day off: ' + next / H);
    st.until = NEVER; await tickEscape(z, t);
    assert.ok(z.events.get('escape').until < NEVER, 'a save that parked it forever gets its clock back');
    st.until = t - 3 * H; await tickEscape(z, t);
    assert.equal(z.events.get('escape').phase, 'idle', 'due while nobody was on: it does not spring on login');
    assert.ok(z.events.get('escape').until > t, 'it lands a while after instead');
  });
  check('the keeper speaks of the king now and then, not every ten minutes (2026-10-24)', () => {
    const { z } = kingWorld();
    ratking.crown(z, Date.now());
    const said = [];
    z.send = (s, t) => said.push(t);
    z.creatureNoise = () => {}; z.roomSound = () => {};
    z.inGatehouse = new Set(['hatch']);
    z.outOfWorld = () => true;
    z.regionOf = () => 'gate';
    z.sessions = new Map([['hatch', { pubkey: 'hatch', name: 'Rome', roomId: 'gate-room' }]]);
    for (let i = 0; i < 300; i++) { ratking.resetForTest(z); ratking.roll(z, Date.now()); } // five hours by the fire
    assert.ok(said.length <= 1, 'once said, not again for half an hour: ' + said.length);
  });
  check('with no king there is no cough', () => {
    const { z } = kingWorld();
    const noise = []; z.creatureNoise = (r) => noise.push(r); z.send = () => {};
    z.inGatehouse = new Set(); z.outOfWorld = () => false; z.regionOf = () => 'upper';
    z.sessions = new Map([['in', { pubkey: 'in', name: 'Rome', roomId: 'the-cells' }]]);
    for (let i = 0; i < 300; i++) { ratking.resetForTest(z); for (const c of [...z.creatures.values()]) if (c.templateId === 'rat-king') z.creatures.delete(c.id); ratking.roll(z, Date.now()); for (const c of [...z.creatures.values()]) if (c.templateId === 'rat-king') z.creatures.delete(c.id); }
    assert.equal(noise.length, 0);
  });
  check('the creature hooks ask the rat king', () => {
    const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(ai, /if \(ratking\.spares\(z, creature, session\)\) continue;\s*const hostile = AGGRESSIVE\.has\(creature\.templateId\) \|\| bloodWake \|\| ratking\.bold\(z, creature\)(?: \|\| events\.crabMarching\(z, creature\))?;/);
    assert.match(ai, /remembers\(z, creature, s\.pubkey, now\) \|\| ratking\.bold\(z, creature\)(?: \|\| events\.crabMarching\(z, creature\))?\)\s*&& !ratking\.spares\(z, creature, s\)/);
  });

  // ---------------------------------------------------------------- the cough
  console.log('the cough');
  function coughWorld() {
    const z = new ZoneDO({}, {});
    coughing.resetForTest(z);
    const noise = [], said = [];
    z.creatureNoise = (r) => noise.push(r);
    z.roomSound = () => {}; z.send = (s, t) => said.push(t);
    z.inGatehouse = new Set(); z.outOfWorld = () => false; z.wearsTrait = () => false;
    z.roomHasFirekeeper = () => false; z.dens = new Map(); z.curingCount = () => ({});
    const me = { pubkey: 'me', name: 'Rome', roomId: 'r', hp: 100, resting: false };
    z.sessions = new Map([['me', me]]);
    const minutes = (n) => { for (let i = 0; i < n; i++) { coughing.resetForTest(z); coughing.tick(z, Date.now()); } };
    return { z, me, noise, said, minutes };
  }
  check('the drowned leave you coughing up water for a while, and it is noise (2026-10-24)', () => {
    const { me, noise, minutes } = coughWorld();
    coughing.weather.coldBites = () => false; coughing.weather.raining = () => false;
    minutes(30); assert.equal(noise.length, 0, 'nothing to cough about');
    coughing.swallowedWater(me);
    minutes(20); assert.ok(noise.length > 5, 'coughing after the dunk: ' + noise.length);
  });
  check('cold and wet ten minutes with nothing warm sets in a chill; warmth lifts it', () => {
    const { z, me, said, minutes } = coughWorld();
    coughing.weather.coldBites = () => true; coughing.weather.raining = () => true;
    minutes(9); assert.ok(!me.chilled, 'not yet');
    minutes(1); assert.ok(me.chilled, 'ten minutes in');
    z.inGatehouse.add('me'); minutes(1);
    assert.ok(!me.chilled); assert.match(said.at(-1), /cough lets go/);
    coughing.weather.coldBites = () => true; coughing.weather.raining = () => false;
    z.inGatehouse.clear(); me.chillMs = 0; minutes(30); assert.ok(!me.chilled, 'cold but dry is no chill');
  });
  check('being wet outlasts the rain, feeds the chill, and a fire takes it off you (2026-10-29)', () => {
    const { z, me, said } = coughWorld();
    let t = Date.now();
    const minutes = (n) => { for (let i = 0; i < n; i++) { t += 60_000; coughing.resetForTest(z); coughing.tick(z, t); } };
    const wet = () => coughing.isWet(me, t);
    coughing.weather.coldBites = () => true; coughing.weather.windy = () => false; coughing.weather.inWater = () => false;
    coughing.weather.raining = () => true; minutes(1);
    assert.ok(wet(), 'the rain soaks you'); assert.match(said.at(-1), /soaked you through/);
    coughing.weather.raining = () => false; minutes(5);
    assert.ok(wet(), 'and you are still wet after it has stopped');
    minutes(4);
    assert.ok(me.chilled, 'wet in the cold after the rain has gone is still a chill');
    z.campfires.set('r', t + 3 * 60_000); minutes(1);
    assert.ok(!me.chilled && !wet(), 'a campfire dries you and lifts the chill');
    z.campfires.clear(); coughing.weather.coldBites = () => false;
    coughing.weather.raining = () => true; minutes(1); coughing.weather.raining = () => false;
    coughing.weather.windy = () => true; minutes(6);
    assert.ok(!wet(), 'the wind dries you in half the time');
    coughing.weather.windy = () => false; coughing.weather.raining = () => true; minutes(1); coughing.weather.raining = () => false;
    minutes(6); assert.ok(wet(), 'still air takes longer');
  });
  check('the chill wears you down to a floor and no further, and rest mends at half speed (2026-10-29)', () => {
    const { z, me } = coughWorld();
    let t = Date.now();
    const minutes = (n) => { for (let i = 0; i < n; i++) { t += 60_000; coughing.resetForTest(z); coughing.tick(z, t); } };
    me.maxHp = 100; me.hp = 40; z.sendStatus = () => {};
    coughing.weather.coldBites = () => true; coughing.weather.raining = () => true; coughing.weather.windy = () => false; coughing.weather.inWater = () => false;
    minutes(10); assert.ok(me.chilled);
    minutes(10); assert.equal(me.hp, 35, 'a point every two minutes out in it');
    minutes(200); assert.equal(me.hp, 25, 'never below a quarter');
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zone, /const chillMult = session\.chilled && !byFire && !indoors \? CHILL_MEND_MULT : 1;/, 'the chill slows the rest, by a fire it does not');
    assert.match(zone, /healingDue \* feverMult \* chillMult/, 'and the heal reads it');
  });
  function fireWorld(room) {
    const said = [];
    const z = { campfires: new Map(), events: new Map(), env: { DB: { prepare: () => ({ bind: () => ({ run: async () => ({}), first: async () => null }) }) } },
      outOfWorld: () => false, inCombat: () => false, regionOf: () => 'road', carriesLight: (s) => (s.litUntil ?? 0) > Date.now(),
      isDark: () => false, describeRoom: () => 'the room',
      send: (s, m) => said.push(m), roomFeed: () => {}, refreshRoomCtx: () => {}, markSimDirty: () => {}, ensureAlarm: async () => {},
      sessions: new Map(), inDen: new Map(), dens: new Map(), sendStatus: () => {}, sendCtx: () => {}, findCarried: () => null,
      grantItem: async () => true, world: { itemTemplates: new Map() } };
    campfire.sky.raining = () => false; campfire.sky.windy = () => false;
    return { z, said };
  }
  await checkAsync('a campfire takes split wood and a spark, keeps the torch, and the rain puts it out (2026-10-29)', async () => {
    const room = [...OUTDOOR_ROOMS].find((r) => r === 'the-last-paving') ?? [...OUTDOOR_ROOMS][0];
    const { z, said } = fireWorld(room);
    const me = { pubkey: 'me', name: 'Rome', roomId: room, items: [{ rowId: 'w1', itemId: 'split-wood', serial: null }] };
    await campfire.cmdCampfire(z, me);
    assert.ok(!campfire.burning(z, room), 'no spark, no fire'); assert.match(said.at(-1), /nothing to light it with/);
    me.items.push({ rowId: 'k1', itemId: 'loose-rock', serial: null }, { rowId: 's1', itemId: 'scrap-iron', serial: null });
    for (let i = 0; i < 60 && !campfire.burning(z, room); i++) await campfire.cmdCampfire(z, me);
    assert.ok(campfire.burning(z, room), 'a rock struck on scrap iron lights it in the end');
    assert.deepEqual(me.items.map((c) => c.itemId), ['loose-rock', 'scrap-iron'], 'the wood is spent, the rock and the iron are not');
    z.campfires.clear();
    me.items = [{ rowId: 'w2', itemId: 'split-wood', serial: null }, { rowId: 't1', itemId: 'torch', serial: null }, { rowId: 'w3', itemId: 'split-wood', serial: null }];
    await campfire.cmdCampfire(z, me);
    assert.ok(campfire.burning(z, room), 'a torch lights it first time');
    assert.ok(me.items.some((c) => c.itemId === 'torch'), 'and the torch is still in the pack');
    const before = z.campfires.get(room);
    await campfire.cmdCampfire(z, me);
    assert.equal(z.campfires.get(room) - before, CAMPFIRE_MS, 'another bundle feeds it');
    campfire.sky.raining = () => true;
    campfire.tickCampfires(z, Date.now());
    assert.ok(!campfire.burning(z, room), 'the rain puts it out');
    me.items.push({ rowId: 'w4', itemId: 'split-wood', serial: null });
    await campfire.cmdCampfire(z, me);
    assert.ok(!campfire.burning(z, room), 'and will not let one be lit');
    // ANYWHERE ON THE MAP (rome, 2026-10-29): a room under a roof takes one too.
    const inside = 'the-cells';
    assert.ok(!OUTDOOR_ROOMS.has(inside), 'the cells are under a roof');
    campfire.sky.raining = () => false;
    me.roomId = inside; await campfire.cmdCampfire(z, me);
    assert.ok(campfire.burning(z, inside), 'a fire can be made indoors, in the fortress');
    // A DARK ROOM LIGHTS UP (rome, 2026-10-29: the picture stayed dark): the
    // status flag reads the fire, and the room is shown again to the lightless.
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zone, /torch: [^\n]*campfire\.warmsYou\(this, session\)/, 'the picture\'s lit flag counts the campfire');
    z.campfires.clear(); z.isDark = () => true; z.sessions = new Map([['me', me]]); said.length = 0;
    me.items.push({ rowId: 'w9', itemId: 'split-wood', serial: null });
    await campfire.cmdCampfire(z, me);
    assert.ok(said.includes('the room'), 'lighting it in the dark shows you the room');
    z.isDark = () => false; z.sessions = new Map();
    // THE WIND (rome, 2026-10-29): it blows out a fire it reaches; walls keep it off.
    campfire.sky.windy = (zz, r) => r !== inside;
    me.roomId = room; z.campfires.set(room, Date.now() + 60_000);
    campfire.tickCampfires(z, Date.now());
    assert.ok(!campfire.burning(z, room), 'the wind blows out a fire on open ground');
    assert.ok(campfire.burning(z, inside), 'and leaves the one under a roof');
    me.items.push({ rowId: 'w5', itemId: 'split-wood', serial: null });
    await campfire.cmdCampfire(z, me);
    assert.ok(!campfire.burning(z, room), 'and will not let one be lit there');
    z.campfires.set('the-wayside-shelter', Date.now() + 60_000);
    campfire.tickCampfires(z, Date.now());
    assert.ok(campfire.burning(z, 'the-wayside-shelter'), 'a shelter\'s walls keep the wind off it');
  });
  await checkAsync('a torch no longer cooks; a campfire does (2026-10-29)', async () => {
    const room = [...OUTDOOR_ROOMS][0];
    const { z, said } = fireWorld(room);
    const raw = Object.keys(COOK_RECIPES)[0];
    z.world.itemTemplates = new Map([[raw, { id: raw, name: 'a raw catch' }], [COOK_RECIPES[raw], { id: COOK_RECIPES[raw], name: 'a cooked catch' }], ['torch', { id: 'torch', name: 'a torch' }]]);
    const me = { pubkey: 'me', name: 'Rome', roomId: room, litUntil: Date.now() + 60_000, litSource: 'torch',
      items: [{ rowId: 'c1', itemId: raw, serial: null }, { rowId: 't1', itemId: 'torch', serial: null }] };
    z.findCarried = (s, a) => s.items.find((c) => c.itemId === raw);
    await cmdCook(z, me, 'catch');
    assert.ok(me.items.some((c) => c.itemId === raw), 'a lit torch and a spare cook nothing'); assert.match(said.at(-1), /no fire here/);
    assert.ok(me.items.some((c) => c.itemId === 'torch') && me.litSource === 'torch', 'and neither torch is touched');
    z.campfires.set(room, Date.now() + 60_000);
    await cmdCook(z, me, 'catch');
    assert.ok(!me.items.some((c) => c.itemId === raw), 'over a campfire it cooks');
  });
  check('walking tires you: the heaviest kit is empty in about 125 rooms (2026-10-29, it never did; 100 was too far)', () => {
    assert.equal(Math.round(1000 / walkCost(41)), 125, 'the heaviest kit');
    assert.equal(Math.round(1000 / walkCost(34)), 142, 'plate and shield');
    assert.equal(Math.round(1000 / walkCost(0)), 407, 'bare hands');
  });
  check('a sleeping grave-hyena does not stand on its feed frame, and an eater looks up (2026-10-29)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    for (const id of ['grave-hyena', 'dire-hyena']) assert.match(pub, new RegExp(`"${id}":\\s*\\{ n: 9,[^}]*"rest":\\d`), id + ' has a sleeping frame of its own');
    assert.doesNotMatch(pub, /"grave-hyena":\s*\{[^}]*"recover"/, 'and the grave-hyena has no recover frame');
    const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.equal((ai.match(/fxPose\(creature\.roomId, creature\.templateId, "laugh"\)/g) ?? []).length, 2, 'the laugh is shown at the dinner call and at the keening');
    assert.match(pub, /SLEEP_POSES\[z2\] === "feed" && NO_FEED_SLEEP\[id\]/, 'and the sleep pick reads it');
    assert.match(pub, /if \(t > FEED_S \* 0\.42 && t < FEED_S \* 0\.64\) name = a\.watch \|\| "idle";/, 'partway through a bite the head comes up');
  });
  check('the hyenas live mostly out in the pits, and the pits feed them and wear their own plate (2026-10-29)', () => {
    const pits = readFileSync(new URL('../regions/the-pits.rooms', import.meta.url), 'utf8');
    const ids = [...pits.matchAll(/^## (the-[a-z-]+) \| (?!attachment)/gm)].map((m) => m[1]);
    assert.equal(ids.length, 20, 'twenty rooms');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    for (const id of ids) assert.ok(pub.includes(`"${id}":`.padEnd(26) + '"the-pits"'), id + ' wears the pits plate');
    const mig = readFileSync(new URL('../migrations/346_the_hyenas_go_out_to_the_pits.sql', import.meta.url), 'utf8');
    const moved = [...mig.matchAll(/room_id = '([a-z-]+)'\s+WHERE id = '(hyena-\d)'/g)];
    assert.equal(moved.length, 4, 'four hyenas move out');
    for (const [, room] of moved) assert.ok(ids.includes(room), room + ' is in the pits');
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    for (const [, , id] of moved) assert.match(zd, new RegExp(`\\["${id}", "[a-z-]+"\\]`), id + ' is carried along on load (DEN_MOVES)');
    assert.match(zd, /"the-cart-tip", "the-lime-pits", "the-plague-trench", "the-bone-heaps", "the-skull-mound", "the-last-pit"/, 'the pits are carrion ground');
  });
  check('the open ground spreads to three more places, each on a plate of its own (2026-10-29)', () => {
    const src = readFileSync(new URL('../regions/open-ground-2.rooms', import.meta.url), 'utf8');
    const attach = [...src.matchAll(/^## (the-[a-z-]+) \| attachment/gm)].map((m) => m[1]);
    assert.deepEqual(attach, ['the-suttlers-row', 'the-village-smithy', 'the-cider-house', 'the-culver-house'], 'four doors in three places, not one');
    const ids = [...src.matchAll(/^## (the-[a-z-]+) \| (?!attachment)/gm)].map((m) => m[1]);
    assert.equal(ids.length, 20, 'twenty rooms');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const want = (id) => ['the-camp-tail','the-picket-ground','the-forage-cut','the-camp-midden','the-horse-pits','the-camp-graves','the-deserters-ditch','the-plague-tents'].includes(id) ? 'camp-tail'
      : ['the-toft-ends','the-back-lane','the-goose-green','the-stray-pound','the-crofts','the-back-pond'].includes(id) ? 'back-lands' : 'waste-fields';
    for (const id of ids) assert.ok(pub.includes(`"${id}":`.padEnd(26) + `"${want(id)}"`), id + ' wears ' + want(id));
    const mig = readFileSync(new URL('../migrations/348_hyenas_in_the_camp_and_the_fields.sql', import.meta.url), 'utf8');
    assert.match(mig, /VALUES \('grave-hyena-camp', 'grave-hyena', 'the-camp-graves'\)/);
    assert.match(mig, /VALUES \('grave-hyena-fields', 'grave-hyena', 'the-old-plough'\)/);
  });
  check('the forty new rooms paint four pictures of their own, each one installed and shipped (2026-10-29)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const ship = JSON.parse(readFileSync(new URL('./deploy-artwork.json', import.meta.url), 'utf8'));
    const rooms = [...pub.matchAll(/^  "(the-[a-z-]+)":\s+"(the-pits|camp-tail|back-lands|waste-fields)",$/gm)];
    assert.equal(rooms.length, 40, 'forty rooms on the four plates');
    for (const [, id, plate] of rooms) {
      assert.ok(pub.includes(`"${id}":`.padEnd(26) + '"day night night-torch snow"'), id + ' asks for day, night, torch and snow only');
      for (const s of ['day', 'night', 'night-torch', 'snow']) {
        assert.ok(existsSync(new URL(`../public/room-bg/${plate}-${s}.webp`, import.meta.url)), `${plate}-${s} is installed`);
        assert.ok(ship.includes(`room-bg/${plate}-${s}.webp`), `${plate}-${s} ships`);
      }
    }
    for (const g of ['the-pits', 'camp-tail', 'back-lands', 'waste-fields']) assert.match(pub, new RegExp(`^  "${g}": 6\\d,$`, 'm'), g + ' has its mob line');
  });
  check('the redrawn grave-hyena stands at the size the old one did, not 10% smaller (2026-10-30)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const n = Number(pub.match(/^  "grave-hyena": (\d+),/m)?.[1]);
    // at 13 the new sheet's body measured 0.898 of the old strip's at 12; on-screen size goes as n^0.45
    const body = 0.898 * Math.pow(n / 13, 0.45);
    assert.ok(Math.abs(body - 1) < 0.02, 'grave-hyena ' + n + ' draws ' + body.toFixed(3) + ' of his old body');
  });
  check('the barrow-dead crawl up out of the ground no bigger than they stand (2026-10-30)', () => {
    const src = readFileSync(new URL('./build-mob-strips.mjs', import.meta.url), 'utf8');
    const grow = src.slice(src.indexOf('const POSE_GROW'), src.indexOf('const BODY_SCALE'));
    for (const id of ['thrice-dead', 'twice-dead']) {
      const k = Number(grow.match(new RegExp(`"${id}": \\{ "rise": ([\\d.]+) \\}`))?.[1]);
      assert.ok(k > 0 && k < 1, id + "'s rise is shrunk, not left at the size the sheet drew it");
    }
  });
  check('a hollow eye does not bleed its cyan rim onto the face (2026-10-30)', () => {
    const src = readFileSync(new URL('./build-mob-strips.mjs', import.meta.url), 'utf8');
    const fn = src.slice(src.indexOf('async function blackenEyes'));
    const body = fn.slice(0, fn.indexOf('\n}\n'));
    assert.match(body, /const spill = Math\.min\(data\[o \+ 1\], data\[o \+ 2\]\) - data\[o\]/, 'the rim measures its cyan');
    assert.match(body, /if \(e\[o \+ 3\] && spill > 0\) \{ data\[o \+ 1\] -= spill; data\[o \+ 2\] -= spill; \}/, 'and loses it, inside the eye layer only');
  });
  check('every room with a picture in the client is one the server sends its place for (2026-10-30)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const plates = pub.match(/var ROOM_PLATE = \{([\s\S]*?)\n\};/)[1];
    const rooms = [...plates.matchAll(/^\s+"?([a-z][a-z0-9-]*)"?\s*:\s*"/gm)].map((m) => m[1]).filter((r) => r !== 'den');
    const art = new Set([...zd.match(/export const ART_ROOMS = new Set<string>\(\[([\s\S]*?)\]\);/)[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
    assert.ok(rooms.length > 250, 'read the room plates');
    assert.deepEqual(rooms.filter((r) => !art.has(r)), [], 'these paint black: the server never names their place');
  });
  check('deep snow adds to your load on the move, not in the fight (2026-10-29)', () => {
    const room = [...OUTDOOR_ROOMS][0];
    const z = { loadOf: () => 5, snowUntil: Date.now() + 60_000, world: { rooms: new Map([[room, { region: 'mountain' }]]) } };
    const s = { roomId: room };
    assert.equal(moveLoad(z, s), 5 + SNOW_LOAD_KG, 'the snow holds your feet');
    z.snowUntil = 0; assert.equal(moveLoad(z, s), 5, 'and lets them go when it melts');
    const verbs = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(verbs, /partingOdds = Math\.min\(PARTING_CAP, moveLoad\(z, session\)/, 'the parting blow reads it');
    assert.match(verbs, /stealthMult = Math\.max\(ENTRY_STEALTH_MIN, Math\.min\(1, moveLoad\(z, session\)/, 'and the crash into a room');
  });
  await checkAsync('gear on a den shelf does not rust (2026-10-29)', async () => {
    const writes = [];
    const z = { world: { itemTemplates: new Map([['iron-helm', { id: 'iron-helm', slot: 'helm' }]]) }, isGear: () => true,
      env: { DB: { prepare: () => ({ bind: (...a) => ({ run: async () => { writes.push(a); } }) }) } } };
    const week = Date.now() - 7 * 24 * 3_600_000;
    const held = [{ rowId: 'h1', itemId: 'iron-helm', serial: null, condition: 90, containerAt: week },
                  { rowId: 'h2', itemId: 'iron-helm', serial: 12, condition: 60, containerAt: week }];
    await den.rustShelf(z, held, { hides: false });
    assert.deepEqual(held.map((c) => c.condition), [90, 60], 'a week on the shelf and they come off as they went on');
    assert.equal(writes.length, 0, 'and nothing is written');
  });
  check('smoke and a falling wall set you coughing', () => {
    const { z, noise, minutes } = coughWorld();
    coughing.weather.coldBites = () => false;
    z.roomHasFirekeeper = (r) => r === 'r';
    minutes(20); assert.ok(noise.length > 2, 'the clamp smoke');
    noise.length = 0; z.roomHasFirekeeper = () => false;
    coughing.dust(z, 'r'); assert.deepEqual(noise, ['r'], 'the dust, at once');
    coughing.dust(z, 'elsewhere'); assert.deepEqual(noise, ['r'], 'only the room it fell in');
  });

  check('the drowned dunk and the falling wall both call the cough', () => {
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    assert.match(zone, /black water fills your lungs[^\n]*\n\s*cough\.swallowedWater\(victim\)/);
    assert.match(ev, /a wall comes down in a long roar of stone[^\n]*\n\s*cough\.dust\(z, roomId\)/);
    assert.match(zone, /cough\.tick\(this, now\)/);
  });

  // ---------------------------------------------------------------- study by behaviour
  console.log('study by behaviour');
  check('each kind asks only for the behaviours it has (2026-10-24)', () => {
    assert.deepEqual(study.required('skeleton'), ['about', 'dead'], 'the hollow neither sleep nor eat');
    assert.deepEqual(study.required('rat-king'), ['about', 'feeding', 'dead'], 'the king eats and never sleeps');
    for (const id of ['three-hound', 'two-hound']) assert.deepEqual(study.required(id), ['about', 'asleep', 'dead'], id + ' has nothing to eat at its post');
    assert.deepEqual(study.required('hill-wolf'), ['about', 'asleep', 'feeding', 'hungry', 'dead']);
    assert.deepEqual(study.required('roe-deer'), ['about', 'asleep', 'feeding', 'dead'], 'a napper is asked to be caught asleep; a floor eater never hungry');
    assert.deepEqual(study.writes('roe-deer', 'feeding'), ['feeding', 'hungry'], 'seeing a floor eater feed writes its hunger too');
    assert.deepEqual(study.writes('hill-wolf', 'feeding'), ['feeding'], 'a hunter has to be caught hungry on its own');
    const zs = new ZoneDO({}, {}); zs.variantBase = new Map();
    assert.equal(study.soundLine(zs, 'rat'), 'Claws skitter.', 'the book drops the direction the world fills in');
    assert.match(study.soundLine(zs, 'rat-king'), /^Something heavy drags itself, and a great many small claws hurry along with it\. Standing still: a wet, rattling breath/);
  });
  check('a meal holds the animal over it, and it reads as feeding (2026-10-24)', () => {
    const z = new ZoneDO({}, {});
    z.sentinelAwake = () => true;
    const c = { id: 'c', templateId: 'roe-deer', hunger: 10, nextWanderAt: 0 };
    assert.equal(study.behaviourNow(z, c), 'about');
    const now = Date.now();
    ate(c, now);
    assert.equal(study.behaviourNow(z, c, now + 60_000), 'feeding');
    assert.ok(c.nextWanderAt >= now + 60_000, 'it stays put over the meal');
    assert.equal(study.behaviourNow(z, c, now + 3 * 60_000), 'about', 'and the meal ends');
  });
  check('an animal that walks off its meal stops reading as eating (2026-10-28, the hyena)', () => {
    const z = new ZoneDO({}, {});
    z.sentinelAwake = () => true;
    const c = { id: 'h', templateId: 'grave-hyena', roomId: 'the-camp-ground', hunger: 10, nextWanderAt: 0 };
    const now = Date.now();
    ate(c, now);
    assert.equal(study.behaviourNow(z, c, now + 30_000), 'feeding', 'over the meal it is eating');
    c.roomId = 'the-horse-lines';
    assert.notEqual(study.behaviourNow(z, c, now + 30_000), 'feeding', 'a room away, the meal is behind it');
    c.roomId = 'the-camp-ground';
    assert.notEqual(study.behaviourNow(z, c, now + 30_000), 'feeding', 'and walking back does not pick the meal up again');
  });
  check('an eating animal says what kind of meal it is, never what the kill was (2026-10-28)', () => {
    const z = new ZoneDO({}, {});
    z.sentinelAwake = () => true;
    z.world = { mobTemplates: new Map([['grave-hyena', { id: 'grave-hyena', name: 'a grave-hyena', max_hp: 30 }], ['gibbet-crow', { id: 'gibbet-crow', name: 'a gibbet crow', max_hp: 14 }], ['roe-deer', { id: 'roe-deer', name: 'a roe deer', max_hp: 16 }]]), rooms: new Map(), entryRooms: new Set(), exits: new Map() };
    const tell = (templateId, on) => { const c = { id: templateId, templateId, roomId: 'r', hunger: 0, hp: 30, nextWanderAt: 0 }; z.creatures = new Map([[c.id, c]]); ate(c, Date.now(), on); return creatureTell(z, c, 'me'); };
    assert.equal(tell('grave-hyena', 'carrion'), 'head down in a carcass, tearing at what is left');
    assert.equal(tell('grave-hyena', 'kill'), 'head down over its kill, eating');
    assert.equal(tell('grave-hyena', 'scraps'), 'nosing through scraps on the ground and eating them');
    assert.equal(tell('roe-deer', 'graze'), 'head down, grazing');
    assert.match(tell('gibbet-crow', 'carrion'), /bill/);
    for (const on of ['kill', 'carrion', 'scraps', 'graze']) assert.notEqual(tell('grave-hyena', on), 'head down, eating', on);
  });
  function studyWorld() {
    const { db, D1 } = sqliteD1();
    db.exec("CREATE TABLE player_accounts(pubkey TEXT, template_id TEXT, at INTEGER, PRIMARY KEY(pubkey, template_id)); ALTER TABLE players ADD COLUMN accounts INTEGER NOT NULL DEFAULT 0; INSERT INTO players(pubkey, name) VALUES ('me', 'Rome')");
    db.exec("CREATE TABLE journal_logs(journal_id TEXT, template_id TEXT, kills INTEGER DEFAULT 0, studied INTEGER DEFAULT 0, seen TEXT NOT NULL DEFAULT '', met TEXT NOT NULL DEFAULT '', PRIMARY KEY(journal_id, template_id))");
    const z = new ZoneDO({}, {});
    z.env = { DB: D1 };
    const wolfT = { id: 'hill-wolf', name: 'a hill wolf', level: 3, description: 'A grey wolf.', armor: 0, loot_item: null, is_boss: 0 };
    z.world = new Proxy({ mobTemplates: new Map([['hill-wolf', wolfT]]), mobSpawns: [], mobKeys: [] },
      { get: (t, k) => k in t ? t[k] : (typeof k === 'string' ? (t[k] = new Map()) : undefined) });
    z.creatures = new Map(); z.traces = new Map(); z.sessions = new Map();
    const said = [];
    z.send = (_s, t) => said.push(t);
    z.inCombat = () => false; z.mossUnseen = () => false; z.sentinelAwake = () => true;
    z.roomFeed = z.sendCtx = z.refreshRoomCtx = () => undefined;
    z.bearsClause = () => ''; z.hoardManifest = () => ''; z.condition = () => 'unhurt';
    const wolf = { id: 'w1', templateId: 'hill-wolf', roomId: 'r', hp: 20, hunger: 0, nextWanderAt: 0, asleep: true };
    z.creatures.set('w1', wolf);
    z.regionOf = () => 'wood'; z.variantBase = new Map([['white-wolf', 'hill-wolf']]);
    z.findCreatureIn = (room, arg) => [...z.creatures.values()].find((c) => c.roomId === room && /wolf/.test(arg)) ?? null;
    const me = { pubkey: 'me', name: 'Rome', roomId: 'r', items: [{ rowId: 'j', itemId: 'journal', journalId: 'jrn-1' }] };
    const seen = () => db.prepare("SELECT seen FROM journal_logs WHERE template_id = 'hill-wolf'").get()?.seen;
    return { z, me, wolf, said, seen, db };
  }
  await checkAsync('a study writes what the creature is doing, and the same behaviour twice adds nothing (2026-10-24)', async () => {
    const { z, me, wolf, said, seen } = studyWorld();
    await cmdStudy(z, me, 'wolf');
    assert.equal(seen(), 'asleep');
    assert.match(said.at(-1), /You watch a hill wolf sleeping/);
    assert.match(said.at(-1), /still to see it about its business, eating, hungry and dead/);
    await cmdStudy(z, me, 'wolf');
    assert.match(said.at(-1), /already set down a hill wolf sleeping/);
    wolf.asleep = false; wolf.hunger = 60;
    await cmdStudy(z, me, 'wolf');
    assert.equal(seen(), 'asleep,hungry');
  });
  await checkAsync('studying the dead reads the body and uses it up (2026-10-24)', async () => {
    const { z, me, said, seen } = studyWorld();
    const body = { kind: 'blood', at: Date.now(), label: 'a hill wolf', id: 'hill-wolf' };
    z.traces.set('r', [body, { kind: 'blood', at: Date.now(), label: 'Rome', id: 'nomad' }]);
    await cmdStudy(z, me, 'dead wolf');
    assert.equal(seen(), 'dead', 'the living wolf in the room is not the one studied');
    assert.match(said.at(-1), /Any weapon can find the gap/);
    assert.deepEqual(z.traces.get('r').map((t) => t.id), ['nomad'], 'the wolf body is gone; a nomad is never a study');
    await cmdStudy(z, me, 'dead wolf');
    assert.match(said.at(-1), /Nothing by that name/);
  });
  await checkAsync('a full account wants every behaviour and the kills (2026-10-24)', async () => {
    const { z, me, wolf, said, db } = studyWorld();
    db.prepare("INSERT INTO journal_logs VALUES ('jrn-1', 'hill-wolf', 6, 1, 'about,feeding,hungry,dead', '')").run();
    await cmdStudy(z, me, 'wolf');
    assert.match(said.at(-1), /Its account is complete/);
    db.prepare("UPDATE journal_logs SET seen = 'about,feeding,hungry', kills = 6").run();
    wolf.asleep = false; wolf.hunger = 0;
    await cmdStudy(z, me, 'wolf'); // about, already seen
    assert.match(said.at(-1), /already set down/);
  });

  await checkAsync('the journal reads as text: its page, its sound, where it was met, its forms (2026-10-24)', async () => {
    const { z, me, wolf, said, db } = studyWorld();
    z.world.mobTemplates.set('white-wolf', { id: 'white-wolf', name: 'a white wolf', level: 4, description: 'A pale wolf.', armor: 0 });
    me.ws = { send: () => {} };
    wolf.asleep = false;
    await cmdStudy(z, me, 'wolf');
    z.regionOf = () => 'upper';
    wolf.hunger = 60;
    await cmdStudy(z, me, 'wolf');
    z.regionOf = () => 'wood'; wolf.asleep = true;
    await cmdStudy(z, me, 'wolf'); // back in the wood: the place is not written twice
    assert.equal(db.prepare("SELECT met FROM journal_logs WHERE template_id = 'hill-wolf'").get().met, 'wood,upper');
    db.prepare("INSERT INTO journal_logs VALUES ('jrn-1', 'white-wolf', 1, 0, '', 'wood')").run();
    await cmdJournal(z, me, '');
    assert.match(said.at(-1), /2 creatures written down:\n  a white wolf — hunted, 1 kill\n  a hill wolf — sighted, 0 kills/);
    await cmdJournal(z, me, 'hill wolf');
    const page = said.at(-1);
    assert.match(page, /^a hill wolf — sighted, 0 kills/);
    assert.match(page, /Hungry\. Hungry, it eyes/);
    assert.match(page, /Met in The Wood and The Halls\./);
    assert.match(page, /Its rarer forms you have met: a white wolf\./);
    assert.match(page, /Still to see it eating and dead/);
    assert.match(page, /Asleep\. /);
    await cmdJournal(z, me, 'white');
    assert.match(said.at(-1), /A rare blood of a hill wolf\./);
  });

  await checkAsync('the journal chip opens the modal; typed journal reads as text only (2026-10-24)', async () => {
    const { z, me, db } = studyWorld();
    const frames = [];
    me.ws = { send: (x) => frames.push(JSON.parse(x)) };
    db.prepare("INSERT INTO journal_logs VALUES ('jrn-1', 'hill-wolf', 1, 0, '', 'wood')").run();
    await cmdJournal(z, me, '');
    assert.ok(!frames.some((f) => f.t === 'journal'), 'typed journal must not pop the modal');
    await cmdJournal(z, me, '', true);
    assert.ok(frames.some((f) => f.t === 'journal' && f.entries.length === 1), 'the chip opens the modal');
    const zsrc = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zsrc, /if \(isJournal\) return lore\.cmdJournal\(this, session, "", true\)/);
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /s === JOURNAL_CHIP\) \{\s*if \(ws && ws\.readyState === 1\) ws\.send\(JSON\.stringify\(\{ v: 0, t: "journal" \}\)\)/);
  });

  await checkAsync('finishing a page puts it on the legend board once; a book found full gives nothing (2026-10-24)', async () => {
    const { z, me, wolf, db } = studyWorld();
    const accounts = () => db.prepare("SELECT accounts FROM players WHERE pubkey = 'me'").get().accounts;
    db.prepare("INSERT INTO journal_logs VALUES ('jrn-1', 'hill-wolf', 6, 1, 'about,feeding,hungry,dead', '')").run();
    await cmdStudy(z, me, 'wolf'); // asleep: this study finishes it
    assert.equal(accounts(), 1);
    assert.equal(me.accounts, 1);
    wolf.asleep = false;
    await cmdStudy(z, me, 'wolf');
    assert.equal(accounts(), 1, 'once per kind');
    // Somebody else's book, already full: writing more in it (a pale crawler
    // caught dozing, which its account never asked for) is not finishing it.
    z.world.mobTemplates.set('pale-crawler', { id: 'pale-crawler', name: 'a pale crawler', level: 3, description: 'Pale.', armor: 0 });
    z.creatures.clear();
    z.creatures.set('pc', { id: 'pc', templateId: 'pale-crawler', roomId: 'r', hp: 10, hunger: 0, nextWanderAt: 0, asleep: true });
    z.findCreatureIn = (room, arg) => [...z.creatures.values()].find((c) => c.roomId === room && /crawler/.test(arg)) ?? null;
    db.prepare("INSERT INTO journal_logs VALUES ('jrn-1', 'pale-crawler', 6, 1, 'about,feeding,hungry,dead', '')").run();
    await cmdStudy(z, me, 'crawler');
    assert.equal(db.prepare("SELECT seen FROM journal_logs WHERE template_id = 'pale-crawler'").get().seen, 'about,asleep,feeding,hungry,dead', 'the doze is written down');
    assert.equal(accounts(), 1, 'a page found full is not yours');
  });

  await checkAsync('a journal taken out after connecting re-reads the chip cache, so a written page offers no chip (2026-10-24)', async () => {
    const { z, me, said, db } = studyWorld();
    db.prepare("INSERT INTO journal_logs VALUES ('jrn-1', 'hill-wolf', 7, 1, 'about,asleep,feeding,hungry,dead', '')").run();
    const book = me.items.pop(); // in the lockbox when they connected
    await refreshStudied(z, me);
    assert.equal(me.studiedKey, journalKey(me));
    me.items.push(book); // taken out at the gate
    assert.notEqual(me.studiedKey, journalKey(me), 'the cache knows it was read from other books');
    await refreshStudied(z, me);
    assert.equal(me.studiedKey, journalKey(me));
    assert.ok(me.studied.get('hill-wolf').has('dead'));
    const chips = readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8');
    assert.match(chips, /const firstMob = stale \? undefined :/);
    assert.match(chips, /else if \(!stale\) \{\n\s*const body =/);
    // And an "already" answer fixes the cache on its own.
    me.studied = undefined;
    await cmdStudy(z, me, 'wolf');
    assert.match(said.at(-1), /already set down/);
    assert.ok(me.studied.get('hill-wolf').has('asleep'));
  });
  await checkAsync('the legend board counts a full account at 10 (2026-10-24)', async () => {
    const { db, D1 } = sqliteD1();
    db.exec("DROP TABLE players; CREATE TABLE players(pubkey TEXT PRIMARY KEY, name TEXT, kills INTEGER DEFAULT 0, boss_kills INTEGER DEFAULT 0, pvp_kills INTEGER DEFAULT 0, accounts INTEGER DEFAULT 0, lb_published_at INTEGER)");
    db.exec("INSERT INTO players VALUES ('a', 'A', 5, 0, 0, 3, 1), ('b', 'B', 30, 0, 0, 0, 1)");
    const top = await loadLeaderboard(D1, 'legend', 10, { bossPts: 100, pvpPts: 25, accountPts: 10, trophyIds: [] });
    assert.deepEqual(top.map((e) => [e.name, e.score]), [['A', 35], ['B', 30]]);
  });

  // ---------------------------------------------------------------- the bench
  console.log('the bench');
  await checkAsync('lockbox to vault clunks like every other move into a box (2026-10-24)', async () => {
    const { db, D1 } = sqliteD1();
    const z = new ZoneDO({}, {});
    z.env = { DB: D1 };
    z.world = new Proxy({ itemTemplates: new Map([['tin', { id: 'tin', name: 'a tin', slot: '', rarity: 'common', weight: 1 }]]), entryRooms: new Set(['gate']) },
      { get: (t, k) => k in t ? t[k] : (typeof k === 'string' ? (t[k] = new Map()) : undefined) });
    z.inGatehouse = new Set(['me']);
    const frames = [];
    const me = { pubkey: 'me', name: 'Rome', roomId: 'gate', items: [], away: true, ws: { send: (m) => frames.push(JSON.parse(m)) } };
    db.prepare("INSERT INTO player_items(id, item_id, pubkey, signed_serial, container) VALUES ('r2', 'tin', 'me', 5, 'lockbox')").run();
    for (const k of ['hasRoom']) z[k] = () => true;
    z.stackable = () => false; z.isGear = () => false; z.enterStep = () => {}; z.send = () => {}; z.savedLoadouts = () => [];
    await handleBench(z, me, { action: 'vault', rows: ['r2'] });
    assert.equal(db.prepare("SELECT container FROM player_items WHERE id = 'r2'").get().container, 'vault', 'it moved');
    const bench = frames.filter((f) => f.t === 'bench').at(-1);
    assert.equal(bench?.sfx, 'box');
  });

  check('a burning lantern offers douse, in the chips and in help (2026-10-24)', () => {
    const chips = readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8');
    assert.match(chips, /if \(!fighting && session\.litSource === "lantern" && z\.carriesLight\(session\)\) suggest\.push\("douse"\);/);
    const parser = readFileSync(new URL('../src/parser.ts', import.meta.url), 'utf8');
    assert.match(parser, /"  douse             \(shutter, snuff\)/);
    assert.deepEqual(parse('douse'), { verb: 'douse', arg: '' });
  });

  check('the picture draws the newest bodies, and always the one the study chip names (2026-10-24)', () => {
    const { z, me } = studyWorld();
    z.creatures.clear();
    const T = (id, name) => z.world.mobTemplates.set(id, { id, name, level: 2, description: '', armor: 0 });
    T('brood-rat', 'a swollen brood-rat'); T('the-miller', 'the miller');
    z.world.rooms = new Map([['r', { id: 'r', name: 'The Ditch' }]]); z.world.entryRooms = new Set(); z.world.exits = new Map();
    const at = Date.now();
    z.traces.set('r', [{ kind: 'remains', at, label: 'the miller', id: 'the-miller' },
      ...[1, 2, 3].map((i) => ({ kind: 'blood', at: at + i, label: 'a swollen brood-rat', id: 'brood-rat' }))]);
    me.studied = new Map([['brood-rat', new Set(['dead'])]]); me.studiedKey = journalKey(me);
    const frames = []; me.ws = { send: (m) => frames.push(JSON.parse(m)) };
    let threw = null;
    try { sendCtx(z, me); } catch (e) { threw = e; }
    if (threw) { console.log('    (sendCtx needs more of the world here: ' + threw.message + ')'); throw threw; }
    const ctx = frames.filter((f) => f.t === 'ctx').at(-1);
    assert.ok(ctx.suggest.includes('study dead miller'), 'the chip names the miller');
    assert.ok(ctx.dead.includes('the-miller'), 'and the picture shows it');
    assert.equal(ctx.dead.length, 3);
  });

  check('running water a third down everywhere, and the gust top a quarter down (2026-10-24)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /a\.water === "run" \? \(a\.loud \? 0\.13 : 0\.07\) \* SCAPE_VOL/);
    assert.match(pub, /windBase \* \(0\.3 \+ 0\.6 \* scape\.gust\) \* SCAPE_VOL/);
  });

  check('the Drowned God stands forward of his pool (2026-10-24)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /"gods-pool": 58,/);
  });
  check('journal <creature> reads a page inside a gate, not spoken aloud (2026-10-24)', () => {
    // Inside a gate a no-argument verb with words after it is speech, so
    // "journal red stag" was said out loud. Journal takes a creature now.
    const c = parse('journal red stag');
    assert.equal(c.verb, 'journal');
    assert.ok(/red stag/.test(c.arg));
    assert.ok(!GATEHOUSE_NOARG.has('journal'), 'the server must not treat it as speech');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const m = pub.match(/var GATEHOUSE_NOARG_CMDS = \{([\s\S]*?)\n\};/);
    assert.ok(m && !/\bjournal:/.test(m[1].replace(/\/\/.*$/gm, '')), 'the client must not echo it as speech');
  });
  check('the Forgotten King sits and rises in his chair at the live king size, then stands on the floor below (2026-10-24)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /"sunken-throne": 61,/);
    assert.match(pub, /var FRAME_DROP = \{ "forgotten-king": \{ death: 0\.03 \} \};/, 'his death a little lower');
    assert.match(pub, /"sunken-throne": \{ up: 0\.305, s: 1\.09 \}/);
    assert.match(pub, /p\.k === a\.spec\.f\["keep-the-seat"\] \|\| p\.k === a\.spec\.f\["stand-from-the-throne"\]/);
    const strips = readFileSync(new URL('./build-mob-strips.mjs', import.meta.url), 'utf8');
    assert.match(strips, /"forgotten-king": \{ "call-the-dark": 1\.16 \}/);
  });

  // ---------------------------------------------------------------- the rising dead
  console.log('the dead that get up');
  await checkAsync('a revenant falls like the dead, and only gets up a while later (2026-10-24)', async () => {
    const z = new ZoneDO({}, {});
    rising.resetForTest(z);
    const keep = new Set(['constructor', 'onCreatureDeath', 'killVerbOf']);
    for (let p = Object.getPrototypeOf(z); p && p !== Object.prototype; p = Object.getPrototypeOf(p))
      for (const k of Object.getOwnPropertyNames(p)) if (!keep.has(k) && typeof p[k] === 'function') z[k] = () => undefined;
    const said = []; z.send = (_s, t) => said.push(t);
    z.feedKill = () => '';
    z.creatures = new Map(); z.sessions = new Map(); z.traces = new Map();
    // A COPY, as the real addTrace lays one (rome, 2026-10-26: the body stayed on the floor
    // when it got up - this stub used to keep the same object and hid it).
    z.addTrace = (room, tr) => { const laid = { ...tr }; z.traces.set(room, [...(z.traces.get(room) ?? []), laid]); return laid; };
    const tmpl = { id: 'twice-dead', name: 'a twice-dead', max_hp: 30, level: 3, is_boss: 0 };
    z.world = new Proxy({ mobTemplates: new Map([['twice-dead', tmpl]]) }, { get: (t, k) => k in t ? t[k] : (typeof k === 'string' ? (t[k] = new Map()) : undefined) });
    const me = { pubkey: 'me', name: 'Rome', roomId: 'r', items: [], kills: 0, bossKills: 0, target: 'td' };
    z.sessions.set('me', me);
    const c = { id: 'td', templateId: 'twice-dead', roomId: 'r', hp: 0, hunger: 0, grudges: [], target: 'me', nextWanderAt: 0 };
    z.creatures.set('td', c);
    await z.onCreatureDeath(me, c, tmpl);
    assert.equal(z.creatures.has('td'), false, 'it is down, off the board');
    assert.equal(me.target, null, 'the fight is over');
    assert.equal(me.kills, 0, 'no kill on the sheet for a false fall');
    assert.equal(z.traces.get('r')?.[0]?.id, 'twice-dead', 'a body lies there');
    rising.tick(z, Date.now() + 10_000);
    assert.equal(z.creatures.has('td'), false, 'not at once');
    rising.tick(z, Date.now() + 50_000);
    assert.ok(z.creatures.has('td'), 'it gets up');
    assert.equal(c.hp, 12, 'weaker than before');
    assert.equal(c.target, 'me', 'and comes for the one who put it down');
    assert.equal((z.traces.get('r') ?? []).length, 0, 'the body was it');
    c.hp = 0;
    await z.onCreatureDeath(me, c, tmpl).catch(() => {}); // the real fall: stubs end it early, but it must not rise
    rising.tick(z, Date.now() + 100_000);
    assert.equal(z.creatures.has('td'), false, 'the second fall is the last');
  });

  // ---------------------------------------------------------------- whetstone
  console.log('the whetstone');
  await checkAsync('a piece at 59.6 reads 60 and the stone says so, not a silent 0.4 (2026-10-23)', async () => {
    const { z, me, last } = denWorld();
    z.inDen.delete('me');
    me.roomId = [...WHETSTONE_ROOMS][0];
    const rec = recorder(); z.env = { DB: rec.DB };
    const glaive = { rowId: 'g1', itemId: 'hand-axe', serial: null, equipped: true, condition: WHET_CAP - 0.4 };
    me.items.push(glaive);
    await cmdRepair(z, me, 'axe');
    assert.match(last(), /already past what a stone can keep/);
    assert.equal(glaive.condition, WHET_CAP - 0.4, 'nothing moved');
    glaive.condition = 44.6;
    await cmdRepair(z, me, 'axe');
    assert.equal(glaive.condition, 60, 'the stone takes it up in whole numbers');
  });

  console.log('the bell door');
  check('the issue chest is refilled for every bell, and sometimes empty (2026-10-26)', () => {
    const mig = readFileSync(new URL('../migrations/341_the_issue_on_every_bell.sql', import.meta.url), 'utf8');
    const secs = Number(/refill_secs = (\d+) WHERE id = 'box-armory'/.exec(mig)[1]);
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const num = (n) => eval(new RegExp(`export const ${n} = ([^;]+);`).exec(zd)[1].replace(/_/g, ''));
    const hours = eval(/export const BELL_HOURS_UTC = (\[[^\]]+\]);/.exec(zd)[1]);
    const jitter = num('BELL_JITTER_MS'), open = num('BELL_TELEGRAPH_MS') + num('BELL_ACTIVE_MS') + num('BELL_AFTERMATH_MS');
    const gap = Math.min(...hours.map((h, i) => ((hours[(i + 1) % hours.length] - h + 24) % 24) * 3_600_000));
    // opened at the last moment of one ringing, it is full before the earliest the next can start
    assert.ok(secs * 1000 + open < gap - 2 * jitter, `refilled in ${secs / 3600}h, next bell as soon as ${(gap - 2 * jitter) / 3_600_000}h`);
    assert.ok(secs * 1000 > open, 'and not twice in one ringing');
    assert.match(zd, /export const PRIZE_EMPTY_ODDS: Record<string, number> = \{ "box-armory": 0\.25 \};/, 'the bell chest only, one in four');
    const zsrc = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zsrc, /if \(DOOR_PRIZE_BOXES\.has\(cache\.id\) && chance\(PRIZE_EMPTY_ODDS\[cache\.id\] \?\? 0\)\) \{/, 'the other door boxes still never come up empty');
  });
  console.log('the sound');
  check('sound turned off and back on wakes a context the browser parked or closed (2026-10-26)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const fn = (n) => { const i = pub.indexOf('\nfunction ' + n + '('); let d = 0;
      for (let k = pub.indexOf('{', i); k < pub.length; k++) { if (pub[k] === '{') d++; else if (pub[k] === '}' && --d === 0) return pub.slice(i + 1, k + 1); } };
    const made = [];
    class FakeCtx {
      constructor() { this.state = 'suspended'; this.resumed = 0; this.destination = {}; made.push(this); }
      createGain() { return { gain: { value: 0 }, connect() {} }; }
      resume() { this.resumed++; return Promise.resolve(); }
    }
    const listeners = [];
    const document = { addEventListener: (k) => listeners.push(k), removeEventListener() {} };
    const calls = [];
    const run = new Function('AudioContext', 'document', 'calls',
      `var actx = null, amaster = null, ambNodes = null, scape = null, soundOn = true, AMB_FADE = 1;
       var SND_WAKE = ["pointerdown", "click"];
       function fadeGain() {} function startAmb() { calls.push("amb"); } function scapeStart() { calls.push("scape"); }
       ${fn('sndInit')}\n${fn('sndWatch')}\n${fn('wakeSnd')}
       return { sndInit, sndWatch, wakeSnd, get actx() { return actx; }, set actx(v) { actx = v; }, set on(v) { soundOn = v; } };`);
    const S = run(FakeCtx, document, calls);
    S.sndInit();
    const ctx = S.actx;
    ctx.state = 'interrupted'; // an iPhone locked while the sound was off
    S.sndInit();
    assert.ok(ctx.resumed >= 2, 'woken from interrupted, not only from suspended');
    ctx.state = 'closed';
    S.sndInit();
    assert.notEqual(S.actx, ctx, 'a closed context is built again');
    S.actx.state = 'closed';
    S.wakeSnd();
    assert.ok(calls.includes('amb') && calls.includes('scape'), 'and its beds with it');
    listeners.length = 0;
    S.actx.state = 'suspended';
    S.sndWatch();
    assert.deepEqual(listeners, ['pointerdown', 'click'], 'stopped running: the wake goes back on');
    listeners.length = 0;
    S.on = false;
    S.sndWatch();
    assert.equal(listeners.length, 0, 'not while the sound is off');
    assert.match(pub, /actx\.onstatechange = sndWatch;/);
    assert.match(pub, /addEventListener\("visibilitychange", function \(\) \{ if \(!document\.hidden\) sndWatch\(\); \}\);/);
  });
  console.log('the herds');
  // The wood in small: deer and wolves with rows across 10 rooms, nobody home.
  function herdWorld(deerRows = 10, wolfRows = 5) {
    const rooms = new Map(), mobSpawns = [];
    for (let i = 0; i < 10; i++) rooms.set('w' + i, { id: 'w' + i });
    for (let i = 0; i < deerRows; i++) mobSpawns.push({ template_id: 'roe-deer', room_id: 'w' + (i % 10) });
    for (let i = 0; i < wolfRows; i++) mobSpawns.push({ template_id: 'grey-wolf', room_id: 'w' + (i % 10) });
    const world = { rooms, mobSpawns, mobVariants: [], safeRooms: new Set(), entryRooms: new Set(), exits: new Map(),
      mobTemplates: new Map([
        ['roe-deer', { id: 'roe-deer', name: 'a roe-deer', max_hp: 16, respawn_secs: 300, is_boss: 0 }],
        ['grey-wolf', { id: 'grey-wolf', name: 'a grey wolf', max_hp: 26, respawn_secs: 600, is_boss: 0 }],
      ]) };
    const z = { world, creatures: new Map(), sessions: new Map(), herds: new Map(), variantBase: new Map(), arrivals: new Map(), conditions: new Map(),
      regionOf: () => 'wood', outOfWorld: () => false, roomDist: () => 1, rollCarry: () => undefined,
      noteCreaturesChanged() {}, roomFeed() {}, roomSound() {}, refreshRoomCtx() {} };
    const add = (t, room) => { const id = 'c' + Math.random(); z.creatures.set(id, { id, templateId: t, roomId: room, home: room, hp: 1 }); };
    const count = (t) => [...z.creatures.values()].filter((c) => c.templateId === t).length;
    return { z, add, count };
  }
  check('an emptied region never stays at zero: the floor walks one in (2026-10-25)', () => {
    const { z, count } = herdWorld();
    herds.tick(z, 0, true);
    herds.tick(z, 15 * 60_000, true); // a quarter of an hour, not a deer standing
    assert.ok(count('roe-deer') >= 1, 'a wiped herd comes back inside the quarter hour');
  });
  check('the floor grows with the hunters standing on the ground (2026-10-25)', () => {
    const one = herds.ratesFor(true, 300, 0, 30, 1, 1)[1];
    const five = herds.ratesFor(true, 300, 0, 30, 5, 1)[1];
    assert.ok(five > one * 3, 'five hunters pull in more than one does');
    const nobody = herds.ratesFor(true, 300, 0, 30, 0, 1)[1];
    assert.equal(nobody, one, 'nobody out still means one hunter\'s floor, so the empty world refills');
    assert.equal(herds.ratesFor(true, 300, 20, 30, 5, 1)[1], herds.ratesFor(true, 300, 20, 30, 0, 1)[1], 'above the floor, hunters change nothing');
  });
  check('a herd never passes what its region carries, however long it sleeps (2026-10-25)', () => {
    const { z, add, count } = herdWorld();
    add('roe-deer', 'w1'); add('grey-wolf', 'w2');
    herds.tick(z, 0, true);
    herds.tick(z, 48 * 3_600_000, true); // two days in one step
    assert.equal(count('roe-deer'), 10);
    assert.equal(count('grey-wolf'), 5);
    herds.tick(z, 72 * 3_600_000, true);
    assert.equal(count('roe-deer'), 10, 'a full region owes nothing');
  });
  check('one region refilling never takes another region\'s share (2026-10-25)', () => {
    const { z, add } = herdWorld(10, 0);
    z.regionOf = (r) => (Number(r.slice(1)) < 5 ? 'wood' : 'road'); // five rows each
    add('roe-deer', 'w1'); add('roe-deer', 'w2'); // the wood holds 2, the road none
    herds.tick(z, 0, true);
    herds.tick(z, 48 * 3_600_000, true);
    const inBand = (b) => [...z.creatures.values()].filter((c) => z.regionOf(c.roomId) === b).length;
    assert.equal(inBand('wood'), 5);
    assert.equal(inBand('road'), 5);
  });
  check('a stray still walking home counts for the region it lives in (2026-10-25)', () => {
    const { z, add } = herdWorld(10, 0);
    for (let i = 0; i < 10; i++) { z.world.rooms.set('r' + i, { id: 'r' + i }); z.world.mobSpawns.push({ template_id: 'roe-deer', room_id: 'r' + i }); }
    z.regionOf = (r) => (r.startsWith('w') ? 'wood' : 'road');
    for (let i = 0; i < 10; i++) add('roe-deer', 'w' + i);
    for (const c of z.creatures.values()) c.roomId = 'r0'; // the wood's whole herd still on the road, walking in
    herds.tick(z, 0, true);
    herds.tick(z, 6 * 3_600_000, true);
    const woodHomed = [...z.creatures.values()].filter((c) => c.home.startsWith('w')).length;
    assert.equal(woodHomed, 10, 'the wood is full; nothing more is owed it');
  });
  check('a birth never appears in front of a player (2026-10-25)', () => {
    const { z, add, count } = herdWorld(10, 0);
    for (let i = 0; i < 4; i++) add('roe-deer', 'w3'); // the whole herd stands where you stand
    z.sessions.set('me', { roomId: 'w3' });
    z.world.rooms.set(MOUTHS[0], { id: MOUTHS[0] }); // strays walk in from a mouth, as in the world
    herds.tick(z, 0, true);
    for (let m = 1; m <= 600; m++) herds.tick(z, m * 60_000, true);
    assert.ok(count('roe-deer') > 4, 'the herd grew');
    const born = [...z.creatures.values()].filter((c) => c.templateId === 'roe-deer' && !/^c/.test(c.id));
    assert.ok(born.every((c) => c.roomId !== 'w3'), 'none of them began in the watched room');
  });
  check('a herd has no refill timer; a line that is not a herd keeps its own (2026-10-25)', () => {
    const { z } = herdWorld();
    z.world.mobSpawns.push({ template_id: 'twice-dead', room_id: 'w1' });
    z.world.mobTemplates.set('twice-dead', { id: 'twice-dead', name: 'a twice-dead', max_hp: 20, respawn_secs: 90, is_boss: 0 });
    z.arrivals.set('roe-deer', 5); // banked before the herds came
    scheduleArrivals(z, 0);
    assert.ok(!z.arrivals.has('roe-deer') && !z.arrivals.has('grey-wolf'), 'the herds run on births, not a clock');
    assert.ok(z.arrivals.has('twice-dead'), 'the hollow still run on theirs');
  });
  // The day: dawn is the first 18 minutes of the light, dusk its last, then two hours of night.
  const DAWN = 5 * 60_000, NOON = 60 * 60_000, DUSK = 110 * 60_000, NIGHT = 3 * 3_600_000;
  function roundWorld() {
    const world = { mobTemplates: new Map([
      ['roe-deer', { id: 'roe-deer', name: 'a roe-deer', respawn_secs: 300, is_boss: 0 }],
      ['tawny-owl', { id: 'tawny-owl', name: 'a tawny owl', respawn_secs: 660, is_boss: 0 }],
    ]) };
    // cover 'w-home' -- 'the-holly-dark' -- 'the-deer-lawn' (feeding), in a line
    const dist = { 'the-holly-dark': 1, 'the-deer-lawn': 2, 'w-home': 0 };
    const z = { world, variantBase: new Map(), conditions: new Map(), regionOf: () => 'wood',
      nearby: (_from, r) => new Map(Object.entries(dist).filter(([, d]) => d <= r)) };
    const deer = { id: 'd', templateId: 'roe-deer', roomId: 'w-home', home: 'w-home', hp: 10 };
    return { z, deer };
  }
  check('the day\'s animals feed at dawn and dusk; the night\'s through the dark (2026-10-25)', () => {
    assert.equal(herds.roundPhase('roe-deer', DAWN), 'feed');
    assert.equal(herds.roundPhase('roe-deer', DUSK), 'feed');
    assert.equal(herds.roundPhase('roe-deer', NOON), 'rest');
    assert.equal(herds.roundPhase('roe-deer', NIGHT), 'rest');
    assert.equal(herds.roundPhase('tawny-owl', NIGHT), 'feed');
    assert.equal(herds.roundPhase('tawny-owl', NOON), 'rest');
  });
  check('at dawn a deer walks out to the nearest lawn; at noon it stays home (2026-10-25)', () => {
    const { z, deer } = roundWorld();
    assert.equal(herds.roundGround(z, deer, DAWN), 'the-deer-lawn');
    deer.roundAt = 0;
    assert.equal(herds.roundGround(z, deer, NOON), undefined);
    z.regionOf = () => 'road';
    deer.roundAt = 0;
    assert.equal(herds.roundGround(z, deer, DAWN), undefined, 'the road keeps no round');
  });
  check('out on the lawn at feeding time it keeps to the open; at noon it steps into cover (2026-10-25)', () => {
    const { z, deer } = roundWorld();
    deer.roomId = 'the-deer-lawn';
    const exits = [{ to_room: 'the-holly-dark' }, { to_room: 'the-long-glade' }];
    deer.roundFor = 'the-deer-lawn';
    assert.deepEqual(herds.roundExits(z, deer, exits, DAWN).map((e) => e.to_room), ['the-long-glade']);
    deer.roundFor = undefined;
    assert.deepEqual(herds.roundExits(z, deer, exits, NOON).map((e) => e.to_room), ['the-holly-dark']);
    deer.target = 'someone';
    assert.equal(herds.roundExits(z, deer, exits, NOON).length, 2, 'a fight is not a round');
  });
  check('the bell is heard inside the keep, not only read (2026-10-25)', () => {
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    const bell = ev.slice(ev.indexOf('async function tickBell'), ev.indexOf('case "active"', ev.indexOf('async function tickBell')) + 2400);
    for (const [what, snd] of [['a single bell-note rolls through the halls', 'bell'], ['The bell begins to RING', 'bells'], ['The bell shudders under your hand', 'bell'], ['The bell is RINGING inches from you', 'bells'], ['The bell is RINGING, a long way up', 'bells']]) {
      const at = bell.indexOf(what);
      assert.ok(at > 0, what + ' is still said');
      const call = bell.slice(at, bell.indexOf('\n', at));
      assert.match(call, new RegExp('"' + snd + '"\\);$'), what + ' carries the ' + snd + ' sound');
    }
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zone, /if \(far\) base\.far = far;/, 'a room line can carry its sound');
  });
  check('on hunted ground the prey give up the dawn, some stay in, and they bolt when you walk in (2026-10-25)', () => {
    const { z, deer } = roundWorld();
    z.world.mobTemplates.set('grey-wolf', { id: 'grey-wolf', name: 'a grey wolf', respawn_secs: 600, is_boss: 0 });
    const wolf = { id: 'w', templateId: 'grey-wolf', roomId: 'w-home', home: 'w-home', hp: 10 };
    assert.ok(!herds.wary(z, deer), 'quiet ground: nothing is wary');
    z.conditions.set('wood', { kind: 'hunted', since: 0 });
    assert.ok(herds.wary(z, deer), 'the deer are');
    assert.ok(!herds.wary(z, wolf), 'the wolves are not');
    const herd = Array.from({ length: 40 }, (_, i) => ({ ...deer, id: 'd' + i }));
    assert.ok(herd.every((d) => herds.phaseFor(z, d, DAWN) === 'rest'), 'the dawn is given up');
    const out = herd.filter((d) => herds.phaseFor(z, d, DUSK) === 'feed').length;
    assert.ok(out > 8 && out < 32, 'some come out in the last light, some stay in: ' + out);
    assert.ok(herd.every((d) => herds.phaseFor(z, d, DUSK) === herds.phaseFor(z, d, DUSK + 60_000)), 'the same answer all evening');
    assert.equal(herds.roundGround(z, herd.find((d) => herds.phaseFor(z, d, DUSK) === 'rest'), DUSK), undefined, 'one that stays in walks nowhere');
    z.conditions.delete('wood');
    assert.equal(herds.phaseFor(z, deer, DAWN), 'feed', 'and when the hunting stops, the dawn comes back');
    const verbs = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(verbs, /await ai\.provokeGrudges\(z, session, true\);[^\n]*\n\s*await ai\.waryBolt\(z, session, stealthMult\);/, 'walking in can put them to flight');
  });
  check('a carrion eater feeds on the bone ground, an adder on the warm rock (2026-10-25)', () => {
    assert.ok(herds.feedsAt('carrion-vulture', 'the-bone-ground'), 'a vulture is out on the carrion ground');
    assert.ok(herds.feedsAt('carrion-vulture', 'the-deer-lawn'), 'and where the grazers die');
    assert.ok(herds.feedsAt('stone-adder', 'the-ramp-head'), 'an adder lies on the warm rock');
    assert.ok(!herds.feedsAt('stone-adder', 'the-deer-lawn'), 'not on the grass');
    assert.ok(!herds.feedsAt('roe-deer', 'the-bone-ground'), 'a deer does not graze the bone fan');
    assert.ok(herds.feedsAt('ptarmigan', 'the-south-shelf'), 'the high mountain\'s one green strip');
  });
  check('at dawn a vulture walks out to the bone ground, not a lawn it cannot reach (2026-10-25)', () => {
    const { z } = roundWorld();
    z.world.mobTemplates.set('carrion-vulture', { id: 'carrion-vulture', name: 'a carrion vulture', respawn_secs: 780, is_boss: 0 });
    z.regionOf = () => 'mountain';
    z.nearby = (_f, r) => new Map([['m-home', 0], ['the-bone-ground', 3]].filter(([, d]) => d <= r));
    const v = { id: 'v', templateId: 'carrion-vulture', roomId: 'm-home', home: 'm-home', hp: 10 };
    assert.equal(herds.roundGround(z, v, DAWN), 'the-bone-ground');
  });
  check('the high feeding is feeding ground, joined both ways, and drawn as rock with green in it (2026-10-25)', () => {
    const sql = readFileSync(new URL('../migrations/340_the_high_feeding.sql', import.meta.url), 'utf8');
    for (const [room, from, there, back] of [['the-moss-flush', 'the-upper-brim', 'east', 'west'], ['the-red-moss', 'the-rust-slope', 'north', 'south'], ['the-cushion-ledge', 'the-first-step', 'south', 'north']]) {
      assert.ok(herds.feedsAt('ptarmigan', room), room + ' feeds the high grazers');
      assert.equal(terrainOf(room, '', 'mountain'), 'slab', room + ' is not an alder wood or a cairn field');
      assert.ok(sql.includes(`('${room}', '${there}', '${from}', NULL)`), room + ' leads back');
      assert.ok(sql.includes(`('${from}', '${back}', '${room}', NULL)`), from + ' leads to it');
    }
  });
  check('the round is wired into wandering, and the feeding ground is the one read from the rooms (2026-10-25)', () => {
    const src = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(src, /huntGround\(z, creature, now\) \?\? herds\.roundGround\(z, creature, now\) \?\? creature\.home/);
    assert.match(src, /exits = herds\.roundExits\(z, creature, exits, now\);/);
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const forage = zd.slice(zd.indexOf('export const SURFACE_FORAGE'), zd.indexOf('export const FORAGE_ROOMS'));
    for (const r of ['the-deer-lawn', 'the-white-ride', 'the-cockle-beds', 'the-long-glade']) assert.ok(forage.includes(`"${r}"`), r);
    for (const r of ['the-pale-grass', 'the-moon-glade']) assert.ok(!forage.includes(`"${r}"`), r + ' feeds nothing, by its own words');
  });
  console.log('what is going on in a region');
  const H = 3_600_000;
  function condWorld(line = 'mountain-hare', rows = 10) {
    const mobSpawns = [];
    for (let i = 0; i < rows; i++) mobSpawns.push({ template_id: line, room_id: 'm' + i });
    const world = { mobSpawns, mobTemplates: new Map([[line, { id: line, name: line === 'roe-deer' ? 'a roe-deer' : 'a mountain hare', max_hp: 10, respawn_secs: 240, is_boss: 0 }]]) };
    const traces = [];
    const z = { world, creatures: new Map(), sessions: new Map(), conditions: new Map(), condTrack: new Map(), variantBase: new Map(),
      regionOf: () => 'mountain', noteCreaturesChanged() {}, addTrace: (room, t) => traces.push({ room, ...t }) };
    for (let i = 0; i < rows; i++) z.creatures.set('h' + i, { id: 'h' + i, templateId: line, roomId: 'm' + i, home: 'm' + i, hp: 10 });
    return { z, traces };
  }
  check('a region killed over hard is hunted, and stops being once the killing stops (2026-10-25)', () => {
    const { z } = condWorld();
    for (let i = 0; i < 16; i++) conditions.noteKill(z, 'mountain', 0);
    conditions.tick(z, 0, true);
    assert.equal(conditions.of(z, 'mountain')?.kind, 'hunted');
    conditions.tick(z, 2 * H, true); // two half-lives: 16 -> 4
    assert.equal(conditions.of(z, 'mountain'), undefined);
    assert.ok(z.condTrack.get('rest:mountain') > 2 * H, 'and the ground rests after');
  });
  check('a prey herd left full half a day booms, and stays out in the open (2026-10-25)', () => {
    const { z } = condWorld('roe-deer');
    let first;
    for (let h = 0; h <= 40 && first === undefined; h++) { conditions.tick(z, h * H, true); if (conditions.of(z, 'mountain')) first = h; }
    assert.ok(first >= 12 && first <= 37, 'half a day full at the least, and the clocks staggered by up to a day: ' + first);
    assert.deepEqual([conditions.of(z, 'mountain')?.kind, conditions.of(z, 'mountain')?.line], ['boom', 'roe-deer']);
    assert.ok(conditions.booming(z, z.creatures.get('h0')));
    assert.equal(conditions.drawFor(z, 'grey-wolf', 'mountain'), 2, 'the wolves come after them');
    assert.equal(conditions.drawFor(z, 'stone-adder', 'mountain'), 1, 'what does not eat deer does not');
  });
  check('what nothing eats never booms (2026-10-25)', () => {
    const { z } = condWorld('bone-breaker');
    z.world.mobTemplates.set('bone-breaker', { id: 'bone-breaker', name: 'a bone-breaker', max_hp: 10, respawn_secs: 900, is_boss: 0 });
    for (let h = 0; h <= 60; h++) { conditions.tick(z, h * H, true); assert.equal(conditions.of(z, 'mountain'), undefined, 'hour ' + h); }
  });
  check('three deer are not a boom (2026-10-25)', () => {
    const { z } = condWorld('roe-deer', 3);
    for (let h = 0; h <= 60; h++) { conditions.tick(z, h * H, true); assert.equal(conditions.of(z, 'mountain'), undefined, 'hour ' + h); }
  });
  check('the sick do not breed (2026-10-25)', () => {
    const { z, add, count } = herdWorld(10, 0);
    for (let i = 0; i < 5; i++) add('roe-deer', 'w' + i); // half-full: the fastest breeding there is
    z.conditions.set('wood', { kind: 'murrain', line: 'roe-deer', since: 0 });
    herds.tick(z, 0, true);
    for (let m = 1; m <= 240; m++) herds.tick(z, m * 60_000, true);
    assert.ok(count('roe-deer') <= 7, 'strays only, no births: ' + count('roe-deer'));
  });
  check('a boom of hares turns to a murrain: thin, and dying out of sight (2026-10-25)', () => {
    const { z, traces } = condWorld();
    z.sessions.set('me', { roomId: 'm0' });
    let murrain;
    for (let t = 0; t <= 80 * H; t += H / 6) {
      conditions.tick(z, t, true);
      if (conditions.of(z, 'mountain')?.kind === 'murrain' && murrain === undefined) murrain = t;
      if (murrain !== undefined && !conditions.of(z, 'mountain')) break;
    }
    assert.ok(murrain !== undefined, 'the boom turned');
    assert.ok([...z.creatures.values()].every((c) => c.hp <= 6), 'the sick are thin');
    assert.ok(traces.length > 0 && traces.every((t) => t.room !== 'm0'), 'they die where nobody is standing');
    assert.ok(z.creatures.has('h0'), 'not the one you are watching');
    assert.equal(conditions.of(z, 'mountain'), undefined, 'it ends once the herd has thinned');
  });
  check('in a murrain the sick die only where nobody is standing (2026-10-25)', () => {
    const { z, traces } = condWorld();
    for (let i = 0; i < 9; i++) z.sessions.set('p' + i, { roomId: 'm' + i });
    z.conditions.set('mountain', { kind: 'murrain', line: 'mountain-hare', since: 0 });
    for (let t = 0; t <= 200 * H; t += H / 6) conditions.tick(z, t, true); // long enough that the one exposed is sure to go
    assert.ok(traces.length === 1 && traces[0].room === 'm9', 'only the one in the empty room went');
    assert.equal(traces[0].sick, true, 'and it reads as a body nothing touched');
    for (let i = 0; i < 9; i++) assert.ok(z.creatures.has('h' + i));
  });
  check('a booming herd is out on the feeding ground even at noon (2026-10-25)', () => {
    const { z } = condWorld('roe-deer');
    z.nearby = (_f, r) => new Map([['m0', 0], ['the-deer-lawn', 2]].filter(([, d]) => d <= r));
    const deer = z.creatures.get('h0');
    assert.equal(herds.roundGround(z, deer, NOON), undefined, 'an ordinary noon: in cover');
    z.conditions.set('mountain', { kind: 'boom', line: 'roe-deer', since: 0 });
    deer.roundAt = 0;
    assert.equal(herds.roundGround(z, deer, NOON), 'the-deer-lawn', 'too many of them to keep to cover');
  });
  check('the ground says it, and nothing else does (2026-10-25)', () => {
    const { z } = condWorld();
    z.conditions.set('mountain', { kind: 'murrain', line: 'mountain-hare', since: 0 });
    const lines = new Set();
    for (let i = 0; i < 400; i++) { const l = conditions.ambient(z, 'm1'); if (l) lines.add(l); }
    assert.ok(lines.size >= 2 && [...lines].some((l) => /hare/.test(l)));
    z.conditions.clear();
    assert.equal(conditions.ambient(z, 'm1'), null);
    const src = readFileSync(new URL('../src/conditions.ts', import.meta.url), 'utf8');
    assert.ok(!/keeper|gatehouseFeed|roomFeedBands/.test(src.replace(/\/\/.*$/gm, '')), 'the keeper stays quiet');
    const zsrc = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zsrc, /conditions\.tick\(this, t, true\)/);
    assert.match(zsrc, /conditions\.tick\(this, now, false\)/);
    assert.match(zsrc, /killer\.kills \+= 1;\n\s*conditions\.noteKill/);
    assert.match(zsrc, /const going = conditions\.ambient\(this, roomId\);/);
    assert.match(zsrc, /conditions: Object\.fromEntries\(this\.conditions\)/);
  });
  function thickWorld() {
    const { z } = condWorld('roe-deer');
    z.world.mobTemplates.set('grey-wolf', { id: 'grey-wolf', name: 'a grey wolf', max_hp: 26, respawn_secs: 600, is_boss: 0 });
    for (let i = 0; i < 4; i++) {
      z.world.mobSpawns.push({ template_id: 'grey-wolf', room_id: 'w' + i });
      z.creatures.set('g' + i, { id: 'g' + i, templateId: 'grey-wolf', roomId: 'w' + i, home: 'w' + i, hp: 26 });
    }
    return z;
  }
  check('ground with more hunters than its prey can feed goes thick, and the prey keep to cover (2026-10-26)', () => {
    const z = thickWorld();
    for (let h = 0; h <= 4; h++) { conditions.tick(z, h * H, true); assert.equal(conditions.of(z, 'mountain'), undefined, 'its own mix is not thick: hour ' + h); }
    for (let i = 1; i < 10; i++) z.creatures.delete('h' + i); // the deer eaten out from under the wolves
    conditions.tick(z, 5 * H, true);
    assert.equal(conditions.of(z, 'mountain'), undefined, 'not on the first reading');
    conditions.tick(z, 7 * H, true);
    assert.deepEqual([conditions.of(z, 'mountain')?.kind, conditions.of(z, 'mountain')?.line], ['thick', 'grey-wolf']);
    assert.ok(herds.wary(z, z.creatures.get('h0')), 'the deer that is left keeps to cover');
    assert.ok(!herds.wary(z, z.creatures.get('g0')), 'the wolves do not');
    const lines = new Set();
    for (let i = 0; i < 400; i++) { const l = conditions.ambient(z, 'm1'); if (l) lines.add(l); }
    assert.ok([...lines].some((l) => /grey wolf/.test(l)), 'the ground says whose');
    for (let i = 1; i < 10; i++) z.creatures.set('h' + i, { id: 'h' + i, templateId: 'roe-deer', roomId: 'm' + i, home: 'm' + i, hp: 10 });
    conditions.tick(z, 8 * H, true);
    assert.equal(conditions.of(z, 'mountain'), undefined, 'the prey back, it clears');
  });
  check('three wolves are not thick, however few the deer (2026-10-26)', () => {
    const z = thickWorld();
    z.creatures.delete('g3');
    for (let i = 0; i < 10; i++) z.creatures.delete('h' + i);
    for (let h = 0; h <= 10; h++) { conditions.tick(z, h * H, true); assert.equal(conditions.of(z, 'mountain'), undefined, 'hour ' + h); }
  });
  check('ground whose own mix is mostly hunters is not thick for being itself (2026-10-26)', () => {
    const z = thickWorld();
    for (let i = 3; i < 10; i++) { z.creatures.delete('h' + i); z.world.mobSpawns.splice(z.world.mobSpawns.findIndex((r) => r.room_id === 'm' + i), 1); }
    for (let i = 4; i < 8; i++) {
      z.world.mobSpawns.push({ template_id: 'grey-wolf', room_id: 'w' + i });
      z.creatures.set('g' + i, { id: 'g' + i, templateId: 'grey-wolf', roomId: 'w' + i, home: 'w' + i, hp: 26 });
    }
    for (let h = 0; h <= 10; h++) { conditions.tick(z, h * H, true); assert.equal(conditions.of(z, 'mountain'), undefined, 'eight wolves to three deer, as it was made: hour ' + h); }
  });
  check('only the hunters that run a ground down make it thick: eagles over it do not (2026-10-26)', () => {
    const { z } = condWorld('roe-deer');
    z.world.mobTemplates.set('hill-eagle', { id: 'hill-eagle', name: 'a hill eagle', max_hp: 20, respawn_secs: 600, is_boss: 0 });
    for (let i = 0; i < 4; i++) {
      z.world.mobSpawns.push({ template_id: 'hill-eagle', room_id: 'e' + i });
      z.creatures.set('e' + i, { id: 'e' + i, templateId: 'hill-eagle', roomId: 'e' + i, home: 'e' + i, hp: 20 });
    }
    for (let i = 1; i < 10; i++) z.creatures.delete('h' + i);
    for (let h = 0; h <= 10; h++) { conditions.tick(z, h * H, true); assert.equal(conditions.of(z, 'mountain'), undefined, 'hour ' + h); }
  });
  check('the regions are in the keeper census, not on a wall for players (2026-10-26)', () => {
    const z = thickWorld();
    conditions.tick(z, 0, true);
    const read = () => conditions.censusLines(z, 0).join('\n');
    assert.match(read(), /The Mountain — none; kills 0\.0; hunters 1\.0x/, 'its own mix reads 1x');
    for (let i = 0; i < 9; i++) z.creatures.delete('h' + i);
    for (let i = 0; i < 8; i++) conditions.noteKill(z, 'mountain', 0);
    conditions.tick(z, H, true);
    assert.match(conditions.censusLines(z, H).join('\n'), /The Mountain — none; kills \d\.\d; hunters 10\.0x \(over the line 0m\); scarce: roe-deer/, 'how near the next one is');
    z.conditions.set('mountain', { kind: 'thick', line: 'grey-wolf', since: 0 });
    assert.match(conditions.censusLines(z, H).join('\n'), /The Mountain — thick \(grey wolf\) for 60m/);
    const gsrc = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.ok(!/look tally|conditions\.tally/.test(gsrc), 'no tally in the gatehouse');
    assert.ok(!/look tally/.test(readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8')), 'and no chip for one');
    const vsrc = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(vsrc, /lines\.push\("", \.\.\.conditions\.censusLines\(z, now\)\);/, 'the census reads it');
  });
  check('a ranging pack is not scarce on its rows: the census says where it is (2026-10-28)', () => {
    const { z } = condWorld('roe-deer');
    z.regionOf = (room) => room.startsWith('c') ? 'wood' : 'mountain';
    z.world.mobTemplates.set('coyote', { id: 'coyote', name: 'a coyote', max_hp: 14, respawn_secs: 600, is_boss: 0 });
    for (let i = 0; i < 5; i++) {
      z.world.mobSpawns.push({ template_id: 'coyote', room_id: 'c' + i });
      z.creatures.set('k' + i, { id: 'k' + i, templateId: 'coyote', roomId: 'm0', home: 'm0', hp: 14 });
    }
    const read = conditions.censusLines(z, 0).join('\n');
    assert.ok(!/scarce: coyote/.test(read), 'the whole pack alive on the mountain is not scarce in the wood');
    assert.match(read, /Coyotes, ranging: 5 on The Mountain \(of 5\)/, 'where the pack is');
  });
  check('the command line is named a search, so Safari offers no contacts (2026-10-28)', () => {
    const psrc = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(psrc, /<input id="cmd" type="search" name="search" autocomplete="off"/);
  });
  check('an oversized save names what is filling it (2026-10-25)', () => {
    const blob = JSON.stringify({ small: 1, bloodOn: 'x'.repeat(40_000), board: 'y'.repeat(20_000), events: 'z'.repeat(5_000), tiny: [] });
    assert.equal(biggestFields(blob), 'bloodOn 39KB, board 20KB, events 5KB');
    assert.equal(biggestFields('not json'), 'unreadable');
  });
  check('fog over the open ground reaches the fortress gates (2026-10-25)', () => {
    const z = { events: new Map([['fog', { phase: 'active', bands: ['out'] }]]),
      bandOf: (r) => (r === 'gate' || r === 'sally-port' ? 'gate' : r === 'the-mass-grave' ? 'out' : 'wood') };
    assert.ok(wxCovers(z, 'fog', 'the-mass-grave'));
    assert.ok(wxCovers(z, 'fog', 'gate'), 'the gate stands on the open ground');
    assert.ok(wxCovers(z, 'fog', 'sally-port'));
    assert.ok(!wxCovers(z, 'fog', 'the-deer-lawn'), 'the wood is not under it');
  });
  check('a roof whose picture is the outside gets the outside\'s sky, and dawn and dusk are sent (2026-10-25)', () => {
    const z = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(z, /const openSkyForArt = this\.world!\.entryRooms\.has\(session\.roomId\) \|\| ROOF_SHOWS_OUTSIDE\.has\(session\.roomId\);/);
    assert.match(z, /lo: !seesArt\(session\.pubkey\) \? undefined : \(session\.artLow = lowLight\(\)\)/);
    assert.match(z, /lowLight\(\) !== \(s\.artLow \?\? 0\)\) this\.sendStatus\(s\)/, 'the picture turns at dawn even when the sky stays fog');
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    for (const r of ['the-marshals-lodging', 'the-mine-mouth', 'the-village-smithy', 'the-cider-house']) assert.ok(zd.match(/ROOF_SHOWS_OUTSIDE = new Set<string>\(\[([^\]]*)\]/)[1].includes(r), r);
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /paintScene\(f\.band, f\.sky, f\.terrain, f\.room, f\.torch, f\.skyroll, f\.place, f\.sea, f\.red, f\.covered, f\.nt, f\.lo\);/);
  });
  console.log('the ground shows what happened');
  function groundWorld() {
    const z = new ZoneDO({}, {});
    z.world = { rooms: new Map([['w1', { id: 'w1', region: 'wood' }]]), entryRooms: new Set(), mobTemplates: new Map() };
    z.traces = new Map();
    z.regionOf = () => 'wood';
    return z;
  }
  check('a death reads as what kind of death, never as what died (2026-10-25)', () => {
    const z = groundWorld(), now = 10 * H;
    const read = (t) => { z.traces.set('w1', [t]); return z.traceLines('w1', now).join(' '); };
    const sick = read({ kind: 'blood', at: now - 60_000, label: 'a mountain hare', prey: 'mountain-hare', sick: true });
    assert.match(sick, /nothing has been at it/);
    const eaten = read({ kind: 'blood', at: now - 60_000, label: 'a roe-deer', prey: 'roe-deer' });
    assert.match(eaten, /killed here and eaten where it fell/);
    const plain = read({ kind: 'blood', at: now - 60_000, label: 'a roe-deer', id: 'roe-deer' });
    assert.match(plain, /something died here moments ago/);
    for (const l of [sick, eaten, plain]) assert.ok(!/hare|deer|wolf/.test(l), 'it does not say what: ' + l);
  });
  check('grazing and bedding sign never pushes a kill out of view (2026-10-25)', () => {
    const z = groundWorld(), now = 10 * H;
    z.traces.set('w1', [
      { kind: 'blood', at: now - 30 * 60_000, prey: 'roe-deer' },
      { kind: 'graze', at: now - 60_000 }, { kind: 'lie', at: now - 50_000 }, { kind: 'graze', at: now - 40_000 },
    ]);
    const lines = z.traceLines('w1', now);
    assert.equal(lines.length, 3);
    assert.match(lines[0], /killed here/);
    assert.ok(lines.some((l) => /grazed/.test(l)) && lines.some((l) => /lie/.test(l)));
  });
  check('mud takes a print, any weather; ordinary ground does not without rain or snow (2026-10-25)', () => {
    const traces = [];
    const z = { addTrace: (room, t) => traces.push({ room, ...t }), snowUntil: 0, events: new Map(), rain: new Map(),
      world: { rooms: new Map() }, regionOf: () => 'wood', bandOf: () => 'wood' };
    z.wx = undefined;
    const deer = { templateId: 'roe-deer' };
    clues.leaveTracks(z, deer, 'the-black-mud', 'north', 0);
    assert.equal(traces.length, 1);
    assert.equal(traces[0].on, 'mud');
    assert.match(clues.trackLine(traces[0], 60_000), /Fresh tracks in the mud go north/);
    clues.leaveTracks(z, deer, 'the-holly-dark', 'north', 0);
    assert.equal(traces.length, 1, 'dry leaf-litter takes no print');
  });
  check('the round leaves its sign where a herd fed and where it lay (2026-10-25)', () => {
    const { z, deer } = roundWorld();
    z.traces = new Map();
    z.addTrace = (room, t) => { const l = z.traces.get(room) ?? []; l.push(t); z.traces.set(room, l); };
    herds.leaveSign(z, deer, 'the-deer-lawn', NOON);
    assert.equal(z.traces.get('the-deer-lawn')?.[0].kind, 'graze', 'it fed on the lawn');
    for (let m = 1; m <= 8 * 60; m += 10) herds.leaveSign(z, deer, 'the-deer-lawn', NOON + m * 60_000);
    assert.equal(z.traces.get('the-deer-lawn').length, 1, 'a day of grazing is one sign, not a pile that pushes the blood out');
    assert.ok(z.traces.get('the-deer-lawn')[0].at > NOON + 7 * H, 'kept fresh');
    herds.leaveSign(z, deer, 'the-holly-dark', DAWN);
    assert.equal(z.traces.get('the-holly-dark')?.[0].kind, 'lie', 'up out of cover at dawn: it lay there');
    herds.leaveSign(z, deer, 'w-home', NOON);
    assert.equal(z.traces.get('w-home'), undefined, 'drifting about in cover at noon leaves nothing');
  });
  check('the herds run through the offline catch-up and are saved with the world (2026-10-25)', () => {
    const zsrc = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zsrc, /ai\.scheduleArrivals\(this, t\);\n\s*herds\.tick\(this, t, true\)/);
    assert.match(zsrc, /ai\.scheduleArrivals\(this, now\);\n\s*herds\.tick\(this, now, false\)/);
    assert.match(zsrc, /herds: Object\.fromEntries\(this\.herds\)/);
    assert.match(zsrc, /this\.herds = new Map\(Object\.entries\(saved\.herds/);
  });

  check('a creature that ran and then stayed put stops showing the flee gait (2026-10-27)', () => {
    const chips = readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8');
    const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(chips, /: creature\.fled && creature\.fledAt && now - creature\.fledAt < FLEE_SHOWN_MS \? "flee"/, 'flee is shown only just after a room it ran');
    assert.ok(!/: creature\.fled \? "flee"/.test(chips), 'not for as long as the rout count is left over');
    assert.match(ai, /creature\.fled = \(creature\.fled \?\? 0\) \+ 1;\n\s*creature\.fledAt = now;/, 'each room run stamps the time');
  });

  check('creatures on the deep-water picture stand on its flagstones, not in the pools (2026-10-27)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const line = Number(pub.match(/\n  "deep-water": (\d+),/)?.[1]);
    assert.ok(line >= 68 && line <= 72, 'the floor starts at 70% of the frame; got ' + line);
  });

  check('a dropped wire does not ask the relays for your name again; new keys do (2026-10-27)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const resets = (pub.match(/(?<!var )profileTried = false;/g) || []).length;
    assert.equal(resets, 1, 'the lookup is re-armed in exactly one place');
    const rc = pub.slice(pub.indexOf('function reconnect() {'), pub.indexOf('function reconnect() {') + 1500);
    assert.match(rc, /profileTried = false;/, 'and that place is the identity switch');
  });

  check('the pale crawler is hungry on the ordinary clock, not a quarter of it (2026-10-27)', () => {
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const slow = zd.match(/export const SLOW_EATERS: Record<string, number> = (\{[^}]*\});/)?.[1];
    assert.ok(slow !== undefined, 'SLOW_EATERS is still declared');
    assert.ok(!/pale-crawler/.test(slow), 'the crawler is not on the slow clock');
  });

  check('a sheet drawn on transparency is keyed by its alpha, so its haze is not creature (2026-10-27)', () => {
    const cut = readFileSync(new URL('./cut-mob-sheet.mjs', import.meta.url), 'utf8');
    assert.match(cut, /const ALPHA_FLOOR = 32;/);
    assert.match(cut, /return sheetRaw\.data\[i \+ 3\] >= ALPHA_FLOOR && Math\.min\(/, 'the cell finder skips the haze');
    assert.match(cut, /if \(data\[p \+ 3\] < ALPHA_FLOOR\) \{ data\[p\] = data\[p\+1\] = data\[p\+2\] = data\[p\+3\] = 0; continue; \}/, 'and the key clears it');
  });

  check('two dire hyenas in one room fight for it, in their own voice (2026-10-27)', () => {
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    const rivals = zd.match(/export const RAT_RIVALS = new Set\(\[([^\]]*)\]\)/)?.[1] ?? '';
    assert.match(rivals, /"dire-hyena"/, 'the dire hyena is a rival of its own kind');
    assert.match(rivals, /"pale-crawler"/, 'and the crawler still is');
    assert.match(zd, /"dire-hyena": \{\n\s*feed: "[^"]*snapping and shrieking/, 'it fights in its own words, not the crawlers\' wet dark');
    assert.match(ai, /const lines = RIVAL_LINES\[creature\.templateId\]/, 'the fight reads the lines for its kind');
  });

  check('the drowned god looks before it rises, so it can be studied alive (2026-10-27)', () => {
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const a = zs.indexOf('if (creature.target && creature.templateId === DROWNED_GOD)');
    const b = zs.indexOf('} else if (!creature.target && DROWNERS.has(creature.templateId)) {', a);
    assert.ok(a > 0 && b > a, 'the god has its own wind-up ahead of the other drowned');
    const block = zs.slice(a, b) + '}';
    const run = new Function('creature', 'tmpl', 'now', 'DROWNED_GOD', 'GOD_ROUSE_MS', 'cap', 'pick', 'KING_WORDS', block);
    const me = { pubkey: 'me', roomId: 'the-gods-pool', name: 'Rome' }, said = [];
    const poses = [];
    const z = { sessions: new Map([['me', me]]), reachable: () => true, send: (_s, t) => said.push(t), roomFeed() {}, fxPose: (_r, _id, p) => poses.push(p) };
    const god = { id: 'g', templateId: 'drowned-god', roomId: 'the-gods-pool', target: null };
    const words = { 'drowned-god': ['"Come in," says the Drowned God.'] };
    const beat = (t) => run.call(z, god, { name: 'the Drowned God' }, t, 'drowned-god', 8000, (x) => x[0].toUpperCase() + x.slice(1), (xs) => xs[0], words);
    beat(0);
    assert.equal(god.target, null, 'the beat you come in, it only looks');
    assert.deepEqual(said, ['"Come in," says the Drowned God.'], 'and speaks to you first');
    assert.deepEqual(poses, [], 'still crouched on the rim while it speaks');
    assert.equal(me.target, undefined, 'and you are not in a fight, so you can study it');
    beat(4000);
    assert.equal(god.target, null, 'nor the beat after');
    beat(8000);
    assert.equal(god.target, 'me', 'then it comes for you');
    assert.deepEqual(poses, ['alert'], 'standing up as it does');
    god.target = null; me.target = null; god.rouseAt = 4000; me.roomId = 'elsewhere';
    beat(20000);
    assert.equal(god.rouseAt, undefined, 'an empty pool settles it again');
    me.roomId = 'the-gods-pool'; god.target = 'me'; god.rouseAt = 30000;
    beat(30000);
    assert.equal(god.rouseAt, undefined, 'a fight you started drops the wind-up, so the next visit gets its own');
  });

  await checkAsync('the surface warden crosses the sally port back to his round instead of circling the catacombs (2026-10-30)', async () => {
    const z = new ZoneDO({}, {});
    const ex = (pairs) => pairs.map(([dir, to_room]) => ({ dir, to_room, key_item: null }));
    const rooms = ['crypt-steps', 'catacomb', 'sally-port', 'the-sally-ditch', ...PATROLS['warden-surface']];
    z.world = { mobTemplates: new Map([['warden-surface', { id: 'warden-surface', name: 'a hollow warden', max_hp: 30, is_boss: 0 }]]), mobSpawns: [], itemTemplates: new Map(),
      rooms: new Map(rooms.map((r) => [r, { id: r }])), entryRooms: new Set(['sally-port']), safeRooms: new Set(),
      exits: new Map([['crypt-steps', ex([['up', 'sally-port'], ['north', 'catacomb']])], ['catacomb', ex([['south', 'crypt-steps']])],
        ['sally-port', ex([['down', 'crypt-steps'], ['west', 'the-sally-ditch']])], ['the-sally-ditch', ex([['east', 'sally-port']])]]) };
    z.send = () => {}; z.roomFeed = () => {}; z.refreshRoomCtx = () => {}; z.noteCreaturesChanged = () => {};
    const w = { id: 'w', templateId: 'warden-surface', roomId: 'crypt-steps', hp: 30, target: null, grudges: [], home: 'muster' };
    z.creatures = new Map([['w', w]]);
    await creatureMoves(z, w, Date.now(), 'wander', true);
    assert.equal(w.roomId, 'the-sally-ditch', 'through the gate in one beat and out onto his round, not back into the catacombs');
  });

  await checkAsync('a crawler you can plainly see does not drop out of the dark as you leave (2026-10-30)', async () => {
    const z = new ZoneDO({}, {});
    z.world = { mobTemplates: new Map([['pale-crawler', { id: 'pale-crawler', name: 'a pale crawler', level: 2 }]]), mobSpawns: [], itemTemplates: new Map(),
      rooms: new Map([['dry-cistern', { id: 'dry-cistern' }]]), exits: new Map(), entryRooms: new Set(), safeRooms: new Set() };
    const crawler = { id: 'c', templateId: 'pale-crawler', roomId: 'dry-cistern', hp: 10, target: null, hidden: false, curious: 'elsewhere', grudges: [] };
    z.creatures = new Map([['c', crawler]]);
    const said = []; let struck = 0;
    z.send = (_s, t) => said.push(t); z.roomFeed = () => {}; z.refreshRoomCtx = () => {};
    z.creatureFirstStrike = async () => { struck++; };
    z.wearsTrait = () => false; z.roomLit = () => false;
    const me = { pubkey: 'me', name: 'Rome', roomId: 'dry-cistern', items: [], equipped: {} };
    await wakeListeners(z, me, 'dry-cistern', 1, 'hears you move — and swings as you slip past!');
    assert.equal(struck, 0, 'no free blow from a thing in plain view: ' + said);
    assert.equal(crawler.target, null, 'and it does not lock on');
    crawler.hidden = true; crawler.curious = undefined;
    await wakeListeners(z, me, 'dry-cistern', 1, 'hears you move — and swings as you slip past!');
    assert.equal(struck, 1, 'a hidden one still drops on you');
  });

  await checkAsync('the kings speak to you as you come in, before any fight (2026-10-27)', async () => {
    const z = new ZoneDO({}, {});
    z.world = { mobTemplates: new Map([['forgotten-king', { id: 'forgotten-king', name: 'the Forgotten King', is_boss: 1, level: 5 }]]), mobSpawns: [], itemTemplates: new Map() };
    const king = { id: 'k', templateId: 'forgotten-king', roomId: 'sunken-throne', hp: 90, grudges: [], target: null };
    z.creatures = new Map([['k', king]]);
    const said = [], feed = [];
    z.send = (_s, t) => said.push(t); z.roomFeed = (_r, t) => feed.push(t); z.outOfWorld = () => false;
    z.creatureFirstStrike = async () => {};
    const me = { pubkey: 'me', name: 'Rome', roomId: 'sunken-throne' };
    await provokeGrudges(z, me, true);
    assert.equal(said.length, 1, 'he says something as you come in: ' + said);
    assert.match(said[0], /"/, 'in his own words');
    assert.deepEqual(feed, ['The Forgotten King speaks to Rome.'], 'and the room sees him speak to you');
    assert.equal(king.target, null, 'and does not start the fight');
    said.length = 0;
    await provokeGrudges(z, me, false);
    assert.equal(said.length, 0, 'a reconnect is not walking in');
    king.grudges = [{ pk: 'me', at: Date.now() }];
    await provokeGrudges(z, me, true);
    assert.ok(!said.some((t) => /"/.test(t)), 'with a quarrel between you there is no talk');
  });

  check('the log keeps a day of text and lets the rest go (2026-10-27)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const keep = eval(pub.match(/var LOG_KEEP_MS = ([^;]+);/)[1]);
    assert.equal(keep, 24 * 3600000, 'a day');
    const fn = pub.match(/function logTrim\(now\) \{[\s\S]*?\n\}/)[0];
    assert.match(pub, /new MutationObserver\([\s\S]{0,200}logStamp\(muts\[i\]\.addedNodes/, 'every line is stamped, wherever it is added from');
    const H = 3600000, now = 100 * H;
    const kids = [{ __t: now - 30 * H }, { __t: now - 25 * H }, { __t: now - 2 * H }, { __t: now }];
    const log = { get firstChild() { return kids[0] || null; }, removeChild(n) { kids.splice(kids.indexOf(n), 1); } };
    new Function('log', 'LOG_KEEP_MS', fn + '; logTrim(' + now + ');')(log, keep);
    assert.deepEqual(kids.map((k) => (now - k.__t) / H), [2, 0], 'older than a day comes off the top, the rest stays');
  });

  check('the torch effects let go of old creature strips instead of keeping every one (2026-10-27)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const fn = pub.match(/function fxMobPrune\(\) \{[\s\S]*?\n\}/)[0];
    const keep = +pub.match(/var FX_MOB_KEEP = (\d+)/)[1], shown = +pub.match(/FX_MOBS = (\d+)/)[1];
    assert.ok(keep >= shown, 'it never lets go of what is on the row');
    assert.match(pub.match(/function fxMobs\(box\) \{[\s\S]*?\n\}/)[0], /fxMobPrune\(\)/, 'and it prunes as it draws');
    const freed = [];
    const run = new Function('fxMobTex', 'fxMobSeen', 'fxGl', 'FX_MOB_KEEP', fn + '; fxMobPrune();');
    const tex = {}, seen = {};
    for (let i = 0; i < 40; i++) { tex['m' + i] = { n: i }; seen['m' + i] = i; }
    run(tex, seen, { deleteTexture: (t) => freed.push(t.n) }, keep);
    assert.equal(Object.keys(tex).length, keep, 'only the last few stay: ' + Object.keys(tex).length);
    assert.equal(freed.length, 40 - keep, 'and the rest are freed on the card, not just forgotten');
    assert.ok(tex['m39'] && !tex['m0'], 'it is the oldest that go');
  });

  check('the woodward winds up on frame 6 and brings the axe down on frame 7; his second blow skips the wind-up (2026-10-27)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const f = JSON.parse(pub.match(/"the-woodward":\s*\{ n: \d+, aspect: [\d.]+, f: (\{[^}]*\})/)[1]);
    assert.equal(f.alert, 2, 'frame 3 is where he squares up');
    assert.equal(f.swing, 5, 'frame 6 is the wind-up');
    assert.equal(f.attack, 6, 'frame 7 is the axe coming down');
    assert.equal(f.sweep, 6, 'and the second blow lands on it too');
    assert.match(pub, /var woundUp = f\.swing !== undefined && blow === "attack";/, 'only the main blow goes through the wind-up');
    assert.match(pub, /var gatherTo = woundUp \? 0\.45 : 0\.20/, 'and it is held for 45% of the swing, long enough to see');
    assert.match(pub, /name = woundUp \? "swing" : a\.watch;/, 'the gather shows the wind-up frame');
    const build = readFileSync(new URL('./build-mob-strips.mjs', import.meta.url), 'utf8');
    assert.match(build, /"the-woodward": \{ "swing": "attack", "attack": "sweep" \}/, 'a rebuild keeps it');
  });

  check('the sapper\'s blow lands on his pick-down frame: alert, attack, then work-the-face (2026-10-27)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const row = pub.match(/"the-sapper":\s*\{ n: \d+, aspect: [\d.]+, f: (\{[^}]*\})/);
    assert.ok(row, 'his strip row is there');
    const f = JSON.parse(row[1]);
    assert.equal(f.recover, f['work-the-face'], 'he comes off the swing with the pick swung down');
    const build = readFileSync(new URL('./build-mob-strips.mjs', import.meta.url), 'utf8');
    assert.match(build, /"the-sapper": \{ "recover": "work-the-face" \}/, 'a rebuild keeps it');
  });

  check('the sapper is one of the dead, and bare bone like his picture (2026-10-27)', () => {
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const setOf = (name) => zd.match(new RegExp('export const ' + name + ' = new Set\\(\\[([\\s\\S]*?)\\]\\);'))?.[1] ?? '';
    assert.match(setOf('HOLLOW'), /"the-sapper"/, 'he does not bleed, hunger or run');
    assert.doesNotMatch(setOf('GRAVE_FLESH'), /"the-sapper"/, 'he is drawn as bone, so only a blunt blow finds his vitals');
  });

  check('the three marsh grounds take their own rooms off the shared marsh (2026-10-28)', () => {
    const own = {
      'marsh-samphire': ['samphire-flat', 'samphire-flats', 'samphire-island', 'sea-lavender', 'saltmarsh-pools', 'flashes', 'salt-pans', 'salt-workings'],
      'marsh-carr': ['wet-carr', 'decoy-wood', 'decoy-pipe', 'fowlers-track', 'fowlers-hide', 'wildfowler', 'old-boat', 'quaking-turf'],
      'marsh-dyke': ['sea-dyke', 'old-sea-bank', 'salting-edge', 'saltings-gate', 'marsh-strand', 'samphire-turn'],
      'ferry-hard': ['far-hard', 'far-ferry-steps', 'far-noust', 'boat-house', 'oar-store', 'ferryman-stone', 'signal-mast', 'warping-post', 'ferry-house', 'ferry-steps', 'ferry-strand'],
    };
    for (const [ground, rooms] of Object.entries(own))
      for (const r of rooms) assert.equal(terrainOf('the-' + r, '', 'crossing'), ground, 'the-' + r);
    assert.equal(terrainOf('the-saltings', '', 'crossing'), 'marsh', 'the rest of the marsh keeps the old plate');
    assert.equal(terrainOf('the-mid-channel', '', 'crossing'), 'ferry', 'the channel keeps the ferry plate');
  });

  check('every ground in the game is under its region in the preview panel, never Other (2026-10-28)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const block = pub.match(/var TERRAIN_SCENES = \{([\s\S]*?)\n\};/)[1];
    const grounds = [...block.matchAll(/^\s*"?([a-z][a-z-]*)"?\s*:/gm)].map(m => m[1]);
    const panel = readFileSync(new URL('./game-panel.js', import.meta.url), 'utf8');
    const placed = new Set([...panel.match(/var GROUND_PLACE = \{([\s\S]*?)\};/)[1].matchAll(/:\s*"([^"]*)"/g)].flatMap(m => m[1].split(' ')));
    assert.ok(grounds.length > 40, 'read the ground list');
    for (const g of ['marsh-samphire', 'marsh-carr', 'marsh-dyke', 'ferry-hard', 'road-gill']) assert.ok(grounds.includes(g), g + ' is a ground');
    const missing = grounds.filter(g => !placed.has(g));
    assert.deepEqual(missing.filter(g => /^(marsh|ferry|road|wood)-/.test(g)), [], 'these land under Other');
  });

  check('kill sign counts every kill, tells sizes and ages apart, varies its words and never names them (2026-10-28)', () => {
    const z = new ZoneDO({}, {});
    z.world = { rooms: new Map([['moor', { id: 'moor', name: 'The Moor', region: 'out' }]]), entryRooms: new Set() };
    const now = Date.now(), H = 3_600_000;
    const k = (prey, ago) => ({ kind: 'blood', prey, at: now - ago });
    const say = (list) => { z.traces = new Map([['moor', list]]); return z.traceLines('moor', now); };
    for (let b = 0; b < 12; b++) {
      const five = say([k('roe-deer', 5 * 60_000 + b), k('hill-fox', 20 * 60_000 + b), k('roe-deer', 2 * H + b), k('hill-fox', 3 * H + b), k('roe-deer', 4 * H + b)]);
      assert.equal(five.filter((l) => /kill/i.test(l)).length, 1, five.join(' | '));
      assert.match(five[0], /[Ff]ive/, five[0]);
      assert.match(five[0], /two (fresh|still wet)/, five[0]);
      const two = say([k('rat', 60_000 + b), k('red-stag', 2 * H + b)])[0];
      assert.match(two, /A small one, fresh: .*\. A big one, older: .*\.$/, two);
      const three = say([k('rat', 60_000 + b), k('mountain-hare', 2 * H + b), k('hill-fox', 3 * H + b)])[0];
      assert.match(three, /Two small ones, one still fresh: .* A middling one, older: /, three);
      const mixed5 = say([k('rat', 60_000 + b), k('rat', 2 * H + b), k('ptarmigan', 3 * H + b), k('roe-deer', 2 * H + 5 + b), k('wild-boar', 4 * H + b)])[0];
      assert.match(mixed5, /[Ff]ive kills.*three small, one middling and one big/, mixed5);
      const same = say([k('roe-deer', 60_000 + b), k('hill-fox', 2 * H + b)])[0];
      assert.doesNotMatch(same, /small|middling|big/, 'one size keeps the plain count line: ' + same);
      for (const l of [five[0], two, three, mixed5, same]) assert.doesNotMatch(l, /\b(rat|stag|hare|fox|deer|boar|ptarmigan)\b/i, 'never names it: ' + l);
    }
    const one = new Set(Array.from({ length: 40 }, (_, b) => say([k('roe-deer', 60_000 + b * 7919)])[0]));
    assert.ok(one.size >= 3, 'a fresh kill reads in more than one way');
    assert.equal(say([k('roe-deer', 61_234)])[0], say([k('roe-deer', 61_234)])[0], 'the same kill reads the same on every look');
    assert.match(say([k('roe-deer', 60_000)])[0], /kill|killed|eaten/i, 'one kill still reads as a kill');
    // Only an animal something really hunts may be sorted (seals, bears and a cave lion once were).
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const preys = zd.slice(zd.indexOf('export const PREYS_ON'), zd.indexOf('\n]);', zd.indexOf('export const PREYS_ON')));
    const hunted = new Set([...preys.matchAll(/new Set\(\[([^\]]*)\]\)/g)].flatMap((m) => [...m[1].matchAll(/"([a-z-]+)"/g)].map((x) => x[1])));
    for (const name of ['KILL_SMALL', 'KILL_BIG']) {
      const ids = [...zd.match(new RegExp('export const ' + name + ' = new Set\\(\\[([\\s\\S]*?)\\]\\);'))[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
      assert.deepEqual(ids.filter((id) => !hunted.has(id)), [], name + ' holds something nothing hunts');
    }
  });

  check('worn gear shows its condition on the pack row without opening it (2026-10-29)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const condLine = pub.match(/ var cond=([^;]*);/)[1];
    const stateExpr = pub.match(/state\.className='mud-state';state\.textContent=([\s\S]*?);\n/)[1];
    const show = new Function('type', 'it', 'place', 'goodsWorthText', 'var cond=' + condLine + '; return ' + stateExpr + ';');
    const row = (it) => show('bench', it, 'pack', () => '');
    assert.equal(row({ equipped: true, condWord: 'worn' }), 'worn, equipped');
    assert.equal(row({ equipped: true, condWord: 'sound' }), 'equipped');
    assert.equal(row({ sealed: true, condWord: 'battered' }), 'sealed, battered');
    assert.equal(row({ condWord: 'failing' }), 'failing');
  });

  console.log(`\n${passed} regression checks pass`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
