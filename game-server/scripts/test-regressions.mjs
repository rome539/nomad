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
import { readFileSync } from 'node:fs';
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
        "export {cmdMap} from './lore';",
        "export {cmdGo} from './verbs';",
        "export {receiptGoods, goodsWorth, worthMark, worthPips, cmdRepair, sendTrade, glutMult, tickGlut, offerCore, cmdOffer} from './gate';",
        "export {cmdLook} from './verbs';",
        "export * as body from './body';",
        "export * as ratking from './ratking';",
        "export * as coughing from './cough';",
        "export {reconcilePopulation, ate, scheduleArrivals} from './ai';",
        "export * as herds from './herds';",
        "export * as conditions from './conditions';",
        "export * as clues from './clues';",
        "export {biggestFields} from './simstore';",
        "export {wxCovers} from './events';",
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
  const { wxCovers, biggestFields, clues, conditions, cmdOffer, glutMult, tickGlut, offerCore, terrainOf, MOUTHS, herds, scheduleArrivals, GATEHOUSE_NOARG, ZoneDO, parse, den, cmdMap, ate, study, cmdStudy, cmdJournal, refreshStudied, journalKey, rising, loadLeaderboard, handleBench, sendCtx, cmdGo, receiptGoods, goodsWorth, worthMark, worthPips, cmdRepair, sendTrade, cmdLook, body, ratking, coughing, reconcilePopulation, PATROLS, WARRENS_ROOMS, WHETSTONE_ROOMS, WHET_CAP, findsVitals, BIG_VITALS, VITALS_CREATURE, VERMIN, GRAZERS, DEN_BUILDS, DEN_BUILD_WORK, OUTDOOR_ROOMS, DAY_CYCLE_MS, isNight, isFullMoon } = await import(pathToFileURL(output));

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
    ratking.crown(z, Date.now());
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
    assert.match(ai, /if \(ratking\.spares\(z, creature, session\)\) continue;\s*const hostile = AGGRESSIVE\.has\(creature\.templateId\) \|\| bloodWake \|\| ratking\.bold\(z, creature\);/);
    assert.match(ai, /remembers\(z, creature, s\.pubkey, now\) \|\| ratking\.bold\(z, creature\)\)\s*&& !ratking\.spares\(z, creature, s\)/);
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
    z.addTrace = (room, tr) => z.traces.set(room, [...(z.traces.get(room) ?? []), tr]);
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

  console.log(`\n${passed} regression checks pass`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
