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
        "export {receiptGoods, goodsWorth, worthMark, worthPips, cmdRepair, sendTrade} from './gate';",
        "export {cmdLook} from './verbs';",
        "export {WHETSTONE_ROOMS, WHET_CAP} from './zone-data';",
        "export {VERMIN, GRAZERS, DEN_BUILDS, DEN_BUILD_WORK, OUTDOOR_ROOMS, DAY_CYCLE_MS} from './zone-data';",
        "export {isNight, isFullMoon} from './zone-util';",
      ].join('\n'),
      resolveDir: root, loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'silent',
    plugins: [{ name: 'worker-text', setup(b) {
      b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ },
        async a => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' }));
    } }],
  });
  const { ZoneDO, parse, den, cmdMap, cmdGo, receiptGoods, goodsWorth, worthMark, worthPips, cmdRepair, sendTrade, cmdLook, WHETSTONE_ROOMS, WHET_CAP, VERMIN, GRAZERS, DEN_BUILDS, DEN_BUILD_WORK, OUTDOOR_ROOMS, DAY_CYCLE_MS, isNight, isFullMoon } = await import(pathToFileURL(output));

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

  console.log(`\n${passed} regression checks pass`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
