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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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
        "export {ZoneDO, bodyNewerThanSave} from './zone';",
        "export {eatingShown, mealWords} from './ai';",
        "export {parse} from './parser';",
        "export * as den from './den';",
        "export {cmdMap, copyCounts, worldGrid, inkRooms} from './lore';",
        "export {cmdGo} from './verbs';",
        "export {handleGatehouse} from './gate';",
        "export {receiptGoods, goodsWorth, worthMark, worthPips, cmdRepair, sendTrade, glutMult, tickGlut, offerCore, cmdOffer} from './gate';",
        "export {bodyEaten, cmdLook, keepingLines, cmdSmoke, cmdInventory} from './verbs';",
        "export * as light from './light';",
        "export * as body from './body';",
        "export * as ratking from './ratking';",
        "export * as coughing from './cough';",
        "export * as campfire from './campfire';",
        "export {cmdCook, moveLoad} from './verbs';",
        "export {walkCost} from './exhaustion';",
        "export {COOK_RECIPES, CAMPFIRE_MS, SNOW_LOAD_KG, WET_DRY_MS, wardAt} from './zone-data';",
        "export {forageGround, fightIn, shiesNoise, towardBody, deadEatsAt, keeperRead, eatsAt, rollBloodline, reconcilePopulation, ate, scheduleArrivals, provokeGrudges, creatureTell, arrivalLine, wakeListeners, creatureMoves, creatureEatsHere, scavengerFeeds, mobPresence, presenceLine, fallAsleep, broodBirths} from './ai';",
        "export {waters, ratHoards, godMet, godRemembers, rollDen, mountainHomes, catchMult} from './ai';",
        "export {plan as groupPlan, join as groupJoin, tick as groupTick, pickHome as groupPickHome, holdGround, packQuarry, holdLand, holdBody, mobEagle} from './groups';",
        "export {PREYS_ON, PACK_PREY, SMALL_PREY, SMALL_EATERS} from './zone-data';",
        "export * as beasts from './beasts';",
        "export {tick as flightTick} from './flight';",
        "export {GROUND_OF, SETTLES_ON, settlesOn} from './mountain-ground';",
        "export {MOUNTAIN_QUARTER_ROOMS} from './detail';",
        "export * as chronicle from './chronicle';",
        "export * as aliases from './aliases';",
        "export { VERB_ALIASES } from './parser';",
        "export { gatehouseHeard } from './gate';",
        "export * as follow from './follow';",
        "export { cmdEmote, emoteLine } from './verbs';",
        "export {nextBellAt, dayLine, weatherSky, saysWeather, skyClause} from './events';", "export * as grassPatch from './grass';",
        "export {milestoneRead} from './lore';",
        "export {ROOM_FEATURES} from './detail';",
        "export {starvingHunts, huntsAt, woundedPreyHunts} from './ai';",
        "export * as whiteroe from './whiteroe';",
        "export {cmdDive} from './verbs';",
        "export * as herds from './herds';",
        "export * as conditions from './conditions';",
        "export * as clues from './clues';",
        "export {biggestFields, saveSim, loadSim, newCache} from './simstore';",
        "export {rainNextDoor, rainNearby, wxCovers, tickEscape, tickCrabs, crabMarching, crabsOn} from './events';",
        "export * as study from './study';",
        "export {cmdStudy, cmdJournal, refreshStudied, journalKey} from './lore';",
        "export * as rising from './rising';",
        "export {loadLeaderboard} from './world';",
        "export {handleBench} from './gate';",
        "export {benchEquip, boxedByName} from './gate';",
        "export * as grass from './grass';",
        "export {digest} from './ai';",
        "export {FORAGE_ROOMS, SHIELING_HAMLET_ROOMS, BEAKS, BITERS, GATEHOUSE_BARRED} from './zone-data';",
        "export {cmdEquip} from './verbs';",
        "export {sendCtx, timedPose, bodiesIn} from './chips';",
        "export {beforeAttack as styleBeforeAttack, keepAloft as styleKeepAloft} from './styles';",
        "export * as carving from './carving';",
        "export * as feverrat from './feverrat';",
        "export {tickFever, fevered, feverBites, feverLifts, feverCoughs, eventAmbient, coldBites, snowed, paleDrakeSnows} from './events';",
        "export {FEVER_RAT, FEVER_RAT_HOME, FEVER_RAT_HOLD_MS, FEVER_CLOTH_TRAIT, bossStands} from './zone-data';",
        "export * as pvp from './pvp';",
        "export {PATROLS, patrolRoute, WARRENS_ROOMS, DARK_ROOMS, PITS_ROOMS, GATEHOUSE_NOARG, MOUTHS, WITNESSED_LINES} from './zone-data';",
        "export {OUTDOOR_REGIONS, INDOOR_ROOMS} from './zone-data';",
        "export {WHETSTONE_ROOMS, WHET_CAP, findsVitals, BIG_VITALS, VITALS_CREATURE} from './zone-data';",
        "export {VERMIN, GRAZERS, DEN_BUILDS, DEN_BUILD_WORK, OUTDOOR_ROOMS, DAY_CYCLE_MS} from './zone-data';",
        "export {isNight, isFullMoon, terrainOf, skyClear, lidOpen, foodGone, auroraNight, cometNight} from './zone-util';",
        "export {nightExtras} from './events';",
        "export {NIGHT_AURORA, NIGHT_COMET, NIGHT_STARS_TURN} from './zone-data';",
        "export {tickFoodRot, rottedAway, feverPhase, feverGravesOf} from './events';",
        "export {FEVER_GRAVES} from './zone-data';",
        "export {loadContainer, setRottedAway} from './world';",
        "export {SKY_CLEAR_EVERY, ECLIPSE_TOTAL_LINES, ECLIPSE_SUN_LINES, MOON_SKY, MOON_ARC} from './zone-data';",
        "export * as roomSound from './sound';",
        "export {cleanCommand, dialId} from './security';",
        "export {saveMark} from './zone-util';",
        "export {leaderboardRank} from './world';",
        "export {PLAYER_SAVE_MAX_MS} from './zone-data';",
        "export {handleVerify, handleChallenge} from './auth';",
        "export {finalizeEvent as signNostr, generateSecretKey as newNostrKey} from 'nostr-tools';",
      ].join('\n'),
      resolveDir: root, loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'silent',
    plugins: [{ name: 'worker-text', setup(b) {
      b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ },
        async a => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' }));
    } }],
  });
  const { wardAt, saysWeather, skyClause, weatherSky, bodiesIn, styleBeforeAttack, styleKeepAloft, holdBody, mobEagle, forageGround, fightIn, shiesNoise, towardBody, deadEatsAt, grassPatch, dayLine, keeperRead, eatsAt, GATEHOUSE_BARRED, bodyEaten, BEAKS, BITERS, digest, grass, FORAGE_ROOMS, SHIELING_HAMLET_ROOMS, benchEquip, boxedByName, cmdEquip, holdLand, woundedPreyHunts, packQuarry, rollBloodline, bossStands, rainNextDoor, rainNearby, mealWords, waters, beasts, SMALL_PREY, SMALL_EATERS, catchMult, PACK_PREY, flightTick, GROUND_OF, SETTLES_ON, settlesOn, MOUNTAIN_QUARTER_ROOMS, holdGround, groupPlan, groupJoin, groupTick, groupPickHome, PREYS_ON, rollDen, mountainHomes, eatingShown, VERB_ALIASES, gatehouseHeard, aliases, follow, cmdEmote, emoteLine, milestoneRead, nextBellAt, chronicle, ROOM_FEATURES, godMet, godRemembers, roomSound, feverrat, tickFever, fevered, feverBites, feverLifts, feverCoughs, eventAmbient, FEVER_RAT, FEVER_RAT_HOME, FEVER_RAT_HOLD_MS, FEVER_CLOTH_TRAIT, whiteroe, starvingHunts, huntsAt, carving, pvp, ratHoards, cmdDive, wxCovers, tickEscape, tickCrabs, crabMarching, crabsOn, biggestFields, clues, conditions, cmdOffer, glutMult, tickGlut, offerCore, terrainOf, MOUTHS, herds, scheduleArrivals, GATEHOUSE_NOARG, ZoneDO, parse, den, cmdMap, copyCounts, worldGrid, ate, study, cmdStudy, cmdJournal, refreshStudied, journalKey, rising, loadLeaderboard, handleBench, sendCtx, cmdGo, receiptGoods, goodsWorth, worthMark, worthPips, cmdRepair, sendTrade, cmdLook, keepingLines, cmdSmoke, cmdInventory, handleGatehouse, light, body, ratking, coughing, campfire, cmdCook, moveLoad, walkCost, COOK_RECIPES, CAMPFIRE_MS, SNOW_LOAD_KG, WET_DRY_MS, reconcilePopulation, provokeGrudges, creatureTell, arrivalLine, wakeListeners, creatureMoves, creatureEatsHere, scavengerFeeds, mobPresence, presenceLine, WITNESSED_LINES, OUTDOOR_REGIONS, INDOOR_ROOMS, PATROLS, patrolRoute, WARRENS_ROOMS, DARK_ROOMS, PITS_ROOMS, WHETSTONE_ROOMS, WHET_CAP, findsVitals, BIG_VITALS, VITALS_CREATURE, VERMIN, GRAZERS, DEN_BUILDS, DEN_BUILD_WORK, OUTDOOR_ROOMS, DAY_CYCLE_MS, isNight, isFullMoon, skyClear, lidOpen, foodGone, auroraNight, cometNight, nightExtras, NIGHT_AURORA, NIGHT_COMET, NIGHT_STARS_TURN, tickFoodRot, rottedAway, feverPhase, feverGravesOf, FEVER_GRAVES, loadContainer, setRottedAway, SKY_CLEAR_EVERY, ECLIPSE_TOTAL_LINES, ECLIPSE_SUN_LINES, MOON_SKY, MOON_ARC, bodyNewerThanSave, saveSim, loadSim, newCache, fallAsleep, coldBites, snowed, paleDrakeSnows, timedPose, broodBirths, inkRooms } = await import(pathToFileURL(output));

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

  check('the spate is gone: the beck never floods the road (2026-11-11)', () => {
    // Removed outright: not drawn by the roll, never ticked, no water on screen,
    // and a beck left up by an older build is cleared on the first beat.
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    assert.ok(!/\["spate",/.test(ev), 'the spate is back in the roll');
    assert.ok(!/tickSpate|spated\(|silted\(/.test(ev), 'the spate still ticks or floods');
    assert.ok(/z\.events\.delete\("spate"\)/.test(ev), 'an old spate state is not cleared');
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
  await checkAsync('look finds the dead you killed before a trophy in the pack (2026-10-31)', async () => {
    const { z, me, said } = shelfWorld();
    z.world.mobTemplates = new Map([['rat-king', { id: 'rat-king', name: 'the rat king' }], ['rat', { id: 'rat', name: 'a scabby rat' }]]);
    z.world.itemTemplates.set('rat-tail', { id: 'rat-tail', name: 'a rat tail', description: 'Proof of one small victory.', slot: '' });
    me.items.push({ rowId: 'r1', itemId: 'rat-tail', condition: 100, serial: null, equipped: false });
    z.findCreatureIn = () => null;
    z.traces = new Map([['gate', [{ kind: 'blood', at: Date.now(), id: 'rat', label: 'a scabby rat' }, { kind: 'blood', at: Date.now(), id: 'rat-king', label: 'the rat king' }]]]);
    await cmdLook(z, me, 'rat king');
    assert.match(said.at(-1) ?? '', /A dead rat king lies on .*still warm/);
    await cmdLook(z, me, 'scabby rat');
    assert.match(said.at(-1) ?? '', /A dead scabby rat lies on/);
    await cmdLook(z, me, 'dead rat');
    assert.match(said.at(-1) ?? '', /A dead (rat king|scabby rat) lies on/, 'a body, never the tail in the pack');
  });

  // ---------------------------------------------------------------- maps
  console.log('the floors');
  // THE FLOORS (2026-11-03, mig 365). The fortress's inside was drawn as a
  // column of stripes south of the land; now each room carries its floor and
  // the halls lie under the fortress. A square is shared across floors, never
  // within one, and a caption is placed among its own floor's rooms.
  function floorWorld() {
    const z = new ZoneDO({}, {});
    const rooms = new Map([
      // the ground: a gate with the open ground's room just north of it
      ['yard', { id: 'yard', name: 'The Yard', region: 'out', map_x: 0, map_y: 0, map_z: 0 }],
      ['door', { id: 'door', name: 'The Door', region: 'out', map_x: 0, map_y: 1, map_z: 0 }],
      // the halls, straight under them, on the same squares
      ['hallA', { id: 'hallA', name: 'Hall A', region: 'upper', map_x: 0, map_y: 1, map_z: -1 }],
      ['hallB', { id: 'hallB', name: 'Hall B', region: 'upper', map_x: 1, map_y: 1, map_z: -1 }],
      // ...and a halls room a floor further down, among the warrens
      ['drain', { id: 'drain', name: 'The Drain', region: 'upper', map_x: 4, map_y: 4, map_z: -2 }],
    ]);
    const exits = new Map([
      ['yard', [{ dir: 'south', to_room: 'door' }]],
      ['door', [{ dir: 'north', to_room: 'yard' }, { dir: 'down', to_room: 'hallA' }]],
      ['hallA', [{ dir: 'up', to_room: 'door' }, { dir: 'east', to_room: 'hallB' }]],
      ['hallB', [{ dir: 'west', to_room: 'hallA' }, { dir: 'down', to_room: 'drain' }]],
      ['drain', [{ dir: 'up', to_room: 'hallB' }]],
    ]);
    z.world = { rooms, exits, entryRooms: new Set(), safeRooms: new Set(),
      itemTemplates: new Map([['finished-chart', { id: 'finished-chart', name: 'a finished chart', slot: '' }]]) };
    z.dens = new Map(); z.inDen = new Map();
    z.send = () => {};
    const frames = [];
    const me = { pubkey: 'me', name: 'Rome', roomId: 'hallA', items: [{ rowId: 'row1', itemId: 'finished-chart', serial: null, equipped: false, condition: 100 }],
      ws: { send: (m) => frames.push(JSON.parse(m)) } };
    z.sessions = new Map([['me', me]]);
    return { z, me, frames };
  }
  check('every room is on a floor, and two floors can hold the same square', () => {
    const { z } = floorWorld();
    const g = worldGrid(z);
    assert.deepEqual(g.at.get('door'), { x: 0, y: 1, z: 0 });
    assert.deepEqual(g.at.get('hallA'), { x: 0, y: 1, z: -1 }, 'the hall under the door keeps its own square, on its own floor');
  });
  check('a caption is placed among its own floor, and a region gets one per floor it is on', () => {
    const { z } = floorWorld();
    const bands = worldGrid(z).bands;
    const halls = bands.filter((b) => b.region === 'upper').sort((a, b) => b.z - a.z);
    assert.equal(halls.length, 2, 'the halls on their floor, and the drain on the one below');
    // Over Hall A is the Yard's square on the ground, a floor up. It is not in
    // the hall's way: the caption hangs straight over the hall.
    assert.deepEqual({ ...halls[0], y: +halls[0].y.toFixed(2) }, { region: 'upper', x: -0.35, y: -0.05, z: -1 });
    assert.equal(halls[1].z, -2);
  });
  await checkAsync('the map frame tells the client which floor each room is on', async () => {
    const { z, me, frames } = floorWorld();
    await cmdMap(z, me, '');
    const rooms = Object.fromEntries(frames.at(-1).regions.flatMap((r) => r.rooms).map((r) => [r.id, r]));
    assert.equal(rooms.door.z, 0);
    assert.equal(rooms.hallA.z, -1);
    assert.equal(rooms.drain.z, -2);
    assert.ok(rooms.hallA.here);
  });
  check('the map window draws one floor and nothing of the others', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const draw = pub.slice(pub.indexOf('function drawMap()'), pub.indexOf('function mapZoom('));
    assert.match(draw, /if \(nd\.fz !== mapFloor\) continue;/, 'rooms off the floor in view are not drawn bright');
    assert.match(draw, /if \(ed\.z !== mapFloor\) continue;/, 'passages off the floor in view are not drawn');
    assert.match(draw, /if \(su\.z !== mapFloor\) continue;/, 'nor their stubs');
    assert.doesNotMatch(draw, /fz !== 0\) continue;/, 'and the ground is not laid faint over the floors below (2026-11-03)');
    assert.match(pub, /if \(nodes\[ex\.to\]\.fz !== nodes\[fid\]\.fz\) continue;/, 'no line drawn between two floors');
    // ...so a way to another floor is marked on the room itself, by the floor it reaches.
    assert.match(draw, /if \(tn && tn\.fz !== nd\.fz\) \{ if \(tn\.fz > nd\.fz\) toUp = true; else toDn = true; \}/, 'a stair to another floor is told from a climb on this one');
    assert.match(draw, /if \(toUp \|\| toDn\) \{\n      var sr = Math\.max\(3\.5 \* mapDpr, 6\.5 \* s\)/, 'and drawn small, in the corner (2026-11-03: the glowing disc was too much)');
    assert.ok(!/shadowColor = gold; ctx\.shadowBlur = Math\.max\(6 \* mapDpr/.test(draw), 'with no glow');
    // ...and the two inside files say which floor they build on, so a regen
    // cannot drop the halls, warrens or deep back on the ground.
    const deep = readFileSync(new URL('../regions/the-deep-2.rooms', import.meta.url), 'utf8');
    assert.match(deep, /^!floor -3$/m);
    const keep = readFileSync(new URL('../regions/the-keep-grows.rooms', import.meta.url), 'utf8');
    assert.match(keep, /^!floor -1$/m);
    assert.match(keep, /## the-old-adit \| The Old Adit\n!floor -2\n/, 'the Old Adit is the warrens');
  });

  check('low stamina is heard: a ragged breath under everything from the red on the bar (2026-11-03)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /scapeHp\(f\.hp, f\.max_hp\);\n      scapeSta\(f\.fatigue\);/, 'the status frame feeds the breath');
    assert.match(pub, /scapeHeart\(\); scapeWinded\(\);/, 'and it is started with the soundscape');
    assert.match(pub, /var STA_WINDED = 10, STA_HEAVY = 25;/, 'gasps from the red on the bar, heavy breathing from half');
    assert.match(pub, /\} else if \(scapeStaLeft <= STA_HEAVY\) \{/, 'and the heavy breathing has its own branch');
    assert.match(pub, /if \(scapeStaLeft <= STA_WINDED\) \{/, 'heavy breathing down to 11, the gasps from 10');
    assert.match(pub, /var t2 = actx\.currentTime \+ 0\.02, v2 = 0\.04 \* SCAPE_VOL;/, 'and the heavy breath is one breath, the same all the way down');
  });

  check('the weeper\'s arch is open ground, so its lantern keeps its night (2026-11-03)', () => {
    const mig = readFileSync(new URL('../migrations/368_the_arch_stands_outside.sql', import.meta.url), 'utf8');
    assert.match(mig, /UPDATE rooms SET region = 'out' WHERE id = 'weeper-arch';/);
    // not a gate, so only its region can make it outdoors: 'out' must be an outdoor band
    assert.ok(OUTDOOR_REGIONS.has('out'), 'the open ground is outdoors');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /if \(world\.entryRooms\.has\(room\.id\)\) OUTDOOR_ROOMS\.add\(room\.id\);\n\s*else if \(INDOOR_ROOMS\.has\(room\.id\)\) OUTDOOR_ROOMS\.delete\(room\.id\);\n\s*else if \(OUTDOOR_REGIONS\.has\(room\.region\)\) OUTDOOR_ROOMS\.add\(room\.id\);/);
    assert.ok(!INDOOR_ROOMS.has('weeper-arch'), 'and nothing roofs it over');
  });
  await checkAsync('the sewer mouth is under the fen: down into it, up out of it (2026-11-03)', async () => {
    const mig = readFileSync(new URL('../migrations/369_the_grate_is_overhead.sql', import.meta.url), 'utf8');
    // Run it on the old ways and read back where each one goes.
    const db = new (await import('node:sqlite')).DatabaseSync(':memory:');
    db.exec("CREATE TABLE exits(room_id TEXT, dir TEXT, to_room TEXT, key_item TEXT, PRIMARY KEY(room_id, dir))");
    db.exec("INSERT INTO exits(room_id, dir, to_room) VALUES ('the-black-fen','up','sewer'), ('sewer','down','the-black-fen'), ('sewer','up','scullery'), ('scullery','down','sewer'), ('sewer','east','the-sewer-slip')");
    db.exec(mig);
    const way = (a, d) => db.prepare('SELECT to_room FROM exits WHERE room_id = ? AND dir = ?').get(a, d)?.to_room;
    assert.equal(way('the-black-fen', 'down'), 'sewer', 'down through the grate');
    assert.equal(way('the-black-fen', 'up'), undefined, 'no climbing up into a drain');
    assert.equal(way('sewer', 'up'), 'the-black-fen', 'up and out');
    assert.equal(way('sewer', 'down'), undefined);
    assert.equal(way('sewer', 'north'), 'scullery', 'the drain runs back to the scullery');
    assert.equal(way('scullery', 'down'), 'sewer');
    assert.equal(way('sewer', 'east'), 'the-sewer-slip', 'the slip untouched');
    // and the map check holds it like every other stair now
    assert.ok(!readFileSync(new URL('./check-map-true.mjs', import.meta.url), 'utf8').includes('STAIR_EXCEPT'), 'no stair is excused');
  });
  console.log('the smithy gate');
  check('the Weeper\'s Arch is no gate and the Village Smithy is (2026-11-03, mig 366)', () => {
    const mig = readFileSync(new URL('../migrations/366_the_smithy_is_a_gate.sql', import.meta.url), 'utf8');
    assert.match(mig, /UPDATE rooms SET is_entry = 0 WHERE id = 'weeper-arch';/);
    assert.match(mig, /UPDATE rooms SET is_entry = 1 WHERE id = 'the-village-smithy';/);
    assert.match(mig, /UPDATE players SET room_id = 'gate' WHERE room_id = 'weeper-arch';/, 'nobody comes back behind a door that is gone');
    assert.match(mig, /This was a gate once, with a keeper behind it: the hatch in the wall beside the arch is boarded over now/, 'the arch says what it was');
    // ...and the smithy paints its own gate picture, not the burned village's.
    const pub0 = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const gp = pub0.slice(pub0.indexOf('var GATE_PLATE = {'), pub0.indexOf('};', pub0.indexOf('var GATE_PLATE = {')));
    assert.match(gp, /"the-village-smithy":  "day night night-torch snow"/);
    const rp = pub0.slice(pub0.indexOf('var ROOM_PLATE = {'), pub0.indexOf('\n};', pub0.indexOf('var ROOM_PLATE = {')));
    assert.ok(!rp.includes('"the-village-smithy"'), 'a room picture is asked for before a gate one, so the smithy must not have one');
    const og = readFileSync(new URL('../regions/open-ground.rooms', import.meta.url), 'utf8');
    assert.match(og, /## the-village-smithy \| The Village Smithy\n[^#]*\n!entry\n/, 'a regen of the open ground keeps the smithy a gate');
    // Its gatehouse is the smithy's own, and its keeper tells the fortress's story.
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.match(zd, /GATEHOUSE_ROOM: Partial<Record<Region, string>> = \{\n(?:  \/\/.*\n)*  out: "A room knocked through behind the smithy/);
    const lo = readFileSync(new URL('../src/lore.ts', import.meta.url), 'utf8');
    assert.match(lo, /const band = \(own === "out" \? "gate" :/, 'the smithy keeper is not left with no story');
    // The arch paints the picture it always had, as a room, people on the paving.
    assert.ok(/export const ART_ROOMS = new Set<string>\(\[[\s\S]*?"weeper-arch",/.test(zd), 'the arch asks for its own picture');
    const gr = zd.match(/export const GATE_ROOMS = new Set<string>\(\[([^\]]*)\]/)[1];
    assert.ok(gr.includes('"weeper-arch"') && !gr.includes('the-village-smithy'), 'the lantern set follows the pictures, not the doors');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /var PLATE_OF = \{\n  "weeper-arch": "gate-weeper-arch",/);
    assert.match(pub, /var ROOM_PLATE = \{\n(?:  \/\/.*\n)*  "weeper-arch":/);
  });

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
  check('the fever rat falls to a vital as the rat king does (2026-11-02)', () => {
    assert.deepEqual(BIG_VITALS['fever-rat'], BIG_VITALS['rat-king']);
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
  await checkAsync('the typed inventory shows the lockbox out in the world, as the window does (2026-11-03)', async () => {
    const z = new ZoneDO({}, {});
    const { db, D1 } = sqliteD1(); z.env = { DB: D1 };
    z.world = new Proxy({ itemTemplates: new Map([['knife', { id: 'knife', name: 'a knife', slot: 'weapon', rarity: 'common' }],
      ['pale-pelt', { id: 'pale-pelt', name: 'a pale pelt', slot: '', rarity: 'rare' }]]),
      rooms: new Map([['moor', { id: 'moor', name: 'The Moor' }]]), entryRooms: new Set(['gate']) },
      { get: (t, k) => k in t ? t[k] : (typeof k === 'string' ? (t[k] = new Map()) : undefined) });
    const me = { pubkey: 'me', name: 'Rome', roomId: 'moor', items: [{ rowId: 'r1', itemId: 'knife', serial: null, equipped: true, condition: 100 }] };
    z.sessions.set('me', me);
    db.prepare("INSERT INTO player_items(id, item_id, pubkey, equipped, container) VALUES ('r1', 'knife', 'me', 1, ''), ('r2', 'pale-pelt', 'me', 0, 'lockbox')").run();
    const said = []; z.send = (_s, t) => said.push(t); z.roomFeed = () => {};
    await cmdInventory(z, me);
    const out = said.join('\n');
    assert.match(out, /You carry[\s\S]*a knife/, 'the pack is listed');
    assert.match(out, /Lockbox \(1\/\d+\):\n  a pale pelt/, 'and the lockbox under it, away from a gate');
    assert.doesNotMatch(out, /deep keep/, 'the deep keep stays at the gates');
  });
  check('a keeper speaks only of what is on his own ground (2026-11-02)', () => {
    // (the fever rat's own faded keeper lines were taken out, 2026-11-11)
    // the king is the fortress's, the roe the wood's
    const src = (f) => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
    assert.match(src('ratking.ts'), /if \(z\.inGatehouse\.has\(s\.pubkey\)\) \{[\s\S]{0,400}if \(z\.world\?\.rooms\?\.get\(s\.roomId\)\?\.region\) continue;[\s\S]{0,400}RAT_KING_KEEPER_LINES/, 'the king only at a fortress gate');
    assert.match(src('whiteroe.ts'), /if \(z\.world!\.rooms\.get\(s\.roomId\)\?\.region !== "wood"\) continue;[\s\S]{0,300}WHITE_ROE_KEEPER_LINES/, 'the roe only at a wood gate');
  });
  await checkAsync('the road keeps its record under the names on the first milestone (2026-11-02)', async () => {
    const { db, D1 } = sqliteD1();
    db.exec(readFileSync(new URL('../migrations/363_the_world_remembers.sql', import.meta.url), 'utf8'));
    const said = [];
    const z = { env: { DB: D1 }, world: { rooms: new Map([['the-first-milestone', { name: 'The First Milestone', region: 'road' }], ['the-stony-rise', { name: 'The Stony Rise', region: 'road' }]]) },
      stoneNames: new Map([['the-first-milestone', [{ name: 'Irongate', at: 1 }]]]), send: (_s, t) => said.push(t) };
    chronicle.died(z, { name: 'Lunapilot', roomId: 'the-stony-rise' }, { name: 'a barrow-wight', is_boss: 0 });
    await new Promise((r) => setTimeout(r, 0));
    await milestoneRead(z, { roomId: 'the-first-milestone' });
    assert.match(said.join(' '), /Irongate[\s\S]*Lunapilot, dead at the Stony Rise, to a barrow-wight\./, 'the register, then the road\'s record');
    said.length = 0; z.stoneNames.clear();
    await milestoneRead(z, { roomId: 'the-first-milestone' });
    assert.match(said.join(' '), /Lunapilot, dead at the Stony Rise/, 'with no names carved yet, still the record');
    assert.match(readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8'), /return await lore\.milestoneRead\(z, session\);/, 'look milestone reads it');
  });
  check('wanderers wake at a gate, any gate, or out on the road, and nowhere else (2026-11-02)', () => {
    const z = new ZoneDO({}, {});
    const gates = ['gate', 'weeper-arch', 'sally-port', 'the-first-milestone', 'the-gate-arch', 'the-ferry-house', 'the-slabs'];
    const room = (id, region) => [id, { id, region }];
    z.world = { entryRooms: new Set(gates), entryRoom: 'gate', spawnRooms: new Set(['gate', 'the-old-road']),
      rooms: new Map([...gates.map((g) => room(g, g === 'the-first-milestone' ? 'road' : 'wood')), room('the-old-road', 'out'),
        room('the-stony-rise', 'road'), room('the-sixth-milestone', 'road'), room('the-road-bolthole', 'road'), room('the-boulder-beach', 'mountain')]),
      safeRooms: new Set(['the-road-bolthole']) };
    const woke = new Set();
    for (let i = 0; i < 4000; i++) woke.add(z.randomGate());
    assert.deepEqual([...woke].sort(), [...gates, 'the-stony-rise', 'the-sixth-milestone'].sort(), 'every gate, and any road room but a gate or a hideaway');
  });

  check('the gatehouse healing line is only said in the gatehouse (2026-11-02)', () => {
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const a = zs.indexOf('if (session.hp >= session.maxHp) {\n          // Fully healed');
    const block = zs.slice(a, zs.indexOf('\n        }\n', a) + 10);
    const run = new Function('session', 'sheltered', 'byFire', 'out', 'const self = { send: (_s, t) => out.push(t), trySavePlayer() {} };' +
      'return (async function () {' + block.replace(/this\./g, 'self.').replace('await self.trySavePlayer(session.pubkey, session.roomId, session.hp);', '') + '})();');
    const said = (s, sheltered) => { const out = []; run(s, sheltered, false, out); return out.join(' '); };
    const road = { hp: 100, maxHp: 100, resting: true, exhaustion: { units: 40 } };
    assert.doesNotMatch(said(road, false), /gatehouse/, 'resting out on the road, still winded');
    assert.match(said(road, false), /waiting on your breath/);
    assert.match(said({ hp: 100, maxHp: 100, resting: false }, true), /In the gatehouse quiet/, 'and in the gatehouse it still is');
  });
  check('the bell rings once to its hour, never twice in one night (2026-11-02)', () => {
    const H = 3_600_000, day = Date.UTC(2026, 10, 3);
    for (let i = 0; i < 500; i++) {
      // settled ten minutes after ringing twenty minutes early for 01:00
      const after = nextBellAt(day + 1 * H - 20 * 60_000 + 12 * 60_000);
      assert.ok(after >= day + 13 * H - 20 * 60_000 && after <= day + 13 * H + 20 * 60_000, 'the next ringing is the 13:00 one, not 01:00 again');
      // and after the 13:00 ringing, the next night's 01:00
      const night = nextBellAt(day + 13 * H + 15 * 60_000);
      assert.ok(night >= day + 25 * H - 20 * 60_000 && night <= day + 25 * H + 20 * 60_000, 'then the next night');
      // from the middle of the morning, that day's 13:00 still comes
      const noon = nextBellAt(day + 6 * H);
      assert.ok(noon >= day + 13 * H - 20 * 60_000 && noon <= day + 13 * H + 20 * 60_000);
    }
  });
  check('every region keeps a record, on a thing that already answers a close look (2026-11-02)', () => {
    const regions = new Set(['']); // the fortress: its rooms predate the region files
    for (const f of readdirSync(new URL('../regions/', import.meta.url))) {
      const m = readFileSync(new URL('../regions/' + f, import.meta.url), 'utf8').match(/^!region (\S+)/m);
      if (m) regions.add(m[1] === 'upper' ? '' : m[1]); // built as upper, blanked to the fortress's '' (mig 356)
    }
    for (const r of regions) {
      const rec = chronicle.RECORDS[r];
      assert.ok(rec, `region "${r}" keeps no record`);
      assert.ok(ROOM_FEATURES[rec.room]?.[rec.feature], `the ${r || 'fortress'} record (${rec.room}) has no close look for "${rec.feature}"`);
    }
  });
  await checkAsync('the world remembers: every death and every boss is written where it happened, and the keeper forgets (2026-11-02)', async () => {
    const { db, D1 } = sqliteD1();
    db.exec(readFileSync(new URL('../migrations/363_the_world_remembers.sql', import.meta.url), 'utf8'));
    const rooms = new Map([['the-bounds-house', { name: 'The Bounds House', region: 'wood' }], ['the-black-mud', { name: 'The Black Mud', region: 'wood' }],
      ['the-roll-room', { name: 'The Roll Room', region: '' }], ['the-scraped-hall', { name: 'The Scraped Hall', region: 'deep' }]]);
    const said = [];
    const z = { env: { DB: D1 }, world: { rooms }, send: (_s, t) => said.push(t) };
    await chronicle.load(z);
    const ash = { pubkey: 'a', name: 'Ashwren', roomId: 'the-black-mud' };
    const thes = { pubkey: 't', name: 'Thessaly', roomId: 'the-black-mud' };
    chronicle.slain(z, ash, { id: 'woodward', name: 'the woodward', is_boss: 1 }, 'the-black-mud');
    chronicle.slain(z, ash, { id: 'rat', name: 'a scabby rat', is_boss: 0 }, 'the-black-mud');
    chronicle.died(z, thes, { id: 'rat', name: 'a scabby rat', is_boss: 0 });
    chronicle.died(z, { ...thes, roomId: 'the-scraped-hall' }, null, 'Ashwren');
    chronicle.denRaised(z, 'Corran', 'the-black-mud');
    await new Promise((r) => setTimeout(r, 0));
    const rows = db.prepare('SELECT region, kind, who, what, notable FROM chronicle ORDER BY id').all();
    assert.deepEqual(rows.map((r) => r.kind), ['slain', 'died', 'killed', 'den-raised'], 'a rat killed is not news; every death is');
    assert.deepEqual(rows.map((r) => r.region), ['wood', 'wood', 'deep', 'wood'], 'filed under the region it happened in');
    assert.deepEqual(rows.map((r) => r.notable), [1, 0, 1, 0], 'a boss and a wanderer\'s steel are the keeper\'s news; a rat death is not');
    // the rods read the wood's rows, newest first, and only under the rods
    const rods = ROOM_FEATURES['the-bounds-house']['shelf|shelves|rods|hazel|bundles|tallies|tally'];
    const read = await chronicle.under(z, 'the-bounds-house', rods);
    assert.match(read, /^ The newest bundle is not tied yet/);
    assert.ok(read.indexOf('A den raised at the Black Mud by Corran.') < read.indexOf('Thessaly, dead at the Black Mud, to a scabby rat.'), 'newest first');
    assert.match(read, /The woodward, killed by Ashwren at the Black Mud\./);
    assert.doesNotMatch(read, /killed by Ashwren at the Scraped Hall/, 'the deep\'s death is not on the wood\'s rods');
    assert.equal(await chronicle.under(z, 'the-bounds-house', ROOM_FEATURES['the-bounds-house']['table|stool|seat']), '', 'the table carries no record');
    assert.equal(await chronicle.under(z, 'the-roll-room', ROOM_FEATURES['the-roll-room']['rolls|roll|pigeon-holes|holes|muster']), '', 'an empty record adds nothing');
    for (let i = 0; i < 7; i++) chronicle.died(z, thes, null);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal((await chronicle.under(z, 'the-bounds-house', rods)).match(/Thessaly, dead at/g).length, chronicle.RECORD_SHOWS, 'only the newest few');
    // ...and only what can be read is kept (2026-11-03): the region's newest few,
    // plus news the keeper might still tell. The rest is gone from the table.
    const wood = db.prepare("SELECT kind, notable FROM chronicle WHERE region = 'wood'").all();
    assert.equal(wood.filter((r) => !r.notable).length <= chronicle.RECORD_SHOWS, true, 'rows nobody can read are not kept');
    assert.ok(wood.some((r) => r.kind === 'slain'), 'but the boss the keeper may still tell of is');
    // the keeper: exact, then half a name, then no name, then nothing
    const e = { at: 0, region: 'wood', room: 'the-black-mud', kind: 'slain', who: 'Ashwren', what: 'the woodward', notable: true };
    // A kill fades on the creature's own clock (2026-11-03): thirds of how long it stays dead.
    const C = 7 * 3600_000;
    assert.match(chronicle.keeperLine(e, 1000, C), /"The woodward is dead," the keeper says\. "Ashwren put it down, out in the wood\./);
    assert.match(chronicle.keeperLine(e, C / 3 + 1, C), /Ashw-something/);
    assert.doesNotMatch(chronicle.keeperLine(e, (2 * C) / 3 + 1, C), /Ash/);
    assert.equal(chronicle.keeperLine(e, C + 1, C), null, 'and not past the time it takes to come back');
    assert.equal(chronicle.slainClock({ world: { mobTemplates: new Map([['old-grey', { id: 'old-grey', name: 'the old grey', respawn_secs: 2520 }]]) } }, 'the old grey'), 2520 * 10 * 1000, 'its clock is how long it stays dead');
    // he tells news once, and never your own deed back to you
    const rnd = crypto.getRandomValues; crypto.getRandomValues = (a) => { a.fill(0); return a; }; // every die lands
    try {
      const listener = { pubkey: 'l', name: 'Pilgrim' };
      assert.ok(chronicle.keeperNews(z, listener, Date.now()), 'news to someone who has not heard it');
      assert.match(said.at(-1), /the keeper says/);
      said.length = 0;
      assert.ok(chronicle.keeperNews(z, listener, Date.now()), 'the other piece of news');
      assert.ok(!chronicle.keeperNews(z, listener, Date.now()), 'and then he has nothing new');
      said.length = 0;
      assert.ok(!chronicle.keeperNews(z, ash, Date.now()), 'never your own deed told back to you');
    } finally { crypto.getRandomValues = rnd; }
    // ONE PIECE OF NEWS PER BOSS, and none once it is back (2026-11-03).
    {
      const said2 = [];
      const z2 = { env: { DB: D1 }, world: { rooms, mobTemplates: new Map([['old-grey', { id: 'old-grey', name: 'the old grey', respawn_secs: 2520, is_boss: 1 }]]) },
        creatures: new Map(), send: (_s, t) => said2.push(t) };
      await chronicle.load(z2);
      const g = { id: 'old-grey', name: 'the old grey', is_boss: 1 };
      chronicle.slain(z2, { name: 'Irongate' }, g, 'the-black-mud');
      chronicle.slain(z2, { name: 'Lunapilot' }, g, 'the-black-mud');
      const rnd2 = crypto.getRandomValues; crypto.getRandomValues = (a) => { a.fill(0); return a; };
      try {
        const hearer = { pubkey: 'h', name: 'Hearer' };
        const before = said2.length;
        while (chronicle.keeperNews(z2, hearer, Date.now())) {}
        const grey = said2.slice(before).filter((l) => /old grey/.test(l));
        assert.equal(grey.length, 1, 'two kills of one boss are one piece of news');
        assert.match(grey[0], /Lunapilot/, 'and it is the latest');
        chronicle.slain(z2, { name: 'Ashwren' }, g, 'the-black-mud');
        z2.creatures.set('c1', { id: 'c1', templateId: 'old-grey', roomId: 'the-black-mud', hp: 40 });
        const heard = said2.length;
        while (chronicle.keeperNews(z2, hearer, Date.now())) {}
        assert.ok(!said2.slice(heard).some((l) => /old grey/.test(l)), 'once it is back on its feet he stops telling it dead');
      } finally { crypto.getRandomValues = rnd2; }
    }
    // and the hooks are where the things happen
    const src = (f) => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
    const zs = src('zone.ts');
    assert.ok(zs.indexOf('chronicle.slain(this, killer, tmpl, creature.roomId)') > zs.indexOf('rising.fall(this, killer, creature, tmpl'), 'a revenant\'s false fall is not a kill');
    assert.match(zs, /const slayer = slayerName[^\n]*\n\s*chronicle\.died\(this, victim, tmpl, slayerName\);/, 'every death, before the body is moved');
    assert.match(zs, /await chronicle\.load\(this\);/);
    assert.match(src('den.ts'), /chronicle\.denRaised\(z, session\.name, roomId\);/);
    assert.match(src('den.ts'), /chronicle\.denLeft\(z, session\.name, den\.roomId\);/);
    assert.match(src('den.ts'), /chronicle\.denFell\(z, den\.holderName, den\.roomId\);/);
    assert.match(src('works.ts'), /chronicle\.boarded\(z, gate\);/);
    assert.match(src('works.ts'), /chronicle\.opened\(z, gate\);/);
    assert.equal(src('events.ts').match(/chronicle\.fever\(z, (?:st\.where|feverRoom\(z, graves\)), (true|false)\);/g).length, 3, 'settled, lifted, and lifted by the rat\'s death');
    assert.match(src('verbs.ts'), /feature \+ await chronicle\.under\(z, session\.roomId, feature\)/);
    assert.match(src('lore.ts'), /if \(chronicle\.keeperNews\(z, session, now\)\)/);
  });
  await checkAsync('by the gatehouse fire you can look at yourself by name and at one piece of what another wears (2026-11-02)', async () => {
    const { D1 } = sqliteD1();
    const said = [];
    const shield = { rowId: 's1', itemId: 'gravestone-shield', serial: null, equipped: true, condition: 100 };
    const me = { pubkey: 'me', name: 'Irongate', roomId: 'gate', ws: { readyState: 1 }, items: [], hp: 100, maxHp: 100 };
    const luna = { pubkey: 'you', name: 'Lunapilot', roomId: 'gate', ws: { readyState: 1 }, items: [shield], hp: 100, maxHp: 100 };
    const tmpl = { id: 'gravestone-shield', name: 'a gravestone shield', slot: 'shield', description: 'A slab of headstone with a strap riveted on.' };
    const z = { env: { DB: D1 }, sessions: new Map([['me', me], ['you', luna]]), outOfWorld: () => true, inGatehouse: new Set(['me', 'you']),
      send: (s, t) => { if (s === me) said.push(t); }, sendGateCtx: async () => {}, sendStatus() {}, markSimDirty() {},
      world: { itemTemplates: new Map([['gravestone-shield', tmpl]]), rooms: new Map(), regions: new Map(), mobTemplates: new Map() },
      equippedItem: (s, slot) => { const c = s.items.find((i) => i.equipped && z.world.itemTemplates.get(i.itemId)?.slot === slot); return c ? { carried: c, tmpl: z.world.itemTemplates.get(c.itemId) } : null; },
      findCarried: () => undefined, litFor: () => true, inCombat: () => false, conditionWord: () => '', carriesLight: () => false, burdened: () => false, bloodOn: new Map(), carvings: new Map(), inDen: new Map(), dens: new Map(),
      phases: new Map(), events: new Map(), bandOf: () => 'upper', regionOf: () => '', wallOf: () => new Set(), walkedOf: () => new Set() };
    for (const [line, want] of [['look lunapilot grave', /Lunapilot's gravestone shield\. A slab of headstone/], ['look shield on luna', /Lunapilot's gravestone shield/], ["look luna's gravestone", /Lunapilot's gravestone shield/]]) {
      said.length = 0;
      await handleGatehouse(z, me, line);
      assert.doesNotMatch(said.join(' '), /You say/, line + ' is not said out loud');
      assert.match(said.join(' '), want, line + ' reads the piece');
    }
    said.length = 0;
    await handleGatehouse(z, me, 'look irongate');
    assert.doesNotMatch(said.join(' '), /You say/, 'your own name is not said out loud');
    // how winded they are shows; full breath says nothing (2026-11-02)
    said.length = 0;
    await handleGatehouse(z, me, 'look lunapilot');
    assert.doesNotMatch(said.join(' '), /winded|blowing|spent|breath/i, 'nothing at full breath');
    for (const [units, want] of [[300, /They are winded/], [600, /They are blowing hard/], [900, /They are spent/]]) {
      luna.exhaustion = { units, at: Date.now(), mode: 'combat' };
      said.length = 0;
      await handleGatehouse(z, me, 'look lunapilot');
      assert.match(said.join(' '), want, units + ' fatigue shows');
    }
    luna.exhaustion = { units: 100, at: Date.now(), mode: 'combat' };
    said.length = 0;
    await handleGatehouse(z, me, 'look lunapilot');
    assert.doesNotMatch(said.join(' '), /winded|blowing|spent/i, 'a little used breath says nothing');
    me.exhaustion = { units: 600, at: Date.now(), mode: 'combat' };
    said.length = 0;
    await handleGatehouse(z, me, 'look me');
    assert.match(said.join(' '), /You are blowing hard/, 'and on yourself');
    delete me.exhaustion;
    said.length = 0;
    await handleGatehouse(z, me, 'look lunapilot grave dirt');
    assert.match(said.join(' '), /You say/, 'words that name nothing are still speech');
    assert.match(readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8'), /const piece = blind \? null : lookOnPlayer\(z, session, arg,/, 'out in the world too');
  });
  await checkAsync('look me shows the blood on your hands and everything you wear, and your own name is look me everywhere (2026-11-02)', async () => {
    const { D1 } = sqliteD1();
    const said = [];
    const tm = { mace: { name: 'a flanged mace', slot: 'weapon' }, slab: { name: 'a gravestone shield', slot: 'shield' }, plate: { name: 'a deadplate harness', slot: 'armor' },
      crown: { name: 'the Marrow-Crown', slot: 'helm' }, boots: { name: "a pair of warden's sabatons", slot: 'feet' }, shroud: { name: "a drowned-diver's shroud", slot: 'cloak' } };
    const me = { pubkey: 'me', name: 'Irongate', roomId: 'moor', ws: { readyState: 1 }, hp: 100, maxHp: 100, flags: [],
      items: Object.keys(tm).map((id) => ({ rowId: id, itemId: id, serial: null, equipped: true, condition: 70 })) };
    const z = { env: { DB: D1 }, sessions: new Map([['me', me]]), outOfWorld: () => true, inGatehouse: new Set(['me']), bloodOn: new Map([['me', [Date.now()]]]),
      send: (s, t) => { if (s === me) said.push(t); }, sendGateCtx: async () => {}, sendStatus() {}, markSimDirty() {},
      world: { itemTemplates: new Map(Object.entries(tm)), rooms: new Map(), regions: new Map(), mobTemplates: new Map(), exits: new Map() },
      equippedItem: (s, slot) => { const c = s.items.find((i) => i.equipped && tm[i.itemId]?.slot === slot); return c ? { carried: c, tmpl: tm[c.itemId] } : null; },
      findCarried: () => undefined, litFor: () => true, inCombat: () => false, conditionWord: () => '', carriesLight: () => false, burdened: () => false, reachable: () => true,
      carvings: new Map(), inDen: new Map(), dens: new Map(), phases: new Map(), events: new Map(), bandOf: () => 'upper', regionOf: () => '', wallOf: () => new Set(), walkedOf: () => new Set() };
    const read = (await handleGatehouse(z, me, 'look me'), said.join(' '));
    assert.match(read, /blood on you that is not a beast's/, 'the blood on your hands');
    for (const piece of Object.values(tm)) assert.ok(read.toLowerCase().includes(piece.name.toLowerCase()), 'names ' + piece.name);
    assert.match(read, /Your gear shows honest use|worn in rather than worn out/, 'how used your kit is, in your own words');
    assert.doesNotMatch(read, /\btheir\b|\bthem\b/, 'never a stranger\'s words');
    said.length = 0;
    await handleGatehouse(z, me, 'look irongate');
    assert.match(said.join(' '), /^You take stock of yourself[\s\S]*blood on you/, 'your name by the fire is look me');
    assert.match(readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8'), /if \(other === session\) return z\.send\(session, selfExamine\(z, session\)/, 'your name out in the world is look me, not a stranger\'s view');
  });
  await checkAsync('carve rock works by the gatehouse fire, and bare carve is still the wall (2026-11-01)', async () => {
    const { D1 } = sqliteD1();
    const said = [], heard = [];
    const me = { pubkey: 'me', name: 'Rome', roomId: 'gate', ws: { readyState: 1 },
      items: [{ rowId: 'k1', itemId: 'loose-rock', serial: null, equipped: false, condition: 100 }, { rowId: 'k2', itemId: 'rusted-chisel', serial: null, equipped: false, condition: 100 }] };
    const other = { pubkey: 'you', name: 'Pilgrim', roomId: 'gate', ws: { readyState: 1 }, items: [] };
    const z = { env: { DB: D1 }, sessions: new Map([['me', me], ['you', other]]), outOfWorld: () => true,
      send: (s, t) => (s === me ? said : heard).push(t), sendGateCtx: async () => {}, sendStatus() {}, markSimDirty() {},
      roomFeed: () => { throw new Error('the dark outside heard it'); }, creatureNoise: () => { throw new Error('the dark outside heard it'); },
      world: { itemTemplates: new Map([['rusted-chisel', { name: 'a rusted chisel' }]]), rooms: new Map(), regions: new Map() },
      grantItem: async (s, id) => { const c = { rowId: 'n1', itemId: id, serial: null, equipped: false, condition: 100 }; s.items.push(c); return c; },
      wallOf: () => new Set(), walkedOf: () => new Set() };
    await handleGatehouse(z, me, 'carve rock');
    assert.doesNotMatch(said.join(' '), /You say/, 'not said out loud');
    assert.match(said.join(' '), /work at it with a rusted chisel/, 'the rock is carved');
    assert.match(heard.join(' '), /Rome sits working at a rock/, 'the fire sees it');
    const made = me.items.find((c) => c.itemId.startsWith('carving-'));
    assert.ok(made);
    // set down by the fire, it stands in the gatehouse and not on the ground outside
    z.world.itemTemplates.set(made.itemId, { name: 'a stone ' + made.itemId.slice(8) });
    Object.assign(z, { inGatehouse: new Set(['me']), inDen: new Map(), dens: new Map(), carvings: new Map(), findCarried: () => undefined,
      refreshRoomCtx: () => { throw new Error('the room outside was told'); } });
    heard.length = 0;
    await carving.cmdPlace(z, me, 'stone ' + made.itemId.slice(8));
    assert.match(heard.join(' '), /Rome sets a stone .* down/, 'the fire sees it set down');
    assert.equal(carving.roomLines(z, me).length, 1, 'it stands in the gatehouse');
    assert.equal(carving.roomLines(z, { pubkey: 'outside', roomId: 'gate' }).length, 0, 'not out on the ground');
    // the gatehouse is one room behind every gate: in at another gate, the same fire, the same carving
    z.inGatehouse.add('far');
    assert.equal(carving.roomLines(z, { pubkey: 'far', roomId: 'sally-port' }).length, 1, 'seen from the gatehouse by whoever came in at another gate');
    assert.equal(carving.roomLines(z, { pubkey: 'outside', roomId: 'sally-port' }).length, 0, 'and not out on that gate\'s ground');
    assert.match(carving.lookPlaced(z, me, made.itemId.slice(8)), /Cut into the base: Rome/);
    // only its carver can take it up again (2026-11-01)
    const kind = made.itemId.slice(8);
    Object.assign(z, { packRoom: () => true, inGatehouse: new Set(['me', 'you']) });
    said.length = heard.length = 0;
    await handleGatehouse(z, other, 'get ' + kind);
    assert.match(heard.join(' '), /You say: get /, 'someone else cannot take it: it is only said (2026-11-07)');
    assert.equal(carving.roomLines(z, me).length, 1, 'and it still stands');
    await handleGatehouse(z, me, 'pick up stone ' + kind);
    assert.match(said.join(' '), /You take up a stone .* again/, 'its carver takes it back');
    assert.equal(carving.roomLines(z, me).length, 0, 'gone from the spot');
    const back = me.items.find((c) => c.itemId === made.itemId);
    assert.ok(back && back.loreId, 'back in the pack with its record');
    assert.match(readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8'), /lines\.push\(\.\.\.carving\.roomLines\(z, session\)\);/, 'the gatehouse look lists them');
    said.length = 0;
    await handleGatehouse(z, me, 'carve');
    assert.match(said.join(' '), /Bare plaster/, 'bare carve is still the wall chart');
    said.length = 0;
    await handleGatehouse(z, me, 'carve my name in the bench');
    assert.match(said.join(' '), /You say: carve my name/, 'other words after carve are still speech');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const isSpeech = new Function('inGatehouseNow', pub.match(/var SPEECH_VERBS = [^\n]*\n/)[0] + pub.match(/var GATEHOUSE_CMDS = \{[\s\S]*?\n\};\n/)[0]
      + pub.match(/var GATEHOUSE_NOARG_CMDS = \{[\s\S]*?\n\};\n/)[0] + pub.match(/function isSpeech\(t\) \{[\s\S]*?\n\}\n/)[0].replace(/\\\\/g, '\\') + 'return isSpeech;')(true);
    assert.equal(isSpeech('carve rock'), false, 'the client echoes it as a command');
    assert.equal(isSpeech('carve my name'), true);
    assert.equal(isSpeech('pvp on'), false, 'and pvp, which is done at a gate');
    assert.equal(isSpeech('get stone owl'), false, 'and taking up a carving');
    assert.equal(isSpeech('get me a drink'), true);
    assert.equal(isSpeech('get face 2'), false);
    assert.equal(isSpeech('take second stone face'), false);
  });
  check('the sky picks up where it was after a roof, not from a random place (2026-11-01)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const src = pub.match(/var skyKept = \{\};\nfunction skyHandover[\s\S]*?\n\}\n/)[0];
    const handover = new Function(src + 'return skyHandover;')();
    const first = handover('', 0, 1, 'night', 0);
    const indoors = handover('night', 300, -1, '', 10_000);          // under a roof at t=300, drifting left
    assert.equal(typeof indoors.t, 'number');
    const back = handover('', indoors.t, indoors.dir, 'night', 70_000); // out again a minute later
    assert.equal(back.t, 360, 'it drifted on for the minute you were inside');
    assert.equal(back.dir, -1, 'and still the same way');
    assert.ok(first.t >= 0 && first.t < 600, 'a sky not seen yet starts anywhere');
    assert.match(pub, /var kept = skyHandover\(name, t, dir, next, performance\.now\(\)\);\n      name = next; geo = null; t = kept\.t; dir = kept\.dir;/, 'the drift uses it');
  });
  check('the two hamlets have their names on the map, and the Crossing\'s name comes off them (2026-11-04)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const data = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const lore = readFileSync(new URL('../src/lore.ts', import.meta.url), 'utf8');
    const gate = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    const detail = readFileSync(new URL('../src/detail.ts', import.meta.url), 'utf8');
    assert.match(data, /for \(const id of SALT_HAMLET_ROOMS\) HAMLET_CAPTIONS\[id\] = "salthamlet";/);
    assert.match(data, /for \(const id of SHIELING_HAMLET_ROOMS\) HAMLET_CAPTIONS\[id\] = "shieling";/);
    assert.match(pub, /  salthamlet: "THE SALT HAMLET",\n  shieling: "THE SHIELING HAMLET",/, 'the page has both names');
    // the anchor the server measures, and the quarter each room carries (which
    // takes the hamlet out of the rooms the Crossing's and the mountain's names sit over)
    assert.match(lore, /const quarter = HAMLET_CAPTIONS\[id\] \?\? MAP_QUARTERS\[id\];\n    if \(quarter\) region = quarter;/, 'each hamlet has its own caption spot');
    assert.match(lore, /q: HAMLET_CAPTIONS\[id\] \?\? MAP_QUARTERS\[id\],/, 'a carried map knows a hamlet room is its hamlet');
    assert.match(gate, /q: HAMLET_CAPTIONS\[id\] \?\? MAP_QUARTERS\[id\],/, 'and so does the wall chart');
    assert.match(gate, /hamlet: HAMLET_ROOMS\.has\(id\) \? 1 : 0,/, 'which draws them green too');
    assert.match(pub, /if \(nr === ba\.region && !nd\.q\) \{ bareX \+= pl\.x; bareY \+= pl\.y; bare\+\+; \}/, 'a region\'s name sits over its rooms with no quarter');
    const quarters = detail.slice(detail.indexOf('export const WOOD_QUARTERS'), detail.indexOf('const COVER_QUARTERS'));
    for (const id of ['the-salt-cross', 'the-hill-cross', 'the-hard-lane', 'the-drove-cut'])
      assert.ok(!quarters.includes(`"${id}"`), `${id} is kept out of the quarters that run the game`);
  });
  check('the two hamlets are drawn green on the map, as Assart End is (2026-11-04)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const data = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const lore = readFileSync(new URL('../src/lore.ts', import.meta.url), 'utf8');
    const listOf = (name) => data.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\];`))[1].match(/"[a-z-]+"/g).map((s) => s.slice(1, -1));
    const listed = new Set();
    for (const [f, name] of [['the-salt-hamlet', 'SALT_HAMLET_ROOMS'], ['the-shieling-hamlet', 'SHIELING_HAMLET_ROOMS']]) {
      const own = new Set(listOf(name));
      const ids = readFileSync(new URL(`../regions/${f}.rooms`, import.meta.url), 'utf8').split('\n')
        .filter((l) => l.startsWith('## ') && !l.includes('attachment')).map((l) => l.slice(3).split(' |')[0].trim());
      assert.equal(ids.length, 29, f);
      for (const id of ids) { assert.ok(own.has(id), `${id} is on the map as its hamlet`); listed.add(id); }
      assert.equal(own.size, 29, `${name} holds nothing else`);
    }
    assert.equal(listed.size, 58, 'and nothing else is');
    assert.match(data, /export const HAMLET_ROOMS = new Set<string>\(\[\.\.\.SALT_HAMLET_ROOMS, \.\.\.SHIELING_HAMLET_ROOMS\]\);/);
    assert.match(lore, /hamlet: HAMLET_ROOMS\.has\(id\) \? 1 : 0,/, 'the map frame says which rooms are hamlet');
    assert.match(pub, /hamlet: !!rm\.hamlet,/, 'the page keeps it');
    const src = pub.match(/function mapRegionColor\(region, isGate, isHamlet\) \{[\s\S]*?\n\}\n/)[0];
    const colour = new Function('mapCssVar', src + 'return mapRegionColor;')((v) => v);
    assert.equal(colour('crossing', false, true), '--heal', 'a Salt Hamlet room is green');
    assert.equal(colour('mountain', false, true), '--heal', 'a Shieling room is green');
    assert.equal(colour('den', false, false), '--heal', 'Assart End still is');
    assert.equal(colour('mountain', false, false), '--stone', 'the rest of the mountain is not');
    assert.equal(colour('crossing', true, true), '--steel', 'and a gate is still a gate');
    assert.match(pub, /col = mapRegionColor\(nd\.region, nd\.gate, nd\.hamlet\);/, 'the map draws with it');
  });
  check('the two hamlets keep their names when the map is zoomed far out, as Assart End does (2026-11-06)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const major = pub.match(/var MAP_MAJOR_REGIONS = \{([^}]*)\}/)[1];
    for (const k of ['den', 'salthamlet', 'shieling']) assert.match(major, new RegExp('\\b' + k + ': 1'), k + ' is named far out');
    assert.match(pub, /salthamlet: "THE SALT HAMLET"/);
    assert.match(pub, /shieling: "THE SHIELING HAMLET"/);
  });
  check('the white roe stays in the wood: none is born elsewhere, and one standing elsewhere leaves (2026-11-06)', () => {
    const rooms = new Map([['ride', { id: 'ride', region: 'wood' }], ['lane', { id: 'lane', region: 'road' }], ['yard', { id: 'yard', region: 'den' }]]);
    const roeT = { id: 'roe-deer' }, whiteT = { id: 'white-roe', name: 'a white roe', max_hp: 20 };
    const mk = () => ({
      world: { rooms, mobVariants: [{ baseId: 'roe-deer', variantId: 'white-roe', chance: 1 }], mobTemplates: new Map([['roe-deer', roeT], ['white-roe', whiteT]]), entryRooms: new Set(), safeRooms: new Set(), mobSpawns: [] },
      creatures: new Map(), sessions: new Map(), inGatehouse: new Set(), fed: [],
      regionOf: (r) => rooms.get(r)?.region, noteCreaturesChanged() {}, refreshRoomCtx() {}, roomFeed(_r, t) { this.fed.push(t); }, roomFeedBands() {},
    });
    const z = mk();
    assert.equal(rollBloodline(z, roeT, 'ride').id, 'white-roe', 'the wood can still roll one');
    assert.equal(rollBloodline(z, roeT, 'lane').id, 'roe-deer', 'a roe on the road stays a plain roe');
    assert.equal(rollBloodline(z, roeT, 'yard').id, 'roe-deer', 'and in Assart End');
    assert.equal(rollBloodline(z, roeT).id, 'roe-deer', 'and with no room named');
    const stray = () => ({ id: 's', templateId: 'white-roe', roomId: 'lane', hp: 20, target: null });
    const a = mk(); a.creatures.set('s', stray()); whiteroe.roll(a, 1_000_000);
    assert.equal(a.creatures.has('s'), false, 'one on the road leaves');
    const b = mk(); b.creatures.set('s', { ...stray(), target: 'someone' }); whiteroe.roll(b, 1_000_000);
    assert.equal(b.creatures.has('s'), true, 'not out of a fight');
    const c = mk(); c.creatures.set('s', stray()); c.sessions.set('p', { target: 's' }); whiteroe.roll(c, 1_000_000);
    assert.equal(c.creatures.has('s'), true, 'nor with a wanderer on it');
    const d = mk(); d.creatures.set('s', { ...stray(), roomId: 'ride' }); whiteroe.roll(d, 1_000_000);
    assert.equal(d.creatures.has('s'), true, 'one in the wood stays');
  });
  check('small hunters stay on their prey when starving, and big ones still turn on you (2026-11-07)', () => {
    const z = { creaturesInRoom: () => [] };
    for (const id of ['tawny-owl', 'eagle-owl', 'hill-eagle', 'great-gull', 'black-backed-gull', 'wildcat', 'the-tom', 'the-blue-fox', 'albino-rat', 'coyote']) {
      assert.equal(starvingHunts(z, { id: 'c', templateId: id, roomId: 'x', hunger: 100 }), false, id + ' starving leaves you alone');
      assert.equal(woundedPreyHunts(z, { id: 'c', templateId: id, roomId: 'x', hunger: 0 }), false, id + ' leaves you alone hurt too');
    }
    for (const id of ['hill-wolf', 'lynx', 'grave-hyena', 'glutton', 'brown-bear', 'pale-crawler', 'masterless-dog']) {
      assert.equal(starvingHunts(z, { id: 'c', templateId: id, roomId: 'x', hunger: 100 }), true, id + ' starving still comes for you');
      assert.equal(woundedPreyHunts(z, { id: 'c', templateId: id, roomId: 'x', hunger: 0 }), true, id + ' and for you hurt');
    }
    const study = readFileSync(new URL('../src/study.ts', import.meta.url), 'utf8');
    assert.match(study, /if \(STARVE_HUNTERS\.has\(id\) && SMALL_HUNTERS\.has\(id\)\) return "Hungry, it eyes anything smaller in the room\.";/, 'and studying one does not say it will come for you');
  });

  await checkAsync('hunters hold their land: they settle off a rival\'s, and run intruders off their own (2026-11-07)', async () => {
    const names = ['gate', ...Array.from({ length: 24 }, (_, i) => 'm' + (i + 1))];
    const exits = new Map(names.map((r) => [r, []]));
    for (let i = 1; i < names.length; i++) { exits.get(names[i - 1]).push({ dir: 'e', to_room: names[i] }); exits.get(names[i]).push({ dir: 'w', to_room: names[i - 1] }); }
    const nearby = (from, depth) => { const out = new Map([[from, 0]]), q = [from]; for (const at of q) { const d = out.get(at); if (d < depth) for (const e of exits.get(at)) if (!out.has(e.to_room)) { out.set(e.to_room, d + 1); q.push(e.to_room); } } return out; };
    const tm = (id, hp) => [id, { id, name: 'a ' + id, max_hp: hp, dmg_min: 4, dmg_max: 6, armor: 0 }];
    const world = { rooms: new Map(names.map((r) => [r, { id: r, region: 'mountain' }])), exits, entryRooms: new Set(['gate']), safeRooms: new Set(),
      mobSpawns: ['lynx', 'wildcat', 'ermine', 'hill-fox'].flatMap((t) => [{ template_id: t, room_id: 'm1' }, { template_id: t, room_id: 'm24' }]),
      mobTemplates: new Map([tm('lynx', 52), tm('wildcat', 28), tm('ermine', 18), tm('hill-fox', 24)]) };
    const now = 2_000_000_000;
    const mk = (list) => {
      const z = { world, nearby, regionOf: () => 'mountain', variantBase: new Map(), creatures: new Map(), sessions: new Map(), traces: new Map(), feed: [],
        groups: { at: 0, packs: {}, gone: {} }, withinRadius: (a, b, n) => nearby(b, n).has(a), creaturesInRoom: (r) => [...z.creatures.values()].filter((c) => c.roomId === r),
        roomFeed(_, t) { this.feed.push(t); }, roomSound() {}, fxClash() {}, refreshRoomCtx() {}, noteCreaturesChanged() {} };
      for (const c of list) z.creatures.set(c.id, { hp: 20, hunger: 0, nextWanderAt: 0, roomId: c.home, ...c });
      return z;
    };
    const land = new Set(nearby('m12', 3).keys());
    // Settling: never on land held by its own kind or a bigger hunter after its food.
    for (const [who, holder] of [['wildcat', 'lynx'], ['lynx', 'lynx'], ['ermine', 'wildcat'], ['hill-fox', 'lynx']]) {
      const z = mk([{ id: 'h', templateId: holder, home: 'm12' }]);
      for (let i = 0; i < 60; i++) { const h = groupPickHome(z, who, now); assert.ok(h && !land.has(h), who + ' settles off the land of a ' + holder + ': ' + h); }
    }
    { const z = mk([{ id: 'h', templateId: 'ermine', home: 'm12' }]); let on = 0;
      for (let i = 0; i < 200; i++) if (land.has(groupPickHome(z, 'wildcat', now))) on++;
      assert.ok(on > 0, 'a smaller hunter\'s land does not keep a bigger one off'); }
    { const z = mk(names.slice(1).filter((_, i) => i % 3 === 0).map((r, i) => ({ id: 'l' + i, templateId: 'lynx', home: r })));
      assert.ok(groupPickHome(z, 'wildcat', now), 'with every room held, it still settles somewhere'); }
    // Defending, with scripted odds: 0.1 passes the chase, the second decides a bite.
    const real = crypto.getRandomValues;
    const roll = (seq) => { let i = 0; crypto.getRandomValues = (a) => { a.fill(Math.floor(seq[Math.min(i++, seq.length - 1)] * 2 ** (a.BYTES_PER_ELEMENT * 8))); return a; }; };
    const flee = async (c) => { c.roomId = 'm20'; };
    try {
      roll([0.1, 0.9, 0.5]);
      const z = mk([{ id: 'h', templateId: 'lynx', home: 'm12' }, { id: 'r', templateId: 'wildcat', home: 'm10', roomId: 'm12' }]);
      const lynx = z.creatures.get('h'), cat = z.creatures.get('r');
      assert.equal(await holdLand(z, lynx, now, flee), true, 'a lynx on its land goes for the wildcat living there');
      assert.equal(cat.hp, 20, 'mostly a chase');
      assert.equal(cat.drivenOff, 1); assert.equal(cat.home, 'm10', 'once does not cost it its home');
      assert.ok(cat.avoids.some((a) => a.roomId === 'm12'), 'it keeps off the room');
      assert.equal(lynx.curious, 'm20', 'and the lynx goes after it');
      roll([0.1, 0.9, 0.5]); cat.roomId = 'm12'; lynx.rivalRestUntil = undefined;
      await holdLand(z, lynx, now, flee);
      assert.ok(!land.has(cat.home), 'run off twice, it settles somewhere off the lynx\'s land');
      assert.equal(z.groups.tally.moved, 1, 'and that is a home given up in the count (2026-11-10)');
      roll([0.1, 0.9, 0.5]);
      const by = mk([{ id: 'h', templateId: 'lynx', home: 'm12' }, { id: 'r', templateId: 'wildcat', home: 'm3', roomId: 'm12', drivenOff: 1 }]);
      assert.equal(await holdLand(by, by.creatures.get('h'), now, flee), true, 'one passing through is run off too');
      assert.equal(by.creatures.get('r').home, 'm3', 'but it lives elsewhere, so it keeps its home');
      roll([0.1, 0.05, 0.5]);
      const b = mk([{ id: 'h', templateId: 'lynx', home: 'm12' }, { id: 'r', templateId: 'wildcat', home: 'm3', roomId: 'm12', hp: 3 }]);
      await holdLand(b, b.creatures.get('h'), now, flee);
      assert.ok(b.creatures.get('r').hp >= 1 && b.creatures.get('r').hp < 3, 'sometimes a bite, never a kill');
      roll([0.1, 0.9, 0.5]);
      const away = mk([{ id: 'h', templateId: 'lynx', home: 'm12', roomId: 'm20' }, { id: 'r', templateId: 'wildcat', home: 'm3', roomId: 'm20' }]);
      assert.equal(await holdLand(away, away.creatures.get('h'), now, flee), false, 'off its own land it leaves others be');
      roll([0.1, 0.9, 0.5]);
      const big = mk([{ id: 'h', templateId: 'wildcat', home: 'm12' }, { id: 'r', templateId: 'lynx', home: 'm3', roomId: 'm12' }]);
      assert.equal(await holdLand(big, big.creatures.get('h'), now, flee), false, 'a wildcat does not go for a lynx');
      roll([0.1, 0.9, 0.5]);
      const kin = mk([{ id: 'h', templateId: 'lynx', home: 'm12' }, { id: 'r', templateId: 'lynx', home: 'm3', roomId: 'm12' }]);
      assert.equal(await holdLand(kin, kin.creatures.get('h'), now, flee), true, 'its own kind it runs off');
    } finally { crypto.getRandomValues = real; }
  });

  await checkAsync('a hungry pack goes after one hind together, into its room, and stays with it (2026-11-07)', async () => {
    const mk = () => {
      const z = new ZoneDO({}, {});
      const ex = (pairs) => pairs.map(([dir, to_room]) => ({ dir, to_room, key_item: null }));
      const line = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
      z.world = { mobTemplates: new Map([['hill-wolf', { id: 'hill-wolf', name: 'a hill wolf', max_hp: 36, is_boss: 0 }], ['red-hind', { id: 'red-hind', name: 'a red hind', max_hp: 30, is_boss: 0 }]]), mobSpawns: [], itemTemplates: new Map(),
        rooms: new Map(line.map((r) => [r, { id: r, region: 'mountain' }])),
        exits: new Map(line.map((r, i) => [r, ex([...(i ? [['west', line[i - 1]]] : []), ...(i < line.length - 1 ? [['east', line[i + 1]]] : [])])])), entryRooms: new Set(), safeRooms: new Set() };
      z.send = () => {}; z.roomFeed = () => {}; z.roomSound = () => {}; z.refreshRoomCtx = () => {}; z.noteCreaturesChanged = () => {};
      z.groups = { at: 0, packs: { p: { line: 'hill-wolf', home: 'a', size: 3, peak: 2 } }, gone: {} };
      const wolf = (id, hunger) => ({ id, templateId: 'hill-wolf', roomId: 'a', home: 'a', group: 'p', hp: 36, target: null, grudges: [], hunger, nextWanderAt: 0 });
      const hind = { id: 'h', templateId: 'red-hind', roomId: 'f', home: 'f', hp: 30, target: null, grudges: [], hunger: 0, nextWanderAt: 0 };
      return { z, wolf, hind };
    };
    { const { z, wolf, hind } = mk(); const w1 = wolf('w1', 80), w2 = wolf('w2', 80);
      z.creatures = new Map([['w1', w1], ['w2', w2], ['h', hind]]);
      for (let i = 0; i < 12; i++) { await creatureMoves(z, w1, Date.now(), 'wander', true); await creatureMoves(z, w2, Date.now(), 'wander', true); }
      assert.equal(z.groups.packs.p.quarry, 'h', 'the pack picks the hind');
      assert.equal(w1.roomId, 'f', 'the first wolf walks right into its room, five rooms out');
      assert.equal(w2.roomId, 'f', 'and so does the second, so there are two');
      await creatureMoves(z, w1, Date.now(), 'wander', true);
      assert.equal(w1.roomId, 'f', 'there, it stays with it'); }
    { const { z, wolf, hind } = mk(); const w1 = wolf('w1', 80), w2 = wolf('w2', 10);
      z.creatures = new Map([['w1', w1], ['w2', w2], ['h', hind]]);
      assert.equal(packQuarry(z, w1, Date.now()), undefined, 'one hungry wolf is not a hunting pack'); }
    { const { z, wolf, hind } = mk(); const w1 = wolf('w1', 80), w2 = wolf('w2', 80); hind.roomId = 'g'; z.groups.packs.p.home = 'a';
      z.creatures = new Map([['w1', w1], ['w2', w2], ['h', hind]]);
      assert.equal(packQuarry(z, w1, Date.now()), 'g', 'it reaches out a long way from home');
      w1.group = undefined; assert.equal(packQuarry(z, w1, Date.now()), undefined, 'a lone wolf does not'); }
  });

  await checkAsync('a gripped animal stays gripped: it cannot walk out of the hold (2026-11-06)', async () => {
    const z = new ZoneDO({}, {});
    const ex = (pairs) => pairs.map(([dir, to_room]) => ({ dir, to_room, key_item: null }));
    z.world = { mobTemplates: new Map([['feral-goat', { id: 'feral-goat', name: 'a feral goat', max_hp: 26, is_boss: 0 }], ['hill-eagle', { id: 'hill-eagle', name: 'an eagle', max_hp: 34, is_boss: 0 }]]), mobSpawns: [], itemTemplates: new Map(),
      rooms: new Map([['a', { id: 'a', region: 'out' }], ['b', { id: 'b', region: 'out' }]]), exits: new Map([['a', ex([['east', 'b']])], ['b', ex([['west', 'a']])]]), entryRooms: new Set(), safeRooms: new Set() };
    z.send = () => {}; z.roomFeed = () => {}; z.roomSound = () => {}; z.refreshRoomCtx = () => {}; z.noteCreaturesChanged = () => {};
    const goat = { id: 'g', templateId: 'feral-goat', roomId: 'a', home: 'a', hp: 26, target: null, grudges: [], hunger: 0, nextWanderAt: 0, heldBy: 'e' };
    const eagle = { id: 'e', templateId: 'hill-eagle', roomId: 'a', home: 'a', hp: 34, target: null, grudges: [], hunger: 0, nextWanderAt: 0, holding: 'g' };
    z.creatures = new Map([['g', goat], ['e', eagle]]);
    await creatureMoves(z, goat, Date.now(), 'wander', true);
    assert.equal(goat.roomId, 'a', 'its wander clock running out does not let it walk off');
    assert.equal(goat.heldBy, 'e');
    goat.heldBy = undefined; eagle.holding = undefined;
    await creatureMoves(z, goat, Date.now(), 'wander', true);
    assert.equal(goat.roomId, 'b', 'let go, it walks like anything else');
  });
  check('a hunter with its teeth in something does not fall asleep (2026-11-09, the sleeping wolf over the hind)', () => {
    const z = new ZoneDO({}, {});
    z.world = { mobTemplates: new Map([['hill-wolf', { id: 'hill-wolf', name: 'a hill wolf', max_hp: 40, is_boss: 0 }]]), mobSpawns: [], itemTemplates: new Map(), rooms: new Map(), exits: new Map(), entryRooms: new Set(), safeRooms: new Set() };
    const now = Date.now();
    const wolf = { id: 'w', templateId: 'hill-wolf', roomId: 'a', hp: 40, target: null, grudges: [], hunger: 50, nextWanderAt: 0, holding: 'h' };
    fallAsleep(z, wolf, now);
    assert.ok(!wolf.asleep, 'holding a hind, it stays awake');
    fallAsleep(z, wolf, now, true);
    assert.ok(!wolf.asleep, 'the gorge nap does not take it either');
    wolf.holding = undefined; fallAsleep(z, wolf, now);
    assert.ok(wolf.asleep, 'let go, it may sleep');
  });
  check('a brood mother on murrain ground does not breed, and does again when it lifts (2026-11-09, Assart End stuck 97h)', () => {
    const now = Date.now();
    const z = { world: { mobTemplates: new Map([['rat', { id: 'rat', name: 'a scabby rat', max_hp: 11 }], ['brood-rat', { id: 'brood-rat', name: 'a brood-mother' }]]) },
      creatures: new Map(), conditions: new Map([['den', { kind: 'murrain', line: 'rat', since: now }]]), regionOf: () => 'den',
      noteCreaturesChanged() {}, roomFeed() {}, roomSound() {}, refreshRoomCtx() {} };
    const mother = { id: 'm', templateId: 'brood-rat', roomId: 'nest', home: 'nest', hp: 30, grudges: [], target: null, nextBirthAt: now - 1 };
    z.creatures.set('m', mother);
    broodBirths(z, mother, now);
    assert.equal(z.creatures.size, 1, 'no pup while the nest is sick');
    assert.ok(mother.nextBirthAt > now, 'her clock still runs');
    z.conditions.delete('den'); mother.nextBirthAt = now - 1;
    broodBirths(z, mother, now);
    assert.equal(z.creatures.size, 2, 'well again, she breeds');
  });
  check('the cave lion bleeds 3, and only the lion (2026-11-09)', () => {
    const mig = readFileSync(new URL('../migrations/378_the_cave_lion_bleeds_three.sql', import.meta.url), 'utf8');
    const ups = [...mig.matchAll(/^UPDATE mob_templates SET bleed = (\d+) WHERE id = '([a-z-]+)';$/gm)];
    assert.equal(ups.length, 1, 'one change');
    assert.deepEqual([ups[0][1], ups[0][2]], ['3', 'cave-lion']);
  });
  check('a blown animal is drawn standing at bay, not flying off (2026-11-09, the raven)', () => {
    const ch = readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8');
    assert.match(ch, /creature\.windedUntil && now < creature\.windedUntil \? "hurt"/, 'blown shows the hurt pose');
  });
  check('a pose that runs out on its clock redraws the room by itself (2026-11-09, the raven stuck in the air)', () => {
    const now = Date.now();
    const raven = { id: 'r', templateId: 'scarp-raven', roomId: 'a', hp: 4, target: null, grudges: [], hunger: 0, nextWanderAt: now + 999999, windedUntil: now + 45000 };
    assert.equal(timedPose(raven, now), 'blown');
    assert.equal(timedPose(raven, now + 46000), '', 'the blown time runs out');
    raven.fled = 2; raven.fledAt = now;
    assert.equal(timedPose(raven, now + 1000), 'blown', 'blown outranks the flee just run');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /const poseSeen = chips\.timedPose\(creature, now\);\n\s*if \(poseSeen !== \(creature\.poseSeen \?\? ""\)\) \{ creature\.poseSeen = poseSeen \|\| undefined; this\.refreshRoomCtx\(creature\.roomId\); \}/, 'the tick redraws on a change');
  });
  check('a held animal skips the runner branch: no "ready to run and not running" over a grip (2026-11-09)', () => {
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const i = zs.indexOf('if (!hunted && creature.heldBy) {');
    const j = zs.indexOf('} else if (!hunted && RUNNERS.has(creature.templateId) && ai.playerPresent(this, creature.roomId)');
    assert.ok(i > 0 && j > i && j - i < 200, 'the held guard comes first, ahead of the bolt branch');
  });
  check('the mountain has twelve hill wolves, the four new rows carrying ids and standing on wolf ground (2026-11-06)', () => {
    const mig = readFileSync(new URL('../migrations/375_more_wolves_on_the_hill.sql', import.meta.url), 'utf8');
    const rows = [...mig.matchAll(/VALUES \('(spawn-hill-wolf@([a-z-]+))', 'hill-wolf', '([a-z-]+)'\)/g)];
    assert.equal(rows.length, 4, 'four more, on top of the eight');
    for (const [, , inId, room] of rows) {
      assert.equal(inId, room, 'the id names its room');
      assert.ok(GROUND_OF.has(room) && settlesOn('hill-wolf', room), room + ' is ground a wolf settles on');
    }
  });
  check('one hill wolf can take a goat, and it still takes two for a hind (2026-11-06)', () => {
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.match(zd.match(/\n  \["hill-wolf", new Set\([^\n]*/)[0], /"feral-goat"/, 'the goat is on the lone wolf\'s list');
    const pack = zd.match(/\n  \["hill-wolf", new Map\([^\n]*/)[0];
    assert.doesNotMatch(pack, /"feral-goat"/, 'and no longer waits on a second wolf');
    assert.match(pack, /\["red-hind", 2\]/, 'the hind still does');
  });
  check('animals may make homes in the territory; only the summit is shut (2026-11-09)', () => {
    const names = ['gate', 'low', ...MOUNTAIN_QUARTER_ROOMS.territory.slice(0, 3), ...MOUNTAIN_QUARTER_ROOMS.summit];
    const exits = new Map(names.map((r) => [r, []]));
    for (let i = 1; i < names.length; i++) { exits.get(names[i - 1]).push({ dir: 'e', to_room: names[i] }); exits.get(names[i]).push({ dir: 'w', to_room: names[i - 1] }); }
    const world = { rooms: new Map(names.map((r) => [r, { id: r, region: 'mountain' }])), exits, entryRooms: new Set(['gate']), safeRooms: new Set(), mobSpawns: [{ template_id: 'test-bird', room_id: 'low' }] };
    const homes = mountainHomes({ world, regionOf: (r) => r === 'gate' ? 'road' : 'mountain' }, 'test-bird');
    for (const r of MOUNTAIN_QUARTER_ROOMS.territory.slice(0, 3)) assert.ok(homes.includes(r), r + ' takes a home');
    for (const r of MOUNTAIN_QUARTER_ROOMS.summit) assert.ok(!homes.includes(r), 'the summit does not');
  });
  check('coming in close on the mountain names its six tiers, as every other region names its quarters (2026-11-06)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const labels = pub.slice(pub.indexOf('var MAP_REGION_LABELS = {'), pub.indexOf('function buildMapGraph('));
    const major = pub.match(/var MAP_MAJOR_REGIONS = \{([^}]*)\}/)[1];
    assert.deepEqual(Object.keys(MOUNTAIN_QUARTER_ROOMS).sort(), ['cloud', 'foot', 'high', 'middle', 'summit', 'territory']);
    for (const k of Object.keys(MOUNTAIN_QUARTER_ROOMS)) {
      assert.match(labels, new RegExp('\\n  ' + k + ': "THE [A-Z ]+"'), k + ' has a name on the map');
      assert.doesNotMatch(major, new RegExp('\\b' + k + ': 1'), k + ' waits until you come in close');
    }
  });
  check('zoomed all the way out, the Shieling hamlet\'s name stays below the mountain\'s (2026-11-06)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const src = pub.slice(pub.indexOf('function mapFarSpot('), pub.indexOf('function mapResize('));
    const spot = new Function(src + '; return mapFarSpot;')();
    // the far names as they stood: the mountain's over the hamlet's rooms, the Crossing's and the Salt hamlet's beside it
    const mountain = { x: 766, y: 500, w: 194, h: 28 }, crossing = { x: 605, y: 546, w: 194, h: 28 }, salt = { x: 598, y: 600, w: 238, h: 28 };
    const placed = [mountain, crossing, salt];
    const got = spot(true, 926, 535, 280, 28, 8, placed);
    assert.ok(got.y >= 535, 'it is not moved above its own ground');
    assert.ok(got.rect.y >= mountain.y + mountain.h, 'it sits under the mountain\'s name');
    assert.ok(Math.abs(got.x - 926) <= 140, 'and no more than half its width off its ground');
    for (const r of placed) assert.ok(!(got.rect.x < r.x + r.w && got.rect.x + got.rect.w > r.x && got.rect.y < r.y + r.h && got.rect.y + got.rect.h > r.y), 'and prints through no other name');
    assert.equal(spot(true, 926, 535, 280, 28, 8, [{ x: 800, y: 521, w: 250, h: 28 }]).y, 535 + 28 * 1.15, 'with the line above open too, it still goes down');
    const other = spot(false, 926, 535, 280, 28, 8, placed);
    assert.ok(other.y < 535, 'every other name keeps the rule it had');
    assert.match(pub, /var MAP_FAR_BELOW = \{ shieling: 1 \}/);
    assert.match(pub, /below: !!MAP_FAR_BELOW\[ba\.region\]/, 'the label carries it');
    assert.match(pub, /mapFarSpot\(farLabels\[fl\]\.below, /, 'and the far names use it');
  });
  check('the birds fly on while you are under a roof, not from the start again (2026-11-04)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const src = pub.match(/var skyLifeKept = \{\};\nfunction skyLifeHandover[\s\S]*?\n\}\n/)[0];
    const handover = new Function(src + 'return skyLifeHandover;')();
    const flock = [{ t0: 280, dur: 40 }];
    const fresh = handover('', { flyers: [], t: 0, next: 0 }, 'day|wood', 0);
    assert.equal(fresh.kept, false, 'a sky not seen yet starts fresh');
    assert.deepEqual(fresh.flyers, []);
    const indoors = handover('day|wood', { flyers: flock, t: 300, next: 310 }, '', 10_000); // under a roof at t=300
    assert.deepEqual(indoors.flyers, [], 'nothing flies under a roof');
    const back = handover('', indoors, 'day|wood', 25_000);                                // out again 15 seconds later
    assert.equal(back.kept, true);
    assert.equal(back.flyers, flock, 'the same birds are still up');
    assert.equal(back.t, 315, 'and have flown on for the time you were inside');
    assert.equal(back.next, 310, 'and the next one is still due when it was');
    assert.match(pub, /var kept = skyLifeHandover\(hour \|\| band \? hour \+ "\|" \+ band : "", \{ flyers: flyers, t: t, next: next \}, nh \|\| nb \? nh \+ "\|" \+ nb : "", performance\.now\(\)\);\n      hour = nh; band = nb; flyers = kept\.flyers; t = kept\.t; next = kept\.next;/, 'the birds use it');
    assert.match(pub, /if \(!kept\.kept && birds\(\) && Math\.random\(\) < \.55\) spawn\(true\)/, 'and a sky coming back does not throw up a new bird');
  });
  check('the fade between rooms carries the drifting sky where it is, not the still picture (2026-11-01)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const src = pub.match(/function skyCopy\(node\) \{[\s\S]*?\n\}\n/)[0];
    const el = (tag, attrs = {}) => ({ tag, id: attrs.id || '', style: { display: 'block', ...(attrs.style || {}) }, children: attrs.children || [], width: attrs.width, height: attrs.height,
      appendChild(c) { this.children.push(c); }, removeAttribute(k) { if (k === 'id') this.id = ''; },
      cloneNode(deep) { return el(tag, { style: { ...this.style }, children: deep ? this.children.map((c) => c.cloneNode(true)) : [], width: this.width, height: this.height, id: this.id }); },
      getContext: () => ({ drawImage() {} }) });
    const drift = el('div', { id: 'sky-drift', style: { transform: 'translate3d(-412.50px,0,0)' }, children: [el('i'), el('i')] });
    const stars = el('canvas', { id: 'sky-stars', width: 1280, height: 720 });
    const document = { getElementById: (id) => ({ 'sky-drift': drift, 'sky-stars': stars })[id], createElement: (t) => el(t) };
    const skyCopy = new Function('document', src + 'return skyCopy;')(document);
    const copy = skyCopy(el('div'));
    assert.equal(copy.children.length, 2, 'the strip and the stars go into the fade');
    assert.equal(copy.children[0].style.transform, 'translate3d(-412.50px,0,0)', 'the strip where it has drifted to');
    assert.equal(copy.children[0].id, '', 'with no second #sky-drift on the page');
    assert.equal(copy.children[0].children[0].style.position, 'absolute');
    drift.style.display = 'none'; stars.style.display = 'none';
    assert.equal(skyCopy(el('div')).children.length, 0, 'an indoor sky with no strip copies nothing more');
    assert.match(pub, /if \(skyEl\) cover\.appendChild\(skyCopy\(copy\(skyEl\)\)\);/, 'the fade uses it');
  });
  await checkAsync('a smoke in the lockbox can be lit; one in the vault cannot (2026-11-01)', async () => {
    const { db, D1 } = sqliteD1();
    const said = [];
    const z = { env: { DB: D1 }, send: (_s, t) => said.push(t), outOfWorld: () => false, actorFeed() {}, roomSound() {}, creatureNoise() {} };
    const me = { pubkey: 'me', name: 'Rome', roomId: 'moor', items: [] };
    db.prepare("INSERT INTO player_items(id, item_id, pubkey, container) VALUES ('v1', 'dry-cigarettes', 'me', 'vault')").run();
    await cmdSmoke(z, me);
    assert.match(said.pop(), /nothing but lint/, 'the vault stays at the gate');
    db.prepare("INSERT INTO player_items(id, item_id, pubkey, container) VALUES ('b1', 'dry-cigarettes', 'me', 'lockbox')").run();
    await cmdSmoke(z, me);
    assert.match(said.pop(), /work one loose and light it/, 'the lockbox rides with you');
  });
  // 2026-11-07: a map and a journal went onto a stiff body in the ossuary with the
  // box at 4 of 8. The dying hand now writes down why, every time.
  await checkAsync('a vital death puts the map and the book in a box with room, and says why either way', async () => {
    const run = async (boxed) => {
      const { z, me, db, wolf } = bodyWorld();
      for (const k of ['hasRoom', 'slotsUsed', 'stackable', 'isGear']) z[k] = ZoneDO.prototype[k].bind(z);
      z.world.itemTemplates.set('surveyor-map', { id: 'surveyor-map', name: "a surveyor's map", slot: '' });
      z.world.itemTemplates.set('hunters-journal', { id: 'hunters-journal', name: "a hunter's journal", slot: '' });
      for (let i = 0; i < boxed; i++) { z.world.itemTemplates.set('g' + i, { id: 'g' + i, name: 'g' + i, slot: 'weapon' }); db.prepare("INSERT INTO player_items(id, item_id, pubkey, container, journal_id) VALUES (?, ?, 'me', 'lockbox', '')").run('lb' + i, 'g' + i); }
      db.prepare("INSERT INTO player_items(id, item_id, pubkey, journal_id) VALUES ('m1', 'surveyor-map', 'me', 'map-1')").run();
      db.prepare("INSERT INTO player_items(id, item_id, pubkey, journal_id) VALUES ('j1', 'hunters-journal', 'me', 'jrn-1')").run();
      me.items.push({ rowId: 'm1', itemId: 'surveyor-map', serial: null, journalId: 'map-1', condition: 100 }, { rowId: 'j1', itemId: 'hunters-journal', serial: null, journalId: 'jrn-1', condition: 100 });
      const logged = [], log = console.log; console.log = (m) => logged.push(String(m));
      try { await z.onPlayerDeath(me, wolf, undefined, true); } finally { console.log = log; }
      const at = Object.fromEntries(db.prepare("SELECT id, container FROM player_items WHERE id IN ('m1','j1')").all().map((r) => [r.id, r.container]));
      return { at, line: logged.find((l) => l.startsWith('dying hand')) ?? '' };
    };
    const room = await run(4);
    assert.deepEqual(room.at, { m1: 'lockbox', j1: 'lockbox' }, 'four of eight: both go in the box, not onto the body');
    assert.match(room.line, /box=4 rows\/4 slots of 8; saved surveyor-map; saved hunters-journal/, room.line);
    const full = await run(8);
    assert.deepEqual(full.at, { m1: 'body:moor', j1: 'body:moor' }, 'a full box: they stay on the body');
    assert.match(full.line, /box=8 rows\/8 slots of 8; no room for surveyor-map/, full.line);
  });
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
  // 2026-11-07: the hold is half an hour, not an hour.
  await checkAsync('a stiff body holds for half an hour, then lets go', async () => {
    const { z, me, wolf, where, said } = bodyWorld();
    await z.onPlayerDeath(me, wolf, undefined, true);
    assert.match(said.join(' '), /within 30 minutes/, 'the dead are told half an hour');
    const realNow = Date.now, t0 = realNow();
    try {
      Date.now = () => t0 + 29 * 60_000; await body.sweep(z, Date.now());
      assert.deepEqual(where(), ['body:moor', 'body:moor'], 'at 29 minutes it still holds');
      Date.now = () => t0 + 31 * 60_000; await body.sweep(z, Date.now());
      assert.deepEqual(where(), [], 'at 31 it has let go');
    } finally { Date.now = realNow; }
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

  // ---------------------------------------------------------------- the old adit
  console.log('the old adit');
  check('a warren rat drags unwatched litter to the Hoard-Hole, never food, the rock or room stock (2026-10-31)', () => {
    const z = new ZoneDO({}, {});
    z.world = { itemTemplates: new Map([['buckle', { id: 'buckle', name: 'a buckle', slot: '' }], ['salt-fish', { id: 'salt-fish', name: 'salt fish', slot: '', edible: 1 }], ['loose-rock', { id: 'loose-rock', name: 'a rock', slot: '' }], ['sword', { id: 'sword', name: 'a sword', slot: 'weapon' }]]),
      mobTemplates: new Map([['rat', { id: 'rat', name: 'a scabby rat' }]]), groundSpawns: [{ room_id: 'the-scrape', item_id: 'sword' }] };
    z.sessions = new Map();
    for (const k of ['roomFeed', 'roomSound', 'refreshRoomCtx', 'stampFresh', 'armStrayDecay']) z[k] = () => {};
    z.ground = new Map([['the-scrape', ['salt-fish', 'loose-rock', 'sword', 'buckle']]]);
    z.groundCond = new Map([['buckle@the-scrape', 61]]);
    const rat = { id: 'r', templateId: 'rat', roomId: 'the-scrape', hp: 11, target: null };
    ratHoards(z, rat);
    assert.deepEqual(z.ground.get('the-hoard-hole'), ['buckle'], 'the buckle went to the pile');
    assert.deepEqual(z.ground.get('the-scrape'), ['salt-fish', 'loose-rock', 'sword'], 'food, the rock and the room stock stay');
    assert.equal(z.groundCond.get('buckle@the-hoard-hole'), 61, 'its wear went with it');
    ratHoards(z, rat);
    assert.deepEqual(z.ground.get('the-hoard-hole'), ['buckle'], 'nothing else it will take');
    z.ground.set('the-scrape', ['buckle']);
    z.sessions = new Map([['me', { pubkey: 'me', roomId: 'the-scrape', hp: 10 }]]);
    z.outOfWorld = () => false; z.reachable = () => true;
    ratHoards(z, rat);
    assert.deepEqual(z.ground.get('the-scrape'), ['buckle'], 'not with someone watching');
  });
  await checkAsync('diving the Black Sump soaks you; standing on its bank does not (2026-10-31)', async () => {
    const z = new ZoneDO({}, {});
    z.world = { itemTemplates: new Map(), mobTemplates: new Map() };
    const said = [];
    for (const k of ['roomFeed', 'roomSound', 'creatureNoise', 'sendStatus']) z[k] = () => {};
    z.send = (_s, t) => { said.push(t); };
    const me = { pubkey: 'me', name: 'Rome', roomId: 'the-warren-sump', hp: 50 };
    assert.ok(!coughing.isWet(me), 'dry on the bank');
    await cmdDive(z, me, '');
    assert.ok(coughing.isWet(me), 'soaked from the water');
    assert.match(said.at(-1) ?? '', /bones/);
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
    z.sessions = new Map();
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
  check('the wardens and the rat king walk no round; the captain still does (2026-10-31)', () => {
    assert.equal(PATROLS.warden, undefined, 'the wardens roam');
    assert.equal(PATROLS['rat-king'], undefined, 'the king roams the warrens');
    assert.ok(PATROLS['warden-captain']?.length, 'the captain keeps his ring');
  });
  check('the rat king comes with two rats beside him, never one taken from under a watcher (2026-10-31)', () => {
    const { z, rat } = kingWorld();
    z.world.mobSpawns = [1, 2, 3].map(() => ({ template_id: 'rat', room_id: 'the-rat-warren' }));
    ratking.crown(z, Date.now());
    const beside = [...z.creatures.values()].filter((c) => c.templateId === 'rat' && c.roomId === 'the-rat-warren');
    assert.equal(beside.length, 2, 'two rats in his room');
    assert.equal(rat.roomId, 'the-rat-warren', 'the nearest one came in with him');
    const w = kingWorld();
    w.z.world.mobSpawns = [1, 2, 3].map(() => ({ template_id: 'rat', room_id: 'the-rat-warren' }));
    w.z.sessions = new Map([['me', { pubkey: 'me', roomId: 'the-gnaw-hollow' }]]);
    ratking.crown(w.z, Date.now());
    assert.equal(w.rat.roomId, 'the-gnaw-hollow', 'a rat someone is looking at stays put');
    assert.equal([...w.z.creatures.values()].filter((c) => c.templateId === 'rat' && c.roomId === 'the-rat-warren').length, 2, 'and two come anyway');
    const full = kingWorld();
    full.z.sessions = new Map([['me', { pubkey: 'me', roomId: 'the-gnaw-hollow' }]]);
    ratking.crown(full.z, Date.now());
    assert.equal([...full.z.creatures.values()].filter((c) => c.templateId === 'rat').length, 1, 'never a rat over the cap');
  });
  check('a cough is a noise, heard next door; and the rat king no longer sets anyone coughing (2026-10-24, 2026-11-05)', () => {
    const { z } = kingWorld();
    ratking.crown(z, Date.now() - 4 * 3_600_000);
    const noise = [], heard = [], said = new Map();
    z.creatureNoise = (r) => noise.push(r);
    const voiced = [];
    z.roomSound = (r, t, _x, _c, _l, snd) => { heard.push(t); voiced.push(snd?.act); };
    z.send = (s, t, _c, _sp, snds) => { said.set(s.pubkey, [...(said.get(s.pubkey) ?? []), t]); if (snds) voiced.push(...snds.map((x) => x.act)); };
    z.inGatehouse = new Set(['hatch']);
    z.outOfWorld = () => false;
    z.regionOf = (r) => ({ 'the-cells': 'upper', 'the-moor': 'out', 'gate-room': 'gate' })[r];
    const inside = { pubkey: 'in', name: 'Rome', roomId: 'the-cells' };
    z.sessions = new Map([['in', inside]]);
    coughing.cough(z, inside, 'You cough.');
    assert.deepEqual(noise, ['the-cells'], 'a cough draws the curious like any noise');
    assert.match(heard[0], /coughing \{dir\}/, 'and the next rooms hear it');
    assert.ok(voiced.length >= 2 && voiced.every((a) => a === 'cough'), 'the cougher and the wall both carry the cough sound: ' + voiced);
    noise.length = 0; said.clear();
    for (let i = 0; i < 300; i++) { ratking.resetForTest(z); ratking.roll(z, Date.now()); }
    assert.equal(noise.length, 0, 'five hours in the fortress under a living king and nobody coughs');
    assert.ok((said.get('in') ?? []).length > 5, 'but his signs still show');
    assert.equal(typeof ratking.cough, 'undefined', 'the king has no cough of his own any more');
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
  check('the creature hooks ask the rat king', () => {
    const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(ai, /if \(ratking\.spares\(z, creature, session\)\) continue;\s*const hostile = AGGRESSIVE\.has\(creature\.templateId\) \|\| bloodWake \|\| ratking\.bold\(z, creature\)(?: \|\| events\.crabMarching\(z, creature\))?(?: \|\| cave)?;/);
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
    z.roomHasFirekeeper = () => false; z.dens = new Map(); z.curingCount = () => ({}); z.sendStatus = () => {};
    z.bandOf = () => ''; // no ground of its own: no fever over it unless a check says so
    const me = { pubkey: 'me', name: 'Rome', roomId: 'r', hp: 100, resting: false };
    z.sessions = new Map([['me', me]]);
    const minutes = (n) => { for (let i = 0; i < n; i++) { coughing.resetForTest(z); coughing.tick(z, Date.now()); } };
    return { z, me, noise, said, minutes };
  }
  check('the cold is told when it comes on you and when it lets go, and the bar holds it (2026-11-10)', () => {
    const { me, said, minutes } = coughWorld();
    coughing.weather.raining = () => false; coughing.weather.inWater = () => false;
    coughing.weather.coldBites = () => true;
    minutes(3);
    assert.equal(said.filter((t) => t === 'The cold gets into you.').length, 1, 'told once, not every minute: ' + said);
    coughing.weather.coldBites = () => false;
    minutes(2);
    assert.equal(said.filter((t) => t === 'You are out of the cold.').length, 1, 'and told when it lets go');
    assert.equal(me.coldNoted, false);
    const vs = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(vs, /z\.send\(session, z\.enterDescribe\(session\)\);\n\s+cough\.noteCold\(z, session\);/, 'walking into it says so at once, under the room');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.ok(zs.includes('if (!session.chilled && cough.cold(this, session)) fx.push("cold");'), 'the bar shows it');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.ok(/cold:\s+\{ label: "cold"/.test(pub), 'and the page has a tag for it');
  });
  check('the drowned leave you coughing up water for a while, and it is noise (2026-10-24)', () => {
    const { me, noise, minutes } = coughWorld();
    coughing.weather.coldBites = () => false; coughing.weather.raining = () => false;
    minutes(30); assert.equal(noise.length, 0, 'nothing to cough about');
    coughing.swallowedWater(me);
    minutes(20); assert.ok(noise.length > 5, 'coughing after the dunk: ' + noise.length);
  });
  check('the fever sets you coughing on its own ground, not under the grave-cloth or behind a gatehouse door (2026-11-05)', () => {
    const { z, me, noise, said, minutes } = coughWorld();
    coughing.weather.coldBites = () => false; coughing.weather.raining = () => false; coughing.weather.inWater = () => false;
    z.bandOf = (r) => (r === 'r' ? 'crossing' : 'wood');
    z.events = new Map([['fever-strand', { phase: 'idle', until: Date.now() + 3_600_000 }]]);
    minutes(60); assert.equal(noise.length, 0, 'no fever, no cough');
    z.events.get('fever-strand').phase = 'active';
    minutes(120); assert.ok(noise.length > 15 && noise.length < 50, 'about one cough in four minutes while the Crossing has its fever: ' + noise.length);
    assert.ok(said.some((t) => /graves|chest|hacking/.test(t)), 'in the fever\'s own words');
    noise.length = 0; me.roomId = 'elsewhere';
    minutes(60); assert.equal(noise.length, 0, 'off its ground, nothing');
    me.roomId = 'r'; z.wearsTrait = (_s, t) => t === 'grave-clothed';
    minutes(60); assert.equal(noise.length, 0, 'the grave-cloth keeps it off you');
    z.wearsTrait = () => false; z.inGatehouse.add('me');
    minutes(60); assert.equal(noise.length, 0, 'and so does a gatehouse door');
    z.inGatehouse.clear(); z.events.get('fever-strand').phase = 'aftermath';
    minutes(60); assert.equal(noise.length, 0, 'and it stops when the fever lifts');
  });
  check('the fever rat holds its ground twelve hours, and the fever\'s cough builds after it settles and fades after it lifts (2026-11-05)', () => {
    assert.equal(FEVER_RAT_HOLD_MS, 12 * 3_600_000, 'twelve hours before it goes back down on its own');
    const H = 3_600_000, t0 = Date.now();
    const z = { inGatehouse: new Set(), wearsTrait: () => false, bandOf: () => 'mountain', events: new Map() };
    const me = { pubkey: 'me', roomId: 'r' };
    const st = { phase: 'active', until: t0 + H, onAt: t0 };
    z.events.set('fever-hill', st);
    assert.equal(feverCoughs(z, me, t0), 0, 'nothing in the air the moment it settles');
    const mid = feverCoughs(z, me, t0 + 1.5 * H);
    assert.ok(mid > 0.3 && mid < 0.7, 'halfway up after an hour and a half: ' + mid);
    assert.equal(feverCoughs(z, me, t0 + 5 * H), 1, 'full once it has built');
    feverLifts(Object.assign(z, { roomFeedBands: () => {}, world: null }), 'the-hill-graves', t0 + 5 * H);
    assert.equal(st.phase, 'aftermath');
    const going = feverCoughs(z, me, t0 + 6 * H);
    assert.ok(going > 0.3 && going < 0.7, 'still in the air an hour after the rat is killed: ' + going);
    st.phase = 'idle';
    assert.ok(feverCoughs(z, me, t0 + 6 * H) > 0.3, 'and after the aftermath is over too');
    assert.equal(feverCoughs(z, me, t0 + 8 * H), 0, 'and gone after two hours');
    st.phase = 'active'; st.liftedAt = undefined; delete st.onAt;
    assert.equal(feverCoughs(z, me, t0), 1, 'a fever already on from before this is at full');
  });
  check('the Litter Chamber is warm: no chill sets in there, and it dries you (2026-10-31)', () => {
    const { me, minutes } = coughWorld();
    coughing.weather.coldBites = () => true; coughing.weather.raining = () => true;
    me.roomId = 'the-litter-chamber';
    minutes(20); assert.ok(!me.chilled, 'its heat keeps the chill off');
    coughing.weather.raining = () => false; coughing.soak(me);
    minutes(1); assert.ok(!coughing.isWet(me), 'and dries you like a fire');
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
  check('the bar says wet and chilled for as long as they last, not one line in the scroll (2026-10-31)', () => {
    const { z, me } = coughWorld();
    let t = Date.now(), sent = 0;
    const minutes = (n) => { for (let i = 0; i < n; i++) { t += 60_000; coughing.resetForTest(z); coughing.tick(z, t); } };
    me.maxHp = 100; me.hp = 100; z.sendStatus = () => { sent++; };
    me.coldNoted = true; // already told it is cold here: this counts the wet and the chill alone
    coughing.weather.coldBites = () => true; coughing.weather.windy = () => false; coughing.weather.inWater = () => false;
    coughing.weather.raining = () => true; minutes(1);
    assert.equal(sent, 1, 'soaked: the bar is told');
    minutes(9); assert.ok(me.chilled); assert.equal(sent, 2, 'chilled: the bar is told');
    z.inGatehouse.add('me'); const before = sent; minutes(1);
    assert.ok(sent >= before + 2, 'dry and warm again: the bar is told both');
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zone, /if \(session\.chilled\) fx\.push\("chilled"\);\n    else if \(cough\.isWet\(session\)\) fx\.push\("wet"\);/, 'the status carries them');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /chilled: +\{ label: "chilled"/); assert.match(pub, /wet: +\{ label: "wet"/);
  });
  check('a player switched out of the arena feed is never handed a line for it, nor named in one (2026-10-31)', () => {
    const z = new ZoneDO({}, {});
    const sock = () => { const out = []; return { out, send: (m) => out.push(JSON.parse(m)), serializeAttachment: () => {}, deserializeAttachment: () => ({}) }; };
    const a = { pubkey: 'a', name: 'Ash', roomId: 'r', ws: sock() }, b = { pubkey: 'b', name: 'Birch', roomId: 'r', ws: sock() };
    z.sessions = new Map([['a', a], ['b', b]]); z.outOfWorld = () => false;
    const fpubs = (s) => s.ws.out.filter((f) => f.t === 'fpub').length;
    z.actorFeed(a, 'r', 'Ash goes north.');
    assert.equal(fpubs(a), 1, 'on by default: the deed goes out');
    a.arenaOff = true; z.actorFeed(a, 'r', 'Ash goes south.');
    assert.equal(fpubs(a), 1, 'switched off: nothing more of theirs');
    assert.equal(b.ws.out.filter((f) => f.kind === 24913).length, 2, 'the room still sees it live');
    z.actorFeed(b, 'r', 'Birch turns on Ash!', 'fight', true, 'a');
    assert.equal(fpubs(b), 0, 'a line naming them stays off the feed too');
    a.arenaOff = false; z.actorFeed(b, 'r', 'Birch turns on Ash!', 'fight', true, 'a');
    assert.equal(fpubs(b), 1, 'back on: it goes out again');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /"&tell=1&arena=" \+ \(typeof arenaWanted === "function" && !arenaWanted\(\) \? "0" : "1"\)/, 'the client says it when it dials, on unless switched off');
    assert.match(pub, /if \(!text \|\| arenaOn === false \|\| !arenaWanted\(\)\) return;/, 'and posts nothing of yours while it is off');
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
  check('the warrens and the deep show their night picture without a torch, not the torchlit one (2026-11-04)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const rp = pub.slice(pub.indexOf('var ROOM_PLATE'), pub.indexOf('\n};', pub.indexOf('var ROOM_PLATE')));
    const torchOnly = [...rp.matchAll(/^  "([^"]+)":\s*"night-torch",$/gm)].map((m) => m[1]);
    assert.deepEqual(torchOnly, [], 'rooms that show the torchlit picture with no torch');
    for (const r of ['the-old-adit', 'the-scrape', 'the-descent', 'the-tide-gate', 'the-cooperage']) assert.match(rp, new RegExp('^  "' + r + '":\\s*"night night-torch",$', 'm'), r + ' has its night picture');
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
  await checkAsync('a creature with an eye layer ships with no cyan marker left in its strip (2026-10-30)', async () => {
    // The cook was built before he was in MOB_EYES, so the builder never blackened
    // his eyes and the #00D0D0 key went out in the strip itself.
    const sharp = (await import('sharp')).default;
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const block = pub.slice(pub.indexOf('var MOB_EYES = {'), pub.indexOf('\n};', pub.indexOf('var MOB_EYES = {')));
    const ids = [...block.replace(/\/\/.*$/gm, '').matchAll(/"([a-z0-9-]+)":\s*1/g)].map((m) => m[1]);
    assert.ok(ids.includes('the-cook'), 'read the eye list');
    const strip = (id) => fileURLToPath(new URL('../public/mob/' + id + '.webp', import.meta.url));
    const cyan = [];
    for (const id of ids) {
      if (!existsSync(strip(id))) continue;
      const data = await sharp(strip(id)).ensureAlpha().raw().toBuffer();
      let n = 0;
      for (let o = 0; o < data.length; o += 4) if (data[o + 3] > 100 && data[o] < 90 && data[o + 1] > 150 && data[o + 2] > 150) n++;
      if (n) cyan.push(id + ' ' + n);
    }
    assert.deepEqual(cyan, [], 'the marker went out in the picture');
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
  check('the peat hut never shows daylight: it is pitch dark inside (2026-11-09)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const plates = pub.match(/var ROOM_PLATE = \{([\s\S]*?)\n\};/)[1];
    assert.match(plates, /\n  "the-peat-hut":\s*"night night-torch",/, 'no day picture for a room the words call dark');
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
  // 2026-11-08: and now names the kill, when the meal is a body (an owl on its
  // kill and the look never said what it was eating).
  check('an eating animal says what kind of meal it is, and what the kill was (2026-10-28, 2026-11-08)', () => {
    const z = new ZoneDO({}, {});
    z.sentinelAwake = () => true;
    z.world = { mobTemplates: new Map([['grave-hyena', { id: 'grave-hyena', name: 'a grave-hyena', max_hp: 30 }], ['gibbet-crow', { id: 'gibbet-crow', name: 'a gibbet crow', max_hp: 14 }], ['roe-deer', { id: 'roe-deer', name: 'a roe deer', max_hp: 16 }]]), rooms: new Map(), entryRooms: new Set(), exits: new Map() };
    const tell = (templateId, on, what) => { const c = { id: templateId, templateId, roomId: 'r', hunger: 0, hp: 30, nextWanderAt: 0 }; z.creatures = new Map([[c.id, c]]); ate(c, Date.now(), on, 0, undefined, what); return creatureTell(z, c, 'me'); };
    assert.equal(tell('grave-hyena', 'kill', 'roe-deer'), 'head down over a roe deer, its kill, eating', 'the kill named');
    assert.equal(tell('gibbet-crow', 'kill', 'roe-deer'), 'standing on a roe deer, its kill, tearing at it with its bill', 'a bird on its kill');
    assert.equal(tell('grave-hyena', 'carrion', 'roe-deer'), 'head down in the carcass of a roe deer, tearing at what is left', 'a carcass named');
    assert.equal(tell('gibbet-crow', 'kill'), 'standing on its kill, tearing at it with its bill', 'nothing to name, still reads');
    assert.equal(tell('grave-hyena', 'carrion'), 'head down in a carcass, tearing at what is left');
    assert.equal(tell('grave-hyena', 'kill'), 'head down over its kill, eating');
    assert.equal(tell('grave-hyena', 'scraps'), 'nosing through scraps on the ground and eating them');
    assert.equal(tell('roe-deer', 'graze'), 'head down, grazing');
    assert.match(tell('gibbet-crow', 'carrion'), /bill/);
    for (const on of ['kill', 'carrion', 'scraps', 'graze']) assert.notEqual(tell('grave-hyena', on), 'head down, eating', on);
  });
  // 2026-11-10: an old billy "shrinks from your flame and breaks away", then
  // went "east up the rock at a walk, unhurried": its flee line is a flight.
  check('an old billy running from you bolts, and does not walk off unhurried', () => {
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.match(zd, /"old-billy": \{ out: "bolts \{dir\} over the rocks and is gone\.",/);
  });
  // 2026-11-10: an animal the flame frightened off fled "trailing blood" or
  // walked off "unhurried"; a fire flight takes its own lines, no wound, no stroll.
  check('an animal frightened off by fire runs from the light, unwounded', () => {
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.match(zd, /export const FIRE_FLEE_OUT = \[\n  "flees \{dir\} from the light\.",\n  "bolts \{dir\}, away from the fire\.",\n\];/);
    const a = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(a, /: fromFire \? `\$\{cap\(tmpl\.name\)\} \$\{pick\(FIRE_FLEE_OUT\)\.replace\("\{dir\}", exit\.dir\)\}`\n\s+: runner/, 'before the runner, the wound and the own line');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /const fireScare = nerve && ai\.dreadsFire\(this, creature, victim\);/);
    assert.match(zs, /creatureMoves\(this, creature, now, "flee", false, false, fireScare\)/, 'the flee knows it was the fire');
  });
  // 2026-11-10: the map modal lagged. Each frame read the theme colours once a
  // room, re-measured every name, drew rooms off screen, and drew on every move.
  check('the map reads its colours once a frame, skips rooms off screen, and draws once a frame while dragged', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /function drawMap\(\) \{\n  mapVarCache = \{\};\n  try \{ mapPaint\(\); \} finally \{ mapVarCache = null; \}/, 'colours cached for the frame');
    assert.match(pub, /if \(mapVarCache && mapVarCache\[name\] !== undefined\) return mapVarCache\[name\];/, 'the cache is read');
    assert.match(pub, /var cx = sx\(p\.x\), cy = sy\(p\.y\);\n\s+if \(cx \+ tw < 0 \|\| cx - tw > W \|\| cy \+ th \* 2 < 0 \|\| cy - th \* 2 > H\) continue;/, 'rooms off screen skipped');
    assert.match(pub, /\n    mapDrawSoon\(\);\n  \}\);\n  function end\(e\)/, 'a drag draws once a frame');
    assert.match(pub, /mapCam\.scale = after; mapDrawSoon\(\);/, 'a zoom too');
    assert.match(pub, /var hit = mapFitCache\.get\(key\);|hit = mapFitCache\.get\(key\)/, 'fitted names kept');
  });
  // 2026-11-10: an eagle owl was "here, restless with hunger" on the look, but
  // walked in as a bare "An eagle owl creeps in." The walk-in is told whole.
  check('an animal walking in is told as the look tells it: its hunger, its load, its wounds', () => {
    const z = new ZoneDO({}, {});
    const owl = { id: 'eagle-owl', name: 'an eagle owl', max_hp: 20 };
    z.world = { mobTemplates: new Map([['eagle-owl', owl]]), rooms: new Map(), entryRooms: new Set(), exits: new Map() };
    const c = { id: 'o1', templateId: 'eagle-owl', roomId: 'r', hunger: 999, hp: 20, nextWanderAt: 0 };
    z.creatures = new Map([[c.id, c]]);
    const tell = creatureTell(z, c, 'me');
    assert.ok(tell, 'a hungry owl has a tell');
    assert.equal(arrivalLine(z, c, owl, 'me'), `An eagle owl creeps in, ${tell}.`, 'hunger in the walk-in');
    c.hp = 5;
    assert.match(arrivalLine(z, c, owl, 'me'), /\.\s\(.+\)$/, 'wounds after it, as the look');
    const a = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(a, /: \(s: Session\) => arrivalLine\(z, creature, tmpl, s\.pubkey, jingle\)/, 'the walk-in feed uses it, per viewer');
  });
  // 2026-11-08: a hunter's kill leaves no body, so the picture drew an owl on
  // its kill over bare ground; the kill is drawn under it while the meal lasts.
  check('a kill being eaten is drawn under its eater, and every kill names what it was', () => {
    const ch = readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8');
    assert.match(ch, /if \(\(c\.eatingOn !== "kill" && c\.eatingOn !== "carrion"\) \|\| !c\.eatingWhat \|\| !ai\.eatingNow\(c\) \|\| dead\.includes\(c\.eatingWhat\)\) continue;\n\s+dead\.unshift\(c\.eatingWhat\);/, 'drawn while eaten');
    const a = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(a, /fedFrom1 - creature\.hunger, undefined, kill\.prey\)/, 'the bear on the wolves kill');
    assert.match(a, /fedFrom4 - creature\.hunger, undefined, victim\.templateId\)/, 'a run-down kill');
    assert.match(a, /fedFrom5 - creature\.hunger, undefined, victim\.templateId\)/, 'a worried kill');
    assert.match(a, /id: eaten\.id \}, eaten\.prey \?\? eaten\.id\)/, 'a carcass');
    assert.match(readFileSync(new URL('../src/groups.ts', import.meta.url), 'utf8'), /fedFrom - wolf\.hunger, undefined, from\)/, 'the wolves on their ground');
  });
  // 2026-11-08: the keeper's key gets what the sim holds on an animal under the
  // look; nobody else does.
  check('the keeper key reads an animal in full when it looks, and only that key', () => {
    const z = new ZoneDO({}, {});
    z.world = { mobTemplates: new Map([['eagle-owl', { id: 'eagle-owl', name: 'an eagle owl', max_hp: 22 }], ['mountain-hare', { id: 'mountain-hare', name: 'a mountain hare', max_hp: 6 }]]), mobSpawns: [{ id: 'o1', template_id: 'eagle-owl', room_id: 'r' }], rooms: new Map(), entryRooms: new Set(), exits: new Map() };
    z.roomDist = () => 3;
    const now = Date.now();
    const c = { id: 'o1', templateId: 'eagle-owl', roomId: 'r', hp: 22, hunger: 3.4, home: 'h', nextWanderAt: now + 120_000, grudges: [], target: null };
    z.creatures = new Map([[c.id, c]]);
    ate(c, now, 'kill', 0, undefined, 'mountain-hare');
    const r = keeperRead(z, c, now);
    assert.match(r, /keeper: eagle-owl #o1 · hp 22\/22 · hunger 3 · awake/, r);
    c.hp = 20.9068; assert.match(keeperRead(z, c, now), /hp 21\/22/, 'health in whole points'); c.hp = 22;
    assert.match(r, /doing: eating mountain hare \(its kill\), \d+m \d+s left/, r);
    assert.match(r, /home: h, 3 rooms off · none/, r);
    assert.match(r, /next move: in 2m 0s · flight: none/, r);
    assert.match(r, /born: spawn row o1, bloodline plain · traits: none/, r);
    c.traits = ['runt'];
    assert.match(keeperRead(z, c, now), /· traits: runt$/, 'a marked one names its trait');
    c.traits = undefined;
    c.eatingUntil = undefined; c.asleep = true; c.sleepUntil = now + 360_000;
    assert.match(keeperRead(z, c, now), /doing: sleeping, wakes in 6m 0s/);
    const v = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(v, /if \(session\.pubkey === CENSUS_PUBKEY\) z\.send\(session, ai\.keeperRead\(z, creature\), "dim"\);/, 'only the keeper key');
  });
  // 2026-11-08: two hinds slept through a rock brought down on a latch beside
  // them: the forcing drew the curious from next door but never woke the room.
  check('forcing a latch wakes what sleeps in the room, as loud as a fight', () => {
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /this\.roomSound\(session\.roomId, "Stone rings on iron \{dir\}, again and again\."\);\n(\s*\/\/.*\n)*\s+await ai\.wakeListeners\(this, session, session\.roomId, WAKE_NOISE, [^\n]+, true\);/, 'the ringing wakes the room');
  });
  // 2026-11-08: a lantern looked at in the gatehouse never said its well.
  check('a lantern looked at by the fire says how much fat is in its well', () => {
    const v = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    const fn = v.slice(v.indexOf('export async function lookKeepingItem'), v.indexOf('return null;', v.indexOf('export async function lookKeepingItem')));
    assert.match(fn, /carried\.itemId === LANTERN_ITEM \? " " \+ light\.wellWords\(light\.wellOf\(session, carried\)\)/, 'in the pack');
    assert.match(fn, /it\.itemId === LANTERN_ITEM \? " " \+ light\.wellWords\(it\.fuel \?\? 0\)/, 'in the lockbox or vault');
  });
  // 2026-11-08: a lantern filled while lit lost the lump and its unburned fat
  // when the connection or the server went: the burning well lived only in memory.
  check('a burning lantern writes its well down when filled and when you leave', () => {
    const l = readFileSync(new URL('../src/light.ts', import.meta.url), 'utf8');
    assert.match(l, /session\.litUntil! \+= LANTERN_FAT_MS;\n\s+session\.torchWarned = false;\n(\s*\/\/.*\n)*\s+saveWell\(z, session\);/, 'filled while burning');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /fades from the world\.`, "who"\);\n\s+light\.saveWell\(this, session\);/, 'leaving the world');
  });
  // 2026-11-08: the night had its line under a room's words and no other part
  // of the day had one; now dawn, morning, midday, afternoon and dusk each do.
  check('every part of the day has its line under the room, as the night does', () => {
    const z = new ZoneDO({}, {});
    z.world = { rooms: new Map([['r', { id: 'r', region: 'crossing' }]]), exits: new Map(), mobTemplates: new Map(), entryRooms: new Set() };
    const seen = new Set();
    const start = Date.UTC(2026, 10, 8);
    for (let t = start; t < start + 2 * DAY_CYCLE_MS * 4; t += 5 * 60_000) {
      const line = dayLine(z, 'r', t);
      if (isNight(t)) assert.equal(line, '', 'nothing at night: the night line has it');
      else if (line) seen.add(line.split(/[:,]/)[0]);
    }
    for (const part of ['Dawn', 'Morning', 'The middle of the day', 'Afternoon', 'Dusk']) assert.ok(seen.has(part), part + ' never said: ' + [...seen]);
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /const day = events\.dayLine\(this, room\.id\);\n\s+if \(day\) lines\.push\(LORE_LINE \+ day\);/, 'in the room, in the lore look');
  });
  // 2026-11-10: on the mountain under snow, the room's snow line was followed by
  // an hour line of grey cloud only, while the picture had snow falling.
  check('while it snows the hour line says the snow is coming down, and rain, fog and the night the same', () => {
    const z = new ZoneDO({}, {});
    z.world = { rooms: new Map([['r', { id: 'r', region: 'mountain' }]]), exits: new Map(), mobTemplates: new Map(), entryRooms: new Set() };
    z.snowUntil = Date.now() + 10 * DAY_CYCLE_MS * 8;
    const start = Date.UTC(2026, 10, 8);
    let said = 0;
    for (let t = start; t < start + 2 * DAY_CYCLE_MS * 4; t += 5 * 60_000) {
      const line = dayLine(z, 'r', t);
      if (!line) continue;
      said++;
      assert.match(line, /snow coming down/, line);
    }
    assert.ok(said > 0, 'the day was said at all');
    assert.equal(weatherSky(z, 'r'), 'snow');
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    assert.match(ev, /return snowed\(z, roomId\) \? "snow" : foggy\(z, roomId\) \? "fog" : raining\(z, roomId\) \? "rain" : "";/, 'the picture\'s order: snow, fog, rain');
    assert.match(ev, /const wx = weatherSky\(z, roomId\);[\s\S]{0,120}if \(wx\) return WEATHER_DAY\[wx\]/, 'by day');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /if \(nightWx\) lines\.push\(LORE_LINE \+ WEATHER_NIGHT\[nightWx\]\);\n\s+else if/, 'and by night, in place of the open sky');
    // ...and said ONCE: the snow line is not printed over the hour line that has the snow in it
    z.events = new Map(); z.bandOf = () => 'mountain'; z.regionOf = () => 'mountain';
    let clause = '';
    try { clause = skyClause(z, 'r'); } catch {}
    if (clause) assert.ok(saysWeather(clause, 'snow'), 'the snow clause is known for the snow: ' + clause);
    assert.ok(saysWeather(' The mountain is under snow, and the snow is old enough to have opinions about what stays on it and what sinks.', 'snow'), 'the line rome saw twice');
    assert.ok(!saysWeather(' The mountain is under snow, and the snow is old enough to have opinions about what stays on it and what sinks.', ''), 'kept when the hour line does not say it');
    assert.match(zs, /if \(sky && !events\.saysWeather\(sky, hourSaysWx\)\) lines\.push/, 'the room leaves the second one out');
  });
  // 2026-11-08: there was no way to tell whether grazers had eaten a room down.
  check('the grass can be looked at: how much is left, a bare room says so, and the keeper gets the count', () => {
    const z = new ZoneDO({}, {});
    z.world = { rooms: new Map(), exits: new Map(), mobTemplates: new Map(), entryRooms: new Set() };
    const room = [...FORAGE_ROOMS][0];
    z.regionOf = (r) => r === room ? 'mountain' : 'wood';
    grassPatch.resetForTest(z);
    const now = Date.now();
    assert.ok(grassPatch.isGrassRoom(z, room), 'a mountain grazing room');
    assert.ok(!grassPatch.isGrassRoom(z, 'elsewhere'), 'nowhere else');
    assert.match(grassPatch.words(grassPatch.left(z, room, now)), /thick and untouched/);
    assert.equal(grassPatch.bareLine(z, room, now), '', 'nothing under the room while there is grass');
    for (let i = 0; i < 6; i++) grassPatch.crop(z, 'red-hind', room, now);
    assert.match(grassPatch.words(grassPatch.left(z, room, now)), /eaten down to the dirt/);
    assert.equal(grassPatch.bareLine(z, room, now), 'The grass here is eaten down to the dirt.', 'bare, and said so');
    assert.match(grassPatch.keeperLine(z, room, now), /grass 0\/6 · next grows back in 20m/);
    const v = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(v, /grass\.isGrassRoom\(z, session\.roomId\) && \/\^\(the \)\?\(grass\|grazing\|turf\|sward\|pasture\)\$\/i/, 'look grass answers');
    assert.match(v, /if \(session\.pubkey === CENSUS_PUBKEY\) z\.send\(session, grass\.keeperLine/, 'the count for the keeper only');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /const bare = indoors \? "" : grass\.bareLine\(this, room\.id, Date\.now\(\)\);\n\s+if \(bare\) lines\.push\(bare\);/, 'under the room');
  });
  // 2026-11-08: no snake ate a rat; two hunted nothing and the gravid adder had
  // no way to eat at all.
  check('every snake takes rats, and the adder and viper hunt rather than graze', () => {
    for (const snake of ['stone-adder', 'the-gravid-adder', 'gill-adder', 'fen-viper']) assert.ok(PREYS_ON.get(snake)?.has('rat'), snake + ' takes rats');
    for (const snake of ['gill-adder', 'fen-viper']) assert.ok(!GRAZERS.has(snake), snake + ' no longer crops the floor');
    for (const bird of ['mountain-chough', 'ptarmigan', 'ermine']) assert.ok(PREYS_ON.get('the-gravid-adder').has(bird), 'the gravid adder eats as the stone adder does: ' + bird);
  });
  // 2026-11-08: four creatures stood in one straight line; a rank of three or
  // more now staggers, every other one a little forward.
  check('three or more in a rank stand staggered, every other one forward', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /var stag = items\.length >= 3 \? forward \* \.22 : 0;\n\s+items\.forEach\(function \(item, k\) \{\n\s+put\(item, xs\[k\], depth \+ \(k % 2 \? stag : 0\), false, 10 \+ r \* 2 \+ \(k % 2 && stag \? 1 : 0\)\);/);
  });
  // 2026-11-08: a scavenger ate the dead only once it was hungry at 50, so bodies
  // lay uneaten; it eats as it goes now, at 20, as a grazer does.
  check('a scavenger eats the dead as it goes, vermin and lurkers still when hungry', () => {
    for (const s of ['carrion-vulture', 'bone-breaker', 'glutton', 'grave-hyena']) assert.equal(deadEatsAt(s), 20, s);
    assert.equal(deadEatsAt('rat'), 50, 'a rat on a body waits to be hungry, as before');
    const a = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(a, /if \(creature\.hunger < deadEatsAt\(creature\.templateId\) && !gorging\) return;/, 'the live meal');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /if \(c\.hunger >= ai\.deadEatsAt\(c\.templateId\) && \(SCAVENGERS\.has/, 'and the far world');
  });
  // 2026-11-08: a scavenger only ever noticed a body in the room next door; a
  // hungry one walks to the nearest within three rooms now.
  check('a hungry scavenger walks toward the nearest body within three rooms', () => {
    const line = ['a', 'b', 'c', 'd', 'e'];
    const dist = (x, y) => Math.abs(line.indexOf(x) - line.indexOf(y));
    const z = { traces: new Map(), nearby: (from, r) => new Map(line.map((x) => [x, dist(from, x)]).filter(([, d]) => d <= r).sort((p, q) => p[1] - q[1])), roomDist: dist };
    const tmpl = { name: 'a carrion vulture' };
    const c = { templateId: 'carrion-vulture', roomId: 'a' };
    const exits = [{ to_room: 'b' }];
    const body = { kind: 'remains', at: 0, label: 'a red hind', prey: 'red-hind', id: 'red-hind', meat: 20 };
    z.traces.set('d', [body]);
    assert.equal(towardBody(z, c, tmpl, exits)?.to_room, 'b', 'three rooms off, it takes the step toward it');
    z.traces = new Map([['e', [body]]]);
    assert.equal(towardBody(z, c, tmpl, exits), undefined, 'four rooms off is a bird\'s job, not a walk');
    z.traces = new Map([['d', [{ ...body, meat: 0 }]]]);
    assert.equal(towardBody(z, c, tmpl, exits), undefined, 'a body picked clean draws nothing');
    const a = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(a, /\?\? \(creature\.hunger >= deadEatsAt\(tmpl\.id\) \? towardBody\(z, creature, tmpl, exits\) : undefined\);/, 'wired into the wander');
  });
  // 2026-11-08: only the roaming coyote hunted snakes; eight hunters take them
  // now, and a snake is a small meal.
  check('the snakes are hunted, and a snake is a small meal', () => {
    const takes = { 'hill-eagle': ['stone-adder', 'gill-adder'], 'eagle-owl': ['stone-adder', 'the-gravid-adder'], lynx: ['stone-adder', 'the-gravid-adder'],
      glutton: ['stone-adder', 'the-gravid-adder'], 'hill-fox': ['gill-adder'], wildcat: ['gill-adder'], 'grey-heron': ['gill-adder'], 'marsh-hound': ['fen-viper'] };
    for (const [hunter, snakes] of Object.entries(takes)) for (const sn of snakes) assert.ok(PREYS_ON.get(hunter)?.has(sn), hunter + ' takes ' + sn);
    for (const sn of ['stone-adder', 'the-gravid-adder', 'gill-adder', 'fen-viper']) assert.ok(SMALL_PREY.has(sn), sn + ' is a small meal');
    assert.ok(GRAZERS.has('grey-heron'), 'the heron still grazes');
    const fl = readFileSync(new URL('../src/flight.ts', import.meta.url), 'utf8');
    assert.match(fl, /if \(eats\?\.size && z\.creaturesInRoom\(room\)\.some\([^\n]+\)\) return true;\n(\s*\/\/.*\n)*\s+if \(GRAZERS\.has\(c\.templateId\) \|\| GRAZERS\.has\(line\)\) return forageGround/, 'a bird that hunts and grazes flies to either');
  });
  // 2026-11-08: no small cat took the ermine, and the tom hunted less than a plain wildcat.
  check('the cats hunt the right animals', () => {
    for (const cat of ['wildcat', 'the-tom', 'lynx']) assert.ok(PREYS_ON.get(cat).has('ermine'), cat + ' takes the ermine');
    for (const p of PREYS_ON.get('wildcat')) assert.ok(PREYS_ON.get('the-tom').has(p), 'the tom takes ' + p + ' as the wildcat does');
    for (const fox of ['hill-fox', 'snow-fox']) assert.ok(PREYS_ON.get('lynx').has(fox), 'the lynx takes the ' + fox);
  });
  // 2026-11-08: a hind fled a fight and walked back into it again and again: its
  // fear was read after its round had narrowed its ways to that room, and home
  // was always allowed; and the stags and goats came to look at a brawl.
  check('a frightened animal stays out of a fight, and the deer and goats are shy of one', () => {
    const z = { sessions: new Map([['a', { roomId: 'fight' }]]), inCombat: () => true };
    assert.ok(fightIn(z, 'fight') && !fightIn(z, 'quiet'), 'a fight is known by its room');
    for (const id of ['red-hind', 'roe-deer', 'red-stag', 'wood-stag', 'feral-goat', 'old-billy', 'hedgehog']) assert.ok(shiesNoise(id), id + ' is shy of a fight');
    assert.ok(!shiesNoise('hill-wolf'), 'a wolf still comes to look');
    const a = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(a, /const ok = \(e: \{ to_room: string \}\) => !feared\.has\(e\.to_room\) \|\| \(e\.to_room === creature\.home && !fightIn\(z, e\.to_room\)\);\n\s+const safe = exits\.filter\(ok\);\n\s+const anyWay = safe\.length \? safe : unanchored\.filter\(ok\);/, 'fear reads every way, and home is no refuge mid-fight');
    assert.match(a, /if \(NOISE_SHY\.has\(tmpl\.id\)\) continue;/, 'nor joins a fight in its room');
    assert.match(a, /HOARDERS\.has\(c\.templateId\) \|\| shiesNoise\(c\.templateId\)\) \|\| c\.target\) continue;/, 'the noise sends it off');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /if \(ai\.shiesNoise\(c\.templateId\)\) continue;/, 'and does not draw it in');
  });
  // 2026-11-08: the mountain's animals all lived low. 37 green rooms fed nothing,
  // the bone ground fed grazers, the North Bank was green against its words, no
  // deer could live above the grass and goats ate only grass.
  check('the mountain spreads its animals: green ground feeds, goats browse the crags, deer lie up high', () => {
    const z = { world: { entryRooms: new Set() } };
    for (const r of ['the-alder-thicket', 'the-corrie-lip', 'the-heather-step', 'the-south-bank', 'the-shelf-head', 'the-crack-line']) assert.ok(forageGround(z, 'red-hind', r), r + ' feeds a grazer, as its words say');
    assert.ok(!forageGround(z, 'red-hind', 'the-north-bank'), 'the North Bank, where nothing grazes, does not');
    assert.ok(!forageGround(z, 'rat', 'the-bone-ground'), 'the bone ground feeds no grazer');
    assert.ok(forageGround(z, 'feral-goat', 'the-shelf-walk') && forageGround(z, 'old-billy', 'the-knife'), 'a goat browses the high crags');
    assert.ok(!forageGround(z, 'red-hind', 'the-shelf-walk'), 'a hind does not');
    assert.ok(settlesOn('red-hind', 'the-north-scree'), 'a hind may lie up on stone');
    assert.ok(herds.feedsAt('feral-goat', 'the-shelf-walk'), 'and a goat\'s round takes it up to them');
  });
  // 2026-11-10: the fourth tier had no grazing of its own beyond mig 340's three rooms, so grazers lived low.
  check('something grows up high: fifteen rooms of the fourth tier say so and feed a grazer (mig 381)', () => {
    const z = { world: { entryRooms: new Set() } };
    const src = readFileSync(new URL('../regions/mountain-4.rooms', import.meta.url), 'utf8');
    const sql = readFileSync(new URL('../migrations/381_something_grows_up_high.sql', import.meta.url), 'utf8');
    for (const r of ['the-crest-step', 'the-north-drop', 'the-ridge-end', 'the-glacier-toe', 'the-melt-run', 'the-boulder-nose', 'the-lower-fan', 'the-stained-run', 'the-red-gully', 'the-gendarme',
      'the-lean', 'the-glacier-bend', 'the-pavement', 'the-cold-terrace', 'the-shelf-under']) {
      assert.ok(forageGround(z, 'red-hind', r) && herds.feedsAt('ptarmigan', r), r + ' feeds the grazers');
      assert.ok(settlesOn('red-hind', r) && settlesOn('mountain-hare', r), r + ' is ground a hind or a hare may live on');
      const prose = src.slice(src.indexOf('## ' + r + ' |')).split('\n')[1];
      assert.match(prose, /\bmoss\b/, r + ' says in its own words that something grows there');
      assert.ok(sql.includes(prose.replaceAll("'", "''")), r + ': the migration carries the same words as the source');
    }
  });
  // 2026-11-08: no goat or hind ever homed above its highest spawn row.
  check('a mountain home has no ceiling, and a goat counts its crags when it settles', () => {
    const a = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    const fn = a.slice(a.indexOf('export function mountainHomes'), a.indexOf('export function rollDen'));
    assert.ok(!/d <= far/.test(fn), 'no furthest-row ceiling');
    assert.match(fn, /SURFACE_FORAGE\.has\(n\) \|\| \(BROWSERS\.has\(templateId\) && CRAG_ROOMS\.has\(n\)\)/, 'a goat settles by its crags');
  });
  // 2026-11-08: the herds slid to the foot, which has most of the grazing rooms;
  // a new home is drawn by the grass left near it, not by how many rooms.
  check('a grazer draws its home by the grass left, so eaten ground stops pulling', () => {
    const g = readFileSync(new URL('../src/groups.ts', import.meta.url), 'utf8');
    assert.match(g, /food\.set\(r, SCAVENGERS\.has\(line\) \? 1 : grass\.left\(z, r, now\) \/ GRASS_BITES\)/);
  });
  // 2026-11-08: every herd of a line ended up in two or three homes at the foot.
  check('herds keep apart, and a herd near full takes no newcomer; packs as before', () => {
    const g = readFileSync(new URL('../src/groups.ts', import.meta.url), 'utf8');
    assert.match(g, /const herd = MOUNTAIN_GROUPS\.has\(line\) && \(!PREYS_ON\.has\(line\) \|\| FLOCKS\.has\(line\)\);/, 'herds and flocks only');
    assert.match(g, /const spaced = all\.filter\(\(r\) => !barred\.has\(r\) && !apart\.has\(r\)\);\n\s+const unbarred = spaced\.length \? spaced : all\.filter/, '4 rooms from another herd of its line, while there is room');
    assert.match(g, /const spare = PREYS_ON\.has\(line\) && !FLOCKS\.has\(line\) \? 0 : 1;/, 'a herd keeps one place spare, a pack none');
  });
  // 2026-11-08: the birds bunched: chough flocks did not keep apart, and ravens,
  // vultures and bone-breakers roosted on the same few rooms.
  check('the birds spread out: flocks keep apart, roosting birds take the least crowded ground', () => {
    const g = readFileSync(new URL('../src/groups.ts', import.meta.url), 'utf8');
    assert.match(g, /const herd = MOUNTAIN_GROUPS\.has\(line\) && \(!PREYS_ON\.has\(line\) \|\| FLOCKS\.has\(line\)\);/, 'chough flocks keep apart');
    assert.match(g, /\} else if \(SPREAD_ROOSTS\.has\(line\)\) \{/, 'roosting birds count their own kind round each room');
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    for (const b of ['scarp-raven', 'carrion-vulture', 'bone-breaker']) assert.ok(zd.match(/export const SPREAD_ROOSTS = new Set<string>\(\[[^\]]*\]\)/)[0].includes(`"${b}"`), b);
  });
  // 2026-11-09: a vulture, two bone-breakers and the bone-dropper in one room. The
  // spread counted only a bird's own kind; now the big carrion birds count each other.
  check('a vulture, a bone-breaker and a raven each settle off the others\' roosts (2026-11-09)', () => {
    const names = ['gate', ...Array.from({ length: 24 }, (_, i) => 'm' + (i + 1))];
    const exits = new Map(names.map((r) => [r, []]));
    for (let i = 1; i < names.length; i++) { exits.get(names[i - 1]).push({ dir: 'e', to_room: names[i] }); exits.get(names[i]).push({ dir: 'w', to_room: names[i - 1] }); }
    const nearby = (from, depth) => { const out = new Map([[from, 0]]), q = [from]; for (const at of q) { const d = out.get(at); if (d < depth) for (const e of exits.get(at)) if (!out.has(e.to_room)) { out.set(e.to_room, d + 1); q.push(e.to_room); } } return out; };
    const birds = ['carrion-vulture', 'bone-breaker', 'scarp-raven'];
    const world = { rooms: new Map(names.map((r) => [r, { id: r, region: 'mountain' }])), exits, entryRooms: new Set(['gate']), safeRooms: new Set(),
      mobSpawns: birds.flatMap((t) => [{ template_id: t, room_id: 'm1' }]), mobTemplates: new Map() };
    const crowded = new Set(nearby('m12', 3).keys());
    for (const [who, roosting] of [['bone-breaker', 'carrion-vulture'], ['carrion-vulture', 'bone-breaker'], ['scarp-raven', 'carrion-vulture'], ['carrion-vulture', 'the-bone-dropper']]) {
      const z = { world, nearby, regionOf: () => 'mountain', variantBase: new Map([['the-bone-dropper', 'bone-breaker']]), creatures: new Map([['r', { id: 'r', templateId: roosting, home: 'm12', roomId: 'm12' }]]),
        groups: { at: 0, packs: {}, gone: {} }, creaturesInRoom: () => [] };
      for (let i = 0; i < 60; i++) { const h = groupPickHome(z, who, 2_000_000_000); assert.ok(h && !crowded.has(h), who + ' roosts off a ' + roosting + '\'s ground: ' + h); }
    }
  });
  // 2026-11-08: the Boulder Gate was a hideaway; it is ordinary mountain ground.
  check('the Boulder Gate is no hideaway, in the room source and the database', () => {
    const src = readFileSync(new URL('../regions/mountain-2.rooms', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('## the-boulder-gate |'), src.indexOf('\n## ', src.indexOf('## the-boulder-gate |') + 5));
    assert.ok(!/^!safe$/m.test(block), 'the source does not mark it safe');
    assert.match(readFileSync(new URL('../migrations/376_the_boulder_gate_is_no_hideaway.sql', import.meta.url), 'utf8'), /UPDATE rooms SET is_safe = 0 WHERE id = 'the-boulder-gate';/);
  });
  // 2026-11-08: a kill hung in the air a moment before its body dropped: the death
  // frame played at the standing line, the body lay lower a beat later.
  check('every room the crowberries lie in says crowberry grows there', () => {
    const dir = new URL('../migrations/', import.meta.url);
    const rooms = readdirSync(new URL('../regions/', import.meta.url)).filter((f) => f.endsWith('.rooms'))
      .map((f) => readFileSync(new URL('../regions/' + f, import.meta.url), 'utf8')).join('\n');
    const where = new Set();
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
      const sql = readFileSync(new URL(f, dir), 'utf8');
      for (const m of sql.matchAll(/\('the-[a-z-]+', 'crowberries', 1\)|VALUES \('crowberries', '([a-z-]+)', 1\)/g)) if (m[1]) where.add(m[1]);
      for (const m of sql.matchAll(/\('(the-[a-z-]+)',\s*'crowberries',\s*1\)/g)) where.add(m[1]);
    }
    assert.ok(where.size >= 8, 'eight crowberry rooms, found ' + where.size);
    for (const r of where) {
      const at = rooms.indexOf('## ' + r + ' ');
      assert.ok(at >= 0, r + ' is in the room source');
      const body = rooms.slice(at, rooms.indexOf('\n## ', at + 3) >>> 0);
      assert.ok(/crowberr/i.test(body), r + ' names the crowberry');
      assert.ok(!/bilberr/i.test(body), r + ' names no other berry');
    }
  });
  check('the hill wolf faces you when hit, not its idle profile', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /var HIT_AS = \{ "hill-wolf": "alert" \};/, 'the wolf is hit in its front-facing frame');
    assert.ok(pub.includes('if (recoil === "idle" && typeof HIT_AS !== "undefined" && HIT_AS[id] && spec.f[HIT_AS[id]] !== undefined) recoil = HIT_AS[id];'), 'and the paint uses it');
  });
  check('a kill goes down where it stands, and its body stays there until more come in', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const beat = pub.slice(pub.indexOf('a.phase = "death"; a.t = 0; a.asleep = false;'), pub.indexOf('mobHold = Date.now() + DEATH_S * 1000;'));
    // no move at death: its death frame at once, on its own standing feet line
    assert.ok(!/style\.top/.test(beat), 'a dying creature is not moved');
    assert.ok(beat.includes('a.el.style.backgroundPositionX = (a.spec.f.death * 100 / (a.spec.n - 1)) + "%";'), 'death frame shown at once');
    assert.ok(beat.includes('((fdrop - (a.lift || 0)) * 100)'), 'its standing lift kept');
    const pose = pub.slice(pub.indexOf('  if (a.phase === "death") {\n'), pub.indexOf('} else if (a.phase === "attack") {'));
    assert.ok(pose.includes('name = "death";') && !/s \*=/.test(pose), 'a dying body is not resized');
    // its body is laid on the spot it stood on, at the depth it stood at...
    assert.match(pub, /el\._depth = depth;/, 'each sprite remembers how far forward it stands');
    assert.match(pub, /stood: true, depth: anims\[a0\]\.el\._depth \|\| 0/, 'a dying one carries its spot into the repaint');
    assert.match(pub, /put\(item, best, stood \? Number\(item\.el\.dataset\.depth\) \|\| 0 : forward \* \.9, true, i\);/, 'laid where it stood');
    assert.ok(pub.includes('if (stood) best = Math.max(deadL, Math.min(deadR - w, fellAt - w / 2));'), 'on the very spot, not the nearest clear one');
    // ...until more come into the room
    assert.match(pub, /var moreCame = list\.length > \(mobsEl\._livingN \|\| 0\);/, 'more coming in is noticed');
    assert.match(pub, /if \(at\.stood && !moreCame\)/, 'and then it goes down to the front');
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
    assert.match(said.slice(-2).join('\n'), /You watch a hill wolf sleeping/);
    assert.match(said.slice(-2).join('\n'), /still to see it about its business, eating, hungry and dead/);
    await cmdStudy(z, me, 'wolf');
    assert.match(said.slice(-2).join('\n'), /already set down a hill wolf sleeping/);
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
    assert.match(said.slice(-2).join('\n'), /Any weapon can find the gap/);
    assert.deepEqual(z.traces.get('r').map((t) => t.id), ['nomad'], 'the wolf body is gone; a nomad is never a study');
    await cmdStudy(z, me, 'dead wolf');
    assert.match(said.slice(-2).join('\n'), /Nothing by that name/);
  });
  await checkAsync('a dead body names everything it gives, the cuts included (2026-11-05)', async () => {
    // The page named only the trophy and keys, so a kind whose kill cuts leather,
    // fat or bone read "gives nothing worth carrying" (the sloth) or left them out.
    const { z, me, said } = studyWorld();
    z.world.itemTemplates = new Map([['leather-offcuts', { id: 'leather-offcuts', name: 'a handful of leather offcuts' }],
      ['fat', { id: 'fat', name: 'a lump of fat' }], ['bone-offcuts', { id: 'bone-offcuts', name: 'a handful of bone and horn' }]]);
    z.traces.set('r', [{ kind: 'blood', at: Date.now(), label: 'a hill wolf', id: 'hill-wolf' }]);
    await cmdStudy(z, me, 'dead wolf');
    assert.match(said.slice(-2).join('\n'), /Its body gives [^.]*a handful of leather offcuts/, 'the leather a hill wolf is cut for');
    assert.doesNotMatch(said.slice(-2).join('\n'), /nothing worth carrying/);
  });
  await checkAsync('study does not print what an animal hunts; the journal still has it (2026-11-06)', async () => {
    const { z, me, wolf, said } = studyWorld();
    z.world.mobTemplates.set('rat', { id: 'rat', name: 'a scabby rat', level: 1 });
    wolf.asleep = false; wolf.hunger = 0; wolf.eatingUntil = Date.now() + 90_000; wolf.eatingIn = wolf.roomId; wolf.eatingOn = 'kill';
    await cmdStudy(z, me, 'wolf');
    assert.match(said.slice(-2).join('\n'), /You watch .* eating a while/, 'it was watched feeding');
    assert.doesNotMatch(said.slice(-2).join('\n'), /It hunts|its own kind about it|eats the dead/, 'and none of that is printed');
    assert.match(study.line(z, z.world.mobTemplates.get(wolf.templateId), 'feeding'), /It hunts/, 'the journal page keeps it');
  });
  await checkAsync('a full account wants every behaviour and the kills (2026-10-24)', async () => {
    const { z, me, wolf, said, db } = studyWorld();
    db.prepare("INSERT INTO journal_logs VALUES ('jrn-1', 'hill-wolf', 6, 1, 'about,feeding,hungry,dead', '')").run();
    await cmdStudy(z, me, 'wolf');
    assert.match(said.slice(-2).join('\n'), /Its account is complete/);
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
    db.exec("DROP TABLE players; CREATE TABLE players(pubkey TEXT PRIMARY KEY, name TEXT, kills INTEGER DEFAULT 0, boss_kills INTEGER DEFAULT 0, pvp_kills INTEGER DEFAULT 0, accounts INTEGER DEFAULT 0, charted INTEGER DEFAULT 0, lb_published_at INTEGER)");
    db.exec("INSERT INTO players VALUES ('a', 'A', 5, 0, 0, 3, 0, 1), ('b', 'B', 30, 0, 0, 0, 0, 1)");
    const top = await loadLeaderboard(D1, 'legend', 10, { bossPts: 100, pvpPts: 25, accountPts: 10, chartPts: 50, trophyIds: [] });
    assert.deepEqual(top.map((e) => [e.name, e.score]), [['A', 35], ['B', 30]]);
  });
  await checkAsync('a map walked to every room is 50 on the legend board, once (2026-11-09)', async () => {
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.match(zd, /export const LB_CHART_PTS = 50;/);
    const { db, D1 } = sqliteD1();
    db.exec("DROP TABLE players; CREATE TABLE players(pubkey TEXT PRIMARY KEY, name TEXT, kills INTEGER DEFAULT 0, boss_kills INTEGER DEFAULT 0, pvp_kills INTEGER DEFAULT 0, accounts INTEGER DEFAULT 0, charted INTEGER DEFAULT 0, lb_published_at INTEGER)");
    db.exec("CREATE TABLE map_ink(map_id TEXT, room_id TEXT, PRIMARY KEY(map_id, room_id))");
    db.exec("INSERT INTO players VALUES ('a', 'A', 5, 0, 0, 0, 0, 1), ('b', 'B', 30, 0, 0, 0, 0, 1)");
    db.exec("INSERT INTO map_ink VALUES ('map-a', 'r1'), ('map-a', 'r2'), ('map-b', 'r1'), ('map-b', 'r2'), ('map-b', 'r3')");
    const z = new ZoneDO({}, {});
    z.env = { DB: D1 };
    z.world = { rooms: new Map([['r1', {}], ['r2', {}], ['r3', {}]]) };
    const said = []; z.send = (_s, t) => said.push(t);
    // A walks the last room with a surveyor's map: credited.
    const a = { pubkey: 'a', roomId: 'r3', items: [{ itemId: 'surveyor-map', rowId: 'x', journalId: 'map-a' }] };
    await inkRooms(z, a);
    assert.equal(a.charted, 1, 'the step that inks the last room credits it');
    assert.match(said.at(-1), /last room goes down/);
    await inkRooms(z, a); a.roomId = 'r1'; await inkRooms(z, a);
    assert.equal(db.prepare("SELECT charted FROM players WHERE pubkey='a'").get().charted, 1, 'once');
    // B picks up a map already whole: nothing new is inked, nothing is credited.
    const b = { pubkey: 'b', roomId: 'r2', items: [{ itemId: 'surveyor-map', rowId: 'y', journalId: 'map-b' }] };
    await inkRooms(z, b);
    assert.ok(!b.charted, 'a full map picked up was somebody else\'s walking');
    // A crude map walked whole does not count.
    db.exec("INSERT INTO map_ink VALUES ('map-c', 'r1'), ('map-c', 'r2')");
    const c = { pubkey: 'b', roomId: 'r3', items: [{ itemId: 'crude-map', rowId: 'z', journalId: 'map-c' }] };
    await inkRooms(z, c);
    assert.ok(!c.charted, 'only a surveyor\'s copy');
    const top = await loadLeaderboard(D1, 'legend', 10, { bossPts: 100, pvpPts: 25, accountPts: 10, chartPts: 50, trophyIds: [] });
    assert.deepEqual(top.map((e) => [e.name, e.score]), [['A', 55], ['B', 30]]);
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
    assert.match(parser, /"  light \/ douse      a torch or a lantern/, 'douse is in the short help');
    const guide = readFileSync(new URL('../src/guide.ts', import.meta.url), 'utf8');
    assert.match(guide, /<code>douse<\/code> \(snuff, shutter\)/, 'and in full in the guide');
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
    assert.match(pub, /var FRAME_DROP = \{ "forgotten-king": \{ death: 0\.03 \},/, 'his death a little lower');
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
    const z = { world, creatures: new Map(), sessions: new Map(), herds: new Map(), groups: { at: 0, packs: {}, gone: {} }, variantBase: new Map(), arrivals: new Map(), conditions: new Map(),
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
  // 2026-11-08: the bone floors fed scavengers forever, so they never left them
  // for the real dead; now nothing eats the floor.
  check('no scavenger eats the bone floors, though it roosts on them; an adder on the warm rock (2026-10-25, 2026-11-08)', () => {
    assert.ok(herds.feedsAt('carrion-vulture', 'the-bone-ground'), 'the bone ground is the vulture\'s roost, where its round keeps it');
    const a = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.ok(!/CARRION_ROOMS\.has\(creature\.roomId\)/.test(a), 'nothing gnaws the bone floor');
    const fl = readFileSync(new URL('../src/flight.ts', import.meta.url), 'utf8');
    assert.ok(!/CARRION_ROOMS\.has\(room\)/.test(fl), 'no bird flies to a bone floor for food');
    assert.match(readFileSync(new URL('../src/groups.ts', import.meta.url), 'utf8'), /SCAVENGERS\.has\(line\) \? CARRION_ROOMS/, 'and it homes by its roost');
    assert.ok(herds.feedsAt('carrion-vulture', 'the-deer-lawn'), 'and where the grazers die');
    assert.ok(herds.feedsAt('stone-adder', 'the-ramp-head'), 'an adder lies on the warm rock');
    assert.ok(!herds.feedsAt('stone-adder', 'the-deer-lawn'), 'not on the grass');
    assert.ok(!herds.feedsAt('roe-deer', 'the-bone-ground'), 'a deer does not graze the bone fan');
    assert.ok(herds.feedsAt('ptarmigan', 'the-south-shelf'), 'the high mountain\'s one green strip');
  });
  check('at dawn a vulture walks out to its roost on the bone ground, not a lawn it cannot reach (2026-10-25)', () => {
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
    const { z } = condWorld('eyrie-holder');
    z.world.mobTemplates.set('eyrie-holder', { id: 'eyrie-holder', name: 'an eyrie-holder', max_hp: 10, respawn_secs: 900, is_boss: 0 });
    for (let h = 0; h <= 60; h++) { conditions.tick(z, h * H, true); assert.equal(conditions.of(z, 'mountain'), undefined, 'hour ' + h); }
  });
  check('the stone adder moves homes like the rest of the mountain, and rats stay (2026-11-06)', () => {
    const src = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const list = (name) => src.slice(src.indexOf(`export const ${name} = new Set`), src.indexOf(']);', src.indexOf(`export const ${name} = new Set`)));
    assert.match(list('MOUNTAIN_ROAMERS'), /"stone-adder"/, 'it draws new homes');
    assert.doesNotMatch(list('ROOTED'), /"stone-adder"|"the-gravid-adder"/, 'and walks to them, the rare form too');
    assert.doesNotMatch(list('MOUNTAIN_ROAMERS'), /"rat"/, 'rats keep the Shieling');
    assert.ok(settlesOn('stone-adder', 'the-first-crag') && !settlesOn('stone-adder', 'the-deer-lawn-high'), 'rock, not grass');
    assert.ok(settlesOn('stone-adder', 'the-shiel-street'), 'and some may lie up in the Shieling');
  });
  // 2026-11-07: a meal landed whole at the first bite and the eating after was
  // only shown. Now it is eaten down over the meal, and cut short gives back the rest.
  check('a meal is eaten over its time; cut short, the animal is owed the rest and the body keeps it', () => {
    const t = 1_000_000;
    const traces = new Map();
    const z = { traces, addTrace(r, tr) { traces.set(r, [...(traces.get(r) ?? []), tr]); } };
    const mk = () => ({ id: 'w', templateId: 'hill-wolf', roomId: 'r', hunger: 80, hp: 20, nextWanderAt: 0 });
    let c = mk(); c.hunger = 5; ate(c, t, 'carrion', 75, { roomId: 'r', prey: 'red-hind', meat: 40 });
    assert.equal(c.eatingUntil - t, 120_000, 'a whole body takes two minutes');
    digest(z, c, t + 60_000);
    assert.equal(c.hunger, 5, 'eating, nothing is given back');
    digest(z, c, t + 120_000);
    assert.equal(c.meal, undefined, 'finished, the meal is done');
    assert.equal(traces.size, 0, 'and nothing goes back on the floor');
    c = mk(); c.hunger = 5; ate(c, t, 'carrion', 75, { roomId: 'r', prey: 'red-hind', meat: 40 });
    c.roomId = 'elsewhere';
    digest(z, c, t + 60_000);
    assert.equal(c.hunger, 5 + 37.5, 'walked off halfway: half the meal is owed back');
    assert.deepEqual(traces.get('r')?.map((tr) => [tr.kind, tr.prey, tr.meat]), [['remains', 'red-hind', 20]], 'and half the body is still lying there');
    c = mk(); c.hunger = 30; ate(c, t, 'kill', 25);
    assert.equal(c.eatingUntil - t, 40_000, 'a mouthful is quicker');
    c.target = 'someone';
    digest(z, c, t + 30_000);
    assert.equal(c.hunger, 30 + 25 * 0.25, 'set on three quarters in, it is owed the last quarter');
    c = mk(); ate(c, t, 'kill', 0);
    assert.equal(c.meal, undefined, 'a meal that took nothing off owes nothing');
    const zsrc = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.equal((zsrc.match(/ai\.digest\(this, (c|creature), (t|now)\)/g) ?? []).length, 3, 'the meal goes on wherever hunger does: the live beat, the slow world and the catch-up');
  });
  // 2026-11-07: rats were finishing a wolf's body. A feeder smaller than the dead
  // takes its own size off it and leaves the rest.
  // 2026-11-10: both of the keeper's warm pieces could be off the shelf at once.
  check('the keeper always has one warm piece: the wool-lined cap never rotates off', () => {
    const g = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.match(g, /itemId === SOUP_ITEM \|\| FENCE_ALWAYS\.has\(itemId\)\);/);
    assert.match(g, /if \(now >= at \|\| fenceStaple\(z, itemId\)\) z\.fenceOut\.delete\(itemId\);/, 'and one already off comes straight back');
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.match(zd, /export const FENCE_ALWAYS = new Set\(\["wool-lined-cap"\]\);/);
  });
  // 2026-11-10: a ward was on or off, so a second quiet or padded piece was worth
  // nothing. Two or more worn pieces of one ward are a step stronger.
  check('a second piece of the same ward counts: half becomes a third', () => {
    assert.equal(wardAt('quiet', 0, 0.5), 1);
    assert.equal(wardAt('quiet', 1, 0.5), 0.5);
    assert.equal(wardAt('quiet', 2, 0.5), 1 / 3);
    assert.equal(wardAt('padded', 3, 0.5), 1 / 3, 'a third piece adds no more');
    assert.equal(wardAt('fleeced', 2, 0.25), 0.125);
    assert.equal(wardAt('hooded', 2, 0.5), 0.5, 'a ward with no stacked figure stays as it was');
    const z = new ZoneDO({}, {});
    z.world = { itemTemplates: new Map([['cap', { id: 'cap', traitMap: new Map([['quiet', 1]]) }], ['boot', { id: 'boot', traitMap: new Map() }]]) };
    const s = { items: [{ itemId: 'cap', equipped: true }, { itemId: 'boot', equipped: true, rolledMap: new Map([['quiet', 1]]) }, { itemId: 'cap', equipped: false }] };
    assert.equal(z.wornCount(s, 'quiet'), 2, 'worn pieces only, made or rolled');
    assert.equal(z.ward(s, 'quiet', 0.5), 1 / 3);
    const src = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8') + readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8') + readFileSync(new URL('../src/pvp.ts', import.meta.url), 'utf8');
    for (const tag of ['quiet', 'padded', 'wardhide', 'mailward', 'slick', 'fleeced']) assert.ok(src.includes(`ward(session, "${tag}"`) || src.includes(`ward(victim, "${tag}"`) || src.includes(`ward(defender, "${tag}"`), tag + ' reads the count');
  });
  // 2026-11-10: breaking a rare gave 4 stock and forging one cost 3, so any rare
  // found became any rare wanted, with change. Breaking gives under the forge cost.
  check('breaking gear down gives less than forging its rarity costs', () => {
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.match(zd, /export const SALVAGE_YIELD: Record<string, number> = \{ common: 1, uncommon: 1, rare: 2, epic: 4 \};/);
    const mig = readFileSync(new URL('../migrations/382_gear_found_where_it_belongs.sql', import.meta.url), 'utf8');
    assert.match(mig, /UPDATE mob_templates SET gear_item = NULL, gear_drop = 0 WHERE id = 'cave-lion';/);
    assert.match(mig, /UPDATE fence_stock SET cost = 40 WHERE item_id = 'strongbox-key';/);
  });
  // 2026-11-10: a big body feeds more mouths. A feeder takes half its own size,
  // so a cave lion goes four ways among great vultures, six among hill wolves.
  check('a cave lion feeds four great vultures and six hill wolves', () => {
    const mobTemplates = new Map([['cave-lion', { id: 'cave-lion', name: 'the cave lion', max_hp: 96 }], ['great-vulture', { id: 'great-vulture', name: 'a great vulture', max_hp: 56 }], ['hill-wolf', { id: 'hill-wolf', name: 'a hill wolf', max_hp: 36 }]]);
    const mouths = (eater) => {
      const z = { world: { mobTemplates }, creatures: new Map(), traces: new Map([['r', [{ kind: 'remains', at: 1, prey: 'cave-lion' }]]]), fxFed() {}, refreshRoomCtx() {}, roomFeed() {}, roomSound() {}, sessions: new Map() };
      let n = 0;
      for (let i = 0; i < 20; i++) { const c = { id: 'c' + i, templateId: eater, roomId: 'r', hunger: 90, hp: 1, fed: 9, nextWanderAt: 0 }; z.creatures.set(c.id, c); scavengerFeeds(z, c, true); if (c.meal) n++; }
      return n;
    };
    assert.equal(mouths('great-vulture'), 4);
    assert.equal(mouths('hill-wolf'), 6);
  });
  check('a small thing does not eat a big body whole; a big one still does', () => {
    const mobTemplates = new Map([['rat', { id: 'rat', name: 'a scabby rat', max_hp: 8 }], ['hill-wolf', { id: 'hill-wolf', name: 'a hill wolf', max_hp: 30 }],
      ['carrion-vulture', { id: 'carrion-vulture', name: 'a carrion vulture', max_hp: 40 }], ['mountain-hare', { id: 'mountain-hare', name: 'a mountain hare', max_hp: 6 }]]);
    const mk = (body) => { const z = { world: { mobTemplates }, creatures: new Map(), traces: new Map([['r', [{ kind: 'remains', at: 1, ...body }]]]), fxFed() {}, refreshRoomCtx() { z.redrawn = (z.redrawn ?? 0) + 1; }, roomFeed() {}, roomSound() {}, sessions: new Map() }; return z; };
    const feed = (z, templateId) => { const c = { id: templateId + Math.random(), templateId, roomId: 'r', hunger: 90, hp: 1, fed: 9, nextWanderAt: 0 }; z.creatures.set(c.id, c); scavengerFeeds(z, c, true); return c; };
    const finish = (z, c) => digest(z, c, c.meal.to);
    let z = mk({ prey: 'hill-wolf' });
    const r1 = feed(z, 'rat');
    assert.equal(z.traces.get('r')?.[0]?.meat, 26, 'a rat takes half its own size off a wolf');
    feed(z, 'rat'); feed(z, 'rat');
    assert.equal(z.traces.get('r')?.[0]?.meat, 18, 'three rats in, there is still a body');
    for (let i = 0; i < 4; i++) feed(z, 'rat');
    assert.equal(z.traces.get('r')?.[0]?.meat, 2, 'seven rats in, a scrap is left');
    const r4 = feed(z, 'rat');
    // 2026-11-07: a meal takes its time, so the body stays until the last one eating it is done.
    assert.equal(z.traces.get('r')?.[0]?.meat, 0, 'the eighth takes the last of it, and the body still lies there while it eats');
    const r5 = feed(z, 'rat');
    assert.equal(r5.meal, undefined, 'with nothing left on it, the next rat finds nothing to eat');
    finish(z, r4);
    assert.equal(z.traces.get('r')?.length, 1, 'the body stays while another is still eating it');
    for (const c of z.creatures.values()) if (c !== r4 && c.meal) finish(z, c);
    assert.equal(z.traces.get('r'), undefined, 'and leaves the floor when the last meal on it is done');
    assert.equal(z.redrawn, 1, 'and the picture is told');
    z = mk({ prey: 'hill-wolf' });
    const v = feed(z, 'carrion-vulture');
    assert.equal(z.traces.get('r')?.[0]?.meat, 0, 'a vulture bigger than the wolf takes all of it, and eats it where it lies');
    digest(z, v, v.meal.from + (v.meal.to - v.meal.from) / 2); 
    assert.equal(z.traces.get('r')?.length, 1, 'still eating, the body is there');
    v.roomId = 'elsewhere'; digest(z, v, v.meal.from + (v.meal.to - v.meal.from) / 2);
    assert.equal(z.traces.get('r')?.length, 1, 'driven off half way, one body lies there, not two');
    assert.equal(z.traces.get('r')[0].meat, 15, 'with the half it did not eat');
    z = mk({ label: 'a hill wolf' });
    feed(z, 'rat');
    assert.equal(z.traces.get('r')?.[0]?.meat, 26, 'a body named only by its label weighs the same');
    z = mk({ prey: 'mountain-hare' });
    const h = feed(z, 'rat');
    assert.equal(z.traces.get('r')?.[0]?.meat, 0, 'a rat eats a hare whole');
    finish(z, h);
    assert.equal(z.traces.get('r'), undefined, 'and when it is done the hare is gone');
  });
  // 2026-11-07: the hide ward's line said a raven "drags claws", and opened on
  // the creature's name so it read as a second blow after the hit.
  check('the guard, the hide and the mail say what they turned, and read as the same hit', () => {
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.ok(!zs.includes('drags claws through the thick hide'), 'no claws on a beak');
    assert.match(zs, /const by = BEAKS\.has\(tmpl\.id\) \? "beak" : BITERS\.has\(tmpl\.id\) \? "teeth" : "blow";\n\s+if \(victim\.stance === "guarded"/, 'beak, teeth or the blow');
    for (const line of ['`Your guard turns the worst of the ${by} — no wound opens.`', '`Your thick hide turns the ${by} — no wound opens.`', '`The ${by} skates across your rings — no wound opens.`'])
      assert.ok(zs.includes(line), 'told from your side: ' + line);
    assert.ok(!zs.includes('rakes for you, but your guard') && !zs.includes('rakes across the rings'), 'the guard and the mail no longer read as a new blow');
    const word = (id) => BEAKS.has(id) ? 'beak' : BITERS.has(id) ? 'teeth' : 'blow';
    assert.equal(word('scarp-raven'), 'beak'); assert.equal(word('hill-wolf'), 'teeth'); assert.equal(word('the-old-raven'), 'beak', 'a beak that also bites is still a beak');
  });
  // 2026-11-07: a body went from the picture as an animal walked in to eat it:
  // a room keeps twelve marks, and the newcomer's prints pushed out the oldest,
  // the body. And a body laid by a death (a name and a template, no prey) never
  // matched its own meal, so a meal cut short laid a second, unseen body and the
  // first lay picked clean for good; and one whose eater was killed did the same.
  check('a body stays in the picture until there is nothing left on it', () => {
    const mobTemplates = new Map([['rat', { id: 'rat', name: 'a scabby rat', max_hp: 8 }], ['hill-wolf', { id: 'hill-wolf', name: 'a hill wolf', max_hp: 30 }]]);
    const zone = () => { const z = { world: { mobTemplates, rooms: new Map([['r', { region: 'mountain' }]]) }, snowUntil: 0, events: new Map(), bandOf: () => 'upper', regionOf: () => 'mountain', weather: {}, creatures: new Map(), traces: new Map(), fxFed() {}, refreshRoomCtx() { z.redrawn = (z.redrawn ?? 0) + 1; }, roomFeed() {}, roomSound() {}, sessions: new Map() };
      z.addTrace = (room, tr) => ZoneDO.prototype.addTrace.call(z, room, tr); return z; };
    let z = zone();
    const now = Date.now();
    z.addTrace('r', { kind: 'blood', at: now, label: 'a hill wolf', id: 'hill-wolf' });
    for (let i = 0; i < 14; i++) z.addTrace('r', { kind: 'track', at: now, id: 'beast' + i, dir: 'east' });
    assert.ok(z.traces.get('r').some((t) => t.id === 'hill-wolf'), 'prints walking in never push a body out');
    assert.ok(z.traces.get('r').length <= 13, 'the prints still keep to the cap');
    z = zone();
    z.addTrace('r', { kind: 'blood', at: now, label: 'a hill wolf', id: 'hill-wolf' });
    const feed = () => { const c = { id: 'rat' + Math.random(), templateId: 'rat', roomId: 'r', hunger: 90, hp: 1, fed: 9, nextWanderAt: 0 }; z.creatures.set(c.id, c); scavengerFeeds(z, c, true); return c; };
    const body = () => z.traces.get('r')?.filter((t) => t.kind === 'blood' || t.kind === 'remains') ?? [];
    const a = feed();
    a.roomId = 'away'; digest(z, a, a.meal.from + (a.meal.to - a.meal.from) / 2);
    assert.equal(body().length, 1, 'a meal cut short on a body a death laid puts what it left back on that body, not a second one');
    assert.equal(body()[0].meat, 28, 'the half it did not eat');
    assert.equal(body()[0].id, 'hill-wolf', 'and the body is still the one drawn');
    body()[0].meat = 4;
    const b = feed();
    assert.equal(body()[0].meat, 0, 'the last of it taken');
    digest(z, b, b.meal.to);
    assert.equal(z.traces.get('r'), undefined, 'and gone when that meal is done');
    z = zone();
    z.addTrace('r', { kind: 'blood', at: now, label: 'a scabby rat', id: 'rat' });
    const c = feed();
    z.creatures.delete(c.id); // killed at its meal
    const due = c.meal.to;
    ZoneDO.prototype.pruneTraces.call(z, due);
    assert.equal(body().length, 1, 'a body picked clean lies there while its meal would still be going');
    ZoneDO.prototype.pruneTraces.call(z, due + 61_000);
    assert.equal(z.traces.get('r'), undefined, 'and goes after, even when the one eating it was killed');
    assert.ok(z.redrawn >= 1, 'and the picture lets it go');
  });
  // 2026-11-07: a body looked the same whole or three parts eaten.
  check('looking at a body says how much has been eaten off it', () => {
    const z = { world: { mobTemplates: new Map([['hill-wolf', { id: 'hill-wolf', max_hp: 30 }]]) } };
    const at = (meat) => bodyEaten(z, { kind: 'remains', at: 1, meat }, 'hill-wolf');
    assert.equal(at(undefined), '', 'a whole body says nothing of it');
    assert.equal(at(30), '');
    assert.equal(at(22), 'something has been at it');
    assert.equal(at(15), 'half eaten');
    assert.equal(at(6), 'eaten down to little but bone');
    assert.equal(at(0), 'picked down to the bone', 'the last of it being finished');
    const v = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(v, /return eaten \? `\$\{lies\}, and \$\{eaten\}\.` : `\$\{lies\}\.`;/, 'the look says it');
  });
  // 2026-11-07: on a snow night the scene came in and the torch's light seconds
  // later: its light map was a CSS mask, which the browser fetched again after
  // the picture was up. It is drawn from the map loaded with the picture.
  check('the torch on the snow is drawn from the light map loaded with the picture', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /readySceneImage\(snowLight, keep\(function \(i\) \{ snowMaskImg = i; \}\)\);/, 'the light map is kept as it loads');
    assert.match(pub, /readySceneImage\(scene \? scene \+ "\?v=" \+ BG_V : "", keep\(function \(i\) \{ sceneImg = i; \}\)\);/, 'and the picture');
    assert.match(pub, /listeners\.forEach\(function \(fn\) \{ fn\(ok, ok \? img : null\); \}\);/, 'handed over by the loader, not looked up in a cache that may have let it go');
    assert.match(pub, /slX\.drawImage\(slBase, 0, 0, slW, slH\);\n\s+slX\.globalCompositeOperation = "destination-in";\n\s+slX\.drawImage\(snowMaskImg, 0, 0, slW, slH\);/, 'drawn through the map');
    assert.match(pub, /snowLightEl\.style\.webkitMaskImage = snowLightEl\.style\.maskImage = snowLight && !slDrawn \?/, 'and the CSS mask only when it could not be drawn');
    assert.match(pub, /<div id="snowlight" aria-hidden="true"><canvas><\/canvas><\/div>/, 'on its own canvas');
  });
  // 2026-11-07: typing "fish" in the gatehouse was turned away at the door.
  check('in the gatehouse what is done out in the dungeon is said, not refused', () => {
    for (const line of ['fish', 'fish are biting at the ford', 'cast a line', 'listen to me', 'go on then', 'attack is the best defence', 'north', 'drop it', 'light the fire'])
      assert.deepEqual(gatehouseHeard(line), { say: line }, line);
    assert.ok('cmd' in gatehouseHeard('cure fish'), 'curing a fish at the racks is still a command');
    const g = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.ok(!g.includes('Not from in here — the dungeon is on the other side of that door.'), 'nothing is turned away at the door');
    assert.match(g, /if \(GATEHOUSE_BARRED\.has\(v\)\) return gatehouseSay\(z, session, text\);/, 'a get that is not your carving is said');
  });
  // 2026-11-07: the weather and the sky after a room's words wear the lore look.
  check('a room look draws its weather and sky lines in the lore look', () => {
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /if \(sky && !events\.saysWeather\(sky, hourSaysWx\)\) lines\.push\(LORE_LINE \+ sky\.trim\(\)\);/, 'the weather');
    assert.match(zs, /lines\.push\(LORE_LINE \+ \(isFullMoon\(\)/, 'and the night sky');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /var loreLine = lines\[i\]\.charAt\(0\) === "\\u0003";\n\s+if \(loreLine\) lines\[i\] = lines\[i\]\.slice\(1\);/, 'the page takes the mark off');
    assert.match(pub, /var c = loreLine \? "lore" : cls \|\| classify\(plain\);/, 'and draws it as a telling');
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.match(zd, /export const LORE_LINE = "\\u0003";/, 'one mark, the same on both sides');
  });
  // 2026-11-08: the weather's passing line, heard as you walk room to room, was
  // left plain when the room's weather line took the lore look.
  check('the weather heard walking room to room is in the lore look', () => {
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /const said = events\.eventAmbient\(this, roomId\);\n\s+const sky = said \? LORE_LINE \+ said : null;/, 'marked where it is drawn');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /var c = loreLine \? "lore" : cls \|\| classify\(plain\);/, 'the mark wins over the amb class');
  });
  // 2026-11-08: the night line, marked for the lore look, played the telling's
  // scratch on every room walked into; a marked line keeps its old sound.
  check('a weather or sky line in the lore look makes no telling sound', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /var s = sndFor\(plain, \(loreLine \? cls \|\| classify\(plain\) : c\) \|\| ""\);/, 'sounded as it was before the look');
  });
  // 2026-11-07: the Slabs' lantern flame was drawn beside the lantern: every
  // plate's marker sat about 13 pixels left of and above the flame, measured off
  // the plates (the night-torch one only 4).
  check('the Slabs lantern flame sits on the lantern', () => {
    const fx = JSON.parse(readFileSync(new URL('./plate-fx-torches.json', import.meta.url), 'utf8'));
    const flame = { day: [0.7028, 0.3787], fog: [0.7037, 0.3776], night: [0.7047, 0.3778], 'night-torch': [0.7041, 0.3767], rain: [0.6927, 0.3701], snow: [0.7031, 0.3783] };
    for (const [k, [x, y]] of Object.entries(flame)) {
      const m = fx['gate-the-slabs-' + k]?.[0];
      assert.ok(m && Math.abs(m[0] - x) < 0.003 && Math.abs(m[1] - y) < 0.003, k + ' at ' + JSON.stringify(m));
    }
    assert.match(readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8'), /var FX_V   = "(4[89]|[5-9]\d|\d{3,})";/, 'and browsers are told the index changed');
  });
  // 2026-11-07: fighting one of two ravens, the one standing aside was drawn
  // taking the blows: the round named the kind and the page moved the first of it.
  check('a blow moves the creature it was, not the first of its kind in the row', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const at = pub.indexOf('function mobBeat(');
    const src = pub.slice(at, pub.indexOf('\n}\n', at) + 2);
    const run = new Function('anims', 'mobWho', 'STAGGER_S', 'DEATH_S', 'mobHold', src + '; return mobBeat;');
    const mk = () => [{ id: 'scarp-raven', slot: 0, phase: 'idle', strike: 'peck', spec: { f: {} } }, { id: 'scarp-raven', slot: 1, phase: 'idle', strike: 'peck', spec: { f: {} } }];
    let anims = mk();
    run(anims, ['c-aside', 'c-fight'], 0.3, 1, 0)(['scarp-raven'], ['scarp-raven'], [], [], [], [], '', [], ['c-fight'], ['c-fight']);
    assert.equal(anims[0].phase, 'idle', 'the raven standing aside does nothing');
    assert.equal(anims[1].phase, 'attack', 'the one fighting swings');
    anims = mk();
    run(anims, ['c-aside', 'c-fight'], 0.3, 1, 0)([], ['scarp-raven'], [], [], [], [], '', [], [], ['c-fight']);
    assert.deepEqual(anims.map((a) => a.phase), ['idle', 'hit'], 'and the one hit is the one that recoils');
    anims = mk();
    run(anims, [], 0.3, 1, 0)(['scarp-raven'], [], [], [], [], [], '', []);
    assert.equal(anims.filter((a) => a.phase === 'attack').length, 1, 'with no ids it still moves just one, as before');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /\(kind === "swung" \? e\.sw : e\.st\)\.push\(creature\.id\);/, 'the round says which');
    assert.match(zs, /swung: e\.swung, struck: e\.struck, sw: e\.sw, st: e\.st/, 'and sends it');
    const cs = readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8');
    assert.match(cs, /seen\.push\(creature\.templateId\);   \/\/ a room paints four at most\n\s+who\.push\(creature\.id\);/, 'and the room says who stands in each slot');
  });
  // 2026-11-07: the study chip offered a bird that had flown off: it read every
  // creature whose roomId was here, and one in the air keeps its roomId.
  check('the study chip only offers what is in the room, not a bird in the air', () => {
    const cs = readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8');
    assert.match(cs, /const firstMob = stale \? undefined : z\.creaturesInRoom\(session\.roomId\)\.find\(/, 'from the room index');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /if \(c\.aloft !== undefined\) continue;\n\s+const list = m\.get\(c\.roomId\)/, 'which leaves out anything in the air');
  });
  // 2026-11-07: `look slate` read out the weather where every other look in the
  // gatehouse tells you what the thing is. Now `look slate` says what the slate
  // is, in the lore look, and `slate` reads the sky off it, plain.
  check('look slate says what the slate is; slate reads the weather', () => {
    const g = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.match(g, /if \(is\("slate", "weather slate", "keepers slate", "keeper's slate", "sky", "weather"\)\) return SLATE_LOOK;/, 'look slate is the slate');
    assert.match(g, /if \(v === "slate"\) return z\.send\(session, slateText\(z\), "study"\);/, 'slate is the sky on it, plain');
    assert.match(g, /fixtures\.push\("Beside the hatch hangs the keeper's slate, with the sky chalked on it\. \('slate' to read it\)"\)/, 'the room points at the word');
    assert.deepEqual(gatehouseHeard('slate'), { cmd: { verb: 'slate', arg: '' } }, 'slate commands by the fire');
    assert.deepEqual(gatehouseHeard('slate it'), { say: 'slate it' }, 'and with words after it is said');
    assert.match(readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8'), /inside\.push\("slate"\);/, 'and the chip reads it');
  });
  // 2026-11-08: a grazer only grazed once it was hungry, and a mouthful only took
  // the edge off, so the hinds read "restless with hunger" on good grass. It
  // crops as it goes now, and is hungry only when the grass round it is gone.
  check('a grazer eats as it goes, not only once it is hungry', () => {
    for (const id of ['red-hind', 'feral-goat', 'mountain-hare', 'ptarmigan']) assert.ok(eatsAt(id) < 50, id + ' grazes before it is hungry');
    assert.equal(eatsAt('lynx'), 50, 'a hunter still eats when hungry');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.equal((zs.match(/>= ai\.eatsAt\((c|creature)\.templateId\)\) ai\.creatureEatsHere\(/g) ?? []).length, 3, 'the live beat, the slow world and the catch-up all ask it');
  });
  // 2026-11-07: close looks and what a study finds wear the lore look, as the
  // last hand on found gear does; the study's own line and its count stay plain.
  check('close looks and study findings are told in the lore look', () => {
    const v = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(v, /if \(feature\) return z\.send\(session, feature \+ await chronicle\.under\(z, session\.roomId, feature\), "lore"\);/, 'a room feature');
    assert.match(v, /if \(placed\) return z\.send\(session, placed, "lore"\);/, 'a carving in the room');
    const g = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.match(g, /if \(fixture\) return fixture === describeGatehouse\(z, session\) \? lookGatehouse\(z, session\) : z\.send\(session, fixture, "lore"\);/, 'the gatehouse fixtures');
    assert.match(g, /if \(!target\) return lookGatehouse\(z, session\);/, 'and the room look splits the chart, slate and board off');
    assert.match(g, /if \(p\.fixtures\.length\) z\.send\(session, p\.fixtures\.join\("\\n"\), "lore"\);/, 'into the lore look');
    for (const line of ["By the door, the wall chart", "Beside the hatch hangs the keeper's slate", 'fixtures.push(notices === 1']) assert.ok(g.includes('fixtures.push(') && g.slice(g.indexOf('function gatehouseParts')).includes(line), line);
    assert.match(g, /fixtures\.push\("Beside the hatch hangs the keeper's slate/, 'the slate is one of them');
    for (const [where, re] of [['the body', /bodyRead\(z, session\.roomId, body\.tr, body\.tmpl\.id, body\.tmpl\.name\), "lore"\)/], ['the far look', /seen\.slice\(0, 2\)\.map\(\(l\) => l\.text\)\.join\(" "\), "lore"\)/],
      ['the sky', /if \(skyNow\) return z\.send\(session, skyNow, "lore"\);/], ['listening', /z\.send\(session, lines\.join\("\\n"\), "lore", undefined, cues\.slice\(0, 4\)\);/],
      ['the wanderer', /wanderer\.LOOK_TEXT, "lore"\)/], ['a sprung chest', /forcing again\.`, "lore"\)/]]) assert.match(v, re, where);
    assert.match(readFileSync(new URL('../src/lore.ts', import.meta.url), 'utf8'), /are on both stones\.` \+ \(record \? `\\n\$\{record\}` : ""\), "lore"\);/, 'the name stones');
    assert.match(g, /if \(carved\) return z\.send\(session, carved, "lore"\);/, 'and its carvings');
    const l = readFileSync(new URL('../src/lore.ts', import.meta.url), 'utf8');
    assert.match(l, /set down what you see\.\$\{tail\}`, "study"\);\n[^\n]*\n    z\.send\(session, \[ai\.creatureRead\([\s\S]*?\]\.filter\(Boolean\)\.join\("\\n"\), "lore"\);/, 'what a study sees');
    assert.match(l, /if \(found\) z\.send\(session, found, "lore"\);/, 'and what it finds in a body');
  });
  // 2026-11-07: the barter window named gear without saying what kind it is,
  // where the pack window says weapon, helm and the rest.
  check('the barter window and the keeper\'s typed list say what kind of gear each piece is', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const row = pub.slice(pub.indexOf('function tradeItemNode('), pub.indexOf('\n}\n', pub.indexOf('function tradeItemNode(')));
    assert.match(row, /if \(it\.slot && SLOT_WORD\[it\.slot\]\) \{ var kd = document\.createElement\("span"\); kd\.className = "kind"; kd\.textContent = " \\u00b7 " \+ SLOT_WORD\[it\.slot\]/, 'stock and goods rows carry the kind');
    assert.match(pub, /nm\.textContent = it\.name \+ \(it\.slot && SLOT_WORD\[it\.slot\] \? " \\u00b7 " \+ SLOT_WORD\[it\.slot\] : ""\);/, 'and what he is not carrying');
    const gsrc = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.match(gsrc, /\$\{z\.gearName\(t\.id\)\}\$\{t\.slot && SLOT_WORD\[t\.slot\] \? ` · \$\{SLOT_WORD\[t\.slot\]\}` : ""\}/, 'the typed list says it too');
  });
  // 2026-11-07: the Shieling's rats were always hungry: only five of its rooms
  // were forage ground and none of its rats lived on them.
  check('every room of the Shieling hamlet is forage ground, like Assart End', () => {
    for (const id of SHIELING_HAMLET_ROOMS) assert.ok(FORAGE_ROOMS.has(id), id + ' grows nothing');
    for (const id of ['the-shiel-street', 'the-forge-yard', 'the-high-croft']) assert.ok(SHIELING_HAMLET_ROOMS.includes(id), id);
  });
  // 2026-11-07: a bird fighting from the air was put on the floor by a reel (an
  // overreach or a stun) and by any rebuild of the creature row (a body falling).
  check('a bird fighting from the air stays up through a reel and a row rebuild', () => {
    const chipsSrc = readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8');
    const aloftAt = chipsSrc.indexOf('ai.airborne(creature, now) ? "aloft"'), downedAt = chipsSrc.indexOf('now < creature.groundedUntil ? "downed"'), reelAt = chipsSrc.indexOf(': creature.stunned || (creature.staggerUntil');
    assert.ok(aloftAt > 0 && aloftAt < downedAt && downedAt < reelAt, 'up first, then knocked out of the air as its own state, both ahead of reel');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const body = pub.slice(pub.indexOf('function paintMobs('), pub.indexOf('function fitMobRow('));
    assert.ok(body.indexOf('var wasAir = {}') > 0 && body.indexOf('var wasAir = {}') < body.indexOf('anims.length = 0'), 'the air is read before the row is torn up');
    assert.match(body, /if \(was\) \{ newA\[a2\]\.state = was\.state; newA\[a2\]\.swoop = was\.swoop; \}\n  \}\n  applyState\(doing\);/, 'and handed to the new sprites before the state is applied');
  });
  // 2026-11-07: a piece in the lockbox could not be mended or taken up in hand
  // without first fetching it to the pack.
  await checkAsync('a piece in the lockbox can be wielded and mended from where it rests (2026-11-07)', async () => {
    const mkWorld = () => {
      const rows = new Map([['bx', { id: 'bx', item_id: 'maul', container: 'lockbox', condition: 60, acquired_at: 5 }], ['bt', { id: 'bt', item_id: 'tin', container: 'lockbox', condition: 100, acquired_at: 5 }]]);
      const DB = { prepare: (q) => ({ bind: (...a) => ({
        all: async () => ({ results: [...rows.values()].filter((r) => r.container === a[1]) }),
        run: async () => {
          if (/SET container = '', equipped = 0/.test(q)) { const r = rows.get(a[1]); if (!r || r.container !== a[3]) return { meta: { changes: 0 } }; r.container = ''; }
          if (/SET container = \?, equipped = 0/.test(q)) rows.get(a[2]).container = a[0];
          return { meta: { changes: 1 } };
        },
      }) }) };
      rows.set('sw', { id: 'sw', item_id: 'sword', container: '', condition: 100, acquired_at: 5 });
      const itemTemplates = new Map([['maul', { id: 'maul', name: 'a studded maul', slot: 'weapon', traits: '' }], ['tin', { id: 'tin', name: 'a tin of dry cigarettes', slot: '' }], ['sword', { id: 'sword', name: 'a short sword', slot: 'weapon', traits: '' }]]);
      const sent = [];
      const s = { pubkey: 'p', roomId: 'r', items: [] };
      const z = { env: { DB }, world: { itemTemplates, entryRooms: new Set() }, foodCapped: () => false, torchCapped: () => false, dressingCapped: () => false, packRoom: () => true, packCap: () => 20,
        equippedItem: (ss, slot) => { const c = ss.items.find((k) => k.equipped && itemTemplates.get(k.itemId).slot === slot); return c ? { carried: c, tmpl: itemTemplates.get(c.itemId) } : null; },
        hasRoom: () => true, isGear: () => true, stackable: () => false, inCombat: () => false, carriesLight: () => false, send: (_s, m) => sent.push(m), sendCtx: () => {},
        findCarried: (ss, arg) => ss.items.find((c) => itemTemplates.get(c.itemId).name.includes(arg)) ?? null,
        gearName: (_id, n) => n, displayName: (c) => itemTemplates.get(c.itemId).name };
      return { rows, s, z, sent };
    };
    let w = mkWorld();
    assert.equal(await benchEquip(w.z, w.s, 'bx'), undefined, 'the window takes it up');
    assert.ok(w.s.items.find((c) => c.rowId === 'bx')?.equipped, 'out of the box and in hand');
    assert.equal(w.rows.get('bx').container, '', 'and out of the box');
    assert.match(await benchEquip(w.z, w.s, 'bt'), /can't wear or wield/, 'a tin is not wielded');
    assert.equal(w.rows.get('bt').container, 'lockbox', 'and stays boxed');
    w = mkWorld();
    await cmdEquip(w.z, w.s, 'maul');
    assert.ok(w.s.items.find((c) => c.rowId === 'bx')?.equipped, 'typed wield reaches the box too: ' + w.sent.join(' | '));
    w = mkWorld(); w.z.packRoom = () => false;
    assert.match(await benchEquip(w.z, w.s, 'bx'), /pack is full/, 'no room in the pack, it stays put');
    assert.equal(w.rows.get('bx').container, 'lockbox');
    // ...and what it replaces goes back into the box in its place.
    const armed = () => { const w = mkWorld(); w.s.items.push({ rowId: 'sw', itemId: 'sword', equipped: true, condition: 100 }); return w; };
    w = armed();
    assert.equal(await benchEquip(w.z, w.s, 'bx'), undefined);
    assert.ok(w.s.items.find((c) => c.rowId === 'bx')?.equipped, 'the maul in hand');
    assert.equal(w.rows.get('sw').container, 'lockbox', 'the sword it replaced goes into the box');
    assert.ok(!w.s.items.some((c) => c.rowId === 'sw'), 'and out of the pack');
    w = armed(); w.z.packRoom = (ss) => ss.items.length < 1;
    assert.equal(await benchEquip(w.z, w.s, 'bx'), undefined, 'a full pack swaps too');
    assert.ok(w.s.items.find((c) => c.rowId === 'bx')?.equipped && w.rows.get('sw').container === 'lockbox', 'the sword went in first to make room');
    w = armed(); w.z.packRoom = (ss) => ss.items.length < 1; w.z.torchCapped = (_ss, id) => id === 'maul'; w.z.torchFullNote = () => 'too many lights';
    assert.equal(await benchEquip(w.z, w.s, 'bx'), 'too many lights', 'the new one cannot come out');
    assert.ok(w.s.items.find((c) => c.rowId === 'sw')?.equipped && w.rows.get('sw').container === '' && w.rows.get('bx').container === 'lockbox', 'no swap possible, everything back as it was');
    w = armed();
    await cmdEquip(w.z, w.s, 'maul');
    assert.ok(w.s.items.find((c) => c.rowId === 'bx')?.equipped && w.rows.get('sw').container === 'lockbox', 'typed wield swaps too');
    assert.ok(w.sent.some((m) => /a short sword goes into your lockbox/i.test(m)), 'and says where it went: ' + w.sent.join(' | '));
    w = armed(); w.z.packRoom = (ss) => ss.items.length < 1;
    await cmdEquip(w.z, w.s, 'maul');
    assert.ok(w.sent.some((m) => /a short sword goes into your lockbox/i.test(m)), 'a full-pack swap says so too: ' + w.sent.join(' | '));
    w = mkWorld();
    assert.equal((await boxedByName(w.z, w.s, 'maul'))?.rowId, 'bx', 'found by name in the box');
    const gsrc = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.match(gsrc, /const carried = z\.findCarried\(session, arg\) \?\? await boxedByName\(z, session, arg\);\n  if \(!carried\) return z\.send\(session, "You carry nothing like that\."\);\n  \/\/ The forge's voice/, 'typed repair at the bench reaches the box');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /if \(place === "lockbox" && it\.slot\) btn1\(it\.slot === "weapon" \? "wield" : "wear", "equip"\);/, 'the lockbox row has wield');
    assert.match(pub, /if \(place === "lockbox" && benchAtGate && it\.fix && it\.cond !== null && it\.cond < 100\) btn1\("repair", "repair"\);/, 'and repair at a gate');
  });
  await checkAsync('the cold and the dead are a shelf in the menu their stow chip opens (2026-11-06)', async () => {
    const rows = new Map([['pk', { id: 'pk', item_id: 'haunch', container: '', condition: 100, acquired_at: 5 }], ['bx', { id: 'bx', item_id: 'haunch', container: 'lockbox', condition: 100, acquired_at: 5 }], ['ot', { id: 'ot', item_id: 'haunch', container: 'other', condition: 100, acquired_at: 5 }]]);
    const DB = { prepare: (q) => ({ bind: (...a) => ({
      all: async () => ({ results: [...rows.values()].filter((r) => r.container === a[1]) }),
      run: async () => {
        if (/SET container = \?/.test(q)) rows.get(a[2]).container = a[0];
        if (/SET acquired_at = \?/.test(q)) rows.get(a[1]).acquired_at = a[0];
        return { meta: { changes: 1 } };
      },
    }) }) };
    const itemTemplates = new Map([['haunch', { name: 'a haunch', edible: 1 }]]);
    const z = { env: { DB }, world: { itemTemplates, rooms: new Map() }, isGear: () => false, slotsUsed: (l) => l.length, foodCapped: () => false, torchCapped: () => false, dressingCapped: () => false, packRoom: () => true, dens: new Map(), holdings: new Map(), den: new Map() };
    const mk = (roomId) => ({ pubkey: 'p', roomId, items: [{ rowId: 'pk', itemId: 'haunch', equipped: false, condition: 100, acquiredAt: 5 }] });
    const s = mk('the-shieling');
    assert.equal((await den.keepHere(z, s)).name, 'The cold');
    assert.equal(await den.benchStow(z, s, 'pk'), undefined, 'from the pack into the cold');
    assert.equal(rows.get('pk').container, 'cold'); assert.equal(s.items.length, 0);
    assert.equal(await den.benchStow(z, s, 'bx'), undefined, 'and from the box');
    assert.equal(rows.get('bx').container, 'cold');
    assert.equal((await den.keepHere(z, s)).held.length, 2, 'the column reads them back');
    assert.equal(await den.benchFetch(z, s, 'pk'), undefined, 'and back to the pack');
    assert.equal(rows.get('pk').container, ''); assert.equal(s.items[0].rowId, 'pk');
    assert.ok(rows.get('pk').acquired_at > 5, 'as young as it went in: the clock restarts');
    assert.ok(await den.benchFetch(z, s, 'ot'), 'nothing of another keeping comes out of the cold');
    rows.get('pk').acquired_at = 5; rows.get('pk').container = '';
    const o = mk('deep-ossuary');
    assert.equal((await den.keepHere(z, o)).name, 'The dead');
    await den.benchStow(z, o, 'pk'); assert.equal(rows.get('pk').container, 'ossuary', 'the dead keep their own');
    await den.benchFetch(z, o, 'pk'); assert.equal(rows.get('pk').acquired_at, 5, 'and give nothing back younger');
    assert.equal(await den.keepHere(z, mk('the-road')), null, 'no such shelf elsewhere');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const gate = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.match(gate, /keep: keep \? 1 : 0,/, 'the frame says so'); assert.match(gate, /shelf: sortKit\(group\(shelfHeld\)\),/, 'and carries it');
    assert.match(pub, /benchHasShelf = benchAtDen \|\| !!state\.keep;/, 'the client knows'); assert.match(pub, /classList\.toggle\("hasden", benchHasShelf\)/, 'and makes room');
    assert.match(pub, /if \(benchHasShelf\) \{\s*bshelf\.style\.display = "";/, 'and fills the column');
    assert.match(pub, /#bench\.hasden:not\(\.nogate\) \.bcols \{ grid-template-columns: repeat\(4/, 'a fourth beside the vault at the Shieling');
  });
  check('the herd people live at least ten steps from any gate, and walk there (2026-11-06)', () => {
    const mig = readFileSync(new URL('../migrations/374_the_herd_people_go_up_the_hill.sql', import.meta.url), 'utf8');
    const moved = [...mig.matchAll(/SET room_id = '([a-z-]+)' WHERE id = '(spawn-(the-herd|the-milker|a-fold-dog)@([a-z-]+)#\d+)'/g)];
    assert.equal(moved.length, 14, 'all five herds, four milkers and five dogs');
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    for (const [, , id, , old] of moved) assert.ok(zd.includes(`["${id}", "${old}"]`), id + ' is carried along on load (DEN_MOVES)');
    const links = new Map();
    const dirUrl = new URL('../regions/', import.meta.url);
    for (const f of readdirSync(dirUrl).filter((n) => n.endsWith('.rooms'))) {
      let at = '';
      for (const line of readFileSync(new URL(f, dirUrl), 'utf8').split('\n')) {
        const h = line.match(/^## ([a-z0-9-]+) \|/); if (h) at = h[1];
        const e = line.match(/^> \w+\s+([a-z0-9-]+)/); if (e && at) { (links.get(at) ?? links.set(at, new Set()).get(at)).add(e[1]); (links.get(e[1]) ?? links.set(e[1], new Set()).get(e[1])).add(at); }
      }
    }
    const dist = new Map(['the-shieling', 'the-stell', 'the-shelter-crag', 'the-slabs'].map((g) => [g, 0])); const q = [...dist.keys()];
    for (const r of q) for (const t of links.get(r) ?? []) if (!dist.has(t)) { dist.set(t, dist.get(r) + 1); q.push(t); }
    for (const [, room] of moved) { assert.ok(dist.has(room), room + ' is on the map'); assert.ok(dist.get(room) >= 10, room + ' is only ' + dist.get(room) + ' steps from a gate'); }
    assert.ok(dist.get('the-last-pasture') < 10, 'the measure itself sees the old ground as too close');
  });
  check('someone reading the room is told an animal is eating, all through the meal and when it stops (2026-11-06)', () => {
    const now = Date.UTC(2026, 5, 21, 12);
    const feed = []; const z = { roomFeed: (r, t) => feed.push(t) };
    const owl = { templateId: 'eagle-owl', roomId: 'r', eatingIn: 'r', eatingOn: 'kill', eatingUntil: now + 120_000 };
    const beat = (t, was, shown) => mealWords(z, owl, 'an eagle owl', was, shown, t);
    beat(now, '', 'eat');
    assert.equal(feed.length, 0, 'the first bite has its own line already');
    assert.ok(owl.eatSayAt >= now + 45_000 && owl.eatSayAt <= now + 90_000);
    beat(now + 44_000, 'eat', 'eat'); assert.equal(feed.length, 0, 'not on every beat');
    beat(now + 91_000, 'eat', 'eat');
    assert.equal(feed.length, 1); assert.match(feed[0], /^An eagle owl pulls another strip off its kill/, 'in the body it has');
    beat(now + 92_000, 'eat', 'eat'); assert.equal(feed.length, 1, 'then it waits again');
    beat(now + 121_000, 'eat', ''); assert.match(feed[1], /^An eagle owl wipes its bill/, 'and the end of it is told');
    feed.length = 0;
    const walked = { ...owl, eatingIn: 'elsewhere', eatSayAt: 0 }; mealWords(z, walked, 'an eagle owl', 'eat', '', now); assert.equal(feed.length, 0, 'walked off, it has not finished here');
    const sleeper = { ...owl, asleep: true, eatSayAt: 0 }; mealWords(z, sleeper, 'an eagle owl', 'eat', 'eat', now); assert.equal(feed.length, 0, 'asleep it says nothing');
    const fighter = { ...owl, target: 'x', eatSayAt: 0 }; mealWords(z, fighter, 'an eagle owl', 'eat', 'eat', now); assert.equal(feed.length, 0, 'nor in a fight');
    const hind = { templateId: 'red-hind', roomId: 'r', eatingIn: 'r', eatingOn: 'graze', eatingUntil: now + 9, eatSayAt: 0 }; mealWords(z, hind, 'a red hind', 'graze', 'graze', now); assert.match(feed[0], /^A red hind crops at the ground/); feed.length = 0;
    const adder = { templateId: 'stone-adder', roomId: 'r', eatingIn: 'r', eatingOn: 'kill', eatingUntil: now + 9, eatSayAt: 0 }; mealWords(z, adder, 'a stone adder', 'eat', 'eat', now); assert.match(feed[0], /^A stone adder's jaws work/); feed.length = 0;
    const vulture = { templateId: 'carrion-vulture', roomId: 'r', eatSayAt: 0 }; mealWords(z, vulture, 'a carrion vulture', 'eat', 'eat', now); assert.match(feed[0], /carcass/, 'a scavenger on a body is on carrion');
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zone, /ai\.mealWords\(this, creature, tmpl\.name, eatingWas, eatingSeen, now\);/, 'the beat asks');
    assert.match(readFileSync(new URL('../src/simstore.ts', import.meta.url), 'utf8'), /"eatSayAt"\]\);/, 'and a line of a meal never forces a save');
  });
  check('a window under a roof shows the grey of rain on the ground next door (2026-11-06)', () => {
    const band = { hill: 'mountain', roof: 'mountain', shore: 'crossing' };
    const z = { bandOf: (r) => band[r], regionOf: (r) => band[r], events: new Map([['rain', { phase: 'active', until: Date.now() + 9e6, bands: ['crossing'] }]]),
      world: { rooms: new Map(Object.keys(band).map((r) => [r, {}])), exits: new Map([['hill', [{ to_room: 'shore' }]], ['shore', [{ to_room: 'hill' }]], ['roof', [{ to_room: 'hill' }]]]) } };
    OUTDOOR_ROOMS.add('hill'); OUTDOOR_ROOMS.add('shore');
    try {
      assert.equal(rainNextDoor(z, 'roof'), 'crossing', 'the roof stands on ground with rain beside it');
      assert.equal(rainNearby(z, 'roof'), '', 'but nobody under it is told of the rain in words');
      assert.equal(rainNearby(z, 'hill'), 'crossing', 'outside it is both');
      z.events.get('rain').bands = ['mountain'];
      assert.equal(rainNextDoor(z, 'roof'), '', 'rain on its own ground is not rain next door');
    } finally { OUTDOOR_ROOMS.delete('hill'); OUTDOOR_ROOMS.delete('shore'); }
  });
  check('the picture and the rules agree on which birds strike from the air (2026-11-06)', () => {
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const kinds = zd.slice(zd.indexOf('export const FLIER_KIND'), zd.indexOf('export const FLIERS ='));
    const want = [...kinds.matchAll(/"([a-z-]+)": "(hunter|mobber)"/g)].map((m) => m[1]).sort();
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const got = [...pub.match(/var SWOOPERS = \{([^}]*)\}/)[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]).sort();
    assert.deepEqual(got, want);
    assert.ok(!got.includes('scarp-raven') && !got.includes('gibbet-crow'), 'crows and ravens fight on foot, and the words say so');
  });
  check('walking into the gatehouse shows the room; its chart, slate, board and carvings wait for a look (2026-11-06)', () => {
    const gsrc = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    const zsrc = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const body = gsrc.slice(gsrc.indexOf('export function describeGatehouse'), gsrc.indexOf('// In through the door. Idempotent'));
    assert.match(body, /if \(!arriving\) fixtures\.push\(marks === 0/, 'the wall chart');
    assert.match(body, /if \(!arriving\) fixtures\.push\("Beside the hatch hangs/, 'the slate');
    assert.match(body, /if \(notices > 0 && !arriving\)/, 'the board');
    assert.match(body, /if \(!arriving\) lines\.push\(\.\.\.carving\.roomLines/, 'the carvings');
    const enter = gsrc.slice(gsrc.indexOf('export async function enterGatehouse'), gsrc.indexOf('export function gatehouseHeard'));
    assert.equal((enter.match(/describeGatehouse\(z, session, true\)/g) ?? []).length, 2, 'both ways in arrive');
    assert.doesNotMatch(enter, /describeGatehouse\(z, session\)/, 'neither reads the whole room');
    assert.match(gsrc, /if \(!target\) return lookGatehouse\(z, session\);/, 'a bare look reads it all');
    assert.match(gsrc, /is\("room", "here", "around", "gatehouse", "inside", "place"\)\) \{\s*return describeGatehouse\(z, session\);/, 'and so does look room');
    assert.match(zsrc, /if \(!seamless\) this\.send\(session, gate\.describeGatehouse\(this, session, true\)\);/, 'coming back to it arrives');
  });
  check('the dancer leaps and comes down, and stands between leaps (2026-11-06)', () => {
    const src = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('var LEAP_S ='), src.indexOf('var BOB ='));
    const leapAt = new Function(block + '; return leapAt;')();
    const STEP = 0.02; let run = 0, longest = 0, leaps = 0, gaps = new Set(), last = -99;
    for (let t = 0; t < 300; t += STEP) {
      const u = leapAt(t, 3);
      if (u >= 0) { assert.ok(u < 1); if (!run) { leaps++; gaps.add(Math.round((t - last) * 10)); last = t; } run += STEP; longest = Math.max(longest, run); } else run = 0;
    }
    assert.ok(longest < 0.8, 'it is never stuck in the air: longest ' + longest);
    assert.equal(leaps, 60, 'it leaps again and again');
    assert.ok(gaps.size > 5, 'and not like a clock');
    const calm = src.slice(src.indexOf('var CALM_POSES ='), src.indexOf('var EVENT_POSES ='));
    assert.ok(!/"twisting-leap"/.test(calm), 'the leap is not a resting pose');
    assert.match(src, /var leap = leapAt\(t, a\.slot \| 0\);\s*if \(leap >= 0\) \{ name = "twisting-leap"; air = Math\.sin\(leap \* Math\.PI\) \* HOP; \}/, 'idle shows it with the arc');
  });
  check('walking up to animals does not send everything overdue to water at once (2026-11-06)', () => {
    const noon = Date.UTC(2026, 5, 21, 12);
    const rooms = new Map([['r', {}], ['the-hill-spring', {}]]);
    const mk = (thirstAt) => {
      const c = { id: 'c', templateId: 'hill-wolf', roomId: 'r', home: 'r', hp: 10, nextWanderAt: noon + 3_600_000, thirstAt };
      const z = { world: { rooms }, creatures: new Map([['c', c]]), nearby: () => new Map([['r', 0], ['the-hill-spring', 2]]), events: new Map(), regionOf: () => 'road', bandOf: () => 'road' };
      return { z, c };
    };
    const late = mk(noon - 2 * 3_600_000); waters(late.z, late.c, noon);
    assert.equal(late.c.wateringTo, undefined, 'overdue from an empty stretch, it does not leave now');
    assert.ok(late.c.thirstAt >= noon && late.c.thirstAt <= noon + 4 * 3_600_000, 'it draws a new time in the next few hours');
    const due = mk(noon - 5_000); waters(due.z, due.c, noon);
    assert.equal(due.c.wateringTo, 'the-hill-spring', 'one whose time has just come still goes');
  });
  check('a bird looking for food writes nothing; one taking off does (2026-11-06)', () => {
    const rows = new Map(), written = [];
    const storage = { sql: { exec(q, ...v) {
      if (/^SELECT k, v FROM sim_kv/.test(q)) return [...rows].map(([k, val]) => ({ k, v: val }));
      if (/^INSERT INTO sim_kv/.test(q)) { rows.set(v[0], v[1]); written.push(v[0]); return []; }
      if (/^DELETE FROM sim_kv/.test(q)) { rows.delete(v[0]); return []; }
      return [];
    } }, transactionSync(fn) { fn(); } };
    rows.set('b:meta', JSON.stringify({}));
    const cache = newCache(); const state = loadSim(storage, cache);
    const bird = { id: 'b', templateId: 'great-gull', roomId: 'r', home: 'r', hp: 10 }; state.creatures = [bird];
    saveSim(storage, state, cache); written.length = 0;
    const mobRows = () => written.filter((k) => k.startsWith('b:creatures'));
    bird.flightRestUntil = 12345; saveSim(storage, state, cache);
    assert.deepEqual(mobRows(), [], 'a failed search rewrites no mob row');
    bird.flightTo = 'far'; saveSim(storage, state, cache);
    assert.equal(mobRows().length, 1, 'a flight is saved');
    assert.equal(JSON.parse(rows.get(mobRows()[0])).find((c) => c.id === 'b').flightRestUntil, 12345, 'and carries the wait with it');
  });
  check('the old whole-population copy is swept and never written again (2026-11-10: 292KB every twenty minutes for a rollback nobody would make)', () => {
    const rows = new Map(), written = [];
    const storage = { sql: { exec(q, ...v) {
      if (/^SELECT k, v FROM sim_kv/.test(q)) return [...rows].map(([k, val]) => ({ k, v: val }));
      if (/^INSERT INTO sim_kv/.test(q)) { rows.set(v[0], v[1]); written.push(v[0]); return []; }
      if (/^DELETE FROM sim_kv/.test(q)) { rows.delete(v[0]); return []; }
      return [];
    } }, transactionSync(fn) { fn(); } };
    // a world as production holds it: the shard, and the old copy beside it
    const gull = { id: 'b', templateId: 'great-gull', roomId: 'r', home: 'r', hp: 10 };
    rows.set('b:meta', JSON.stringify({}));
    rows.set('b:creatures:world', JSON.stringify([gull]));
    rows.set('b:creatures', JSON.stringify([gull]));
    const cache = newCache(); const state = loadSim(storage, cache);
    assert.equal(state.creatures.length, 1, 'the gull wakes once, not once for each copy');
    saveSim(storage, state, cache);
    assert.ok(!rows.has('b:creatures'), 'the first save sweeps the old copy');
    assert.ok(rows.has('b:creatures:world'), 'and leaves the live one');
    written.length = 0; cache.lastFullFlushAt = 0; saveSim(storage, state, cache);
    assert.ok(written.includes('b:creatures:world'), 'a full flush did run');
    assert.ok(!written.includes('b:creatures'), 'and did not write the old copy back');
  });
  check('flying birds never boom, and are harder to catch (2026-11-06)', () => {
    for (const bird of ['scarp-raven', 'bone-breaker', 'mountain-chough']) {
      const { z } = condWorld(bird);
      z.world.mobTemplates.set(bird, { id: bird, name: 'a bird', max_hp: 10, respawn_secs: 900, is_boss: 0 });
      for (let h = 0; h <= 60; h++) { conditions.tick(z, h * H, true); assert.equal(conditions.of(z, 'mountain'), undefined, bird + ' hour ' + h); }
    }
    { const { z } = condWorld('bone-breaker'); z.regionOf = () => 'road';
      z.world.mobTemplates.set('bone-breaker', { id: 'bone-breaker', name: 'a bird', max_hp: 10, respawn_secs: 900, is_boss: 0 });
      for (let h = 0; h <= 60; h++) { conditions.tick(z, h * H, true); assert.equal(conditions.of(z, 'road'), undefined, 'off the mountain it does not boom either, hour ' + h); } }
    const z = { regionOf: (r) => r === 'wood' ? 'wood' : 'mountain', variantBase: new Map([['the-bone-dropper', 'bone-breaker']]) };
    assert.equal(catchMult(z, { templateId: 'scarp-raven', home: 'crag', roomId: 'crag' }), 0.5, 'a raven is half as easy');
    assert.equal(catchMult(z, { templateId: 'the-bone-dropper', home: 'crag', roomId: 'crag' }), 0.5, 'and so is its rare blood');
    assert.equal(catchMult(z, { templateId: 'ptarmigan', home: 'crag', roomId: 'crag' }), 1, 'a walking bird is not');
    assert.equal(catchMult(z, { templateId: 'mountain-hare', home: 'crag', roomId: 'crag' }), 1, 'nor a hare');
    assert.equal(catchMult(z, { templateId: 'scarp-raven', home: 'wood', roomId: 'wood' }), 0.5, 'a raven in the wood too');
    assert.equal(catchMult(z, { templateId: 'great-gull', home: 'wood', roomId: 'wood' }), 0.5, 'and a gull');
    assert.match(readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8'), /\* hour \* catchMult\(z, victim\);/, 'the hunt reads it');
  });
  check('no bird fills a hunter: every bird is a small meal (2026-11-06)', () => {
    for (const b of ['ptarmigan', 'mountain-chough', 'oystercatcher', 'gibbet-crow', 'scarp-raven', 'the-old-raven', 'grey-heron', 'bittern', 'tawny-owl', 'great-gull', 'black-backed-gull', 'hill-eagle', 'eagle-owl', 'bone-breaker', 'the-bone-dropper', 'eyrie-holder', 'carrion-vulture', 'brooding-vulture', 'great-vulture']) {
      assert.ok(SMALL_PREY.has(b), b + ' is a small meal');
    }
    assert.ok(!SMALL_PREY.has('red-hind') && !SMALL_PREY.has('feral-goat'), 'a hind or a goat still fills one');
  });
  check('a fox or a wildcat is a small meal, and so is its rare blood (2026-11-09)', () => {
    for (const b of ['hill-fox', 'the-raiding-fox', 'snow-fox', 'the-blue-fox', 'wildcat', 'the-tom']) assert.ok(SMALL_PREY.has(b), b + ' is a small meal');
    for (const b of ['feral-goat', 'a-fold-dog', 'red-hind', 'hill-wolf', 'lynx']) assert.ok(!SMALL_PREY.has(b), b + ' still fills one');
  });
  check('a small meal fills a small hunter; a wolf, an eagle or an owl still only takes the edge off (2026-11-09)', () => {
    for (const b of ['ermine', 'hill-fox', 'the-raiding-fox', 'snow-fox', 'the-blue-fox', 'wildcat', 'the-tom', 'gill-adder', 'fen-viper', 'stone-adder', 'the-gravid-adder', 'scarp-raven', 'the-old-raven', 'mountain-chough']) assert.ok(SMALL_EATERS.has(b), b + ' is filled by a small meal');
    for (const b of ['hill-wolf', 'lynx', 'glutton', 'cave-lion', 'hill-eagle', 'eagle-owl', 'carrion-vulture', 'bone-breaker']) assert.ok(!SMALL_EATERS.has(b), b + ' is not');
    const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(ai, /creature\.hunger - \(eaten\.prey && SMALL_PREY\.has\(eaten\.prey\) && !SMALL_EATERS\.has\(creature\.templateId\) \? MEAL_SMALL : MEAL_CORPSE\)/, 'and a small body lying is a body\'s worth to one');
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
    assert.match(z, /const openSkyForArt = this\.world!\.entryRooms\.has\(roomId\) \|\| ROOF_SHOWS_OUTSIDE\.has\(roomId\);/);
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
    const run = new Function('creature', 'tmpl', 'now', 'DROWNED_GOD', 'GOD_ROUSE_MS', 'cap', 'pick', 'KING_WORDS', 'ai', block);
    godMet.clear();
    const me = { pubkey: 'me', roomId: 'the-gods-pool', name: 'Rome' }, said = [];
    const poses = [];
    const z = { sessions: new Map([['me', me]]), reachable: () => true, send: (_s, t) => said.push(t), roomFeed() {}, fxPose: (_r, _id, p) => poses.push(p) };
    const god = { id: 'g', templateId: 'drowned-god', roomId: 'the-gods-pool', target: null };
    const words = { 'drowned-god': ['"Come in," says the Drowned God.'] };
    const beat = (t) => run.call(z, god, { name: 'the Drowned God' }, t, 'drowned-god', 8000, (x) => x[0].toUpperCase() + x.slice(1), (xs) => xs[0], words, { godMet, godRemembers });
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
    assert.equal(god.rouseAt, undefined, 'a fight you started drops the wind-up');
    // IT REMEMBERS YOU (2026-11-02): out and back in, no second speech
    god.target = null; me.target = null; me.roomId = 'elsewhere'; said.length = 0;
    beat(60_000);
    me.roomId = 'the-gods-pool';
    beat(64_000);
    assert.equal(god.target, 'me', 'back inside fifteen minutes, it comes straight for you');
    assert.deepEqual(said.filter((l) => /Come in/.test(l)), [], 'without speaking again');
    god.target = null; me.target = null; me.roomId = 'elsewhere';
    beat(70_000);
    me.roomId = 'the-gods-pool'; said.length = 0;
    beat(64_000 + 15 * 60_000);
    assert.equal(god.target, null, 'fifteen quiet minutes later it only looks again');
    assert.deepEqual(said, ['"Come in," says the Drowned God.'], 'and speaks again');
  });

  check('the hyenas hunt: a hungry one in the pits does not eat the ground, and since 2026-11-08 nor does a vulture (2026-10-30)', () => {
    const z = new ZoneDO({}, {});
    z.world = { mobTemplates: new Map([['grave-hyena', { id: 'grave-hyena', name: 'a grave-hyena', max_hp: 20 }], ['carrion-vulture', { id: 'carrion-vulture', name: 'a carrion vulture', max_hp: 20 }]]),
      itemTemplates: new Map(), rooms: new Map([['the-cart-tip', { id: 'the-cart-tip' }]]), exits: new Map(), mobSpawns: [] };
    z.ground = new Map(); z.roomFeed = () => {}; z.roomSound = () => {}; z.refreshRoomCtx = () => {}; z.addTrace = () => {};
    const t = 1_000_000_000_000;
    const eat = (templateId) => { const c = { id: templateId, templateId, roomId: 'the-cart-tip', hp: 10, hunger: 80, forageFrom: t - 24 * 3600_000 }; creatureEatsHere(z, c, true, t); return c; };
    assert.equal(eat('grave-hyena').hunger, 80, 'the hyena goes hungry on carrion ground, so it hunts');
    assert.equal(eat('dire-hyena').hunger, 80, 'and so does the dire');
    assert.equal(eat('carrion-vulture').hunger, 80, 'a vulture on the same ground goes hungry too, and looks for the dead');
    assert.equal(herds.feedsAt('grave-hyena', 'the-cart-tip'), false, 'the pits are not its feeding ground');
    assert.equal(herds.feedsAt('carrion-vulture', 'the-cart-tip'), true, 'the vulture keeps its round there, and eats only the dead');
  });

  // 2026-11-07: grazing ground never ran dry, so a herd could stand in one room
  // and eat there for ever. On the mountain the grass is eaten down now.
  await checkAsync('on the mountain the grass is eaten down and grows back, and a hungry grazer walks on to grass', async () => {
    const z = new ZoneDO({}, {});
    const rooms = new Map([['the-deer-lawn-high', { id: 'the-deer-lawn-high', region: 'mountain' }], ['the-heather-shelf', { id: 'the-heather-shelf', region: 'mountain' }],
      ['the-shiel-street', { id: 'the-shiel-street', region: 'mountain' }], ['the-long-glade', { id: 'the-long-glade', region: 'wood' }]]);
    z.world = { mobTemplates: new Map(['feral-goat', 'rat', 'roe-deer'].map((id) => [id, { id, name: 'a ' + id, max_hp: 20 }])),
      itemTemplates: new Map(), rooms, exits: new Map(), mobSpawns: [], entryRooms: new Set() };
    z.regionOf = (r) => rooms.get(r)?.region ?? '';
    z.ground = new Map(); z.roomFeed = () => {}; z.roomSound = () => {}; z.refreshRoomCtx = () => {}; z.addTrace = () => {}; z.fxGrazed = () => {};
    grass.resetForTest(z);
    const t = 1_000_000_000_000;
    const eat = (templateId, roomId, at = t) => { const c = { id: templateId, templateId, roomId, hp: 10, hunger: 80, forageFrom: at - 24 * 3600_000 }; creatureEatsHere(z, c, true, at); return c.hunger < 80; };
    for (let i = 0; i < 6; i++) assert.ok(eat('feral-goat', 'the-deer-lawn-high'), 'mouthful ' + (i + 1));
    assert.ok(!eat('feral-goat', 'the-deer-lawn-high'), 'grazed bare, it feeds nothing');
    assert.ok(!eat('feral-goat', 'the-deer-lawn-high', t + 19 * 60_000), 'nothing back in nineteen minutes');
    assert.ok(eat('feral-goat', 'the-deer-lawn-high', t + 20 * 60_000), 'one mouthful back in twenty');
    assert.equal(grass.has(z, 'feral-goat', 'the-deer-lawn-high', t + 21 * 60_000), false, 'eaten again, bare again');
    assert.equal(grass.left(z, 'the-deer-lawn-high', t + 20 * 60_000 + 120 * 60_000), 6, 'whole again two hours on');
    assert.ok(eat('feral-goat', 'the-heather-shelf'), 'the next lawn has its own grass');
    for (let i = 0; i < 10; i++) assert.ok(eat('rat', 'the-shiel-street'), 'a rat on muck never runs out');
    for (let i = 0; i < 10; i++) assert.ok(eat('roe-deer', 'the-long-glade'), 'and off the mountain the ground never runs dry');
    // The hungry step and the daily round pass a bare room by.
    const asrc = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(asrc, /exits\.find\(\(e\) => forageGround\(z, tmpl\.id, e\.to_room\) && grass\.has\(z, tmpl\.id, e\.to_room, now\)\)/, 'the hungry step looks for grass');
    const hsrc = readFileSync(new URL('../src/herds.ts', import.meta.url), 'utf8');
    assert.match(hsrc, /feedsAt\(c\.templateId, room\) && z\.regionOf\(room\) === band && grass\.has\(z, c\.templateId, room, now\)/, 'and the round for the nearest grass');
  });

  check('no creature speaks a cousin habit: one list each (2026-10-30, the feral goat said it was the old billy)', () => {
    const owners = new Map();
    for (const [id, lines] of Object.entries(WITNESSED_LINES)) owners.set(lines, [...(owners.get(lines) ?? []), id]);
    const shared = [...owners.values()].filter((ids) => ids.length > 1);
    assert.deepEqual(shared, [], 'habit lists shared between creatures: ' + JSON.stringify(shared));
    assert.ok(WITNESSED_LINES['feral-goat'].every((l) => !/billy/i.test(l)), 'the feral goat speaks only of itself');
    assert.ok(WITNESSED_LINES['wildcat'].every((l) => !/lynx/i.test(l)), 'and the wildcat is never the lynx');
  });

  check('a text player standing with an idle creature hears what it is about, now and then (2026-10-30)', () => {
    const z = new ZoneDO({}, {});
    const T = (id, name, max_hp) => [id, { id, name, max_hp, is_boss: 0 }];
    z.world = { mobTemplates: new Map([T('grave-hyena', 'a grave-hyena', 30), T('warden', 'a hollow warden', 30), T('roe-deer', 'a roe deer', 16)]), mobSpawns: [], itemTemplates: new Map(), rooms: new Map(), exits: new Map() };
    const me = { pubkey: 'me', roomId: 'r' };
    z.sessions = new Map([['me', me]]); z.reachable = () => true;
    const said = []; z.roomFeed = (_r, t) => said.push(t);
    const hy = { id: 'h', templateId: 'grave-hyena', roomId: 'r', hp: 30, hunger: 10, target: null };
    const beats = (n, at) => { const out = []; for (let i = 0; i < n; i++) { const before = said.length; mobPresence(z, hy, at + i * 2000); if (said.length > before) out.push(at + i * 2000); } return out; };
    const heard = beats(600, 1_000_000); // twenty minutes beside it
    assert.ok(heard.length >= 3, 'twenty minutes with an idle hyena brings a few lines, not silence: ' + heard.length);
    assert.ok(said.every((l) => /^A grave-hyena /.test(l)), 'by name, in its own lines');
    assert.ok(heard.every((at, i) => i === 0 || at - heard[i - 1] >= 30_000), 'and never two in the same half minute');
    const n = said.length;
    hy.target = 'me'; beats(300, 5_000_000); assert.equal(said.length, n, 'never in a fight');
    hy.target = null; hy.eatingUntil = 9_000_000; beats(300, 6_000_000); assert.equal(said.length, n, 'never while it eats');
    hy.eatingUntil = undefined; me.roomId = 'elsewhere'; beats(300, 7_000_000); assert.equal(said.length, n, 'never to an empty room');
    const tm = (id) => z.world.mobTemplates.get(id);
    assert.match(presenceLine({ templateId: 'roe-deer', hp: 4 }, tm('roe-deer'), false), /hurt|carefully|costs/, 'a hurt animal shows it');
    assert.match(presenceLine({ templateId: 'warden', hp: 30 }, tm('warden'), false), /^A hollow warden /, 'the hollow get their own');
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zone, /ai\.mobHabit\(this, creature, now\);[\s\S]{0,120}ai\.mobPresence\(this, creature, now\);/, 'and it runs every beat, beside the habits');
  });

  check('every snow plate glints, and its creatures throw shadows, under your torch on a snowy night (2026-10-30)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const fx = JSON.parse(readFileSync(new URL('../public/room-fx/fx.json', import.meta.url), 'utf8'));
    const ship = new Set(JSON.parse(readFileSync(new URL('./deploy-artwork.json', import.meta.url), 'utf8')));
    const snows = readdirSync(new URL('../public/room-bg/', import.meta.url)).filter((f) => f.endsWith('-snow.webp')).map((f) => f.slice(0, -5));
    assert.ok(snows.length > 80, 'the snow plates are there to check');
    for (const p of snows) {
      assert.equal(fx[p]?.snow, 1, p + ' is marked for the glint');
      assert.ok(existsSync(new URL('../public/room-fx/' + p + '.png', import.meta.url)), p + ' has its depth map');
      assert.ok(ship.has('room-fx/' + p + '.png'), p + ' depth map ships');
    }
    assert.match(pub, /fxSnowGlint = !!\(lastTorch && wxKind === "snow" && wxHour === "night" && !roofedWx && !lastCovered/, 'only with your torch lit, snowing, at night, out under the sky');
    assert.match(pub, /"  if \(handOn > \.5 \|\| glintOn > \.5\)\{",/, 'the glint runs on its own switch, not only on torch plates');
    assert.match(pub, /fxU\.glintOn, entry\.snow && fxSnowGlint \? 1 : 0\); fxGl\.uniform1f\(fxU\.handOn, fxHandLit\(entry\) \? 1 : 0\); fxRun\(\)/, 'and is set again when the same plate is shown again (the torch lit or put out)');
    assert.match(pub, /function fxHandLit\(e\) \{ return !!e && \(!!e\.hand \|\| \(!!e\.snow && fxSnowGlint\)\); \}/, 'a snow plate under your torch is lit like a torch plate');
    assert.match(pub, /var mobs = fxHandLit\(e\) \? fxMobs\(box\) : \[\];/, 'so the creatures throw their shadows on it (2026-10-30)');
  });

  check('small prey is a mouthful: a dead rat or hare fills a hunter less than a dead goat (2026-10-30)', () => {
    const z = new ZoneDO({}, {});
    z.world = { mobTemplates: new Map([['grave-hyena', { id: 'grave-hyena', name: 'a grave-hyena', max_hp: 20 }]]), itemTemplates: new Map(), rooms: new Map(), exits: new Map(), mobSpawns: [] };
    z.roomFeed = () => {}; z.roomSound = () => {}; z.refreshRoomCtx = () => {}; z.fxFed = () => {};
    const eats = (prey) => {
      z.traces = new Map([['r', [{ kind: 'blood', at: Date.now(), label: 'a body', prey }]]]);
      const h = { id: 'h', templateId: 'grave-hyena', roomId: 'r', hp: 20, hunger: 90, fed: 9 };
      scavengerFeeds(z, h, true);
      return 90 - h.hunger;
    };
    assert.equal(eats('rat'), 25, 'a dead rat takes the edge off');
    assert.equal(eats('fleet-rat'), 25, 'and so does a scary one');
    assert.equal(eats('mountain-hare'), 25, 'all the small prey, not only rats');
    assert.equal(eats('roe-deer'), 75, 'a deer is not small, whatever its hit points');
    assert.equal(eats('feral-goat'), 75, 'a goat is a real meal');
    const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.equal((ai.match(/creature\.hunger = SMALL_PREY\.has\(victim\.templateId\) && !SMALL_EATERS\.has\(creature\.templateId\) \? Math\.max\(0, creature\.hunger - MEAL_SMALL\) : 0;/g) ?? []).length, 2, 'both kill sites: killed small prey is a mouthful, anything else fills, and a small hunter is filled by it');
  });

  check('the hyenas hunt goats on the open ground, alone and with the pack (2026-10-30)', () => {
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.match(zd, /\["grave-hyena", new Map\(\[[^\n]*\["feral-goat", 2\], \["old-billy", 3\]/, 'a pair of grave-hyenas brings down a goat, three the billy');
    assert.match(zd.match(/\n  \["grave-hyena", new Set\([^\n]*/)[0], /"feral-goat", "old-billy"/, 'and one alone goes for one too');
    assert.match(zd.match(/\n  \["dire-hyena", new Set\([^\n]*/)[0], /"feral-goat", "old-billy"/, 'the dire takes one alone');
    const mig = readFileSync(new URL('../migrations/351_goats_on_the_open_ground.sql', import.meta.url), 'utf8');
    const rows = [...mig.matchAll(/VALUES \('(open-goat-\d+)', 'feral-goat', '([a-z-]+)'\)/g)];
    assert.equal(rows.length, 7, 'seven goats, the mountain density of goat-sized grazers');
    assert.equal(new Set(rows.map((r) => r[1])).size, 7, 'each with its own id (mig 309)');
  });

  await checkAsync('two surface wardens walk two rounds: the one set in the churchyard keeps the west side (2026-10-30)', async () => {
    const z = new ZoneDO({}, {});
    const ex = (pairs) => pairs.map(([dir, to_room]) => ({ dir, to_room, key_item: null }));
    const rooms = ['the-village-street', 'the-well-head', 'the-burned-village', 'the-causeway', 'the-gatefall'];
    z.world = { mobTemplates: new Map([['warden-surface', { id: 'warden-surface', name: 'a hollow warden', max_hp: 30, is_boss: 0 }]]), mobSpawns: [], itemTemplates: new Map(),
      rooms: new Map(rooms.map((r) => [r, { id: r }])), entryRooms: new Set(), safeRooms: new Set(),
      exits: new Map([['the-village-street', ex([['west', 'the-well-head'], ['east', 'the-burned-village']])],
        ['the-causeway', ex([['north', 'the-gatefall'], ['south', 'the-burned-village']])]]) };
    z.send = () => {}; z.roomFeed = () => {}; z.refreshRoomCtx = () => {}; z.noteCreaturesChanged = () => {};
    const west = { id: 'w', templateId: 'warden-surface', roomId: 'the-village-street', hp: 30, target: null, grudges: [], home: 'the-churchyard', patrolIdx: 0, nextWanderAt: 0 };
    const east = { id: 'e', templateId: 'warden-surface', roomId: 'the-causeway', hp: 30, target: null, grudges: [], home: 'muster', patrolIdx: 0, nextWanderAt: 0 };
    assert.equal(patrolRoute('warden-surface', 'the-churchyard')[0], 'the-village-street', 'set in the churchyard: the west round');
    assert.equal(patrolRoute('warden-surface', 'muster'), PATROLS['warden-surface'], 'set at the muster: the east round, as before');
    z.creatures = new Map([['w', west], ['e', east]]);
    for (let i = 0; i < 8; i++) { // off its round a step is a coin toss, so one lucky step proves nothing
      west.roomId = 'the-village-street'; west.patrolIdx = 0; west.nextWanderAt = 0;
      east.roomId = 'the-causeway'; east.patrolIdx = 0; east.nextWanderAt = 0;
      await creatureMoves(z, west, Date.now(), 'wander', true);
      await creatureMoves(z, east, Date.now(), 'wander', true);
      assert.equal(west.roomId, 'the-well-head', 'the churchyard warden walks the west round');
      assert.equal(east.roomId, 'the-gatefall', 'the muster warden still walks the east one');
    }
    const mig = readFileSync(new URL('../migrations/352_a_second_warden_on_the_open_ground.sql', import.meta.url), 'utf8');
    assert.match(mig, /VALUES \('ward-6', 'warden-surface', 'the-churchyard'\)/, 'set in the churchyard, with an id');
  });

  await checkAsync('pvp by choice: only two wanderers who both chose it fight, the choice is made at a gate, and it holds a day (2026-11-01)', async () => {
    const said = [];
    const writes = [];
    const z = new ZoneDO({}, {});
    z.env = { DB: { prepare: (sql) => ({ bind: (...a) => ({ run: async () => { writes.push([sql, ...a]); return {}; } }) }) } };
    z.world = { entryRooms: new Set(['gate']), rooms: new Map(), exits: new Map(), mobTemplates: new Map(), itemTemplates: new Map(), mobSpawns: [], safeRooms: new Set() };
    z.send = (s, m) => said.push(m); z.refreshRoomCtx = () => {}; z.outOfWorld = () => false; z.inCombat = () => false;
    const mk = (pk, name, pvpAt) => ({ pubkey: pk, name, roomId: 'the-green', hp: 100, maxHp: 100, items: [], pvpAt, pvpTarget: null });
    const a = mk('a', 'Ash', 0), b = mk('b', 'Bree', 0);
    await pvp.attackPlayer(z, a, b);
    assert.match(said.pop(), /You do not fight other wanderers/, 'out of it, you cannot start one');
    assert.equal(b.pvpTarget, null);
    a.pvpAt = Date.now();
    await pvp.attackPlayer(z, a, b);
    assert.match(said.pop(), /Bree does not fight other wanderers/, 'and you cannot fall on someone out of it');
    assert.equal(a.pvpTarget, null, 'no fight starts');
    // The choice is gate business.
    const c = mk('c', 'Cole', 0);
    await pvp.cmdPvp(z, c, 'on');
    assert.match(said.pop(), /decided at a gate/, 'not out on the green');
    c.roomId = 'gate';
    await pvp.cmdPvp(z, c, 'on');
    assert.ok(pvp.isPvp(c) && writes.some((w) => w[0].includes('pvp_at') && w[1] > 0 && w[2] === 'c'), 'on, and saved');
    await pvp.cmdPvp(z, c, 'off');
    assert.match(said.pop(), /Not yet.*about 24 hours/, 'it holds a day');
    assert.ok(pvp.isPvp(c), 'still on');
    c.pvpAt = Date.now() - 24 * 3600_000 - 1000;
    await pvp.cmdPvp(z, c, 'off');
    assert.ok(!pvp.isPvp(c) && writes.some((w) => w[0].includes('pvp_at') && w[1] === 0 && w[2] === 'c'), 'after a day it comes off, and is saved');
    // A fight between two who chose it stops the round one of them is out of it.
    const d = mk('d', 'Dun', Date.now()), e = mk('e', 'Eve', 0);
    d.pvpTarget = 'e';
    z.sessions = new Map([['d', d], ['e', e]]);
    z.reachable = () => true;
    await pvp.tickPvp(z);
    assert.equal(d.pvpTarget, null, 'no round is fought against someone out of it');
    assert.match(pvp.pvpLine(d), /You fight other wanderers/, 'the sheet says where you stand');
  });

  await checkAsync('carving: a rock and the right tool make a random carving cut as fine as the tool, and a placed one stays, three to a spot, weathering except in your own den (2026-11-01)', async () => {
    assert.deepEqual(parse('place stone hare'), { verb: 'place', arg: 'stone hare' }, 'place reads its carving');
    assert.deepEqual(parse('carve rock'), { verb: 'carve', arg: 'rock' }, 'and carve its rock');
    const rows = new Map(); // the carvings table
    const db = { prepare: (sql) => ({ bind: (...a) => ({
      run: async () => {
        if (sql.startsWith('INSERT INTO carvings')) rows.set(a[0], { kind: a[1], quality: a[2], carver: a[3] });
        else if (sql.startsWith('UPDATE carvings')) Object.assign(rows.get(a[4]) ?? {}, { room_id: a[0] });
        else if (sql.startsWith('DELETE FROM carvings WHERE id')) rows.delete(a[0]);
        return {};
      },
      first: async () => (sql.includes('FROM carvings WHERE id') ? rows.get(a[0]) ?? null : null),
    }) }) };
    const z = new ZoneDO({}, {});
    z.env = { DB: db };
    const tpl = (id, name, rarity, slot = '') => [id, { id, name, rarity, slot, description: name + '.', weight: 0, barter: 0 }];
    z.world = { itemTemplates: new Map([tpl('loose-rock', 'a loose rock', 'common', 'weapon'), tpl('rusted-chisel', 'a rusted chisel', 'common'),
      tpl('keep-masons-chisel', "the keep-mason's chisel", 'epic'), tpl('hammerstone', 'a hammerstone', 'rare', 'weapon'), tpl('oyster-knife', 'an oyster knife', 'uncommon', 'weapon'),
      ...['hare', 'crow', 'rat', 'deer', 'hyena', 'goat', 'owl', 'hound', 'hand', 'face', 'crown', 'figure', 'tower', 'drake'].map((k) => tpl('carving-' + k, 'a stone ' + k, 'common'))]),
      mobTemplates: new Map(), rooms: new Map([['the-green', { id: 'the-green' }]]), exits: new Map(), mobSpawns: [], entryRooms: new Set(), safeRooms: new Set() };
    z.send = (s, m) => said.push(m); z.roomFeed = () => {}; z.creatureNoise = () => {}; z.sendStatus = () => {}; z.refreshRoomCtx = () => {}; z.markSimDirty = () => {};
    z.packRoom = () => true;
    const said = [];
    const item = (itemId) => ({ rowId: itemId + Math.random(), itemId, serial: null, equipped: false, condition: 100 });
    const s = { pubkey: 'pk', name: 'Rome', roomId: 'the-green', items: [item('loose-rock'), item('oyster-knife')] };
    await carving.carveRock(z, s, 'rock');
    assert.match(said.pop(), /Nothing you carry will cut it/, 'a knife is no tool for stone');
    assert.ok(s.items.some((c) => c.itemId === 'loose-rock'), 'and the rock is not spent on it');
    s.items.push(item('rusted-chisel'), item('hammerstone'), item('keep-masons-chisel'));
    assert.equal(await carving.carveRock(z, s, 'hello world'), false, 'carve <words> is still graffiti');
    assert.equal(await carving.carveRock(z, s, 'rock'), true);
    assert.ok(!s.items.some((c) => c.itemId === 'loose-rock'), 'the rock goes into the carving');
    const got = s.items.find((c) => c.itemId.startsWith('carving-'));
    assert.ok(got && got.loreId && rows.get(got.loreId), 'a carving, keyed to its record');
    assert.equal(rows.get(got.loreId).quality, 3, 'cut by the best tool carried: the epic chisel, finely');
    assert.match(said.pop(), /with the keep-mason's chisel.*Finely cut\./, 'the tool and the cut are said');
    assert.equal(await carving.carriedLine(z, got.loreId), ' It is finely cut. Cut into the base: Rome.', 'a look at it in the pack');
    // Set down out on the ground: it stays, and weathers.
    const kind = got.itemId.slice(8);
    await carving.cmdPlace(z, s, kind);
    assert.ok(!s.items.includes(got), 'it leaves the pack');
    assert.deepEqual(carving.roomLines(z, s), ['A stone ' + kind + ' sits here, finely cut.'], 'the room shows it');
    assert.match(carving.lookPlaced(z, s, kind), /Cut into the base: Rome\./, 'a close look names its carver');
    const placed = z.carvings.get('the-green')[0];
    const day = 24 * 3600 * 1000;
    placed.placedAt = Date.now() - 1.2 * day;
    assert.deepEqual(carving.roomLines(z, s), ['A stone ' + kind + ' sits here, worn soft.'], 'a day out and it is worn');
    placed.placedAt = Date.now() - 2.2 * day;
    assert.deepEqual(carving.roomLines(z, s), ['A weathered stone shape sits here, almost past knowing.'], 'two days and it is almost gone');
    placed.placedAt = Date.now() - 3.1 * day;
    assert.deepEqual(carving.roomLines(z, s), [], 'three days and it is gone');
    // Three to a spot, and a full spot refuses a fourth: nothing standing is destroyed (2026-11-01).
    z.carvings.set('the-green', [0, 1, 2].map((i) => ({ id: 'c' + i, kind: 'owl', quality: 1, carver: 'X', roomId: 'the-green', inside: '', lasting: false, placedAt: Date.now() - i * day * 0.5 })));
    const hare = Object.assign(item('carving-hare'), { loreId: 'h1' });
    s.items.push(hare); rows.set('h1', { kind: 'hare', quality: 0, carver: 'Rome' });
    await carving.cmdPlace(z, s, 'hare');
    assert.deepEqual(z.carvings.get('the-green').map((c) => c.id).sort(), ['c0', 'c1', 'c2'], 'the three standing all stay');
    assert.ok(s.items.includes(hare), 'and the fourth stays in the pack');
    s.items.splice(s.items.indexOf(hare), 1);
    // Two of a kind are told apart as two hyenas are, in the order the room lists them (2026-11-01).
    const owls = z.carvings.get('the-green');
    owls[1].carver = 'Mira'; owls[1].carverPk = s.pubkey; owls[2].carver = 'Tam';
    assert.match(carving.lookPlaced(z, s, 'stone owl'), /base: X\./, 'plain is the first');
    assert.match(carving.lookPlaced(z, s, 'stone owl 2'), /base: Mira\./);
    assert.match(carving.lookPlaced(z, s, 'second owl'), /base: Mira\./);
    assert.match(carving.lookPlaced(z, s, '3.owl'), /base: Tam\./);
    assert.equal(carving.lookPlaced(z, s, 'owl 4'), null, 'there is no fourth');
    Object.assign(z, { packRoom: () => true, refreshRoomCtx() {}, roomFeed() {}, sendStatus() {}, markSimDirty() {} });
    assert.equal(await carving.pickUp(z, s, 'owl'), false, 'the first is not yours to take');
    assert.equal(await carving.pickUp(z, s, 'owl 2'), true, 'the second is');
    assert.deepEqual(z.carvings.get('the-green').map((c) => c.id), ['c0', 'c2'], 'and only that one comes up');
    s.items.splice(s.items.findIndex((c) => c.itemId === 'carving-owl'), 1);
    // In your own den it lasts.
    z.inDen = new Map([['pk', 'pk']]); z.dens = new Map([['pk', { roomId: 'the-green', holder: 'pk' }]]);
    s.items.push(Object.assign(item('carving-crow'), { loreId: 'k1' })); rows.set('k1', { kind: 'crow', quality: 4, carver: 'Rome' });
    await carving.cmdPlace(z, s, 'crow');
    const kept = z.carvings.get('the-green').find((c) => c.id === 'k1');
    assert.ok(kept.lasting && kept.inside === 'pk', 'set down inside your own den');
    kept.placedAt = Date.now() - 30 * day;
    assert.deepEqual(carving.roomLines(z, s), ['A stone crow sits here, masterfully cut.'], 'a month on, it has not weathered, and only the den shows it inside');
    z.inDen = new Map();
    assert.ok(!carving.roomLines(z, s).some((l) => /crow/.test(l)), 'out in the street the den piece is not on the ground');
  });

  await checkAsync('a pit hyena lives in the pits: it never moves house for good, and a fed one walks home (2026-10-31)', async () => {
    const z = new ZoneDO({}, {});
    const ex = (pairs) => pairs.map(([dir, to_room]) => ({ dir, to_room, key_item: null }));
    const chain = ['the-bone-fan', 'the-wash-foot', 'the-dug-earth', 'the-last-pit', 'the-camp-tail', 'the-picket-ground'];
    const exits = new Map(chain.map((r, i) => [r, ex([...(i ? [['east', chain[i - 1]]] : []), ...(i < chain.length - 1 ? [['west', chain[i + 1]]] : [])])]));
    z.world = { mobTemplates: new Map([['grave-hyena', { id: 'grave-hyena', name: 'a grave-hyena', max_hp: 26, is_boss: 0 }]]), mobSpawns: [], itemTemplates: new Map(),
      rooms: new Map(chain.map((r) => [r, { id: r, region: 'out' }])), exits, entryRooms: new Set(), safeRooms: new Set() };
    z.send = () => {}; z.roomFeed = () => {}; z.roomSound = () => {}; z.refreshRoomCtx = () => {}; z.noteCreaturesChanged = () => {};
    const rnd = crypto.getRandomValues;
    try {
      crypto.getRandomValues = (a) => { a.fill(0); return a; }; // every die lands: the migration roll included
      const h = { id: 'h', templateId: 'grave-hyena', roomId: 'the-bone-fan', hp: 26, target: null, grudges: [], home: 'the-bone-fan', hunger: 0, nextWanderAt: 0 };
      // enough hyenas on the open ground that a migration may take one (MIGRATE_KEEP)
      const others = [1, 2, 3, 4, 5, 6].map((i) => ["o" + i, { id: "o" + i, templateId: 'grave-hyena', roomId: 'the-picket-ground', hp: 26, target: null, grudges: [], home: 'the-picket-ground' }]);
      z.creatures = new Map([['h', h], ...others]);
      await creatureMoves(z, h, Date.now(), 'wander', true);
      assert.equal(h.drift, undefined, 'a pit hyena never sets off to settle somewhere else');
      assert.equal(h.home, 'the-bone-fan', 'its home stays in the pits');
      const away = { id: 'a', templateId: 'grave-hyena', roomId: 'the-picket-ground', hp: 26, target: null, grudges: [], home: 'the-bone-fan', hunger: 0, nextWanderAt: 0 };
      z.creatures = new Map([['a', away]]);
      crypto.getRandomValues = rnd;
      await creatureMoves(z, away, Date.now(), 'wander', true);
      assert.equal(away.roomId, 'the-camp-tail', 'fed and out on the open ground, it walks back toward the pits');
    } finally { crypto.getRandomValues = rnd; }
    assert.ok(PITS_ROOMS.size === 20 && PITS_ROOMS.has('the-bone-fan') && PITS_ROOMS.has('the-burning-ground'), 'the pits are the twenty rooms of mig 345');
    const mig = readFileSync(new URL('../migrations/357_the_pit_hyenas_spread_out.sql', import.meta.url), 'utf8');
    assert.match(mig, /SET room_id = 'the-bone-fan'\s+WHERE id = 'hyena-1'/, 'hyena-1 moves out to the Bone Fan');
    assert.match(mig, /SET room_id = 'the-burning-ground' WHERE id = 'hyena-3'/, 'hyena-3 to the Burning Ground');
  });

  await checkAsync('the fever rat walks about its graves, no further than the ground round them and never into a gate (2026-11-06)', async () => {
    const z = new ZoneDO({}, {});
    const ex = (pairs) => pairs.map(([dir, to_room]) => ({ dir, to_room, key_item: null }));
    const line = ['graves', 'r1', 'r2', 'r3', 'r4', 'r5'];
    const exits = new Map(line.map((r, i) => [r, ex([...(i ? [['east', line[i - 1]]] : []), ...(i < line.length - 1 ? [['west', line[i + 1]]] : []), ...(r === 'r1' ? [['north', 'the-door']] : [])])]));
    exits.set('the-door', ex([['south', 'r1']]));
    z.world = { mobTemplates: new Map([[FEVER_RAT, { id: FEVER_RAT, name: 'the fever rat', max_hp: 85, is_boss: 1 }]]), mobSpawns: [], itemTemplates: new Map(),
      rooms: new Map([...line, 'the-door'].map((r) => [r, { id: r, region: 'den' }])), exits, entryRooms: new Set(['the-door']), safeRooms: new Set() };
    z.send = () => {}; z.roomFeed = () => {}; z.roomSound = () => {}; z.refreshRoomCtx = () => {}; z.noteCreaturesChanged = () => {};
    const rat = { id: 'r', templateId: FEVER_RAT, roomId: 'graves', home: 'graves', hp: 85, target: null, grudges: [], hunger: 0, nextWanderAt: 0 };
    z.creatures = new Map([['r', rat]]);
    const seen = new Set();
    for (let i = 0; i < 400; i++) { await creatureMoves(z, rat, Date.now(), 'wander', true); seen.add(rat.roomId); }
    assert.ok(seen.size > 1, 'it leaves the room it came up in');
    assert.ok(!seen.has('the-door'), 'it keeps out of a gate');
    assert.ok(!seen.has('r4') && !seen.has('r5'), 'and stays within three rooms of its graves');
    assert.equal(rat.home, 'graves', 'its graves stay its own, which the fever goes by');
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.equal(zone.match(/nextWanderAt <= (?:t|now) && (?:\(!bossStands\(tmpl\) \|\| PATROLS\[tmpl\.id\]\)|!bossStands\(tmpl\))/g)?.length, 3, 'beside a player, far from one and through a sleeping world');
    const standing = { id: 'three-hound', is_boss: 1 };
    assert.equal(bossStands(standing), true, 'every other boss still stands where it lives');
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

  await checkAsync('a bear in its own cave rushes whoever walks in, and a hungry one hunts (2026-11-01)', async () => {
    const z = new ZoneDO({}, {});
    z.world = { mobTemplates: new Map([['brown-bear', { id: 'brown-bear', name: 'a brown bear', level: 5, max_hp: 70 }], ['grey-wolf', { id: 'grey-wolf', name: 'a grey wolf', level: 3, max_hp: 30 }]]),
      mobSpawns: [], itemTemplates: new Map(), rooms: new Map(), exits: new Map(), entryRooms: new Set(), safeRooms: new Set() };
    const bear = { id: 'b', templateId: 'brown-bear', roomId: 'the-wall-cave', hp: 70, grudges: [], target: null, hunger: 0 };
    z.creatures = new Map([['b', bear]]);
    const said = []; let struck = 0;
    z.send = (_s, t) => said.push(t); z.roomFeed = () => {}; z.refreshRoomCtx = () => {}; z.outOfWorld = () => false;
    z.creatureFirstStrike = async () => { struck++; };
    const me = { pubkey: 'me', name: 'Rome', roomId: 'the-wall-cave' };
    await provokeGrudges(z, me, true);
    assert.equal(bear.bluffing, 'me', 'it rushes you as you walk into its cave');
    assert.match(said.join(' '), /stops short/, 'and stops short: the warning');
    assert.equal(struck, 0, 'no free opening blow');
    // the same bear out in the wood lets you by
    Object.assign(bear, { roomId: 'the-broken-avenue', bluffing: undefined, bluffedAt: undefined, target: null });
    me.roomId = 'the-broken-avenue'; said.length = 0;
    await provokeGrudges(z, me, true);
    assert.equal(bear.bluffing, undefined, 'out in the wood it lets you by');
    assert.equal(bear.target, null);
    // asleep in its cave it sleeps through you
    Object.assign(bear, { roomId: 'the-wall-cave', asleep: true }); me.roomId = 'the-wall-cave';
    await provokeGrudges(z, me, true);
    assert.equal(bear.bluffing, undefined, 'a sleeping bear does not rush');
    bear.asleep = false;
    // inside the rearm, the second time in is no bluff
    bear.bluffedAt = Date.now() - 60_000;
    await provokeGrudges(z, me, true);
    assert.equal(bear.target, 'me', 'walk back in on it soon after and it comes for you');
    // hungry is enough for the bear; a wolf still waits for the end of the rope
    z.creaturesInRoom = () => [];
    assert.equal(huntsAt('brown-bear'), 50); assert.equal(huntsAt('grey-wolf'), 85);
    assert.equal(starvingHunts(z, { templateId: 'brown-bear', roomId: 'x', hunger: 55 }), true, 'a hungry bear hunts you');
    assert.equal(starvingHunts(z, { templateId: 'brown-bear', roomId: 'x', hunger: 40 }), false, 'a fed one does not');
    assert.equal(starvingHunts(z, { templateId: 'grey-wolf', roomId: 'x', hunger: 55 }), false, 'the others are as they were');
  });

  await checkAsync('the white roe: it comes to the wood, keeps its room empty, draws the followers, and its death turns the wood (2026-11-01)', async () => {
    // a line of six rooms in the wood, a to f
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const exits = new Map(ids.map((r, i) => [r, [i > 0 && { dir: 'w', to_room: ids[i - 1], key_item: null }, i < 5 && { dir: 'e', to_room: ids[i + 1], key_item: null }].filter(Boolean)]));
    const dist = (x, y) => Math.abs(ids.indexOf(x) - ids.indexOf(y));
    const z = {
      world: { rooms: new Map(ids.map((r) => [r, { id: r, region: 'wood' }])), exits, entryRooms: new Set(), safeRooms: new Set(),
        mobTemplates: new Map([['white-roe', { id: 'white-roe', name: 'a white roe', max_hp: 20 }], ['the-follower', { id: 'the-follower', name: 'the follower' }], ['grey-wolf', { id: 'grey-wolf', name: 'a grey wolf' }]]) },
      creatures: new Map(), sessions: new Map(), inGatehouse: new Set(),
      regionOf: () => 'wood', roomDist: dist, reachable: () => true,
      noteCreaturesChanged() {}, refreshRoomCtx() {}, roomFeed() {}, said: [], send(_s, t) { this.said.push(t); }, bands: [], roomFeedBands(_b, t) { this.bands.push(t); },
    };
    const now = Date.now();
    const roe = whiteroe.comes(z, now);
    assert.ok(roe && ids.includes(roe.roomId), 'one comes, into the wood');
    assert.match(z.bands[0], /everything that was moving stops/);
    assert.equal(whiteroe.comes(z, now + 1), null, 'never two');
    roe.roomId = 'a';
    // nothing steps into its room, and what is in it goes
    const wolf = { id: 'w', templateId: 'grey-wolf', roomId: 'b', grudges: [], target: null };
    z.creatures.set('w', wolf);
    assert.equal(whiteroe.shuns(z, wolf, 'a', now + 2), true, 'a wolf will not step into its room');
    assert.equal(whiteroe.shuns(z, roe, 'a', now + 2), false);
    wolf.roomId = 'a'; let moved = 0;
    await whiteroe.makesWay(z, wolf, now + 3, async () => { moved++; });
    assert.equal(moved, 1, 'one in its room leaves it');
    wolf.target = 'someone'; moved = 0;
    await whiteroe.makesWay(z, wolf, now + 4, async () => { moved++; });
    assert.equal(moved, 0, 'but not out of a fight');
    wolf.target = null; wolf.roomId = 'f'; moved = 0;
    await whiteroe.makesWay(z, wolf, now + 4, async () => { moved++; });
    assert.equal(moved, 0, 'and nothing elsewhere is moved by it');
    // the followers come for whoever is near it, and never into its room
    const me = { pubkey: 'me', name: 'Rome', roomId: 'b', away: false };
    z.sessions.set('me', me);
    const f = { id: 'f1', templateId: 'the-follower', roomId: 'e', hidden: true, grudges: [], target: null };
    z.creatures.set('f1', f);
    await whiteroe.follows(z, f, now + 5);
    assert.equal(f.roomId, 'd', 'it closes on you a room at a time');
    assert.equal(f.followAt, now + 5 + 15_000 * 2, 'quicker the nearer you are to the roe (one step off: 30s)');
    await whiteroe.follows(z, f, now + 6);
    assert.equal(f.roomId, 'd', 'on its own clock');
    me.roomId = 'a'; f.roomId = 'b'; f.followAt = 0;
    await whiteroe.follows(z, f, now + 7);
    assert.equal(f.roomId, 'b', 'it never steps into the roe\'s room');
    me.roomId = 'f'; f.roomId = 'b'; f.followAt = 0; roe.roomId = 'a';
    await whiteroe.follows(z, f, now + 8);
    assert.equal(f.roomId, 'b', 'five steps from the roe and you are nobody it follows');
    // it drops on you more readily the nearer the roe
    me.roomId = 'b';
    assert.equal(whiteroe.wakeMult(z, f, me, now + 9), 3, 'a step off it: three times');
    me.roomId = 'e';
    assert.equal(whiteroe.wakeMult(z, f, me, now + 10), 1.5, 'four off: half again');
    me.roomId = 'f';
    assert.equal(whiteroe.wakeMult(z, f, me, now + 11), 1, 'further: as ever');
    assert.equal(whiteroe.wakeMult(z, wolf, { ...me, roomId: 'a' }, now + 12), 1, 'only the follower');
    // whoever kills it has the wood against them
    whiteroe.slain(z, me);
    assert.deepEqual(wolf.grudges.map((g) => g.pk), ['me'], 'every animal in the wood holds it against you');
    assert.deepEqual(f.grudges.map((g) => g.pk), ['me']);
    assert.match(z.said.join(' '), /turns toward you|about you/);
    // and the world's census never culls it as a spare roe
    const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.match(ai, /const cap = line === RAT_KING \|\| line === WHITE_ROE(?: \|\| line === FEVER_RAT)? \? 1/, 'one, kept through a deploy');
    assert.match(ai, /if \(whiteroe\.roams\(creature\)\) exits = whiteroe\.woodSteps\(z, exits\);/, 'it walks the wood');
    assert.match(ai, /halfBlind \* whiteroe\.wakeMult\(z, c, session, now\)/, 'the drop reads the roe');
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(zd.match(/export const MIGRANTS = new Set<string>\(\[[\s\S]*?\]\);/)[0], /"white-roe"/, 'it keeps to the wood');
  });

  check('every room of the hamlet has its close look, and the fever graves agree with their room (2026-11-01)', () => {
    const detail = readFileSync(new URL('../src/detail.ts', import.meta.url), 'utf8');
    const feats = detail.slice(detail.indexOf('export const ROOM_FEATURES'));
    const ids = ['the-dens-1', 'the-dens-2'].flatMap((f) => readFileSync(new URL(`../regions/${f}.rooms`, import.meta.url), 'utf8')
      .split('\n').filter((l) => /^## [a-z-]+ \| /.test(l) && !/\| attachment/.test(l)).map((l) => l.slice(3).split(' | ')[0]));
    assert.equal(ids.length, 60, 'the sixty rooms of the den ground');
    const missing = ids.filter((id) => !feats.includes(`  "${id}": {`));
    assert.deepEqual(missing, [], 'each one answers a close look');
    assert.doesNotMatch(feats, /Not laid out in rows/, 'the room says the graves are in rows, so the close look does too');
  });

  check('every room of the wood answers a close look (2026-11-02)', () => {
    const detail = readFileSync(new URL('../src/detail.ts', import.meta.url), 'utf8');
    const feats = detail.slice(detail.indexOf('export const ROOM_FEATURES'), detail.indexOf('export const SIGNPOSTS'));
    const files = ['the-wood-1', 'the-wood-2', 'the-wood-3', 'the-wood-4', 'the-old-growth', 'the-gate-rings', 'the-bear-caves', 'the-old-greys-ground'];
    const ids = files.flatMap((f) => readFileSync(new URL(`../regions/${f}.rooms`, import.meta.url), 'utf8')
      .split('\n').filter((l) => /^## [a-z0-9-]+ \| /.test(l) && !/\| attachment/.test(l)).map((l) => l.slice(3).split(' | ')[0]));
    assert.equal(ids.length, 329, 'the wood\'s rooms in its region files');
    const missing = ids.filter((id) => !feats.includes(`  "${id}": {`));
    assert.deepEqual(missing, [], 'each one answers a close look');
  });

  check('every room of the crossing, the mountain and their hamlets answers a close look (2026-11-05)', () => {
    const detail = readFileSync(new URL('../src/detail.ts', import.meta.url), 'utf8');
    const feats = detail.slice(detail.indexOf('export const ROOM_FEATURES'), detail.indexOf('export const SIGNPOSTS'));
    const posts = detail.slice(detail.indexOf('export const SIGNPOSTS'), detail.indexOf('const SIGN_WORDS'));
    const files = [1, 2, 3, 4, 5, 6].flatMap((n) => [`crossing-${n}`, `mountain-${n}`]).concat(['the-salt-hamlet', 'the-shieling-hamlet']);
    const ids = files.flatMap((f) => readFileSync(new URL(`../regions/${f}.rooms`, import.meta.url), 'utf8')
      .split('\n').filter((l) => /^## [a-z0-9-]+ \| /.test(l) && !/\| attachment/.test(l)).map((l) => l.slice(3).split(' | ')[0]));
    assert.equal(ids.length, 667, 'the crossing\'s and the mountain\'s rooms in their region files');
    const missing = ids.filter((id) => !feats.includes(`  "${id}": {`) && !posts.includes(`  "${id}": {`));
    assert.deepEqual(missing, [], 'each one answers a close look (a fingerpost room answers through its post)');
  });

  check('every room of the roads answers a close look (2026-11-05)', () => {
    const detail = readFileSync(new URL('../src/detail.ts', import.meta.url), 'utf8');
    const feats = detail.slice(detail.indexOf('export const ROOM_FEATURES'), detail.indexOf('export const SIGNPOSTS'));
    const posts = detail.slice(detail.indexOf('export const SIGNPOSTS'), detail.indexOf('const SIGN_WORDS'));
    const files = ['east-road-1', 'east-road-2', 'east-road-3', 'west-road', 'west-road-2', 'west-road-3', 'the-fen-road', 'the-drove-lane', 'the-scarp-foot-track'];
    const ids = files.flatMap((f) => readFileSync(new URL(`../regions/${f}.rooms`, import.meta.url), 'utf8')
      .split('\n').filter((l) => /^## [a-z0-9-]+ \| /.test(l) && !/\| attachment/.test(l)).map((l) => l.slice(3).split(' | ')[0]));
    assert.equal(ids.length, 222, 'the roads\' rooms in their region files');
    const missing = ids.filter((id) => !feats.includes(`  "${id}": {`) && !posts.includes(`  "${id}": {`));
    assert.deepEqual(missing, [], 'each one answers a close look');
  });

  check('every room of the open ground and the pits answers a close look (2026-11-05)', () => {
    const detail = readFileSync(new URL('../src/detail.ts', import.meta.url), 'utf8');
    const feats = detail.slice(detail.indexOf('export const ROOM_FEATURES'), detail.indexOf('export const SIGNPOSTS'));
    const posts = detail.slice(detail.indexOf('export const SIGNPOSTS'), detail.indexOf('const SIGN_WORDS'));
    const files = ['open-ground', 'open-ground-2', 'the-pits'];
    const ids = files.flatMap((f) => readFileSync(new URL(`../regions/${f}.rooms`, import.meta.url), 'utf8')
      .split('\n').filter((l) => /^## [a-z0-9-]+ \| /.test(l) && !/\| attachment/.test(l)).map((l) => l.slice(3).split(' | ')[0]));
    assert.ok(ids.length > 68, 'the open ground\'s and the pits\' rooms in their region files');
    const missing = ids.filter((id) => !feats.includes(`  "${id}": {`) && !posts.includes(`  "${id}": {`));
    assert.deepEqual(missing, [], 'each one answers a close look');
  });

  check('every fever graves sits over the same older stone, and says so on a close look (2026-11-05)', () => {
    const rises = Object.entries(FEVER_GRAVES).flatMap(([g, f]) => f.rises ?? [g]);
    assert.equal(rises.length, 6, 'the three village graves and the fortress\'s three');
    for (const id of rises) {
      const all = Object.values(ROOM_FEATURES[id] ?? {}).join(' ');
      assert.match(all, /dressed and laid tight/, `${id}: the older stone under the graves`);
      assert.match(all, /cold air coming up through the joints|cold comes through its joints/, `${id}: and the cold coming up through it`);
    }
  });

  check('the pack is retired from the roll, and the fever stays (2026-11-01)', () => {
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    const pool = ev.match(/const POOL: \[string, number, string\]\[\] = \[[\s\S]*?\n\];/)[0];
    assert.doesNotMatch(pool, /\["pack",/, 'the dogs no longer come in by the roll');
    assert.doesNotMatch(pool, /\["fever",/, 'the fever keeps its own clock now, off the roll (2026-11-04)');
    assert.match(ev, /await tickPack\(z, now\)|tickPack\(z, now\)/, 'one already running still ends');
  });

  await checkAsync('the fever rat: the fever reaches the wood, comes up with its rat, holds while it lives, and lifts when it dies (2026-11-01)', async () => {
    const rooms = new Map([[FEVER_RAT_HOME, { id: FEVER_RAT_HOME, region: 'den' }], ['ride', { id: 'ride', region: 'wood' }], ['lane', { id: 'lane', region: 'road' }]]);
    const z = {
      bandOf(r) { return this.world.rooms.get(r)?.region ?? ''; },
      world: { rooms, mobTemplates: new Map([[FEVER_RAT, { id: FEVER_RAT, name: 'the fever rat', max_hp: 85, is_boss: 1 }]]) },
      events: new Map(), creatures: new Map(), worn: new Set(),
      noteCreaturesChanged() {}, refreshRoomCtx() {}, fed: [], roomFeed(_r, t) { this.fed.push(t); },
      bands: [], roomFeedBands(b, t) { this.bands.push([[...b].sort().join(','), t]); },
      wearsTrait(s, tag) { return tag === FEVER_CLOTH_TRAIT && this.worn.has(s.pubkey); },
    };
    const t0 = Date.now();
    z.events.set('fever', { phase: 'idle', until: 0 });      // the roll drew it
    await tickFever(z, t0);                                   // idle -> the wind off the graves
    assert.equal(z.bands[0][0], 'den,wood', 'the warning reaches the wood as well as the village');
    await tickFever(z, t0 + 61_000);                          // -> active, and the rat comes up
    assert.equal(z.events.get('fever').phase, 'active');
    const rat = feverrat.rat(z);
    assert.ok(rat && rat.roomId === FEVER_RAT_HOME, 'the rat comes up in the fever graves');
    assert.equal(feverrat.comes(z, t0 + 62_000), null, 'never two');
    assert.equal(fevered(z, 'ride'), true, 'the fever is on the wood');
    assert.equal(fevered(z, FEVER_RAT_HOME), true, 'and on the old village');
    assert.equal(fevered(z, 'lane'), false, 'and not on the road');
    const me = { pubkey: 'me', roomId: 'ride' };
    assert.equal(feverBites(z, me), true, 'it cuts your mending in the wood');
    z.worn.add('me');
    assert.equal(feverBites(z, me), false, 'but not through the grave-cloth');
    // its own timer runs out, but the rat lives: the fever holds
    const late = t0 + 61_000 + 3_600_000;
    await tickFever(z, late);
    assert.equal(z.events.get('fever').phase, 'active', 'the fever holds while the rat lives');
    // killed, and the wind comes round
    z.creatures.delete(rat.id);
    feverLifts(z, late + 1);
    assert.equal(z.events.get('fever').phase, 'aftermath', 'killing it lifts the fever');
    assert.equal(fevered(z, 'ride'), false);
    // and a rat nobody kills goes back down after its long course
    z.events.clear(); z.creatures.clear();
    z.events.set('fever', { phase: 'idle', until: 0 });
    await tickFever(z, t0); await tickFever(z, t0 + 61_000);
    assert.ok(feverrat.rat(z));
    await tickFever(z, t0 + 61_000 + FEVER_RAT_HOLD_MS + 1);
    assert.equal(feverrat.rat(z), null, 'left alone, it goes back into the graves');
    assert.equal(z.events.get('fever').phase, 'aftermath', 'and the fever ends');
    // the killing blow reaches it, and its three mending sites ask through the cloth
    assert.match(readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8'), /if \(creature\.templateId === FEVER_RAT\) events\.feverLifts\(this, creature\.home\);/);
    const verbs = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.equal((verbs.match(/events\.feverBites\(z, session\)/g) ?? []).length, 2, 'food and the dressing');
    assert.match(readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8'), /events\.feverBites\(this, session\) \? FEVER_MEND_MULT/, 'and rest');
  });

  await checkAsync('each graves has a fever of its own on its own clock - the old village, both hamlets and the fortress - all can be up at once, and each rat lifts only its own (2026-11-04)', async () => {
    const rooms = new Map([
      ['the-fever-graves', { region: 'den' }], ['the-strand-graves', { region: 'crossing' }], ['the-hill-graves', { region: 'mountain' }],
      ['ride', { region: 'wood' }], ['marsh', { region: 'crossing' }], ['slope', { region: 'mountain' }], ['lane', { region: 'road' }],
      ['ossuary', { region: '' }], ['catacomb', { region: '' }], ['the-plague-trench', { region: 'out' }], ['hall', { region: '' }], ['the-deep-stair', { region: 'deep' }],
    ]);
    const z = {
      bandOf(r) { return this.world.rooms.get(r)?.region || 'upper'; },
      world: { rooms, mobTemplates: new Map([[FEVER_RAT, { id: FEVER_RAT, name: 'the fever rat', max_hp: 85, is_boss: 1 }]]) },
      events: new Map(), creatures: new Map(), noteCreaturesChanged() {}, refreshRoomCtx() {}, roomFeed() {},
      feeds: [], roomFeedBands(b) { this.feeds.push([...b].sort().join(',')); },
    };
    const ground = { 'the-fever-graves': ['ride', 'the-fever-graves'], 'the-strand-graves': ['marsh', 'the-strand-graves'], 'the-hill-graves': ['slope', 'the-hill-graves'] };
    const t0 = Date.now();
    // a fresh world: every graves sets its own first clock, an hour or more out
    await tickFever(z, t0);
    for (const f of Object.values(FEVER_GRAVES)) {
      const st = z.events.get(f.key);
      assert.ok(st && st.phase === 'idle' && st.until >= t0 + 3_600_000 && st.until <= t0 + 6 * 3_600_000, f.key + ' keeps its own clock');
    }
    // all three due together: all three come up, each rat in its own graves
    for (const f of Object.values(FEVER_GRAVES)) z.events.get(f.key).until = t0;
    await tickFever(z, t0); await tickFever(z, t0 + 61_000);
    assert.deepEqual(z.feeds.slice(0, 4).sort(), ['crossing', 'den,wood', 'gate,out,upper', 'mountain'], 'each warning goes to its own ground');
    for (const g of ['the-fever-graves', 'the-strand-graves', 'the-hill-graves']) assert.equal(feverrat.rat(z, g)?.roomId, g, 'a rat up out of ' + g);
    assert.ok(['ossuary', 'catacomb', 'the-plague-trench'].includes(feverrat.rat(z, 'the-fortress')?.roomId), 'the fortress rat up out of one of its three');
    assert.equal([...z.creatures.values()].length, 4, 'four rats, one to each');
    for (const r of ['ride', 'marsh', 'slope', 'the-fever-graves', 'the-strand-graves', 'the-hill-graves', 'hall', 'the-plague-trench']) assert.equal(fevered(z, r), true, r + ' under a fever');
    assert.equal(fevered(z, 'lane'), false, 'and not the road');
    assert.equal(fevered(z, 'the-deep-stair'), false, 'nor the deep, which is its own ground');
    // the fortress rises at random among its three
    const rose = new Set();
    for (let i = 0; i < 40; i++) {
      z.creatures.delete(feverrat.rat(z, 'the-fortress').id); feverLifts(z, 'ossuary', t0);
      const fst = z.events.get('fever-fortress'); fst.phase = 'idle'; fst.until = t0;
      await tickFever(z, t0); await tickFever(z, t0 + 61_000);
      rose.add(feverrat.rat(z, 'the-fortress').roomId);
    }
    assert.deepEqual([...rose].sort(), ['catacomb', 'ossuary', 'the-plague-trench'], 'its rat comes up in any of the three');
    // kill the Crossing's rat: only the Crossing lifts
    z.creatures.delete(feverrat.rat(z, 'the-strand-graves').id);
    feverLifts(z, 'the-strand-graves', t0 + 62_000);
    assert.equal(fevered(z, 'marsh'), false, 'its own fever lifts');
    assert.equal(fevered(z, 'ride'), true, 'the old village\'s runs on');
    assert.equal(fevered(z, 'slope'), true, 'and the mountain\'s');
    assert.equal(feverPhase(z, 'crossing'), 'aftermath');
    // ...and when its aftermath ends its clock starts again, 18 to 30 hours out
    const t1 = t0 + 62_000 + 13 * 60_000;
    await tickFever(z, t1);
    const st = z.events.get('fever-strand');
    assert.ok(st.phase === 'idle' && st.until >= t1 + 18 * 3_600_000 && st.until <= t1 + 30 * 3_600_000, 'its next one is a day or so off');
    assert.equal(feverGravesOf('wood'), 'the-fever-graves'); assert.equal(feverGravesOf('road'), undefined);
    // and the hamlets stand on grounds of their own, graves and all (their pictures, 2026-11-04)
    for (const [f, region, graves, pre] of [['the-salt-hamlet', 'crossing', 'the-strand-graves', 'salt'], ['the-shieling-hamlet', 'mountain', 'the-hill-graves', 'shiel']]) {
      const ids = readFileSync(new URL(`../regions/${f}.rooms`, import.meta.url), 'utf8').split('\n')
        .filter((l) => /^## [a-z-]+ \| /.test(l) && !/\| attachment/.test(l)).map((l) => l.slice(3).split(' | ')[0]);
      assert.equal(ids.length, 29, f);
      assert.ok(ids.includes(graves) && FEVER_GRAVES[graves].bands[0] === region, graves + ' is in its hamlet');
      for (const id of ids) assert.ok([pre + '-street', pre + '-fields', pre + '-common'].includes(terrainOf(id, '', region)), id + ' stands on its hamlet\'s own ground');
      const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
      for (const g of ['street', 'fields', 'common']) {
        assert.match(pub, new RegExp('^  "' + pre + '-' + g + '":\\s+"day night night-torch snow",$', 'm'), pre + '-' + g + ' has its four pictures');
        assert.match(pub, new RegExp('"' + pre + '-' + g + '": \\["' + pre + '-' + g + '"\\]'), pre + '-' + g + ' is a ground the page draws');
      }
    }
  });

  check('the villages are rat-heavy and the hunters round them come in for the rats: the hamlets, the old village, every row with its own id (2026-11-04)', () => {
    const sql = readFileSync(new URL('../migrations/371_the_hamlets_are_lived_in.sql', import.meta.url), 'utf8');
    const rows = [...sql.matchAll(/VALUES \('([^']+)', '([^']+)', '([^']+)'\);/g)].map((m) => ({ id: m[1], t: m[2], room: m[3] }));
    for (const [f, want] of [['the-salt-hamlet', 19], ['the-shieling-hamlet', 25]]) {
      const ids = new Set(readFileSync(new URL(`../regions/${f}.rooms`, import.meta.url), 'utf8').split('\n')
        .filter((l) => /^## [a-z-]+ \| /.test(l) && !/\| attachment/.test(l)).map((l) => l.slice(3).split(' | ')[0]));
      const here = rows.filter((r) => ids.has(r.room));
      assert.equal(here.length, want, f + ' at its ground\'s density');
      assert.equal(here.filter((r) => r.t === 'rat').length, 12, f + ' has its rats');
    }
    assert.equal(rows.length, 44);
    const dens = [...readFileSync(new URL('../migrations/372_the_old_village_is_rat_heavy.sql', import.meta.url), 'utf8')
      .matchAll(/VALUES \('([^']+)', '([^']+)', '([^']+)'\);/g)].map((m) => ({ id: m[1], t: m[2], room: m[3] }));
    assert.equal(dens.filter((r) => r.t === 'rat').length, 12, 'the old village doubles its rats');
    for (const r of [...rows, ...dens]) assert.equal(r.id, `spawn-${r.t}@${r.room}`, 'every spawn row carries its own id');
    assert.equal(new Set([...rows, ...dens].map((r) => r.id)).size, rows.length + dens.length, 'and no two the same');
    const pub = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    const preys = pub.slice(pub.indexOf('export const PREYS_ON'), pub.indexOf('\n]);', pub.indexOf('export const PREYS_ON')));
    for (const h of ['masterless-dog', 'lead-dog', 'tawny-owl', 'marsh-hound', 'great-gull', 'black-backed-gull', 'hill-fox', 'snow-fox', 'wildcat', 'ermine', 'eagle-owl'])
      assert.match(preys, new RegExp('\\["' + h + '", new Set\\(\\["rat"'), h + ' comes in for the rats');
  });

  check('the hamlets have their finds and a set of gear from their own region, the old village three uncommons, and nothing in a chapel but a torch (2026-11-04)', () => {
    const sql = readFileSync(new URL('../migrations/373_the_hamlets_have_their_finds.sql', import.meta.url), 'utf8');
    const rows = [...sql.matchAll(/VALUES \('([^']+)', '([^']+)', 1\);/g)].map((m) => ({ item: m[1], room: m[2] }));
    for (const [f, n] of [['the-salt-hamlet', 18], ['the-shieling-hamlet', 21]]) {
      const ids = new Set(readFileSync(new URL(`../regions/${f}.rooms`, import.meta.url), 'utf8').split('\n')
        .filter((l) => /^## [a-z-]+ \| /.test(l) && !/\| attachment/.test(l)).map((l) => l.slice(3).split(' | ')[0]));
      assert.equal(rows.filter((r) => ids.has(r.room)).length, n, f + ' has its finds');
    }
    const dens = new Set(['the-bark-heap', 'the-lodge-loft', 'the-north-house']);
    assert.deepEqual(rows.filter((r) => dens.has(r.room)).map((r) => r.item).sort(), ['kindling-hatchet', 'moss-packed-cap', 'wolfskin-hood'], 'the old village gains three of the wood\'s uncommons');
    for (const r of rows) if (/chapel/.test(r.room)) assert.equal(r.item, 'torch', 'everything in a chapel was carried out');
    assert.equal(new Set(rows.map((r) => r.item + '@' + r.room)).size, rows.length, 'no find laid twice');
  });

  check('players hear of the fever rat: the keeper, the status line and the old village (2026-11-02)', () => {
    const z = {
      bandOf(r) { return this.world.rooms.get(r)?.region ?? ''; },
      world: { rooms: new Map([['graves-x', { id: 'graves-x', region: 'den' }], ['gate-w', { id: 'gate-w', region: 'wood' }]]), mobTemplates: new Map() },
      events: new Map([['fever', { phase: 'active', until: Date.now() + 3_600_000 }]]), creatures: new Map(),
      sessions: new Map([['me', { pubkey: 'me', roomId: 'gate-w' }], ['out', { pubkey: 'out' }]]), inGatehouse: new Set(['me']), // behind a wood gate: the fever is on his ground
      said: [], send(s, t) { this.said.push([s.pubkey, t]); }, regionOf(r) { return this.world.rooms.get(r)?.region ?? ''; },
    };
    // no rat up: the old village has only the fever's own lines
    const quiet = new Set(); for (let i = 0; i < 200; i++) quiet.add(eventAmbient(z, 'graves-x'));
    assert.ok(![...quiet].some((l) => /facing the graves|loose earth|breathing among the graves/.test(l)), 'no rat lines without a rat');
    // the rat up in the graves
    z.creatures.set('r', { id: 'r', templateId: FEVER_RAT, hp: 85, roomId: 'graves-x' });
    const seen = new Set(); for (let i = 0; i < 200; i++) seen.add(eventAmbient(z, 'graves-x'));
    assert.ok([...seen].some((l) => /facing the graves|loose earth|breathing among the graves/.test(l)), 'the old village sounds of it');
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(ev, /The fever sits over/, 'the room text never names a settled fever: the cough tells you (2026-11-06)');
    // THE KEEPER SPEAKS OF THE FEVER ONCE, STORIED (rome, 2026-11-11): the rat's faded
    // lines, a second telling in a second look, are gone
    assert.doesNotMatch(readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8'), /feverrat\.keeper\(/, 'nothing asks for the faded lines');
    assert.equal(feverrat.keeper, undefined, 'and nothing sends them');
    const zdk = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(zdk, /FEVER_RAT_KEEPER_LINES|Fever's off the graves again|Fever's up out of the dead again/, 'the faded lines are gone');
    assert.match(zdk, /  fever: \[\n    "\\"The wind has come round off the graves\. It comes warm\./, 'the storied telling stays');
  });

  check('the fever rat draws the rat king\'s size, through the size curve (2026-11-01)', () => {
    // MOB_SPRITE is not drawn linearly: mobVh is K * h^MOB_P. Matching the two
    // numbers as if it were drew the fever rat a fifth longer than the king.
    // Body length in frame heights, measured off each strip's idle frame.
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const P = Number(pub.match(/var MOB_P = ([\d.]+);/)[1]);
    const h = (id) => Number(pub.match(new RegExp('"' + id + '": (\\d+),'))[1]);
    const KING_LEN = 0.843, FEVER_LEN = 1.153;
    const ratio = (Math.pow(h('fever-rat'), P) * FEVER_LEN) / (Math.pow(h('rat-king'), P) * KING_LEN);
    assert.ok(Math.abs(ratio - 1) < 0.08, 'the fever rat is drawn ' + ratio.toFixed(2) + 'x the rat king\'s length');
  });

  await checkAsync('filling the lantern redraws the chips, so the last lump takes its chip with it (2026-11-02)', async () => {
    const db = { prepare: () => ({ bind: () => ({ run: async () => ({}) }) }) };
    let ctx = 0;
    const z = { env: { DB: db }, send: () => {}, sendStatus: () => {}, sendCtx: () => { ctx++; }, inCombat: () => false };
    const me = { pubkey: 'me', items: [{ itemId: 'hooded-lantern', rowId: 'l', fuel: 0, condition: 100 }, { itemId: 'fat', rowId: 'f' }] };
    await light.cmdFill(z, me, 'lantern');
    assert.equal(me.items.some((c) => c.itemId === 'fat'), false, 'the fat was not used (the test is not testing anything)');
    assert.equal(ctx, 1, 'the chips were not redrawn after the fat went in');
  });
  check('every room has its own floor underfoot: the Listening Stand steps in leaves like the Heart of It beside it (2026-11-02)', () => {
    const dry = { rain: 0, windUp: false, snow: false, mud: false, seaUp: false, runUp: false };
    const step = (id, region, w = dry) => roomSound.soundscapeOf(roomSound.placeOfRow({ id, region, description: '' }), w).ground;
    assert.equal(step('the-heart-of-it', 'wood'), 'leaves');
    assert.equal(step('the-listening-stand', 'wood'), 'leaves');
    assert.equal(step('the-rope-stage', 'crossing'), 'wood', 'a timber stage');
    assert.equal(step('the-rope-stage', 'crossing', { ...dry, rain: 2 }), 'wood', 'boards do not go to mud in the rain');
    assert.equal(roomSound.soundscapeOf({ roomId: 'the-listening-stand', band: 'wood', open: false, inside: true, floor: 'leaves' }, dry).ground, '', 'behind the gatehouse door is the plain step');
  });
  check('the room fades out with its fog in it, so the fog comes and goes with the picture (2026-11-02)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const fade = pub.slice(pub.indexOf('function fadeScene()'), pub.indexOf('var lastCovered = false;'));
    assert.match(fade, /cover\.appendChild\(ground\);[^]*fogCopy\.appendChild\(fogPix\);[^]*cover\.appendChild\(fogCopy\)/, 'the frozen old room carries its fog, as pixels');
    assert.ok(pub.indexOf('<div id="fogveil"') < pub.indexOf('<div id="mobs"'), 'the fade goes in above the fog veil, so it must carry the fog');
  });
  check('the fog lands with the new picture: drawn from the mask decoded alongside it, never a CSS mask fetched afterwards (2026-11-02)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(pub, /fogVeilEl\.style\.(webkitMaskImage|maskImage)\s*=/, 'a CSS mask on the veil loads on its own time');
    assert.match(pub, /readySceneImage\(fogMask, function \(ok\) \{[^}]*fogImg = ok && e \? e\.image : null;/, 'the decoded mask is kept');
    assert.match(pub, /fx2\.drawImage\(fogImg, 0, 0\);/, 'and the fog is drawn from it in put()');
    assert.match(pub, /<div id="fogveil" aria-hidden="true"><canvas><\/canvas><\/div>/, 'onto the veil\'s canvas');
  });
  check('a spot of carvings shows one at a time, a different one at random (2026-11-01)', () => {
    const now = Date.now();
    const put = (id, kind) => ({ id, kind, quality: 0, carver: 'Rome', carverPk: 'me', roomId: 'moor', inside: '', lasting: true, placedAt: now });
    const z = { carvings: new Map([['moor', [put('a', 'face'), put('b', 'hound'), put('c', 'owl')]]]),
      inGatehouse: new Set(), inDen: new Map(), dens: new Map() };
    const me = { pubkey: 'me', roomId: 'moor' };
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const lines = carving.roomLines(z, me);
      assert.equal(lines.length, 1, 'one line, never the whole list');
      seen.add(lines[0]);
    }
    assert.equal(seen.size, 3, 'each of them turns up in its turn');
    assert.equal(carving.roomLines(z, { pubkey: 'me', roomId: 'elsewhere' }).length, 0, 'none where none stand');
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
    // the wear only, never "sealed": it wrapped and ran over the next row in the vault (2026-10-31)
    assert.equal(row({ sealed: true, condWord: 'battered' }), 'battered');
    assert.equal(row({ sealed: true, condWord: 'nearly broken' }), 'nearly broken');
    assert.equal(row({ sealed: true, condWord: 'sound' }), '');
    assert.equal(row({ condWord: 'failing' }), 'failing');
  });

  check('in your den a lockbox piece goes straight onto the shelf (2026-10-31)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /if \(place === "lockbox" && benchHasShelf\) btnQ\("\\\\u2192 shelf", "stow"\);/, 'the box row has a shelf button in a den');
    const den = readFileSync(new URL('../src/den.ts', import.meta.url), 'utf8');
    const fn = den.slice(den.indexOf('export async function benchStow'));
    const body = fn.slice(0, fn.indexOf('\n}\n'));
    assert.match(body, /carried = \(await loadContainer\(z\.env\.DB, session\.pubkey, "lockbox"\)\)\.find\(\(c\) => c\.rowId === row\);/, 'the server finds the row in the box');
    assert.match(body, /if \(!fromBox\) \{[\s\S]*session\.items\.splice\(idx, 1\);\n  \}/, 'and only splices the pack for a pack row');
  });
  check('the lockbox and vault tabs carry every store count, as the pack tab does (2026-10-31)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const box = pub.match(/fillBenchCol\(block, "Lockbox"[^\n]*/)[0];
    const vault = pub.match(/fillBenchCol\(bvault, "Vault[^\n]*/)[0];
    assert.match(box, /\[packCnt\]\.concat\(foodCnt, vaultCnt\)\);$/, 'the lockbox line says the pack, the food and the vault');
    assert.match(vault, /\[packCnt\]\.concat\(foodCnt, \[others\[0\]\]\)\);$/, 'the vault line says the pack, the food and the lockbox');
    assert.match(pub, /var packCnt = \["pack", /, 'the pack count is labelled');
  });
  check('a lantern and gear put away in the lockbox say their fat and their wear (2026-10-31)', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const condLine = pub.match(/ var cond=([^;]*);/)[1];
    const stateExpr = pub.match(/state\.className='mud-state';state\.textContent=([\s\S]*?);\n/)[1];
    const show = new Function('type', 'it', 'place', 'goodsWorthText', 'var cond=' + condLine + '; return ' + stateExpr + ';');
    assert.equal(show('bench', { sealed: true, condWord: 'sound' }, 'lockbox', () => ''), 'sound', 'a sound chain in the box says so');
    assert.equal(show('bench', { sealed: true, condWord: 'sound', well: 'fat 2/3' }, 'lockbox', () => ''), 'fat 2/3, sound', 'a lantern in the box: its fat and its wear');
    assert.equal(show('bench', { condWord: 'sound' }, 'pack', () => ''), '', 'the pack is as it was');
    const gate = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    assert.match(gate, /: c\.itemId === LANTERN_ITEM \? \{ well: light\.wellCount\(c\.fuel \?\? 0\) \} : \{\}/, 'the server sends a put-away lantern its fat');
    const verbs = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(verbs, /if \(!holder && c\.itemId === LANTERN_ITEM\) tags\.push\(light\.wellCount\(c\.fuel \?\? 0\)\);/, 'and the typed lockbox list says it too');
  });

  check('a door box stands where its row says, not where the world last saved it (2026-11-03)', () => {
    const z = new ZoneDO({}, {});
    z.world = { rooms: new Map(), safeRooms: new Set(), entryRooms: new Set() };
    z.cacheRoom.set('box-glade', 'the-grey-lie');
    assert.equal(z.cacheRoomId({ id: 'box-glade', roomId: 'the-moon-glade' }), 'the-moon-glade', 'the casket is in the glade');
    z.cacheRoom.set('box-roams', 'somewhere');
    assert.equal(z.cacheRoomId({ id: 'box-roams', roomId: 'home' }), 'somewhere', 'a roaming chest keeps its saved spot');
  });

  check('a chest set on a gate roams its own country and never comes back to the doorstep (2026-11-06)', () => {
    const z = new ZoneDO({}, {});
    const room = (id, region) => [id, { id, region }];
    z.world = {
      rooms: new Map([room('the-slabs', 'mountain'), room('crag', 'mountain'), room('ledge', 'mountain'), room('lane', 'road'), room('nook', 'mountain')]),
      safeRooms: new Set(['nook']), entryRooms: new Set(['the-slabs']),
    };
    const locker = { id: 'slabs-locker', roomId: 'the-slabs' };
    for (let i = 0; i < 60; i++) {
      z.cacheRoom.delete(locker.id);
      assert.ok(['crag', 'ledge'].includes(z.cacheRoomId(locker)), 'a fresh chest lands on its own country, off the gate and the hideaway');
    }
    z.cacheRoom.set(locker.id, 'the-slabs');
    assert.ok(['crag', 'ledge'].includes(z.cacheRoomId(locker)), 'one the world saved on the gate moves off it');
    assert.notEqual(z.cacheRoom.get(locker.id), 'the-slabs', 'and the move is kept');
    z.cacheRoom.set(locker.id, 'ledge');
    assert.equal(z.cacheRoomId(locker), 'ledge', 'a chest already out on the ground stays until it is looted');
  });

  await checkAsync('a wanderer\'s aliases stand for one command, never hide a real one, and follow the key (2026-11-03)', async () => {
    const said = [], saved = [];
    const db = { prepare: (sql) => ({ bind: (...a) => ({ run: async () => { saved.push([sql, ...a]); } }) }) };
    const z = { env: { DB: db }, send: (_s, t) => said.push(t) };
    const me = { pubkey: 'me' };
    const run = async (t) => { said.length = 0; const took = await aliases.handle(z, me, t); return took ? said.join('\n') : null; };
    assert.equal(await run('attack rat'), null, 'an ordinary line is not the alias verb');
    assert.match(await run('alias'), /no aliases/, 'none to begin with');
    assert.equal(await run('alias kr = attack rat'), 'kr = attack rat');
    assert.deepEqual(saved.at(-1), ['UPDATE players SET aliases = ? WHERE pubkey = ?', '{"kr":"attack rat"}', 'me'], 'kept on the player row');
    assert.equal(aliases.expand(me, 'kr'), 'attack rat', 'the word becomes the command');
    assert.equal(aliases.expand(me, 'KR  now'), 'attack rat now', 'words after it carry on');
    assert.equal(aliases.expand(me, "'kr"), "'kr", 'speech is left alone');
    assert.equal(aliases.expand(me, 'say kr'), 'say kr', 'only the first word');
    await run('alias bb = kr');
    assert.equal(aliases.expand(me, 'bb'), 'kr', 'expanded once: an alias naming an alias is not followed');
    for (const w of ['n', 'look', 'k', 'i', 'attack', 'quit', 'keys', 'fullscreen', 'alias']) {
      assert.match(await run(`alias ${w} = wave`), /already a command/, `${w} stays the game's`);
    }
    assert.match(await run('alias fs = fullscreen'), /answered by your page/, 'a page word cannot be stood for');
    assert.match(await run('alias xx = alias kr'), /can't make or drop/);
    assert.match(await run('alias two words = wave'), /one word/);
    assert.match(await run('alias kr'), /^kr = attack rat$/, 'one alias read back');
    assert.match(await run('alias'), /bb = kr\n  kr = attack rat/, 'the list, sorted');
    assert.equal(await run('unalias kr'), "'kr' is gone.");
    assert.equal(aliases.expand(me, 'kr'), 'kr', 'a dropped alias is just a word again');
    assert.deepEqual([...aliases.unpack(aliases.pack(me.aliases))], [['bb', 'kr']], 'it packs and unpacks');
    const zsrc = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const at = zsrc.indexOf('frame.text = aliases.expand(session, frame.text);');
    assert.ok(at > 0 && at < zsrc.indexOf('if (this.outOfWorld(session)) {'), 'expanded before the gatehouse reads the line');
    assert.match(zsrc, /aliases: aliases\.unpack\(row\.aliases\),/, 'loaded with the wanderer');
  });

  await checkAsync('follow: fall in behind anyone, step after them, and stop only by choice or by walking off alone (2026-11-03)', async () => {
    const said = [];
    const luna = { pubkey: 'luna', name: 'Lunapilot', roomId: 'moor', hp: 100 };
    const me = { pubkey: 'me', name: 'Rome', roomId: 'moor', hp: 100 };
    const z = {
      sessions: new Map([['luna', luna], ['me', me]]),
      send: (s, t) => said.push([s.pubkey, t]), sendStatus() {},
      reachable: () => true, outOfWorld: () => false, inCombat: (s) => !!s.fighting,
      world: { exits: new Map(), rooms: new Map() },
      knownPaths: new Map(),
    };
    follow.cmdFollow(z, me, 'luna');
    assert.equal(me.following, 'luna', 'no leave asked');
    assert.deepEqual(said.slice(-2), [['me', 'You fall in behind Lunapilot.'], ['luna', 'Rome falls in behind you.']], 'and the leader is told once');
    luna.roomId = 'north-moor';
    assert.equal(follow.followRead(z, me), '', 'a look shows it only while they stand together');
    luna.roomId = 'moor';
    assert.equal(follow.followRead(z, me), 'They keep close behind Lunapilot.');
    for (const [why, set, unset] of [['fighting', () => { me.fighting = true; }, () => { me.fighting = false; }], ['resting', () => { me.resting = true; }, () => { me.resting = false; }], ['at the counter', () => { me.away = true; }, () => { me.away = false; }]]) {
      set(); said.length = 0;
      await follow.after(z, luna, 'moor', 'north');
      assert.equal(said.length, 0, `${why}: no step`);
      assert.equal(me.following, 'luna', `${why}: still following`);
      unset();
    }
    me.pose = 'crouch';
    said.length = 0;
    await follow.after(z, luna, 'moor', 'north');
    assert.equal(said[0][1], 'You follow Lunapilot north.', 'the step is taken behind them');
    assert.match(said[1][1], /There is no way north/, 'through cmdGo, meeting the same refusals as a typed step');
    assert.equal(me.pose, undefined, 'a posture does not survive the step');
    assert.equal(me.following, 'luna', 'a step you could not take leaves you following');
    follow.walkedAlone(z, me);
    assert.equal(me.following, undefined, 'a room entered alone ends it');
    follow.cmdFollow(z, me, 'luna');
    said.length = 0;
    follow.cmdFollow(z, me, '');
    assert.equal(me.following, undefined, "'follow' alone ends it");
    assert.deepEqual(said, [['me', 'You stop following Lunapilot.']]);
    const vsrc = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(vsrc, /session\.roomId = exit\.to_room;\n  if \(!led\) follow\.walkedAlone\(z, session\);/, 'cmdGo ends a follow on a step of your own, as it lands');
    assert.match(vsrc, /z\.markSimDirty\(\);\n  await follow\.after\(z, session, from, dir\);[^\n]*\n\}/, 'and brings followers after a completed step');
    assert.match(readFileSync(new URL('../src/follow.ts', import.meta.url), 'utf8'), /await cmdGo\(z, s, dir, true\);/, 'a step behind someone is led');
    assert.deepEqual(parse('follow the luna'), { verb: 'follow', arg: 'luna' });
    assert.deepEqual(gatehouseHeard('follow me lads'), { say: 'follow me lads' }, "by the fire 'follow me' is said");
  });

  check('emotes open with the wanderer\'s name, read as plain narration like wave, and must be seen (2026-11-03)', () => {
    assert.equal(emoteLine('Rome', 'crouches   by the fire'), 'Rome crouches by the fire');
    assert.equal(emoteLine('Rome', "'s eyes narrow"), "Rome's eyes narrow", 'a possessive joins the name');
    assert.ok(emoteLine('Rome', 'waits ' + 'a'.repeat(400)).length <= 'Rome '.length + 240, 'as long as a said line');
    // IT READS AS A SENTENCE (rome, 2026-11-03): typed like a command, read like prose.
    assert.equal(emoteLine('Gloambrook', 'hug iron', ['Irongate', 'Lunapilot']), 'Gloambrook hugs Irongate', 'the verb takes its s, a short name becomes the whole one');
    assert.equal(emoteLine('Irongate', 'jump'), 'Irongate jumps');
    assert.equal(emoteLine('Irongate', 'look up'), 'Irongate looks up');
    assert.equal(emoteLine('Irongate', 'looks up'), 'Irongate looks up', 'already right is left alone');
    assert.equal(emoteLine('Irongate', 'kiss luna', ['Lunapilot']), 'Irongate kisses Lunapilot');
    assert.equal(emoteLine('Irongate', 'cry'), 'Irongate cries');
    assert.equal(emoteLine('Irongate', 'play'), 'Irongate plays');
    assert.equal(emoteLine('Irongate', 'slowly nod'), 'Irongate slowly nods', 'an adverb hands the s on');
    assert.equal(emoteLine('Irongate', 'have a drink'), 'Irongate has a drink');
    assert.equal(emoteLine('Irongate', 'hug luna!', ['Lunapilot']), 'Irongate hugs Lunapilot!', 'its own ending is kept');
    assert.equal(emoteLine('Irongate', 'jump'), 'Irongate jumps', 'and none is added (rome, 2026-11-03)');
    assert.equal(emoteLine('Lunapilot', 'polish the iron', ['Irongate']), 'Lunapilot polishes the iron', 'after the, a, my: a thing, not a name');
    assert.equal(emoteLine('Lunapilot', 'wave at iron', ['Irongate']), 'Lunapilot waves at Irongate');
    assert.deepEqual(parse('emote Wipes THE blade'), { verb: 'emote', arg: 'Wipes THE blade' }, 'the words as typed');
    const said = [], fed = [];
    let lit = true, fog = false;
    const me = { pubkey: 'me', name: 'Rome', roomId: 'moor' };
    const z = { send: (s, t, c, sp) => said.push([t, c, sp]), roomFeed: (...a) => fed.push(a), litFor: () => lit, events: new Map(), world: { rooms: new Map() }, sessions: new Map() };
    cmdEmote(z, me, 'wipes the blade');
    assert.deepEqual(said.at(-1), ['Rome wipes the blade', undefined, undefined], 'the doer sees it as narration, not speech');
    assert.deepEqual(fed.at(-1), ['moor', 'Rome wipes the blade', 'me', false], 'the room the same way wave reaches it (2026-11-03)');
    lit = false; fed.length = 0;
    cmdEmote(z, me, 'wipes the blade');
    assert.equal(fed.length, 0, 'in the dark nobody sees it');
    assert.match(said.at(-1)[0], /too dark/);
    const vsrc = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(vsrc, /if \(events\.foggy\(z, session\.roomId\)\) return z\.send\(session, "The fog is too thick here for anyone to see it\."\);/, 'nor in the fog');
    const gsrc = readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8');
    // by the fire too, and plain there as dance is, not painted as speech (rome, 2026-11-05)
    assert.match(gsrc, /\n    z\.send\(session, line\);\n    return gatehouseFeed\(z, line, session\.pubkey\);\n  \}/, 'by the fire too, as plain narration');
    assert.doesNotMatch(gsrc.slice(gsrc.indexOf('if (v === "emote")'), gsrc.indexOf('if (v === "carve"')), /"say"/, 'never sent as speech');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub.match(/var SPEECH_VERBS = [^\n]*/)[0], /emote: 1/, 'the page does not echo it twice');
    assert.match(pub, /  alias: 1, unalias: 1,\n\};/, 'alias echoes as a command by the fire');
  });

  check('every command goes through in the gatehouse: none turns into speech unless meant to, and every one has a handler (2026-11-03)', () => {
    // Said, not run, by design: speech itself, follow (no ways out of the
    // gatehouse), what can only be done out in the dungeon (2026-11-07; `get` is
    // still run, for your own carving, and said if it is not that), and the
    // no-argument verbs with words after them (a sentence).
    const SAID = new Set(['say', 'follow', ...[...GATEHOUSE_BARRED].filter((v) => v !== 'get')]);
    const failures = [];
    for (const [word, verb] of Object.entries(VERB_ALIASES)) {
      const bare = gatehouseHeard(word);
      if (SAID.has(verb)) { if (!('say' in bare)) failures.push(`${word}: should be said`); continue; }
      if ('say' in bare) failures.push(`'${word}' was said, not run`);
      else if (bare.cmd.verb !== verb && bare.cmd.verb !== 'go') failures.push(`'${word}' ran ${bare.cmd.verb}`);
      const arg = verb === 'carve' ? 'rock' : verb === 'fill' ? 'lantern' : 'wolf';
      const withArg = gatehouseHeard(`${word} ${arg}`);
      const sentence = GATEHOUSE_NOARG.has(verb) && verb !== 'carve'; // carve rock is the carving
      if (sentence && !('say' in withArg)) failures.push(`'${word} ${arg}' should be a sentence`);
      if (!sentence && 'say' in withArg) failures.push(`'${word} ${arg}' was said, not run`);
    }
    assert.deepEqual(failures, [], 'gatehouse routing');
    assert.deepEqual(gatehouseHeard('emote hugs Luna'), { cmd: { verb: 'emote', arg: 'hugs Luna' } }, 'an emote is run, words as typed');
    assert.ok('say' in gatehouseHeard('hello there'), 'and words that are no command are said');
    assert.ok('say' in gatehouseHeard('carve my name in the table') && 'cmd' in gatehouseHeard('carve rock'), 'carve: the wall bare, the carving with a rock, else a sentence');
    // ...and nothing falls on the floor: every verb the parser knows has a case
    // in the world's dispatch, which is where the gatehouse hands on whatever
    // it does not answer itself.
    const zsrc = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const disp = zsrc.slice(zsrc.indexOf('public async dispatch('), zsrc.indexOf('\n  }\n', zsrc.indexOf('public async dispatch(')));
    const orphans = [...new Set(Object.values(VERB_ALIASES))].filter((v) => !disp.includes(`case "${v}"`));
    assert.deepEqual(orphans, [], 'every verb has a handler');
  });

  check('look sky says the hour the picture is showing, and nobody calls the sky a lid (2026-11-05)', () => {
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    const zd = readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8');
    // a quiet day asked about its sky gets its band; a night gets the night's sky in front of the moon
    assert.match(ev, /return SKY_HOURS\[skyBand\(\)\]! \+ \(cometNight\(\) \? " " \+ NIGHT_COMET : ""\);/, 'the day answers by its band (and its comet)');
    assert.match(ev, /if \(isNight\(\)\) return `\$\{SKY_NIGHT\} /, 'the night describes its sky before the moon');
    const hours = zd.match(/export const SKY_HOURS = \[([\s\S]*?)\n\];/)[1].split('\n').filter((l) => l.trim().startsWith('"'));
    assert.equal(hours.length, 5, 'dawn, morning, midday, afternoon, dusk');
    assert.match(hours[0], /^\s*"Dawn\./); assert.match(hours[0], /gold/);
    assert.match(hours[4], /^\s*"Dusk\./); assert.match(hours[4], /orange/);
    for (const h of hours.slice(1, 4)) { assert.match(h, /blue/, 'the day sky is blue, as painted'); assert.match(h, /white clouds/, 'with white cloud drifting over it'); }
    // the old conceit is out of everything a player reads about the sky
    for (const name of ['SUN_LOW', 'SUN_LOW_NIGHT', 'SKY_HOURS']) {
      const block = zd.match(new RegExp('export const ' + name + ' = \\[([\\s\\S]*?)\\n\\];'))[1];
      assert.doesNotMatch(block, /\blid\b/, name + ' has no lid in it');
    }
    for (const name of ['STARS_NIGHT', 'STARS_DAY', 'SKY_CLEAR', 'STARS_CLEAR', 'SKY_NIGHT'])
      assert.doesNotMatch(zd.match(new RegExp('export const ' + name + ' = "[^\\n]*'))[0], /\blid\b/, name + ' has no lid in it');
  });

  check('a covered spell is the grey sky in the picture and in the words, never a starry one (2026-11-05)', () => {
    const z = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    const zu = readFileSync(new URL('../src/zone-util.ts', import.meta.url), 'utf8');
    // one rule for both: the lid shut, less the full moon that shows through
    assert.match(zu, /export function skyCovered\(now = Date\.now\(\)\): boolean \{\n  return !lidOpen\(now\) && !\(isNight\(now\) && isFullMoon\(now\)\);/);
    // the picture: a covered spell is drawn as the after-rain sky at its hour
    assert.match(z, /\|\| !!\(seesOut \? events\.rainNextDoor\(this, roomId\) : events\.rainNearby\(this, roomId\)\) \|\| skyCovered\(\);/, 'the page is sent the grey sky');
    // the words: look sky says the cloud has it, ahead of the stars and the moon
    const i = ev.indexOf('if (skyCovered() &&'), j = ev.indexOf('if (isNight()) return `${SKY_NIGHT}');
    assert.ok(i > 0 && i < j, 'the covered line answers before the starry night');
    assert.match(ev.slice(i, j), /SKY_COVERED\[isNight\(\) \? 3 : isDawn\(\) \? 0 : isDusk\(\) \? 2 : 1\]/);
  });

  check('reveille and taps are heard as well as read, and the watchman calls the hour without the bugle (2026-11-05)', () => {
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const z = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const bugle = ev.slice(ev.indexOf('function tickBugle('), ev.indexOf('\n}\n', ev.indexOf('function tickBugle(')));
    assert.match(bugle, /z\.roomFeed\(roomId, inKeep \? call : BUGLE_FAR, undefined, false, "evt", undefined, undefined, "bugle"\);/, 'the call carries the bugle sound');
    const far = pub.slice(pub.indexOf('var FAR = {'), pub.indexOf('\n};', pub.indexOf('var FAR = {')));
    assert.match(far, /\n  bugle: function \(t, o\) \{ VOX\.voc\(t, \{ f: \[\[0, 185\], \[1\.0, 178\]\]/, 'the client has the bugle, the same two notes');
    assert.doesNotMatch(far, /\n  watch: function/, 'and no sound left under the old name');
    assert.doesNotMatch(z, /pick\(WATCH_CALLS\), "evt", true, "/, 'the watchman calls the hour in his own voice, not the bugle');
  });

  check('on a red night each look gets its own answer: sky, clouds, stars and moon are not one line (2026-11-05)', () => {
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    const i = ev.indexOf('if (isNight() && isBloodMoon()) {'), red = ev.slice(i, ev.indexOf('\n  }\n', i));
    assert.ok(i > 0, 'the red night reads the word it was asked');
    assert.match(red, /return BLOOD_MOON_STARS;/); assert.match(red, /return BLOOD_MOON_CLOUDS;/); assert.match(red, /return BLOOD_MOON_SKY;/);
    assert.match(red, /if \(!\/\^sun\$\/\.test\(w\)\) return pick\(BLOOD_MOON_LINES\);/, 'the moon keeps its line, the sun its own');
    assert.doesNotMatch(ev, /if \(isNight\(\) && isBloodMoon\(\)\) return pick\(BLOOD_MOON_LINES\);/, 'no single answer for everything');
  });

  check('every event answers each look at the sky on its own terms: the eclipse, the hill\'s stars, and nothing on the ground posing as the sky (2026-11-05)', () => {
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    const look = ev.slice(ev.indexOf('export function skyLook('), ev.indexOf('// Ambience while the sky is doing something'));
    // the eclipse: stars, moon and clouds each their own in totality
    assert.match(look, /return ecl === "active" \? ECLIPSE_STARS : STARS_DAY;/);
    assert.match(look, /return ecl === "active" \? ECLIPSE_MOON : MOON_DAY;/);
    assert.match(look, /return ECLIPSE_CLOUDS;/);
    // the mountain's stars are the mountain's
    assert.match(look, /highGround \? STARS_HILL :/);
    // the ground's events answer look weather, never look sky or look clouds
    for (const g of ['switch (phaseOf(z, "scree"))', 'switch (phaseOf(z, "mast"))', 'crabs !== "idle"', 'eelRunOn(z, roomId)', 'wrackIn(z, roomId)', 'frozen(z, roomId)', 'fenUp(z, roomId)']) {
      const at = look.indexOf(g);
      assert.ok(at > 0, g);
      assert.match(look.slice(Math.max(0, at - 70), at), /groundAsk/, g + ' answers only look weather');
    }
  });

  check('the night extras are on the same nights in the words and the picture (2026-11-11)', () => {
    // The page draws the northern lights and the comet on their own nights, and
    // the stars turning and falling on every night it draws stars; the room's
    // words must name exactly those, under exactly those skies.
    const src = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const grab = (name) => { const i = src.indexOf('function ' + name + '('); return src.slice(i, src.indexOf('\n', i) + 1); };
    const num = (n) => Number((src.match(new RegExp('SKY_' + n + ' = (\\d+)')) || [])[1]);
    const hash = (() => { const i = src.indexOf('function skyDayHash('); return src.slice(i, src.indexOf('\n}\n', i) + 2); })();
    const page = new Function('SKY_AURORA_EVERY', 'SKY_COMET_EVERY', 'SKY_COMET_NIGHTS', hash + grab('skyAuroraNight') + grab('skyCometNight') +
      'return [skyAuroraNight, skyCometNight];')(num('AURORA_EVERY'), num('COMET_EVERY'), num('COMET_NIGHTS'));
    let au = 0, co = 0;
    for (let d = 0; d < 2100; d++) {
      const night = d * DAY_CYCLE_MS + DAY_CYCLE_MS * .75, said = nightExtras(night);
      assert.equal(page[0](d), auroraNight(d), 'day ' + d + ': aurora agrees');
      assert.equal(page[1](d), cometNight(d), 'day ' + d + ': comet agrees');
      assert.equal(said.includes(NIGHT_AURORA), page[0](d), 'day ' + d + ': the words name the aurora on its nights only');
      assert.equal(said.includes(NIGHT_COMET), page[1](d), 'day ' + d + ': the words name the comet on its nights only');
      assert.ok(said.startsWith(NIGHT_STARS_TURN));
      if (page[0](d)) au++; if (page[1](d)) co++;
    }
    assert.ok(au > 150 && au < 320, au + ' aurora nights');
    assert.ok(co > 180 && co < 260, co + ' comet nights');
    // drawn in the game, not only when the preview asks
    assert.match(src, /var tnAurora = SKY_FX\.aurora \|\| skyAuroraNight\(skyRoll\), tnComet = SKY_FX\.comet \|\| skyCometNight\(skyRoll\);/);
    assert.match(src, /var turning = fxNight, /);
    // the comet still, or it is carried off the sky; behind the clouds, as the rest of the sky (2026-11-11)
    const cAt = src.indexOf('if (!lay.path && tnComet) drawComet(c, w * .3, h * .2,'), clAt = src.indexOf('if (row) c.drawImage(row, x0, top, tw * copies, th);');
    assert.ok(cAt > 0 && cAt < clAt, 'the comet is drawn before the clouds, behind them');
    assert.equal((src.match(/\bdrawComet\(c, (?!x, y, B\))/g) || []).length, 1, 'drawn in one place only');
    // ...and by day too, said under the open day skies that draw it (rome, 2026-11-11)
    assert.match(readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8'), /if \(\(daySky === "day" \|\| daySky === "dawn" \|\| daySky === "dusk"\) && cometNight\(\)\) lines\.push\(LORE_LINE \+ NIGHT_COMET\);/);
    for (const k of ['day', 'dawn', 'dusk']) assert.ok(new RegExp('var ' + k + ' = \\{ far: "' + k + '-far"').test(src), k + ' is a layered sky (no path)');
    assert.match(src, /var fxNight = lay\.stars > 0 && !lay\.path;/);
    // ...and said only under the skies that draw them: night, moon, blood
    const zsrc = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zsrc, /const starry = starSky === "night" \|\| starSky === "moon";/);
    assert.match(zsrc, /if \(starry \|\| starSky === "blood"\) \{ const ex = events\.nightExtras\(Date\.now\(\), !starry\); if \(ex\) lines\.push\(LORE_LINE \+ ex\); \}/);
    // the stars are the sky as it is: said in the night line itself, not a line of their own
    assert.match(zsrc, /starry \? "A full moon rides high and white among the slowly wheeling stars/);
    assert.match(zsrc, /: starry\n\s+\? \(this\.carriesLight\(session\)\n\s+\? "Night's fully down and the sky over you is open and black, the stars wheeling slowly round in it/);
    assert.ok(!nightExtras(0, false).includes(NIGHT_STARS_TURN), 'no stars line beside the night line');
    for (const k of ['night', 'moon', 'blood', 'eclipse']) assert.ok(new RegExp('^  ' + k + ': \\{.*stars: [1-9]', 'm').test(src), k + ' draws stars');
    assert.match(src, /eclipse: \{[^\n]*path: "eclipse"/, 'the eclipse sky never takes the extras');
  });

  check('the clear day is the same day in the words and the picture (2026-11-04)', () => {
    // The page draws a sky with no cloud on its own day count; the world says the
    // lid is off on its own. Both must name the same days, or the words lie.
    const src = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const grab = (name) => { const i = src.indexOf('function ' + name + '('); return src.slice(i, src.indexOf('\n}\n', i) + 2); };
    const every = Number((src.match(/var SKY_CLEAR_EVERY = (\d+);/) || [])[1]);
    const page = new Function('SKY_CLEAR_EVERY', 'SKY_BACK_PACE', grab('skyDayHash') + grab('skyCloudSets') + grab('skyCloudsTonight') +
      'return function (d, list) { skyRoll = d; return skyCloudsTonight(list); }; var skyRoll;')(every, .55);
    const list = [['a', [1, 1]], ['b', [1, 1]], ['c', [1, 1]], ['d', [1, 1]]];
    let clear = 0;
    const DAYS = 2100;
    for (let d = 0; d < DAYS; d++) {
      const noon = d * DAY_CYCLE_MS + DAY_CYCLE_MS / 4;
      const pageClear = page(d, list).set.length === 0;
      assert.equal(pageClear, skyClear(noon), 'day ' + d + ': page and world agree');
      if (pageClear) { clear++; assert.ok(lidOpen(noon) && lidOpen(d * DAY_CYCLE_MS + DAY_CYCLE_MS * .75), 'no lid on a clear day or its night'); }
    }
    // about one day in seven, at random (rome: one in seven, not every seventh)
    assert.ok(Math.abs(clear - DAYS / SKY_CLEAR_EVERY) < DAYS / SKY_CLEAR_EVERY * .2, clear + ' clear of ' + DAYS);
    let fixed = 0; for (let d = 0; d + 7 < DAYS; d++) if ((page(d, list).set.length === 0) === (page(d + 7, list).set.length === 0) && page(d, list).set.length === 0) fixed++;
    assert.ok(fixed < clear * .5, 'not on a weekly clock');
    // ...and every cloudy look still comes up: 10 sets each way
    const seen = new Set();
    for (let d = 0; d < DAYS; d++) { const c = page(d, list); if (c.set.length) seen.add(c.set.map((s) => s[0][0]).join('+') + c.dir); }
    assert.equal(seen.size, 20, 'every set, both ways');
  });

  await checkAsync('rotten food rots to nothing in the pack and in store, but not in the cold or forever-keeping food (2026-11-04)', async () => {
    const H = 3600, now = Math.floor(Date.now() / 1000);
    const tmpl = new Map([['raw-meat', { name: 'a hunk of raw meat', edible: 1 }], ['hardtack', { name: 'hardtack', edible: 1 }], ['knife', { name: 'a knife' }]]);
    const deleted = [];
    const DB = { prepare: (q) => ({ bind: (...a) => ({ run: async () => { if (/DELETE/.test(q)) deleted.push(a[0]); }, all: async () => ({ results: rows }) }) }) };
    let rows = [];
    const sent = [];
    const s = { items: [
      { rowId: 'old', itemId: 'raw-meat', acquiredAt: now - 5 * H },
      { rowId: 'rotten', itemId: 'raw-meat', acquiredAt: now - 3 * H },
      { rowId: 'keeps', itemId: 'hardtack', acquiredAt: now - 50 * H },
      { rowId: 'tool', itemId: 'knife', acquiredAt: now - 50 * H },
    ] };
    const z = { sessions: new Map([['p', s]]), world: { itemTemplates: tmpl }, env: { DB }, send: (_, m) => sent.push(m), sendStatus() {}, sendCtx() {} };
    assert.ok(!foodGone(now - 3 * H) && foodGone(now - 4 * H), 'gone at four hours');
    await tickFoodRot(z);
    assert.deepEqual(s.items.map((c) => c.rowId), ['rotten', 'keeps', 'tool'], 'only the food past rotten goes from the pack');
    assert.deepEqual(deleted, ['old']);
    assert.match(sent[0], /rotted to nothing/);
    assert.ok(rottedAway(z, 'raw-meat', now - 5 * H, 'lockbox') && rottedAway(z, 'raw-meat', now - 5 * H, 'vault'), 'it rots in the lockbox and vault');
    assert.ok(!rottedAway(z, 'raw-meat', now - 5 * H, 'cold'), 'the cold keeps it');
    rows = [{ id: 'v1', item_id: 'raw-meat', acquired_at: now - 5 * H }, { id: 'v2', item_id: 'raw-meat', acquired_at: now - H }];
    setRottedAway((i, a, c) => rottedAway(z, i, a, c));
    const held = await loadContainer(DB, 'p', 'vault');
    setRottedAway(null);
    assert.deepEqual(held.map((c) => c.rowId), ['v2'], 'a store read leaves the rotted row out');
    assert.ok(deleted.includes('v1'), 'and deletes it');
  });

  check('the eclipse and the full moon say what the sky draws (2026-11-04)', () => {
    // Totality draws a night-blue sky with stars and the sun as a black disc in a
    // ring of light. The words had a lid gone black and no sun to look at.
    for (const line of [...ECLIPSE_TOTAL_LINES, ...ECLIPSE_SUN_LINES]) {
      assert.ok(!/lid (has )?gone black|no sun to look at/i.test(line), 'eclipse line drawn for an old sky: ' + line);
      assert.ok(/black/i.test(line) && /\b(ring|rim)\b/i.test(line), 'eclipse line names the black sun and its ring: ' + line);
    }
    // The full moon crosses the night (MOON_ARC is added after it), so the phase
    // line cannot also say where it stands.
    for (const arc of MOON_ARC) assert.ok(!/\b(high|low|holding still)\b/i.test(MOON_SKY[0]), 'full moon placed twice: ' + MOON_SKY[0] + arc);
  });

  check('the blood moon grades the plate and keeps the lanterns and the torch (2026-11-05)', () => {
    // The red is a grade on the night plate, as the rain after dark is; the
    // lantern flicker is the effects layer, which stops under any tint it does
    // not list; and a torch is the torch plate's light laid over the red ground
    // through its light map, as at dawn, so the red stays with a torch lit.
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const ngt = pub.match(/var NO_GROUND_TINT = \{([^}]*)\}/)[1];
    assert.ok(!/blood/.test(ngt), 'the blood moon is kept off the ground');
    assert.match(pub, /#scene\.t-blood \{ filter:[^}]*hue-rotate\(-/, 'the plate has a red grade');
    assert.ok(!/#scene\.t-blood::after/.test(pub), 'no wash over the plate');
    assert.match(pub.match(/var FX_UNDER_TINT = \{([^}]*)\}/)[1], /\bblood: 1/, 'the lanterns keep flickering under the red');
    const torch = pub.match(/if \(lit && hour === "blood" && \w+ === "night"[^\n]*\n\s*dawnTorch = /g) || [];
    assert.equal(torch.length, 3, 'a torch under the blood moon lays its light over the red ground (room, gate, terrain)');
  });

  check('a new picture takes its grade at once, not over the hour fade (2026-11-05)', () => {
    // The blood moon's red faded on leaving the gatehouse and off going in: the
    // plate's filter transition, meant for the hour turning in place, ran on
    // every step into another picture.
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /var newPicture = scene !== scenePainted/, 'a step into another picture is known');
    assert.match(pub, /if \(newPicture && sceneEl\.style\) \{\s*sceneEl\.style\.transition = "none";\s*sceneEl\.className = /, 'and its grade goes on with no fade');
  });

  check('a deploy rebuild never puts a wanderer back where an old copy stood (2026-11-05)', () => {
    // After a deploy the world rebuilt a player from its own copy of the body,
    // a day old, over the player row saved minutes before: he stood where he
    // had been the day before until a refresh read the row.
    const now = Date.now(), row = { last_seen: Math.floor(now / 1000) };
    const old = { savedAt: now - 24 * 3600 * 1000, roomId: 'yesterday' };
    const live = { savedAt: now - 3000, roomId: 'today' };
    assert.equal(bodyNewerThanSave(old, row), undefined, 'a day-old copy is not used');
    assert.equal(bodyNewerThanSave(live, row), live, 'a copy written moments before the save is');
    assert.equal(bodyNewerThanSave({ savedAt: now + 4000 }, row)?.savedAt, now + 4000, 'and one written after it');
    const src = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    const hyd = src.slice(src.indexOf('private async hydrateSessions'), src.indexOf('async webSocketMessage'));
    assert.match(hyd, /const body = bodyNewerThanSave\(this\.bodyJournal\.get\(pubkey\), row\);/, 'a live socket is rebuilt only from a copy newer than the save');
    const build = src.slice(src.indexOf('private buildSession('), src.indexOf('private buildSession(') + 600);
    assert.match(build, /const pending = bodyNewerThanSave\(this\.bodyJournal\.get\(row\.pubkey\), row\);/, 'a fresh connect never builds a wanderer from a left copy older than the save');
    assert.match(hyd, /if \(!bodyNewerThanSave\(body, row\)\) \{\s*this\.bodyJournal\.delete\(body\.pubkey\);\s*await this\.state\.storage\.delete\("body:" \+ body\.pubkey\);\s*continue;/, 'and an old left-over copy is dropped, never written back over the save');
  });

  check('the walked maps are one row per player, and a step rewrites only that player (2026-11-05)', () => {
    // b:walked held all 44 players' maps in one 240KB row, rewritten whenever
    // anyone first stood somewhere new.
    const rows = new Map(), written = [];
    const storage = { sql: { exec(q, ...a) {
      if (/^SELECT k, v FROM sim_kv/.test(q)) return [...rows].map(([k, v]) => ({ k, v }));
      if (/^INSERT INTO sim_kv/.test(q)) { rows.set(a[0], a[1]); written.push(a[0]); return []; }
      if (/^DELETE FROM sim_kv/.test(q)) { rows.delete(a[0]); return []; }
      return [];
    } }, transactionSync(fn) { fn(); } };
    // A world saved before this split: one b:walked row, and meta already stripped.
    rows.set('b:meta', JSON.stringify({}));
    rows.set('b:walked', JSON.stringify({ walked: { a: ['r1', 'r2'], b: ['r3'] }, wallMarks: { a: ['r1'] } }));
    let cache = newCache();
    const state = loadSim(storage, cache);
    assert.deepEqual(state.walked, { a: ['r1', 'r2'], b: ['r3'] }, 'the old row is read at the crossover');
    saveSim(storage, state, cache);
    assert.ok(!rows.has('b:walked'), 'the old one-row block is swept');
    assert.deepEqual(JSON.parse(rows.get('b:walk:a')), { walked: ['r1', 'r2'], wallMarks: ['r1'] }, 'a has a row of their own');
    assert.deepEqual(JSON.parse(rows.get('b:walk:b')), { walked: ['r3'], wallMarks: [] }, 'and so does b');
    // One player steps somewhere new: only that row is written.
    state.walked.b = ['r3', 'r4'];
    cache.walkedWroteAt = 0; written.length = 0;
    saveSim(storage, state, cache);
    assert.deepEqual(written.filter((k) => k.startsWith('b:walk')), ['b:walk:b'], 'only the walker is rewritten');
    // A fresh load reads every player back from their own rows.
    cache = newCache();
    const back = loadSim(storage, cache);
    assert.deepEqual(back.walked, { a: ['r1', 'r2'], b: ['r3', 'r4'] }, 'every walk comes back');
    assert.deepEqual(back.wallMarks, { a: ['r1'] }, 'and every wall mark');
    written.length = 0;
    saveSim(storage, back, cache);
    assert.deepEqual(written.filter((k) => k.startsWith('b:walk')), [], 'and nothing is rewritten that did not move');
  });

  check('a room waits for every layer of its sky before it shows (2026-11-05)', () => {
    // Stepping out of the gatehouse the first time, the room came in with a
    // blank sky: a layered sky shows its far sky, disc and clouds, and the room
    // waited only for the named picture, which a layered sky never shows.
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /var skyParts = skyLay \? \[skyLay\.far\]\.concat\(skyLay\.disc \? \[skyLay\.disc\] : \[\], \(skyLay\.clouds \|\| \[\]\)\.map\(/, 'the far sky, the disc and every cloud strip are the sky');
    assert.match(pub, /var waiting = 7 \+ Math\.max\(1, skyParts\.length\)/, 'the room counts each of them');
    assert.match(pub, /for \(var sp = 0; sp < skyParts\.length; sp\+\+\) readySceneImage\("\/sky\/" \+ skyParts\[sp\] \+ "\.webp\?v=" \+ SKY_V, loaded\);/, 'and waits for each before it paints');
  });

  check('a drake that was fought does not fall asleep while the fighter is off mending (2026-11-05)', () => {
    // A wanderer fought the drake, stepped back to heal, and came back to find it
    // asleep: it napped as soon as nobody was standing over it.
    const now = Date.now(), H = 60_000;
    const z = { world: { mobTemplates: new Map([['the-drake', { id: 'the-drake', max_hp: 150 }], ['the-pale-drake', { id: 'the-pale-drake', max_hp: 160 }]]) } };
    const drake = (o) => ({ id: 'd', templateId: 'the-drake', roomId: 'the-summit', hp: 150, grudges: [], nextWanderAt: 0, ...o });
    let d = drake({ hp: 90 }); fallAsleep(z, d, now);
    assert.ok(!d.asleep, 'still hurt: it stays up');
    d = drake({ grudges: [{ pk: 'luna', at: now - 10 * H }] }); fallAsleep(z, d, now);
    assert.ok(!d.asleep, 'whole again, but struck ten minutes ago: it stays up');
    d = drake({ templateId: 'the-pale-drake', hp: 160, grudges: [{ pk: 'luna', at: now - 5 * H }] }); fallAsleep(z, d, now);
    assert.ok(!d.asleep, 'the pale drake the same');
    d = drake({ grudges: [{ pk: 'luna', at: now - 31 * H }] }); fallAsleep(z, d, now);
    assert.ok(d.asleep, 'whole and left alone long enough, it can sleep again');
    const wolf = { id: 'w', templateId: 'hill-wolf', roomId: 'r', hp: 5, grudges: [{ pk: 'luna', at: now }], nextWanderAt: 0 };
    fallAsleep(z, wolf, now);
    assert.ok(wolf.asleep, 'nothing else changes');
  });

  check('the summit is warm while the rooms around it keep the cold (2026-11-05)', () => {
    // Its room says warm air; the game let the cold bite there like the rest of
    // the mountain. Warm, not snowless: the snow still lies on it.
    const now = Date.now(), H = 3_600_000;
    const z = { snowUntil: now + H, events: new Map([['cold', { phase: 'active', until: now + H }]]),
      world: { rooms: new Map([['the-summit', { region: 'mountain' }], ['the-summit-gate', { region: 'mountain' }]]) },
      regionOf: (r) => z.world.rooms.get(r)?.region ?? '' };
    assert.ok(snowed(z, 'the-summit'), 'the snow still lies on the summit when it lies on the mountain');
    assert.ok(!coldBites(z, 'the-summit'), 'the cold does not bite there');
    assert.ok(!wxCovers(z, 'cold', 'the-summit'), 'a cold snap does not reach it');
    assert.ok(snowed(z, 'the-summit-gate'), 'the gate below still lies under the snow');
    assert.ok(coldBites(z, 'the-summit-gate'), 'and is still cold');
  });

  check('the mountain snows while the pale drake lives, and not after (2026-11-05)', () => {
    const now = Date.now(), M = 60_000;
    const pale = { id: 'p', templateId: 'the-pale-drake', roomId: 'the-summit', hp: 160 };
    const z = { snowUntil: 0, creatures: new Map([['p', pale]]) };
    paleDrakeSnows(z, now);
    assert.ok(z.snowUntil > now, 'it brings the snow');
    paleDrakeSnows(z, now + 10 * M);
    assert.ok(z.snowUntil > now + 10 * M, 'and keeps it while it lives');
    z.creatures.delete('p');
    const last = z.snowUntil;
    paleDrakeSnows(z, now + 11 * M);
    assert.equal(z.snowUntil, last, 'dead, it holds the snow no longer');
    assert.ok(last < now + 13 * M, 'which runs out within minutes, and the melt follows');
    const plain = { snowUntil: 0, creatures: new Map([['d', { id: 'd', templateId: 'the-drake', hp: 150 }]]) };
    paleDrakeSnows(plain, now);
    assert.equal(plain.snowUntil, 0, 'the ordinary drake brings none');
    const ev = readFileSync(new URL('../src/events.ts', import.meta.url), 'utf8');
    assert.match(ev.slice(ev.indexOf('async function tickCold'), ev.indexOf('// THE MELT (8f)')), /paleDrakeSnows\(z, now\);/, 'the beat that keeps the snow asks after the pale drake');
  });

  await checkAsync('the sky cut takes the specks in the leaves and leaves purple on the land alone (2026-11-05)', async () => {
    const { keySky } = await import(new URL('./key-sky.mjs', import.meta.url));
    const SKY = [250, 2, 250], GAP = [180, 90, 190], FLOWER = [150, 90, 170], LAND = [90, 80, 60];
    const w = 60, h = 12, rows = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rows.push(y < 4 ? SKY : LAND);
    const at = (x, y) => y * w + x;
    for (const [x, y] of [[19, 1], [21, 1], [20, 0], [20, 2]]) rows[at(x, y)] = LAND; // leaves
    rows[at(20, 1)] = GAP;      // a blurred gap in them: not true sky, and not touching it
    rows[at(40, 10)] = FLOWER;  // out on the land, far from any sky
    rows[at(1, 10)] = SKY;      // a window: true sky with land all round it
    const data = new Uint8ClampedArray(w * h * 4);
    rows.forEach((c, i) => data.set([...c, 255], i * 4));
    keySky(data, w, h);
    const px = (x, y) => [...data.slice(at(x, y) * 4, at(x, y) * 4 + 4)];
    assert.equal(px(4, 0)[3], 0, 'the sky goes');
    assert.equal(px(20, 1)[3], 0, 'the gap in the leaves goes, no pink speck');
    assert.equal(px(1, 10)[3], 0, 'a window of true sky goes');
    assert.deepEqual(px(40, 10), [...FLOWER, 255], 'the flower stays, and keeps its colour');
    assert.deepEqual(px(40, 8), [...LAND, 255], 'the land is untouched');
  });

  check('the picture agrees with the words while an animal eats (2026-11-05)', () => {
    const now = Date.now();
    const chips = readFileSync(new URL('../src/chips.ts', import.meta.url), 'utf8');
    assert.match(chips, /ai\.eatingShown\(z, creature, now\)/, 'the sprite state asks what the words ask');
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zone, /eatingSeen !== \(creature\.eatingSeen \?\? ""\)[^\n]*refreshRoomCtx/, 'a meal starting or ending redraws the room');
    const z = { traces: new Map(), world: { mobTemplates: new Map() } };
    const v = { templateId: 'carrion-vulture', roomId: 'r', eatingIn: 'r', eatingUntil: now + 60000, eatingOn: 'carrion' };
    assert.equal(eatingShown(z, v, now), 'eat', 'a vulture at a carcass is eating');
    assert.equal(eatingShown(z, { ...v, eatingOn: 'graze' }, now), 'graze', 'a grazer grazes');
    assert.equal(eatingShown(z, { ...v, eatingUntil: now - 1 }, now), '', 'the meal over and nothing to eat, it is not eating');
    assert.equal(eatingShown(z, { ...v, eatingIn: 'elsewhere' }, now), '', 'it walked off its meal');
    z.traces.set('r', [{ kind: 'remains', label: 'a rat' }]);
    // 2026-11-08: a fed hill wolf beside a body read as lapping it and was drawn
    // feeding; standing by the dead is not eating them, in words or picture.
    assert.equal(eatingShown(z, { ...v, eatingUntil: 0 }, now), '', 'a scavenger beside remains with no meal on is drawn standing');
    const a = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.ok(!/lapping the bloodied stone clean|hunched low over a corpse/.test(a), 'and the words do not say it is eating either');
  });

  // 2026-11-05: bodies, chests and bags lie nearer than the standing line, but the
  // fog mix for that line was set on the whole row, so they read paler than the
  // clear ground around them.
  // 2026-11-07: taking the mix off bodies altogether left them sharp in the fog;
  // a body takes its own mix, measured at the thinner fog where it lies.
  check('what lies on the ground takes the fog where it lies, and the living still do', () => {
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    assert.match(pub, /#mobs \.mob\.dead \{ --mobfog: var\(--deadfog, \); \}/, 'bodies take the body mix');
    assert.match(pub, /<filter id="fogmixd"[^>]*><feColorMatrix id="fogmixdm"/, 'the body mix exists');
    assert.match(pub, /fogAtLine\(fogMask, deadLineOf\(line\)\)/, 'the body mix is measured where the body lies');
    assert.match(pub, /setProperty\("--deadfog", mxd \? "url\(#fogmixd\)" : ""\)/, 'the body mix is handed to the row');
    const src = pub.match(/function deadLineOf\(line\) \{[\s\S]*?\n\}/)[0];
    const deadLineOf = new Function('MAN_VH', src + '; return deadLineOf;')(42);
    for (const line of [40, 50, 55, 60]) assert.ok(deadLineOf(line) > line, 'a body lies forward of the standing line at ' + line);
    assert.ok(Math.abs(deadLineOf(55) - (55 + .9 * 16)) < 1e-9, 'as far forward as fitMobRow lays it');
    assert.match(pub, /put\(item, best, stood \? Number\(item\.el\.dataset\.depth\) \|\| 0 : forward \* \.9, true, i\)/, 'fitMobRow still lays bodies forward * .9');
    assert.doesNotMatch(pub, /mobsEl\.style\.filter = /, 'the mix is not set on the whole row');
    assert.match(pub, /mobsEl\.style\.setProperty\("--mobfog", mx \? "url\(#fogmix\)" : ""\)/, 'the living are mixed through the variable');
    const rules = pub.match(/#mobs\.t-[^{]*\.mob \{ filter:[^}]*\}/g);
    assert.ok(rules.length >= 14, 'the hour rules were found');
    for (const rule of rules) assert.match(rule, /var\(--mobfog, \);/, 'an hour rule cannot drop the fog from the living: ' + rule.slice(0, 60));
  });

  // 2026-11-06: the trial of random homes. A mountain line takes any fit room within
  // the reach of its own rows; the rat keeps the hamlet, and nothing is homed at a
  // gate, in a hideaway, on the drake's ground or behind a keyed door.
  check('mountain animals take random homes in their own reach, and the rat stays home', () => {
    const chain = ['gate', 'm1', 'm2', 'm3', 'm4', 'm5', 'the-summit-far'];
    const rooms = new Map([...chain, 'safe', 'kept', 'wood'].map((id) => [id, { id, region: id === 'wood' ? 'wood' : 'mountain' }]));
    const exits = new Map(chain.map((id, i) => [id, chain[i + 1] ? [{ to_room: chain[i + 1] }] : []]));
    exits.get('m1').push({ to_room: 'safe' }, { to_room: 'wood' });
    exits.get('m2').push({ to_room: 'kept', key_item: 'riddle-door' });
    const world = { rooms, exits, entryRooms: new Set(['gate']), safeRooms: new Set(['safe']),
      mobSpawns: [{ template_id: 'hill-fox', room_id: 'm2' }, { template_id: 'hill-fox', room_id: 'm4' }, { template_id: 'rat', room_id: 'm3' }, { template_id: 'rat', room_id: 'm5' }] };
    const z = { world, regionOf: (r) => r === 'gate' ? 'gate' : rooms.get(r).region };
    // 2026-11-08: no ceiling: from the nearest row upward, so lines do not all live low.
    assert.deepEqual(mountainHomes(z, 'hill-fox').sort(), ['m2', 'm3', 'm4', 'm5', 'the-summit-far'], 'from its nearest row upward, past no door, no ceiling');
    const got = new Set();
    for (let i = 0; i < 200; i++) got.add(rollDen(z, 'hill-fox', 'm2'));
    assert.deepEqual([...got].sort(), ['m2', 'm3', 'm4', 'm5', 'the-summit-far'], 'every fit room gets used, and nothing else');
    for (let i = 0; i < 50; i++) assert.equal(rollDen(z, 'rat', 'm3'), 'm3', 'the rat keeps its row');
    const herds = readFileSync(new URL('../src/herds.ts', import.meta.url), 'utf8');
    assert.match(herds, /band === "mountain" && MOUNTAIN_ROAMERS\.has\(line\) \? groups\.plan\(/, 'births go through the groups');
    assert.match(herds, /if \(plan\) groups\.join\(c, plan\)/, 'and the newborn takes its place');
    assert.ok(!/"rat"/.test(readFileSync(new URL('../src/zone-data.ts', import.meta.url), 'utf8').match(/export const MOUNTAIN_ROAMERS = new Set\(\[[^\]]*\]\)/)[0]), 'the rat is no roamer: the hamlet is its ground');
    world.mobSpawns.push({ template_id: 'hill-fox', room_id: 'wood' });
    for (let i = 0; i < 50; i++) assert.equal(rollDen(z, 'hill-fox', 'wood'), 'wood', 'off the mountain nothing changes');
  });

  check('mountain groups: chance and food place them, a wipe leaves a loner and fresh ground, hunger moves them', () => {
    const names = Array.from({ length: 24 }, (_, i) => `m${i}`);
    const rooms = new Map(['gate', ...names].map((id) => [id, { id, region: 'mountain' }]));
    const exits = new Map([...rooms.keys()].map((id) => [id, []]));
    const link = (a, b) => { exits.get(a).push({ to_room: b }); exits.get(b).push({ to_room: a }); };
    link('gate', 'm0');
    for (let i = 1; i < names.length; i++) link(names[i - 1], names[i]);
    const world = { rooms, exits, entryRooms: new Set(['gate']), safeRooms: new Set(),
      mobTemplates: new Map(), mobSpawns: [{ template_id: 'hill-wolf', room_id: 'm23' }, { template_id: 'hill-wolf', room_id: 'm22' }] };
    const nearby = (from, depth) => {
      const out = new Map([[from, 0]]), q = [from];
      for (const at of q) { const d = out.get(at); if (d < depth) for (const e of exits.get(at)) if (!out.has(e.to_room)) { out.set(e.to_room, d + 1); q.push(e.to_room); } }
      return out;
    };
    const mk = () => ({ world, nearby, regionOf: () => 'mountain', variantBase: new Map(), creatures: new Map(),
      groups: { at: 0, packs: {}, gone: {} }, noteCreaturesChanged() {} });
    const wolf = (z, id, extra = {}) => { const c = { id, templateId: 'hill-wolf', roomId: 'm20', home: 'm20', hunger: 0, ...extra }; z.creatures.set(id, c); return c; };
    const HOUR = 3_600_000, now = 1_000_000_000;

    // Ten steps from a gate is as near as a wolf settles, though its rows are far out.
    assert.equal(Math.min(...mountainHomes(mk(), 'hill-wolf').map((r) => Number(r.slice(1)))), 9, 'm9 is ten steps from the gate');

    // Mostly in company, some alone, and a group never past its size or off its one home.
    let alone = 0, placed = 0;
    for (let run = 0; run < 200; run++) {
      const z = mk();
      for (let i = 0; i < 8; i++) {
        const p = groupPlan(z, 'hill-wolf', now), c = wolf(z, `w${i}`);
        groupJoin(c, p);
        placed++;
        if (c.lone) { alone++; assert.equal(c.group, undefined); continue; }
        const g = z.groups.packs[c.group];
        assert.equal(c.home, g.home, 'a member lives at its group\'s home');
        assert.ok([...z.creatures.values()].filter((x) => x.group === c.group).length <= g.size, 'the group holds its size');
      }
    }
    assert.ok(alone / placed > 0.12 && alone / placed < 0.28, `about one in five goes alone, got ${alone / placed}`);

    // Food tips the odds and never decides them.
    const z2 = mk();
    for (let i = 0; i < 12; i++) z2.creatures.set(`r${i}`, { id: `r${i}`, templateId: 'rat', roomId: 'm11', hunger: 0 });
    const tally = new Map();
    for (let i = 0; i < 3000; i++) { const r = groupPickHome(z2, 'hill-wolf', now); tally.set(r, (tally.get(r) ?? 0) + 1); }
    assert.ok(tally.get('m11') > 1.5 * tally.get('m20'), 'the rats\' room is likelier than a room with no food');
    // 2026-11-10: every rat counted, so a dozen in one place pulled a wolf thirteen times as hard as bare ground and the packs lived in the hamlet
    assert.ok(tally.get('m11') < 2.6 * tally.get('m20'), `but a dozen rats only double it, got ${tally.get('m11') / tally.get('m20')}`);
    assert.equal(tally.size, 15, 'and every fit room still gets chosen');

    // A wiped group leaves one loner, and the next one settles elsewhere.
    const z3 = mk();
    z3.groups.packs.p = { line: 'hill-wolf', home: 'm15', size: 4, peak: 0 };
    const a = wolf(z3, 'a', { group: 'p', home: 'm15' }), b = wolf(z3, 'b', { group: 'p', home: 'm15' }), c3 = wolf(z3, 'c', { group: 'p', home: 'm15' });
    groupTick(z3, now);
    assert.equal(z3.groups.packs.p.peak, 3, 'the group is whole');
    z3.creatures.delete(b.id); z3.creatures.delete(c3.id);
    groupTick(z3, now + 60_000);
    assert.equal(a.group, undefined); assert.equal(a.lone, true, 'the last one goes on alone');
    assert.equal(z3.groups.packs.p, undefined, 'the group is finished');
    for (let i = 0; i < 300; i++) {
      const d = Math.abs(Number(groupPickHome(z3, 'hill-wolf', now + 120_000).slice(1)) - 15);
      assert.ok(d > 3, 'nothing new settles on the lost ground');
    }
    assert.ok([...Array(400)].some(() => groupPickHome(z3, 'hill-wolf', now + 7 * HOUR) === 'm15'), 'until it has lain empty a while');

    // A group that stays hungry gives up its ground together; a fed one stays.
    const z4 = mk();
    z4.groups.packs.q = { line: 'hill-wolf', home: 'm15', size: 4, peak: 3 };
    const hungry = ['x', 'y', 'w'].map((id) => wolf(z4, id, { group: 'q', home: 'm15', hunger: 80 }));
    groupTick(z4, now);
    groupTick(z4, now + HOUR);
    assert.equal(hungry[0].home, 'm15', 'hungry a while is not long enough');
    groupTick(z4, now + 2 * HOUR + 1000);
    const moved = hungry[0].home;
    assert.notEqual(moved, 'm15', 'it picked new ground');
    assert.ok(Math.abs(Number(moved.slice(1)) - 15) > 3, 'and not next door');
    assert.ok(hungry.every((c) => c.home === moved), 'all of it together');
    assert.equal(z4.groups.tally?.moved, 1, 'and beasts counts it as a home given up (2026-11-10: only homes that ran out their time were counted)');
    // 2026-11-10: still hungry, it drew a new home every two hours for ever; now it gives the new ground a game day
    const T0 = now + 2 * HOUR + 1000;
    groupTick(z4, T0 + 60_000);
    groupTick(z4, T0 + 3 * HOUR);
    assert.equal(hungry[0].home, moved, 'two more hungry hours do not move it again');
    groupTick(z4, T0 + 4 * HOUR + 60_000);
    assert.notEqual(hungry[0].home, moved, 'a game day after the last move, still hungry, it goes again');
    assert.equal(z4.groups.tally.moved, 2);
    const z5 = mk();
    z5.groups.packs.q = { line: 'hill-wolf', home: 'm15', size: 4, peak: 3 };
    const fed = ['x', 'y', 'w'].map((id) => wolf(z5, id, { group: 'q', home: 'm15', hunger: 10 }));
    groupTick(z5, now); groupTick(z5, now + 3 * HOUR);
    assert.equal(fed[0].home, 'm15', 'a fed group stays put');

    // Nothing stays for good: 2-5 game days of 4 hours, a well-fed one a game day more.
    const GAME = 4 * HOUR;
    const z7 = mk();
    z7.groups.packs.q = { line: 'hill-wolf', home: 'm15', size: 4, peak: 3 };
    const stay = ['x', 'y', 'w'].map((id) => wolf(z7, id, { group: 'q', home: 'm15', hunger: 80 }));
    groupTick(z7, now);
    const due = z7.groups.packs.q.moveAt;
    assert.ok(due >= now + 2 * GAME && due <= now + 5 * GAME, 'the clock is two to five game days');
    z7.groups.packs.q.leanSince = undefined;
    for (const c of stay) c.hunger = 10;
    groupTick(z7, due - 60_000);
    assert.equal(stay[0].home, 'm15', 'not before its time');
    groupTick(z7, due);
    assert.equal(stay[0].home, 'm15', 'a well-fed group gets more');
    assert.equal(z7.groups.packs.q.moveAt, due + GAME, 'one game day more');
    stay[0].target = 'someone';
    groupTick(z7, due + GAME);
    assert.equal(stay[0].home, 'm15', 'nothing leaves in a fight');
    stay[0].target = null;
    groupTick(z7, due + GAME + 60_000);
    const gone2 = stay[0].home;
    assert.notEqual(gone2, 'm15', 'then it goes, fed or not');
    assert.ok(Math.abs(Number(gone2.slice(1)) - 15) > 3, 'and not next door');
    assert.ok(stay.every((c) => c.home === gone2), 'all of it together');
    assert.equal(z7.groups.packs.q.moveAt, undefined, 'and starts a fresh clock');
    assert.equal(z7.groups.tally.moved, 1, 'and the keeper\'s count has it');
    const z8 = mk();
    const hungryOne = wolf(z8, 'l', { lone: true, hunger: 10 });
    groupTick(z8, now);
    assert.ok(hungryOne.moveAt >= now + 2 * GAME, 'a loner keeps its own clock');
    const dueL = hungryOne.moveAt;
    hungryOne.kept = true;
    groupTick(z8, dueL);
    assert.notEqual(hungryOne.home, 'm20', 'and goes when it is up');

    // Animals from before groups take their place one at a time; a loner stays out of it.
    const z6 = mk();
    const olds = ['o1', 'o2', 'o3'].map((id) => wolf(z6, id));
    const solo = wolf(z6, 's', { lone: true, hunger: 0 });
    groupTick(z6, now);
    assert.equal(olds.filter((c) => c.group || c.lone).length, 1, 'one a look');
    assert.equal(solo.group, undefined);

    for (const w of ['hill-wolf', 'lead-wolf', 'grey-wolf', 'dire-wolf']) assert.ok(PREYS_ON.get(w).has('rat'), `${w} eats rats`);
    for (const [hunter, birds] of [['lynx', ['scarp-raven', 'mountain-chough', 'hill-eagle', 'eagle-owl', 'bone-breaker']], ['glutton', ['scarp-raven', 'mountain-chough', 'bone-breaker']], ['lead-wolf', ['scarp-raven', 'mountain-chough', 'bone-breaker']], ['hill-wolf', ['mountain-chough']], ['wildcat', ['mountain-chough', 'scarp-raven']], ['the-tom', ['mountain-chough', 'scarp-raven']]]) {
      for (const b of birds) assert.ok(PREYS_ON.get(hunter).has(b), `${hunter} hunts ${b}`);
    }
    assert.equal(PACK_PREY.get('hill-wolf').get('scarp-raven'), 2, 'two wolves take a raven');
    assert.equal(PACK_PREY.get('hill-wolf').get('bone-breaker'), 2, 'two wolves take a bone-breaker');
    // 2026-11-10: nothing but the cave lion took a carrion vulture, so none ever died
    for (const h of ['lynx', 'lead-wolf', 'glutton']) assert.ok(PREYS_ON.get(h).has('carrion-vulture'), `${h} hunts the carrion vulture, as it does the bone-breaker`);
    assert.equal(PACK_PREY.get('hill-wolf').get('carrion-vulture'), 2, 'and two wolves take one');
    assert.ok(settlesOn('lynx', 'the-deer-lawn-high'), 'a lynx may settle on green ground, near the hinds');
  });

  await checkAsync('at a body the bigger one eats, and ravens together push an eagle out', async () => {
    const rooms = new Map(['b', 'away'].map((id) => [id, { id, region: 'mountain' }]));
    const tmpl = (id, name, hp) => [id, { id, name, max_hp: hp, dmg_min: 1, dmg_max: 2, armor: 0 }];
    const world = { rooms, exits: new Map([['b', []], ['away', []]]), mobTemplates: new Map([tmpl('hill-wolf', 'a hill wolf', 36),
      tmpl('carrion-vulture', 'a carrion vulture', 40), tmpl('scarp-raven', 'a scarp raven', 20), tmpl('hill-eagle', 'a hill eagle', 34), tmpl('bone-breaker', 'a bone-breaker', 44)]) };
    const now = 2_000_000_000;
    const flee = async (c) => { c.roomId = 'away'; };
    const scene = (list, traces = [{ kind: 'remains', label: 'a red hind', at: now - 1000, meat: 30 }]) => {
      const feed = [];
      const z = { world, creatures: new Map(), traces: new Map([['b', traces]]), groups: { at: 0, packs: {}, gone: {} },
        creaturesInRoom: (r) => [...z.creatures.values()].filter((c) => c.roomId === r && c.aloft === undefined),
        roomFeed: (_, t) => feed.push(t), roomSound() {}, refreshRoomCtx() {}, feed };
      for (const [id, t, extra] of list) z.creatures.set(id, { id, templateId: t, roomId: 'b', hunger: 50, hp: 30, nextWanderAt: 0, ...extra });
      return z;
    };
    const eating = { eatingUntil: now + 60_000, eatingIn: 'b', eatingOn: 'carrion' };
    const real = crypto.getRandomValues;
    const roll = (v) => { crypto.getRandomValues = (a) => { a.fill(Math.floor(v * 2 ** (a.BYTES_PER_ELEMENT * 8))); return a; }; };
    try {
      roll(0.1);
      // a hungry wolf at a body runs the vulture eating it off, and it keeps away a while
      const w = scene([['w', 'hill-wolf', {}], ['v', 'carrion-vulture', eating]]);
      assert.equal(await holdBody(w, w.creatures.get('w'), now, flee), true);
      const v = w.creatures.get('v');
      assert.equal(v.roomId, 'away', 'the vulture gives it up');
      assert.ok(v.avoids.some((a) => a.roomId === 'b' && a.until > now && a.until < now + 3_600_000), 'and keeps off for a while, not for good');
      assert.equal(w.groups.tally.stolen, 1, 'counted as a meal taken');
      assert.match(w.feed[0], /comes at a carrion vulture over the body/);
      // a fed wolf with no meal on does not bother
      const fed = scene([['w', 'hill-wolf', { hunger: 0 }], ['v', 'carrion-vulture', eating]]);
      assert.equal(await holdBody(fed, fed.creatures.get('w'), now, flee), false, 'a fed wolf leaves it be');
      // the vulture never runs off the wolf
      const back = scene([['v', 'carrion-vulture', {}], ['w', 'hill-wolf', eating]]);
      assert.equal(await holdBody(back, back.creatures.get('v'), now, flee), false, 'a vulture does not run a wolf off');
      // the bone-breaker takes the carcass from the vulture and the raven, not the other way
      const bb = scene([['bb', 'bone-breaker', {}], ['v', 'carrion-vulture', eating]]);
      assert.equal(await holdBody(bb, bb.creatures.get('bb'), now, flee), true, 'the bone-breaker takes it from the vulture');
      const vb = scene([['v', 'carrion-vulture', {}], ['bb', 'bone-breaker', eating]]);
      assert.equal(await holdBody(vb, vb.creatures.get('v'), now, flee), false, 'not the vulture from the bone-breaker');
      // an eagle at its kill runs one raven off...
      const kill = { eatingUntil: now + 60_000, eatingIn: 'b', eatingOn: 'kill' };
      const one = scene([['e', 'hill-eagle', kill], ['r', 'scarp-raven', {}]], []);
      assert.equal(await holdBody(one, one.creatures.get('e'), now, flee), true, 'one raven is run off the eagle\'s kill');
      assert.equal(await mobEagle(one, one.creatures.get('r'), now, flee), false, 'one raven alone does not mob');
      // ...but two go up at it together and push it out, kill or no kill
      const two = scene([['e', 'hill-eagle', kill], ['r1', 'scarp-raven', {}], ['r2', 'scarp-raven', {}]], []);
      assert.equal(await holdBody(two, two.creatures.get('e'), now, flee), false, 'the eagle does not run off two ravens');
      assert.equal(await mobEagle(two, two.creatures.get('r1'), now, flee), true, 'two ravens push the eagle out');
      assert.equal(two.creatures.get('e').roomId, 'away');
      assert.ok(two.creatures.get('r2').rivalRestUntil > now, 'and the whole gang takes a breath');
      assert.equal(await mobEagle(two, two.creatures.get('r2'), now, flee), false, 'not again at once');
    } finally { crypto.getRandomValues = real; }
  });

  check('a bird that climbs out of reach is drawn in the air, and comes down in the picture when its time up runs out (2026-11-10)', () => {
    const now = 2_000_000_000, drawn = [];
    const owl = { id: 'o', templateId: 'eagle-owl', roomId: 'r', hp: 30, target: 'you', lastBlowAt: now - 4000 };
    const z = { send() {}, roomFeed() {}, refreshRoomCtx: () => drawn.push(timedPose(owl, now)) };
    const real = crypto.getRandomValues;
    crypto.getRandomValues = (a) => { a.fill(Math.floor(0.1 * 2 ** (a.BYTES_PER_ELEMENT * 8))); return a; };
    try {
      assert.equal(styleBeforeAttack(z, owl, { id: 'eagle-owl', name: 'an eagle owl', max_hp: 40 }, { pubkey: 'you', hp: 100, maxHp: 100 }, now), true, 'it climbs');
    } finally { crypto.getRandomValues = real; }
    assert.deepEqual(drawn, ['aloft'], 'the room is redrawn once, with the owl already up');
    assert.equal(timedPose(owl, now + 60_000), '', 'and when its time up runs out the tick sees the pose change');
    assert.equal(timedPose({ id: 'w', templateId: 'hill-wolf', airborneUntil: now + 9999 }, now), '', 'only a bird');
  });
  await checkAsync('an animal eating stays on its feet: the eating frame is set down to where it stands (2026-11-10)', async () => {
    const sharp = (await import('sharp')).default;
    const pub = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
    const drops = new Function('return ' + pub.slice(pub.indexOf('var FRAME_DROP = ') + 17, pub.indexOf('};', pub.indexOf('var FRAME_DROP = ')) + 1))();
    let checked = 0;
    for (const m of pub.matchAll(/^\s+"([a-z0-9-]+)":\s*\{ n: (\d+), aspect: [\d.]+, f: (\{[^}]*\}) \}/gm)) {
      const id = m[1], n = +m[2], f = JSON.parse(m[3]);
      const eat = f.feed !== undefined ? 'feed' : f.graze !== undefined ? 'graze' : null;
      if (!eat || f.idle === undefined || f[eat] === f.idle) continue;
      const file = new URL('../public/mob/' + id + '.webp', import.meta.url);
      if (!existsSync(file)) continue;
      const { data, info } = await sharp(fileURLToPath(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const fw = info.width / n, H = info.height;
      const foot = (k) => { for (let y = H - 1; y >= 0; y--) for (let x = Math.round(k * fw); x < Math.round((k + 1) * fw); x++) if (data[(y * info.width + x) * 4 + 3] > 60) return y; return -1; };
      const off = (foot(f.idle) - foot(f[eat])) / H - (drops[id]?.[eat] ?? 0);
      assert.ok(Math.abs(off) <= 0.015, id + ' eats ' + (off * 100).toFixed(1) + '% off its feet');
      checked++;
    }
    assert.ok(checked > 30, 'the strips were read: ' + checked);
  });
  check('a bird up stays up through a lost beat, and comes down with a line when the fight goes (2026-11-10)', () => {
    const now = 2_000_000_000, fed = [], drawn = [];
    const you = { pubkey: 'you', hp: 100, roomId: 'r' };
    const raven = { id: 'v', templateId: 'the-old-raven', roomId: 'r', hp: 20, target: 'you', airborneUntil: now + 5000 };
    const z = { sessions: new Map([['you', you]]), roomFeed: (r, t) => fed.push(t), refreshRoomCtx: () => drawn.push(timedPose(raven, now)) };
    const tmpl = { id: 'the-old-raven', name: 'the old raven', max_hp: 30 };
    // three beats in which its own turn never came (dazed, held): still up, nothing said
    for (const t of [4000, 8000, 12000]) styleKeepAloft(z, raven, tmpl, now + t);
    assert.equal(timedPose(raven, now + 13000), 'aloft', 'still drawn up after beats it lost');
    assert.equal(fed.length, 0, 'and nothing said while it is up');
    // winded and up: drawn up, as the words have it
    raven.windedUntil = now + 99999;
    assert.equal(timedPose(raven, now + 13000), 'aloft', 'an out-of-breath bird in the air is drawn in the air');
    // the fight goes from under it: it comes down, and the room is told
    you.roomId = 'away';
    styleKeepAloft(z, raven, tmpl, now + 16000);
    assert.equal(raven.airborneUntil, undefined, 'down');
    assert.equal(fed.length, 1, 'one line says so');
    assert.deepEqual(drawn, ['blown'], 'and the picture is redrawn with it on the ground');
  });
  check('a kill one animal made of another stays on the ground in the picture, the room text and look alike (2026-11-10)', () => {
    const now = Date.now();
    const tmpls = new Map([['rat', { id: 'rat', name: 'a scabby rat', max_hp: 6 }], ['gill-adder', { id: 'gill-adder', name: 'a gill adder', max_hp: 20 }]]);
    const traces = new Map([['r', [{ kind: 'blood', at: now - 60_000, label: 'a scabby rat', prey: 'rat' }, { kind: 'blood', at: now, label: 'a gill adder', id: 'gill-adder' }]]]);
    const z = { world: { mobTemplates: tmpls }, traces, creaturesInRoom: () => [] };
    assert.deepEqual(bodiesIn(z, 'r'), ['gill-adder', 'rat'], 'the adder you killed and the rat it was swallowing both lie there, with nothing eating either');
    const zoneSrc = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.ok(/for \(const id of chips\.bodiesIn\(this, room\.id\)\)[\s\S]{0,300}A dead \$\{it\} lies here/.test(zoneSrc), 'the room text names the same bodies');
    const verbsSrc = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.ok(verbsSrc.includes('if (body && bodiesIn(z, session.roomId).includes(body.tmpl.id))'), 'and look finds only a body the room shows');
  });
  await checkAsync('rare blood is its line at a body: the old raven, the great vulture and the bone-dropper (2026-11-10)', async () => {
    const rooms = new Map(['b', 'away'].map((id) => [id, { id, region: 'mountain' }]));
    const tmpl = (id, name, hp) => [id, { id, name, max_hp: hp, dmg_min: 1, dmg_max: 2, armor: 0 }];
    const world = { rooms, exits: new Map([['b', []], ['away', []]]), mobTemplates: new Map([tmpl('hill-wolf', 'a hill wolf', 36),
      tmpl('carrion-vulture', 'a carrion vulture', 40), tmpl('great-vulture', 'a great vulture', 48), tmpl('scarp-raven', 'a scarp raven', 20), tmpl('the-old-raven', 'the old raven', 26),
      tmpl('hill-eagle', 'a hill eagle', 34), tmpl('bone-breaker', 'a bone-breaker', 44), tmpl('the-bone-dropper', 'the bone-dropper', 52)]) };
    const variantBase = new Map([['great-vulture', 'carrion-vulture'], ['the-old-raven', 'scarp-raven'], ['the-bone-dropper', 'bone-breaker'], ['lead-wolf', 'hill-wolf']]);
    const now = 2_000_000_000;
    const flee = async (c) => { c.roomId = 'away'; };
    const scene = (list, traces = [{ kind: 'remains', label: 'a red hind', at: now - 1000, meat: 30 }]) => {
      const z = { world, variantBase, creatures: new Map(), traces: new Map([['b', traces]]), groups: { at: 0, packs: {}, gone: {} },
        creaturesInRoom: (r) => [...z.creatures.values()].filter((c) => c.roomId === r && c.aloft === undefined),
        roomFeed() {}, roomSound() {}, refreshRoomCtx() {} };
      for (const [id, t, extra] of list) z.creatures.set(id, { id, templateId: t, roomId: 'b', hunger: 50, hp: 30, nextWanderAt: 0, ...extra });
      return z;
    };
    const eating = { eatingUntil: now + 60_000, eatingIn: 'b', eatingOn: 'carrion' };
    const kill = { eatingUntil: now + 60_000, eatingIn: 'b', eatingOn: 'kill' };
    const real = crypto.getRandomValues;
    crypto.getRandomValues = (a) => { a.fill(Math.floor(0.1 * 2 ** (a.BYTES_PER_ELEMENT * 8))); return a; };
    try {
      const gv = scene([['w', 'hill-wolf', {}], ['v', 'great-vulture', eating]]);
      assert.equal(await holdBody(gv, gv.creatures.get('w'), now, flee), true, 'a wolf runs the great vulture off a body');
      assert.equal(gv.creatures.get('v').roomId, 'away');
      const old = scene([['w', 'hill-wolf', {}], ['r', 'the-old-raven', eating]]);
      assert.equal(await holdBody(old, old.creatures.get('w'), now, flee), true, 'and the old raven');
      const drop = scene([['d', 'the-bone-dropper', {}], ['v', 'carrion-vulture', eating]]);
      assert.equal(await holdBody(drop, drop.creatures.get('d'), now, flee), true, 'the bone-dropper takes a body from a vulture');
      const not = scene([['v', 'great-vulture', {}], ['d', 'the-bone-dropper', eating]]);
      assert.equal(await holdBody(not, not.creatures.get('v'), now, flee), false, 'no vulture takes one from the bone-dropper');
      // the old raven is a raven against the eagle: one of each is two ravens
      const two = scene([['e', 'hill-eagle', kill], ['r1', 'scarp-raven', {}], ['r2', 'the-old-raven', {}]], []);
      assert.equal(await holdBody(two, two.creatures.get('e'), now, flee), false, 'the eagle does not run off a raven and the old raven together');
      assert.equal(await mobEagle(two, two.creatures.get('r2'), now, flee), true, 'and the old raven goes up at the eagle with the other');
      assert.equal(two.creatures.get('e').roomId, 'away');
      assert.ok(two.creatures.get('r1').rivalRestUntil > now && two.creatures.get('r2').rivalRestUntil > now, 'both take a breath after');
    } finally { crypto.getRandomValues = real; }
  });
  check('the dancer is a small meal and fills on one, as the ermine (2026-11-10)', () => {
    assert.ok(SMALL_PREY.has('the-dancer'), 'killed, it takes the edge off a wolf and no more');
    assert.ok(SMALL_EATERS.has('the-dancer'), 'and a small body fills it');
  });

  await checkAsync('a wolf pack runs small hunters off its ground, sometimes kills, and takes their kills', async () => {
    const names = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11'];
    const rooms = new Map(['gate', ...names].map((id) => [id, { id, region: 'mountain' }]));
    const exits = new Map([...rooms.keys()].map((id) => [id, []]));
    const link = (a, b) => { exits.get(a).push({ to_room: b, dir: 'on' }); exits.get(b).push({ to_room: a, dir: 'back' }); };
    link('gate', 'm0');
    for (let i = 1; i < names.length; i++) link(names[i - 1], names[i]);
    const tmpl = (id, name) => [id, { id, name, max_hp: 30, dmg_min: 1, dmg_max: 2, armor: 0 }];
    const world = { rooms, exits, entryRooms: new Set(['gate']), safeRooms: new Set(), itemTemplates: new Map(),
      mobTemplates: new Map([tmpl('hill-wolf', 'a hill wolf'), tmpl('hill-fox', 'a hill fox'), tmpl('lynx', 'a lynx')]),
      mobSpawns: [{ template_id: 'hill-fox', room_id: 'm11' }, { template_id: 'hill-fox', room_id: 'm1' }] };
    const nearby = (from, depth) => {
      const out = new Map([[from, 0]]), q = [from];
      for (const at of q) { const d = out.get(at); if (d < depth) for (const e of exits.get(at)) if (!out.has(e.to_room)) { out.set(e.to_room, d + 1); q.push(e.to_room); } }
      return out;
    };
    const now = 2_000_000_000;
    const flee = async (c) => { c.roomId = 'm5'; };
    const scene = (wolfExtra = {}, foxExtra = {}, traces = []) => {
      const feed = [];
      const z = { world, nearby, regionOf: () => 'mountain', variantBase: new Map(), creatures: new Map(), sessions: new Map(),
        arrivals: new Map(), herds: new Map(), traces: new Map([['m6', traces]]), ground: new Map(), groups: { at: 0, packs: { p: { line: 'hill-wolf', home: 'm6', size: 4, peak: 2 } }, gone: {} },
        withinRadius: (a, b, n) => nearby(b, n).has(a), creaturesInRoom: (r) => [...z.creatures.values()].filter((c) => c.roomId === r),
        roomFeed: (_, t) => feed.push(t), roomSound() {}, fxFed() {}, fxDied() {}, fxClash() {}, refreshRoomCtx() {}, noteCreaturesChanged() {}, addTrace() {}, stampFresh() {}, feed };
      const base = { templateId: 'hill-wolf', roomId: 'm6', home: 'm6', hunger: 80, hp: 30, nextWanderAt: 0, group: 'p' };
      z.wolf = { ...base, id: 'w', ...wolfExtra };
      z.fox = { templateId: 'hill-fox', id: 'f', roomId: 'm6', home: 'm7', hunger: 10, hp: 20, nextWanderAt: 0, ...foxExtra };
      z.creatures.set('w', z.wolf); z.creatures.set('f', z.fox);
      return z;
    };
    // Scripted odds: 0.1 passes the chase roll, the second number decides the kill.
    const real = crypto.getRandomValues;
    const roll = (seq) => { let i = 0; crypto.getRandomValues = (a) => { a.fill(Math.floor(seq[Math.min(i++, seq.length - 1)] * 2 ** (a.BYTES_PER_ELEMENT * 8))); return a; }; };
    try {
      const killed = scene();
      roll([0.1, 0.05]);
      await holdGround(killed, killed.wolf, now, flee);
      assert.ok(!killed.creatures.has('f'), 'sometimes it is caught');
      assert.ok(killed.wolf.hunger < 80, 'and eaten');
      assert.equal(killed.groups.tally.caught, 1, 'and counted');

      roll([0.1, 0.9, 0.5]);
      const chased = scene();
      assert.equal(await holdGround(chased, chased.wolf, now, flee), true);
      assert.ok(chased.creatures.has('f'), 'mostly it runs');
      assert.equal(chased.fox.drivenOff, 1);
      assert.equal(chased.fox.home, 'm7', 'once does not lose it its home');
      assert.ok(chased.fox.avoids.some((a) => a.roomId === 'm6'), 'it keeps off the room');
      assert.ok(chased.wolf.rivalRestUntil > now, 'and the wolf takes a breath');
      assert.equal(chased.wolf.curious, 'm5', 'after running after it');
      assert.equal(chased.groups.tally.chases, 1, 'and counted');

      roll([0.1, 0.9, 0.5]);
      const twice = scene({}, { drivenOff: 1 });
      await holdGround(twice, twice.wolf, now, flee);
      assert.notEqual(twice.fox.home, 'm7', 'run off again, it draws a new home');
      assert.equal(twice.groups.tally.moved, 1, 'counted as a home given up (2026-11-10)');
      assert.ok(!nearby('m6', 3).has(twice.fox.home), 'off the pack\'s ground');

      const kill = { kind: 'blood', prey: 'mountain-hare', at: now - 1000 };
      roll([0.1, 0.9, 0.5]);
      const stolen = scene({}, {}, [kill]);
      await holdGround(stolen, stolen.wolf, now, flee);
      assert.ok(stolen.wolf.hunger < 80, 'the pack wolf eats the fox\'s kill');
      assert.equal(stolen.groups.tally.stolen, 1, 'and counted');

      roll([0.1, 0.1, 0.5]);
      const loner = scene({ group: undefined, lone: true }, {}, [kill]);
      await holdGround(loner, loner.wolf, now, flee);
      assert.ok(loner.creatures.has('f'), 'a lone wolf does not kill it');
      assert.equal(loner.fox.drivenOff, undefined, 'and holds no ground');
      assert.ok(loner.wolf.hunger < 80, 'but it takes the meal');

      roll([0.1, 0.1]);
      const noMeal = scene({ group: undefined, lone: true });
      assert.equal(await holdGround(noMeal, noMeal.wolf, now, flee), false, 'a lone wolf with no kill at stake leaves it be');

      roll([0.1, 0.1]);
      const away = scene({ roomId: 'm11' }, { roomId: 'm11' });
      assert.equal(await holdGround(away, away.wolf, now, flee), false, 'off its own ground the pack wolf leaves it be');

      roll([0.9]);
      const unseen = scene();
      assert.equal(await holdGround(unseen, unseen.wolf, now, flee), false, 'it does not always catch it there');

      roll([0.1, 0.1]);
      const lynx = scene({}, { templateId: 'lynx' });
      assert.equal(await holdGround(lynx, lynx.wolf, now, flee), false, 'a lynx is not run off');
    } finally { crypto.getRandomValues = real; }
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.equal((zone.match(/groups\.holdGround\(this, /g) ?? []).length, 2, 'near and far, both worlds');
  });

  check('mountain animals settle only on their own kind of ground, and every room has a kind', () => {
    const chain = ['gate', 'the-deer-lawn-high', 'the-north-scree', 'the-shiel-street', 'the-first-crag', 'the-snow-bed', 'the-herds-house'];
    const rooms = new Map(chain.map((id) => [id, { id, region: 'mountain' }]));
    const exits = new Map(chain.map((id, i) => [id, chain[i + 1] ? [{ to_room: chain[i + 1] }] : []]));
    const world = { rooms, exits, entryRooms: new Set(['gate']), safeRooms: new Set(), mobSpawns:
      ['red-hind', 'hill-wolf', 'scarp-raven', 'snow-fox'].flatMap((t) => [{ template_id: t, room_id: chain[1] }, { template_id: t, room_id: chain[6] }]) };
    const z = { world, regionOf: () => 'mountain' };
    assert.deepEqual(mountainHomes(z, 'red-hind'), ['the-deer-lawn-high', 'the-north-scree'], 'a hind keeps to green ground, and lies up on stone above it (2026-11-08)');
    assert.deepEqual(mountainHomes(z, 'scarp-raven'), ['the-first-crag'], 'a raven to the crags');
    assert.deepEqual(mountainHomes(z, 'snow-fox'), ['the-north-scree', 'the-snow-bed'], 'a snow fox to snow and stone');
    assert.ok(mountainHomes(z, 'hill-wolf').includes('the-shiel-street'), 'a wolf may hold the hamlet');
    assert.ok(!mountainHomes(z, 'hill-wolf').includes('the-herds-house'), 'but not sleep in a house');
    for (const line of ['red-hind', 'mountain-hare', 'feral-goat', 'ptarmigan', 'snow-fox', 'hill-wolf', 'hill-fox', 'wildcat', 'ermine', 'lynx', 'glutton', 'eagle-owl', 'scarp-raven', 'mountain-chough', 'hill-eagle', 'bone-breaker', 'carrion-vulture']) {
      assert.ok(SETTLES_ON.has(line), `${line} has its ground named`);
    }
    assert.ok(settlesOn('red-hind', 'a-room-nobody-listed'), 'an unlisted room refuses nobody');
    const unlisted = [];
    for (const q of ['foot', 'middle', 'cloud', 'high']) for (const r of MOUNTAIN_QUARTER_ROOMS[q] ?? []) if (!GROUND_OF.has(r)) unlisted.push(r);
    assert.deepEqual(unlisted, [], 'every mountain room has a kind of ground');
  });

  // 2026-11-08: a vulture starving at 99 sat out its whole stay twelve rooms from
  // home after the body it came for was gone: only a hunter looked again.
  check('a carrion bird whose body is gone looks again, as a hunter does', () => {
    const names = Array.from({ length: 40 }, (_, i) => `m${i}`);
    const rooms = new Map(['gate', ...names].map((id) => [id, { id, region: 'mountain' }]));
    const exits = new Map([...rooms.keys()].map((id) => [id, []]));
    const link = (a, b) => { exits.get(a).push({ to_room: b }); exits.get(b).push({ to_room: a }); };
    link('gate', 'm0');
    for (let i = 1; i < names.length; i++) link(names[i - 1], names[i]);
    const tmpl = (id) => [id, { id, name: `a ${id}`, max_hp: 30 }];
    const world = { rooms, exits, entryRooms: new Set(['gate']), safeRooms: new Set(),
      mobTemplates: new Map(['hill-eagle', 'scarp-raven', 'carrion-vulture', 'mountain-hare', 'lynx', 'ptarmigan'].map(tmpl)), mobSpawns: [] };
    const nearby = (from, depth) => {
      const out = new Map([[from, 0]]), q = [from];
      for (const at of q) { const d = out.get(at); if (d < depth) for (const e of exits.get(at)) if (!out.has(e.to_room)) { out.set(e.to_room, d + 1); q.push(e.to_room); } }
      return out;
    };
    // The world keeps its own hours, so find one of each by asking it.
    const hourOf = (want) => { let t = Date.UTC(2026, 5, 21); while (isNight(t) !== want || isNight(t + 3_600_000) !== want) t += 600_000; return t; };
    const noon = hourOf(false), night = hourOf(true);
    const mk = () => {
      const feed = [];
      const z = { world, nearby, feed, regionOf: () => 'mountain', variantBase: new Map(), creatures: new Map(), sessions: new Map(), traces: new Map(),
        groups: { at: 0, packs: {}, gone: {} }, noteCreaturesChanged() {}, refreshRoomCtx() {}, roomFeed: (r, t) => feed.push([r, t]),
        posed: [], fxPose(r, id, p) { this.posed.push([r, id, p]); },
        creaturesInRoom: (r) => [...z.creatures.values()].filter((c) => c.roomId === r && c.aloft === undefined) };
      return z;
    };
    const add = (z, id, templateId, roomId, extra = {}) => { const c = { id, templateId, roomId, home: roomId, hunger: 80, hp: 30, nextWanderAt: 0, ...extra }; z.creatures.set(id, c); return c; };
    const beat = (z, t) => { z.groups.flownAt = 0; flightTick(z, t); };
    const z = mk();
    const v = add(z, 'v', 'carrion-vulture', 'm10', { home: 'm0', hunger: 99, awayAt: 'm10', awayUntil: noon + 9 * 60_000 });
    z.traces.set('m20', [{ kind: 'remains', at: noon, label: 'a red hind', prey: 'red-hind', id: 'red-hind', meat: 30 }]);
    beat(z, noon + 2 * 60_000);
    assert.ok(v.aloft, 'nothing where it landed: it takes off again');
    assert.equal(v.flightTo, 'm20', 'for the next body in reach, ten rooms off');
    // 2026-11-09: the bite took its hunger under hungry at once, and it flew off its meal.
    const z2 = mk();
    const at = noon + 60_000;
    const w = add(z2, 'w', 'carrion-vulture', 'm10', { home: 'm0', hunger: 10, awayAt: 'm10', awayUntil: noon + 9 * 60_000, eatingIn: 'm10', eatingUntil: at + 3 * 60_000 });
    beat(z2, at);
    assert.equal(w.aloft, undefined, 'fed by the bite, it stays at the body while it eats');
    assert.equal(w.roomId, 'm10', 'on the body');
    beat(z2, at + 4 * 60_000);
    assert.ok(w.aloft, 'and goes home once the meal is done');
    // 2026-11-09: one dead vulture brought birds down one after another onto bare bone.
    const z3 = mk();
    z3.traces.set('m20', [{ kind: 'remains', at: noon, label: 'a carrion vulture', prey: 'carrion-vulture', id: 'carrion-vulture', meat: 0 }]);
    z3.traces.set('m14', [{ kind: 'remains', at: noon, label: 'a red hind', prey: 'red-hind', id: 'red-hind', meat: 30 }]);
    const u = add(z3, 'u', 'carrion-vulture', 'm10', { home: 'm0', hunger: 90, aloft: noon + 60_000, flightTo: 'm20' });
    beat(z3, noon + 10_000);
    assert.equal(u.flightTo, 'm14', 'the body it flew for is eaten: it turns for the next one in reach');
    z3.traces.get('m14')[0].meat = 0;
    beat(z3, noon + 20_000);
    assert.equal(u.flightTo, 'm0', 'and with none left, for home');
    const k = add(z3, 'k', 'carrion-vulture', 'm10', { home: 'm0', hunger: 90, aloft: noon + 60_000, flightTo: 'm30' });
    z3.traces.set('m30', [{ kind: 'remains', at: noon, label: 'a red hind', prey: 'red-hind', id: 'red-hind', meat: 30 }]);
    beat(z3, noon + 30_000);
    assert.equal(k.flightTo, 'm30', 'a body still lying keeps it on its way');
  });
  check('birds fly out to food and home again; the lynx and the grazers settle near what they eat', () => {
    const names = Array.from({ length: 40 }, (_, i) => `m${i}`);
    const rooms = new Map(['gate', ...names].map((id) => [id, { id, region: 'mountain' }]));
    const exits = new Map([...rooms.keys()].map((id) => [id, []]));
    const link = (a, b) => { exits.get(a).push({ to_room: b }); exits.get(b).push({ to_room: a }); };
    link('gate', 'm0');
    for (let i = 1; i < names.length; i++) link(names[i - 1], names[i]);
    const tmpl = (id) => [id, { id, name: `a ${id}`, max_hp: 30 }];
    const world = { rooms, exits, entryRooms: new Set(['gate']), safeRooms: new Set(),
      mobTemplates: new Map(['hill-eagle', 'scarp-raven', 'carrion-vulture', 'mountain-hare', 'lynx', 'ptarmigan'].map(tmpl)), mobSpawns: [] };
    const nearby = (from, depth) => {
      const out = new Map([[from, 0]]), q = [from];
      for (const at of q) { const d = out.get(at); if (d < depth) for (const e of exits.get(at)) if (!out.has(e.to_room)) { out.set(e.to_room, d + 1); q.push(e.to_room); } }
      return out;
    };
    // The world keeps its own hours, so find one of each by asking it.
    const hourOf = (want) => { let t = Date.UTC(2026, 5, 21); while (isNight(t) !== want || isNight(t + 3_600_000) !== want) t += 600_000; return t; };
    const noon = hourOf(false), night = hourOf(true);
    const mk = () => {
      const feed = [];
      const z = { world, nearby, feed, regionOf: () => 'mountain', variantBase: new Map(), creatures: new Map(), sessions: new Map(), traces: new Map(),
        groups: { at: 0, packs: {}, gone: {} }, noteCreaturesChanged() {}, refreshRoomCtx() {}, roomFeed: (r, t) => feed.push([r, t]),
        posed: [], fxPose(r, id, p) { this.posed.push([r, id, p]); },
        creaturesInRoom: (r) => [...z.creatures.values()].filter((c) => c.roomId === r && c.aloft === undefined) };
      return z;
    };
    const add = (z, id, templateId, roomId, extra = {}) => { const c = { id, templateId, roomId, home: roomId, hunger: 80, hp: 30, nextWanderAt: 0, ...extra }; z.creatures.set(id, c); return c; };
    const beat = (z, t) => { z.groups.flownAt = 0; flightTick(z, t); };

    // Hungry with food far off: it goes, off the map, and comes down by the food.
    const z = mk();
    const eagle = add(z, 'e', 'hill-eagle', 'm5');
    add(z, 'h', 'mountain-hare', 'm25');
    beat(z, noon);
    assert.ok(eagle.aloft > noon, 'it takes off');
    assert.equal(z.creaturesInRoom('m5').length, 0, 'and no room holds it');
    assert.equal(eagle.flightTo, 'm25', 'bound for the food, twenty rooms off, beyond any walk');
    assert.equal(z.groups.tally.flights, 1, 'and the keeper\'s count has the flight');
    beat(z, noon + 1000);
    assert.notEqual(eagle.aloft, undefined, 'the air takes time');
    beat(z, eagle.aloft);
    assert.equal(eagle.roomId, 'm25'); assert.equal(eagle.aloft, undefined, 'it comes down there');
    assert.ok(z.feed.some(([r, t]) => r === 'm25' && /comes down/.test(t)), 'and the room sees it');
    assert.equal(eagle.awayAt, 'm25', 'it remembers where it came down');
    assert.ok(eagle.nextWanderAt <= eagle.awayUntil - 9 * 60_000, 'and is free to walk at once, not pinned to the room (2026-11-07)');
    // Fed, it goes home.
    eagle.hunger = 5;
    const fedAt = noon + 200_000;
    beat(z, fedAt);
    assert.equal(eagle.flightTo, 'm5', 'fed, it flies home');
    beat(z, eagle.aloft);
    assert.equal(eagle.roomId, 'm5'); assert.equal(eagle.awayUntil, undefined);
    assert.equal(eagle.flightRestUntil, undefined, 'fed needs no rest');

    // It finds nothing: it gives up, goes home hungry, and rests.
    const z2 = mk();
    const lost = add(z2, 'e', 'hill-eagle', 'm5');
    const gone = add(z2, 'h', 'mountain-hare', 'm25');
    beat(z2, noon); z2.creatures.delete(gone.id); const back0 = lost.aloft; beat(z2, back0);
    const landed = lost.awayUntil;
    assert.equal(landed - back0, 10 * 60_000, 'down ten minutes at most, never thirty (2026-11-07)');
    assert.ok(lost.nextWanderAt <= back0, 'walking from the moment it lands');
    beat(z2, back0 + 30_000);
    assert.equal(lost.aloft, undefined, 'it gives the empty ground a minute');
    beat(z2, back0 + 61_000);
    assert.equal(lost.flightTo, 'm5', 'and with nothing in reach it goes home');
    const back = lost.aloft;
    beat(z2, back);
    assert.ok(lost.flightRestUntil > back, 'home hungry, it rests');
    add(z2, 'h2', 'mountain-hare', 'm25');
    beat(z2, back + 1000);
    assert.equal(lost.aloft, undefined, 'and does not go again at once');

    // A hunter whose prey has left flies to the next thing it eats, near or far (2026-11-06).
    const down = (id = 'hill-eagle', extra = {}) => {
      const y = mk(); const c = add(y, 'e', id, 'm5', extra);
      c.awayUntil = noon + 10 * 60_000; c.nextWanderAt = noon; c.awayAt = 'm5';
      return [y, c];
    };
    const afterMinute = noon + 61_000;
    { const [y, c] = down(); add(y, 'h', 'mountain-hare', 'm7'); beat(y, afterMinute);
      assert.equal(c.aloft, undefined, 'prey two rooms off it walks to, on foot (2026-11-07)'); }
    { const [y, c] = down(); add(y, 'h', 'mountain-hare', 'm9'); beat(y, afterMinute);
      assert.equal(c.flightTo, 'm9', 'past its walking ground, it flies to the next, even close by'); assert.equal(c.awayUntil, undefined); }
    { const [y, c] = down(); c.roomId = 'm12'; c.awayAt = 'm12'; add(y, 'h', 'mountain-hare', 'm12'); beat(y, noon + 10 * 60_000);
      assert.equal(c.flightTo, 'm5', 'ten minutes down and still hungry, it leaves, prey or no prey'); }
    { const [y, c] = down(); add(y, 'h', 'mountain-hare', 'm25'); beat(y, afterMinute);
      assert.equal(c.flightTo, 'm25', 'or a long way off'); }
    { const [y, c] = down(); add(y, 'h', 'mountain-hare', 'm5'); add(y, 'p', 'ptarmigan', 'm7'); beat(y, afterMinute);
      assert.equal(c.aloft, undefined, 'it does not leave while there is prey in the room'); }
    { const [y, c] = down(); add(y, 'p', 'ptarmigan', 'm7'); beat(y, noon + 30_000);
      assert.equal(c.aloft, undefined, 'it gives the ground its minute first'); }
    { const [y, c] = down('hill-eagle', { huntRestUntil: afterMinute + 1000 }); add(y, 'p', 'ptarmigan', 'm7'); beat(y, afterMinute);
      assert.equal(c.aloft, undefined, 'not while blown from a rush'); }
    { const [y, c] = down('hill-eagle', { chase: { to: 'm6' } }); add(y, 'p', 'ptarmigan', 'm7'); beat(y, afterMinute);
      assert.equal(c.aloft, undefined, 'not while it is on a chase'); }
    { const [y, c] = down(); c.roomId = 'm12'; add(y, 'p', 'ptarmigan', 'm7'); c.awayUntil = night + 10 * 60_000; c.awayAt = 'm12'; beat(y, night + 61_000);
      assert.equal(c.flightTo, 'm5', 'and in the dark an eagle goes home rather than hunting on'); }
    { const [y, c] = down('carrion-vulture'); y.traces.set('m7', [{ kind: 'blood', at: noon, prey: 'mountain-hare' }]); beat(y, afterMinute);
      assert.equal(c.aloft, undefined, 'a scavenger still waits out its time'); }

    // ...and the walk is anchored where it came down (ai.creatureMoves).
    assert.match(readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8'), /const anchor = creature\.wateringTo \?\? quarry \?\? landed \?\?/, 'it walks the ground round where it landed');

    // A BIRD THAT EATS ONLY THE DEAD FLIES TO BODIES CLOSE BY (2026-11-07): a vulture
    // two rooms from the dead passed them over, too near to fly to, too far to smell.
    { const y = mk(); const v = add(y, 'v', 'carrion-vulture', 'm5'); y.traces.set('m7', [{ kind: 'remains', at: noon, label: 'a hare' }]); beat(y, noon);
      assert.equal(v.flightTo, 'm7', 'two rooms off, it flies to the dead'); }
    { const y = mk(); const v = add(y, 'v', 'carrion-vulture', 'm5'); y.traces.set('m5', [{ kind: 'remains', at: noon, label: 'a hare' }]); y.traces.set('m7', [{ kind: 'remains', at: noon, label: 'a hare' }]); beat(y, noon);
      assert.equal(v.aloft, undefined, 'standing on its meal, it stays'); }
    { const y = mk(); const r = add(y, 'r', 'scarp-raven', 'm5'); y.traces.set('m6', [{ kind: 'remains', at: noon, label: 'a hare' }]); beat(y, noon);
      assert.equal(r.flightTo, 'm6', 'and so does a raven, next door'); }
    { const y = mk(); const e = add(y, 'e', 'hill-eagle', 'm5'); add(y, 'h', 'mountain-hare', 'm7'); beat(y, noon);
      assert.equal(e.aloft, undefined, 'a hunter still walks to prey that close'); }

    // NEVER A FLIGHT TO WHERE IT STANDS (2026-11-07): an eagle fed on its kill in its
    // own home room flew off and landed in the same room, gone and still there.
    { const [y, c] = down(); c.roomId = 'm5'; c.home = 'm5'; c.hunger = 10; beat(y, noon + 2000);
      assert.equal(c.aloft, undefined, 'fed at home, it does not fly home'); assert.equal(c.awayUntil, undefined, 'it is simply home');
      assert.ok(!y.feed.some(([, t]) => /opens its wings/.test(t)), 'and does not say it flew'); }
    { const [y, c] = down(); beat(y, afterMinute);
      assert.equal(c.aloft, undefined, 'prey gone and nothing in reach, at home it stays down'); assert.ok(c.flightRestUntil > afterMinute, 'and rests, hungry'); }
    { const y = mk(); const c = add(y, 'e', 'hill-eagle', 'm5'); add(y, 'h', 'mountain-hare', 'm25'); beat(y, noon); beat(y, c.aloft);
      assert.deepEqual(y.posed.at(-1), ['m25', 'hill-eagle', 'landing'], 'the picture brings it down where the words do'); }

    // What keeps it down.
    const held = (extra, sessions = []) => { const y = mk(); const c = add(y, 'e', 'hill-eagle', 'm5', extra); add(y, 'h', 'mountain-hare', 'm25'); sessions.forEach((s, i) => y.sessions.set(i, s)); beat(y, noon); return c.aloft; };
    assert.equal(held({ target: 'someone' }), undefined, 'not out of a fight');
    assert.equal(held({}, [{ target: 'e' }]), undefined, 'not with a wanderer on it');
    assert.equal(held({ hp: 5 }), undefined, 'not hurt');
    assert.equal(held({ asleep: true }), undefined, 'not asleep');
    assert.equal(held({ hunger: 10 }), undefined, 'not fed');
    const y = mk(); const dusk = add(y, 'e', 'hill-eagle', 'm5'); add(y, 'h', 'mountain-hare', 'm25'); beat(y, night);
    assert.equal(dusk.aloft, undefined, 'an eagle does not hunt the dark');
    const w = mk(); const walker = add(w, 'e', 'hill-eagle', 'm5'); add(w, 'h', 'mountain-hare', 'm7'); beat(w, noon);
    assert.equal(walker.aloft, undefined, 'food on its own ground is walked to');
    const v = mk(); const far = add(v, 'e', 'hill-eagle', 'm5'); add(v, 'h', 'mountain-hare', 'm35'); beat(v, noon);
    assert.equal(far.aloft, undefined, 'beyond its reach it does not know');
    // The carrion vulture flies to a body too, unless it is waiting on someone hurt.
    const vw = mk(); const vult = add(vw, 'v', 'carrion-vulture', 'm5'); vw.traces.set('m20', [{ kind: 'blood', at: noon, prey: 'mountain-hare' }]);
    beat(vw, noon); assert.equal(vult.flightTo, 'm20', 'a vulture flies to the body');
    const vw2 = mk(); const waiting = add(vw2, 'v', 'carrion-vulture', 'm5', { waitsOn: 'someone' }); vw2.traces.set('m20', [{ kind: 'blood', at: noon, prey: 'mountain-hare' }]);
    beat(vw2, noon); assert.equal(waiting.aloft, undefined, 'and stays put while it waits on someone hurt');
    assert.ok(settlesOn('carrion-vulture', 'the-first-crag') && settlesOn('carrion-vulture', 'the-bone-ground') && !settlesOn('carrion-vulture', 'the-deer-lawn-high'), 'it settles on crags and bones, not on grass');
    const lyn = mk(); const cat = add(lyn, 'l', 'lynx', 'm5'); add(lyn, 'h', 'mountain-hare', 'm25'); beat(lyn, noon); beat(lyn, night);
    assert.equal(cat.aloft, undefined, 'a lynx has no wings, by day or by night');

    // Five mobs fill a room: a bird does not choose a full one, turns home if it fills, and never lands over the limit.
    const fill = (y, room, n = 5) => { for (let i = 0; i < n; i++) add(y, `${room}-f${i}`, 'mountain-hare', room, { hunger: 0 }); };
    const cf = mk(); const picky = add(cf, 'e', 'hill-eagle', 'm5'); fill(cf, 'm20'); add(cf, 'h', 'mountain-hare', 'm25'); beat(cf, noon);
    assert.equal(picky.flightTo, 'm25', 'a full room is passed over for the next food');
    const cf2 = mk(); const none = add(cf2, 'e', 'hill-eagle', 'm5'); fill(cf2, 'm20'); beat(cf2, noon);
    assert.equal(none.aloft, undefined, 'with only a full room to go to, it stays');
    const cf3 = mk(); const late = add(cf3, 'e', 'hill-eagle', 'm5'); add(cf3, 'h', 'mountain-hare', 'm25'); beat(cf3, noon);
    fill(cf3, 'm25', 4); const due3 = late.aloft; beat(cf3, due3);
    assert.equal(cf3.creaturesInRoom('m25').length, 5); assert.equal(late.roomId, 'm5', 'it never came down there');
    assert.equal(late.flightTo, 'm5', 'the room filled in flight, so it turns for home'); assert.notEqual(late.aloft, undefined);
    const cf4 = mk(); const out = add(cf4, 'e', 'hill-eagle', 'm5', { roomId: 'm25', flightTo: 'm5', aloft: noon }); fill(cf4, 'm5'); beat(cf4, noon);
    assert.equal(out.aloft, undefined, 'it does come down at the end'); assert.notEqual(out.roomId, 'm5', 'its full home is left alone');
    assert.ok(cf4.creaturesInRoom(out.roomId).length <= 5, 'it lands close by with space'); assert.ok((cf4.nearby('m5', 3).get(out.roomId) ?? 9) <= 3, 'close to home');

    // The whole world's birds fly, each to its own food, inside its own region and under open sky.
    for (const id of ['great-gull', 'gibbet-crow', 'tawny-owl', 'grey-heron', 'bittern', 'oystercatcher', 'wrack-crab', 'ford-eel', 'hedgehog', 'brooding-vulture']) world.mobTemplates.set(id, { id, name: `a ${id}`, max_hp: 30 });
    const elsewhere = (y, far = {}) => { y.regionOf = (r) => far[r] ?? 'crossing'; return y; };
    const g = elsewhere(mk()); const gull = add(g, 'g', 'great-gull', 'm5'); add(g, 'c', 'wrack-crab', 'm20'); beat(g, noon);
    assert.equal(gull.flightTo, 'm20', 'a gull flies to the crabs');
    const g2 = elsewhere(mk(), { m20: 'road' }); const stays = add(g2, 'g', 'great-gull', 'm5'); add(g2, 'c', 'wrack-crab', 'm20'); beat(g2, noon);
    assert.equal(stays.aloft, undefined, 'it does not cross into another region');
    const roofed = (outdoors) => { const y = mk(); y.regionOf = () => 'keep'; const b = add(y, 'g', 'great-gull', 'm5'); add(y, 'c', 'wrack-crab', 'm20'); outdoors.forEach((r) => OUTDOOR_ROOMS.add(r)); beat(y, noon); outdoors.forEach((r) => OUTDOOR_ROOMS.delete(r)); return b.flightTo; };
    assert.equal(roofed(['m5']), undefined, 'it does not fly under a roof'); assert.equal(roofed(['m20']), undefined, 'and has no way up from under one'); assert.equal(roofed(['m5', 'm20']), 'm20', 'open sky to open sky it goes');
    const cr = elsewhere(mk()); const crow = add(cr, 'c', 'gibbet-crow', 'm5'); add(cr, 'h', 'mountain-hare', 'm15'); cr.traces.set('m20', [{ kind: 'blood', at: noon, prey: 'mountain-hare' }]); beat(cr, noon);
    assert.equal(crow.flightTo, 'm20', 'a crow flies to the body and not to the living');
    const ow = elsewhere(mk()); const tawny = add(ow, 'o', 'tawny-owl', 'm5'); add(ow, 'h', 'hedgehog', 'm20'); beat(ow, noon);
    assert.equal(tawny.aloft, undefined, 'an owl waits for dark'); beat(ow, night); assert.equal(tawny.flightTo, 'm20', 'and flies by night');
    rooms.set('the-salt-marsh', { id: 'the-salt-marsh', region: 'mountain' }); exits.set('the-salt-marsh', []); link('m25', 'the-salt-marsh');
    const he = elsewhere(mk()); const heron = add(he, 'h', 'grey-heron', 'm5'); beat(he, noon);
    assert.equal(heron.flightTo, 'the-salt-marsh', 'a grazer flies to feeding ground');
    const he2 = elsewhere(mk()); const near = add(he2, 'h', 'grey-heron', 'm24'); beat(he2, noon);
    assert.equal(near.aloft, undefined, 'and walks when it is close');
    const nest = elsewhere(mk()); const brood = add(nest, 'b', 'brooding-vulture', 'm5'); nest.traces.set('m20', [{ kind: 'blood', at: noon, prey: 'mountain-hare' }]); beat(nest, noon);
    assert.equal(brood.aloft, undefined, 'a mother stays on the nest');
    const pt = elsewhere(mk()); const pta = add(pt, 'p', 'ptarmigan', 'm5'); beat(pt, noon); assert.equal(pta.aloft, undefined, 'a ptarmigan feeds on the ground');
    const homeless = elsewhere(mk()); const hl = add(homeless, 'g', 'great-gull', 'm5', { home: undefined }); add(homeless, 'c', 'wrack-crab', 'm20'); beat(homeless, noon);
    assert.equal(hl.home, 'm5', 'one with no home on record still knows where to come back to');

    // A scavenger flies to a body, not to the living.
    const r = mk(); const raven = add(r, 'r', 'scarp-raven', 'm5'); add(r, 'h', 'mountain-hare', 'm15'); beat(r, noon);
    assert.equal(raven.aloft, undefined, 'a raven does not hunt the hare');
    r.traces.set('m20', [{ kind: 'blood', at: noon, prey: 'mountain-hare' }]); beat(r, noon + 20_000);
    assert.equal(raven.aloft, undefined, 'having just looked, it does not search again on the next check');
    beat(r, noon + 80_000);
    assert.equal(raven.flightTo, 'm20', 'it goes to the body');

    // The slow world leaves one in the air alone, in both of its loops.
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zone, /if \(c\.aloft !== undefined\) continue; \/\/ in the air/, 'the far world');
    assert.match(zone, /if \(c\.aloft !== undefined && !tmpl\.is_boss\) continue;/, 'the catch-up');

    // The lynx draws only from rooms with living prey close by, when any have it.
    const f = mk();
    world.mobSpawns.push({ template_id: 'lynx', room_id: 'm0' }, { template_id: 'lynx', room_id: 'm39' });
    add(f, 'p1', 'ptarmigan', 'm20');
    for (let i = 0; i < 300; i++) assert.ok(nearby('m20', 3).has(groupPickHome(f, 'lynx', noon)), 'a lynx settles by prey');
    const empty = mk();
    assert.ok(groupPickHome(empty, 'lynx', noon), 'and with none anywhere it still settles');
    world.mobSpawns.length = 0;

    // A grazer settles only with grazing in reach of home. The-wind-flat grazes.
    const ids = ['gate', 'the-wind-flat', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];
    const gr = new Map(ids.map((id) => [id, { id }]));
    const gx = new Map(ids.map((id, i) => [id, [...(ids[i + 1] ? [{ to_room: ids[i + 1] }] : []), ...(i ? [{ to_room: ids[i - 1] }] : [])]]));
    const gn = (from, depth) => { const out = new Map([[from, 0]]), q = [from]; for (const at of q) { const d = out.get(at); if (d < depth) for (const e of gx.get(at)) if (!out.has(e.to_room)) { out.set(e.to_room, d + 1); q.push(e.to_room); } } return out; };
    const gw = { rooms: gr, exits: gx, entryRooms: new Set(['gate']), safeRooms: new Set(), mobSpawns: [{ template_id: 'ptarmigan', room_id: 'the-wind-flat' }, { template_id: 'ptarmigan', room_id: 'g8' }] };
    assert.deepEqual(mountainHomes({ world: gw, regionOf: () => 'mountain', nearby: gn }, 'ptarmigan').sort(), ['g1', 'g2', 'g3', 'g4', 'g5', 'the-wind-flat'].sort(), 'grazing within five rooms and no further');
  });

  check('beasts: the mountain count tells packs, limits, flights and who killed what (2026-11-06)', () => {
    const now = 3_000_000_000, DAY = 86_400_000;
    const creatures = new Map();
    const add = (id, templateId, home, extra = {}) => creatures.set(id, { id, templateId, roomId: home, home, ...extra });
    add('w1', 'hill-wolf', 'the-shiel-street', { group: 'p' }); add('w2', 'hill-wolf', 'the-shiel-street', { group: 'p' });
    add('w3', 'hill-wolf', 'the-north-scree', { lone: true }); add('w4', 'hill-wolf', 'the-north-scree');
    add('r1', 'scarp-raven', 'the-first-crag'); add('r2', 'scarp-raven', 'the-first-crag');
    add('r3', 'scarp-raven', 'the-first-crag', { aloft: now + 5000, flightTo: 'the-bone-ground' });
    add('off', 'scarp-raven', 'wood-room');
    const tm = (id, name) => [id, { id, name }];
    const z = { creatures, variantBase: new Map([['lead-wolf', 'hill-wolf']]), groups: { at: 0, packs: { p: { line: 'hill-wolf', home: 'the-shiel-street', size: 4, peak: 2 } }, gone: {} },
      regionOf: (r) => r === 'wood-room' ? 'wood' : 'mountain',
      world: { rooms: new Map([['the-shiel-street', { name: 'The Shiel Street' }], ['the-first-crag', { name: 'The First Crag' }]]),
        mobSpawns: [{ template_id: 'hill-wolf', room_id: 'x' }, { template_id: 'hill-wolf', room_id: 'y' }, { template_id: 'scarp-raven', room_id: 'wood-room' }],
        mobTemplates: new Map([tm('hill-wolf', 'a hill wolf'), tm('scarp-raven', 'a scarp raven'), tm('lynx', 'a lynx')]) } };
    beasts.note(z, 'flights', now); beasts.note(z, 'flights', now); beasts.note(z, 'chases', now); beasts.note(z, 'caught', now); beasts.note(z, 'stolen', now);
    beasts.noteKill(z, creatures.get('r1'), 'lynx', now);
    beasts.noteKill(z, creatures.get('w1'), 'wanderers', now);
    beasts.noteKill(z, creatures.get('off'), 'lynx', now);
    const read = beasts.lines(z, now).join('\n');
    assert.match(read, /Wolves: 4 alive, 1 alone, 2 in the hamlet, 1 not sorted yet/);
    assert.match(read, /pack of 2 at The Shiel Street/);
    assert.match(read, /hill wolf: 4 of 2/, 'alive against the limit, and it can read over');
    assert.match(read, /scarp raven: 3 of 0/, 'the wood raven is not the mountain\'s, in the count or the limit');
    assert.match(read, /Birds: 1 in the air now, most in one room 2 at The First Crag/);
    assert.match(read, /0 homes given up, 2 flights, 1 chases, 1 small hunters caught, 1 kills stolen/);
    assert.match(read, /scarp raven 1: lynx 1/, 'who killed what, and not off the mountain');
    assert.match(read, /hill wolf 1: wanderers 1/, 'wanderers count too');
    beasts.note(z, 'flights', now + DAY);
    const later = beasts.lines(z, now + DAY).join('\n');
    assert.match(later, /In the last hour: 0 homes given up, 1 flights/, 'a new day starts fresh');
    assert.match(later, /The 24 hours before: 0 homes given up, 2 flights/, 'and keeps the day before');
    // The hamlet is the hamlet's real rooms, whether a wolf lives there or just stands there (2026-11-06).
    add('w5', 'hill-wolf', 'the-spring-green', { lone: true });              // home in the hamlet, on green ground
    add('w6', 'hill-wolf', 'the-turf-wall', { lone: true });                 // a fold near the Shieling, not the hamlet
    add('w7', 'hill-wolf', 'the-north-scree', { lone: true, roomId: 'the-shiel-street' }); // lives away, stands in it
    add('w8', 'hill-wolf', 'the-hill-graves', { lone: true, roomId: 'the-first-crag' }); // lives in it, out hunting
    assert.match(beasts.lines(z, now + 2 * DAY).join('\n'), /Wolves: 8 alive, 5 alone, 5 in the hamlet/);
    for (const id of ['w5', 'w6', 'w7', 'w8']) creatures.delete(id);
    const vs = readFileSync(new URL('../src/verbs.ts', import.meta.url), 'utf8');
    assert.match(vs, /export function cmdBeasts\(z: ZoneDO, session: Session\): void \{\n\s*if \(session\.pubkey !== CENSUS_PUBKEY\)/, 'only the keeper reads it');
    const census = vs.slice(vs.indexOf('export async function cmdCensus'));
    assert.ok(!census.slice(0, census.indexOf('\nexport ', 10)).includes('beasts.'), 'and it stays out of the census');
    const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    assert.ok(!/preyFalls\(z, victim, vt\);/.test(ai), 'every hunter kill is told who did it');
    assert.match(readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8'), /beasts\.noteKill\(this, creature, "wanderers"\)/);
    assert.match(readFileSync(new URL('../src/gate.ts', import.meta.url), 'utf8'), /v === "beasts"/, 'it reads by the fire too');
  });

  // ---------------------------------------------------------------- the 2026-11-10 audit
  console.log('the audit of 2026-11-10');
  {
    const sec = await import(pathToFileURL(output));
    await checkAsync('a login signature made for another site is refused (2026-11-10: the challenge did not say where it would be spent)', async () => {
      const spent = new Set();
      const env = { JWT_SECRET: 'regress-' + crypto.randomUUID(), DB: { prepare(sql) { return { bind(...a) { return { async run() {
        if (!sql.startsWith('INSERT')) return { meta: { changes: 0 } };
        const fresh = !spent.has(a[0]); spent.add(a[0]); return { meta: { changes: fresh ? 1 : 0 } };
      } }; } }; } } };
      const sk = sec.newNostrKey();
      const tryLogin = async (tags, at = 'https://nomadmud.com') => {
        const { challenge } = await (await sec.handleChallenge(env)).json();
        const event = sec.signNostr({ kind: 27235, created_at: Math.floor(Date.now() / 1000), tags, content: challenge }, sk);
        const res = await sec.handleVerify(new Request(at + '/auth/verify', { method: 'POST', body: JSON.stringify({ event }) }), env);
        return [res.status, (await res.json()).error];
      };
      assert.deepEqual(await tryLogin([]), [401, 'wrong_site'], 'no site named');
      assert.deepEqual(await tryLogin([['u', 'https://evil.example/auth/verify']]), [401, 'wrong_site'], 'another site named');
      assert.deepEqual(await tryLogin([['u', 'https://evil.example/auth/verify'], ['u', 'https://nomadmud.com/auth/verify']]), [401, 'wrong_site'], 'two sites named');
      assert.deepEqual(await tryLogin([['u', 'https://nomadmud.com/auth/verify']], 'https://www.nomadmud.com'), [401, 'wrong_site'], 'the site is the one asked, not a fixed one');
      assert.equal((await tryLogin([['u', 'https://nomadmud.com/auth/verify'], ['method', 'POST']]))[0], 200, 'this site named');
      assert.equal((await tryLogin([['u', 'http://localhost:8787/auth/verify']], 'http://localhost:8787'))[0], 200, 'and a local server is its own site');
      const page = readFileSync(new URL('../src/public.ts', import.meta.url), 'utf8');
      assert.match(page, /kind: 27235,[^\n]*\["u", location\.origin \+ "\/auth\/verify"\]/, 'the page names its own site in what it signs');
    });
    const { ZoneDO: Z } = sec;
    const mkSession = (tokens) => {
      const att = { pubkey: 'p', pid: 'page', att: 1 };
      return { pubkey: 'p', name: 'Tester', tokens, tokensAt: Date.now(), items: [], roomId: 'r',
        ws: { deserializeAttachment: () => att, serializeAttachment(a) { Object.assign(att, a); this.wrote = (this.wrote ?? 0) + 1; }, send() {} } };
    };
    const mkZone = () => { const z = Object.create(Z.prototype); z.sent = []; z.send = (s, text) => { z.sent.push(text); }; z.env = {}; return z; };
    await checkAsync('typed words carry no control marks (2026-11-10: a typed rarity marker painted a spoken line as loot)', async () => {
      assert.equal(sec.cleanCommand('say \u0001epic\u0002a sword\u0002 ‮flip⁦ \u009bx'), 'say epica sword flip x');
      assert.equal(sec.cleanCommand("say café 日本\tok\nthen \u{1F525}"), "say café 日本\tok\nthen \u{1F525}", 'ordinary letters, tab, newline and emoji stay');
      const z = mkZone(), s = mkSession(6);
      await z.onMessage(s, JSON.stringify({ t: 'cmd', text: 'alias kr = say \u0001epic\u0002hi‮' }));
      assert.equal(s.aliases.get('kr'), 'say epichi', 'cleaned on the way in, before anything reads the line');
    });
    await checkAsync('the arena switch pays a token like any frame (2026-11-10: it was answered above the limit, free)', async () => {
      const z = mkZone(), dry = mkSession(0);
      let admitted = 0;
      await z.onMessage(dry, JSON.stringify({ t: 'arena', on: false }), () => admitted++);
      assert.equal(dry.arenaOff, undefined, 'out of tokens: nothing changes');
      assert.equal(dry.ws.wrote, undefined, 'and nothing is written to the socket');
      assert.equal(z.sent.length, 0, 'said quietly, like the other panel frames');
      const s = mkSession(6);
      await z.onMessage(s, JSON.stringify({ t: 'arena', on: false }), () => admitted++);
      assert.equal(s.arenaOff, true, 'with a token it works as before');
      assert.ok(s.tokens < 6, 'and the token is spent');
      assert.equal(s.ws.deserializeAttachment().pid, 'page', 'the dial id stays on the socket');
      assert.equal(admitted, 0, 'it is not a command: no world-wide save follows it');
    });
    check('an over-long page id is dropped, not stored on the socket (2026-11-10: it overran the socket note after the old socket was closed)', () => {
      assert.deepEqual(sec.dialId('lx3k9abcd1234', '3'), { pid: 'lx3k9abcd1234', att: 3 });
      assert.deepEqual(sec.dialId('x'.repeat(65), '3'), { pid: null, att: 3 });
      assert.deepEqual(sec.dialId('x'.repeat(4000), '1e400'), { pid: null, att: null });
      assert.deepEqual(sec.dialId(null, null), { pid: null, att: null }, 'an older page sends neither');
      assert.deepEqual(sec.dialId('p', '-1'), { pid: 'p', att: null });
      assert.deepEqual(sec.dialId('p', '0'), { pid: 'p', att: 0 });
      const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
      assert.match(zs, /const \{ pid, att \} = dialId\(qs\.get\("pid"\), qs\.get\("att"\)\);/, 'the socket door uses it');
    });
  }

  // ---------------------------------------------------------------- the database is not written for nothing
  console.log('player saves');
  await checkAsync('a player who has not changed is not written to the database again (2026-11-10: every connected player was rewritten every ten seconds, three of every four rows the database wrote)', async () => {
    const m = await import(pathToFileURL(output));
    const writes = [];
    let fail = false, journals = 0;
    const z = Object.create(m.ZoneDO.prototype);
    Object.assign(z, {
      sessions: new Map(), savedMark: new Map(), dirtySaves: new Set(), bodyJournal: new Map(),
      state: { storage: { async put() {}, async delete() {} } },
      env: { DB: { prepare: (sql) => ({ bind: (...a) => ({ async run() { if (fail) throw new Error('busy'); writes.push(a); return { meta: { changes: 1 } }; } }) }) } },
      checkpointBody: async () => { journals++; },
    });
    const s = { pubkey: 'p', roomId: 'the-green', hp: 80, exhaustion: { units: 0, at: 1, mode: 'passive' } };
    z.sessions.set('p', s);
    const quiet = console.error; console.error = () => {};
    try {
      const t = Date.now();
      await z.flushPlayer(s, t);
      assert.equal(writes.length, 1, 'the first flush writes the row');
      await z.flushPlayer(s, t + 10_000);
      s.exhaustion.at = 999; // the tiredness clock moves every beat and is not a change
      await z.flushPlayer(s, t + 20_000);
      assert.equal(writes.length, 1, 'standing still writes nothing more');
      assert.equal(journals, 3, 'and the body journal is still kept every time');
      s.hp = 81; await z.flushPlayer(s, t + 30_000);
      assert.equal(writes.length, 2, 'health moved');
      s.roomId = 'the-road'; await z.flushPlayer(s, t + 40_000);
      assert.equal(writes.length, 3, 'the room moved');
      s.exhaustion.units = 40; await z.flushPlayer(s, t + 50_000);
      assert.equal(writes.length, 4, 'tiredness moved');
      await z.flushPlayer(s, t + 60_000);
      assert.equal(writes.length, 4);
      await z.flushPlayer(s, Date.now() + m.PLAYER_SAVE_MAX_MS + 1);
      assert.equal(writes.length, 5, 'an unchanged player is still written once the long clock runs out');
      // a save the database refused is not remembered as done
      s.hp = 50; fail = true;
      await z.flushPlayer(s, Date.now());
      assert.ok(z.dirtySaves.has('p'), 'the failed save is queued');
      fail = false;
      await z.flushPlayer(s, Date.now());
      assert.equal(writes.length, 6, 'and the next flush writes it');
      assert.equal(writes.at(-1)[1], 50);
      // leaving forgets the mark, so the next arrival is written fresh
      await z.trySavePlayer('p', s.roomId, s.hp, s);
      assert.equal(z.savedMark.has('p'), false);
    } finally { console.error = quiet; }
    assert.notEqual(m.saveMark('r', 1, { units: 0, mode: 'rest' }), m.saveMark('r', 1, { units: 0, mode: 'passive' }), 'the way of resting counts');
    const zs = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(zs, /FLUSH_INTERVAL_MS\) \{\n\s*this\.lastFlushAt = now;\n\s*await Promise\.all\(\[\.\.\.this\.sessions\.values\(\)\]\.map\(\(s\) => this\.flushPlayer\(s, now\)\)\);/, 'the beat uses it');
  });

  await checkAsync('the trophy board reads each player\'s items once and says the same as before (2026-11-10: it added every player up twice, 18,000 rows a board)', async () => {
    const m = await import(pathToFileURL(output));
    const { db, D1 } = sqliteD1();
    db.exec(`DROP TABLE players; CREATE TABLE players(pubkey TEXT PRIMARY KEY, name TEXT, lb_published_at INTEGER);
      CREATE TABLE item_templates(id TEXT PRIMARY KEY, barter REAL);`);
    // 150 trophies, past the 100-value ceiling that once killed this board
    const trophyIds = Array.from({ length: 150 }, (_, i) => 'trophy-' + i);
    const barter = new Map(trophyIds.map((id, i) => [id, i % 7 === 0 ? 0.3 : 1 + (i % 9) * 1.25]));
    barter.set('hardtack', 5); // worth something, but not a trophy
    for (const [id, b] of barter) db.prepare('INSERT INTO item_templates VALUES (?, ?)').run(id, b);
    let seed = 7; const rnd = (n) => (seed = (seed * 31 + 17) % 9973) % n; // small enough to stay exact
    const players = [], items = [];
    for (let i = 0; i < 40; i++) players.push({ pubkey: 'pk' + i, name: 'P' + i, pub: i % 5 === 0 ? null : 1000 - (i % 4) }); // some never entered, some tied on the day
    players.push({ pubkey: 'crumbs', name: 'Crumbs', pub: 1 }); // only a 0.3 trophy: rounds to nothing
    items.push({ pubkey: 'crumbs', item_id: 'trophy-0', container: '' });
    // two with the same hoard: the one who entered first stands higher
    players.push({ pubkey: 'tie-late', name: 'Late', pub: 5 }, { pubkey: 'tie-early', name: 'Early', pub: 3 });
    for (const pk of ['tie-late', 'tie-early']) for (let n = 0; n < 40; n++) items.push({ pubkey: pk, item_id: 'trophy-8', container: 'vault' });
    for (const pl of players.slice(0, 40)) for (let n = rnd(14); n > 0; n--) {
      items.push({ pubkey: pl.pubkey, item_id: rnd(4) === 0 ? 'hardtack' : trophyIds[rnd(150)], container: [null, '', 'lockbox', 'vault', 'den:the-green'][rnd(5)] });
    }
    for (const pl of players) db.prepare('INSERT INTO players VALUES (?, ?, ?)').run(pl.pubkey, pl.name, pl.pub);
    items.forEach((it, i) => db.prepare('INSERT INTO player_items(id, item_id, pubkey, container) VALUES (?, ?, ?, ?)').run('row' + i, it.item_id, it.pubkey, it.container));
    // the board worked out by hand, from the rule and not from any SQL
    const want = players.filter((pl) => pl.pub !== null).map((pl) => ({ ...pl, score: Math.round(items
      .filter((it) => it.pubkey === pl.pubkey && [null, '', 'lockbox', 'vault'].includes(it.container) && it.item_id.startsWith('trophy-'))
      .reduce((n, it) => n + barter.get(it.item_id), 0)) }))
      .filter((pl) => pl.score > 0).sort((a, b) => b.score - a.score || a.pub - b.pub);
    assert.ok(want.length > 10, 'the made-up world has a real board');
    assert.deepEqual(want.slice(0, 2).map((e) => e.pubkey), ['tie-early', 'tie-late'], 'and the tie leads it');
    const seen = [];
    const watched = { prepare(q) { seen.push(q); return D1.prepare(q); } };
    const opts = { bossPts: 100, pvpPts: 25, accountPts: 10, chartPts: 50, trophyIds };
    const top = await m.loadLeaderboard(watched, 'trophies', 100, opts);
    const key = (e) => e.score + ':' + e.pubkey;
    // ties on score and day have no further order, so compare each score's set
    assert.deepEqual(top.map((e) => e.score), want.map((e) => e.score), 'same scores in the same order');
    assert.deepEqual(top.map(key).sort(), want.map(key).sort(), 'same players');
    assert.deepEqual(top.slice(0, 2).map((e) => e.pubkey), ['tie-early', 'tie-late'], 'a tie goes to whoever entered first');
    assert.ok(!top.some((e) => e.pubkey === 'crumbs'), 'a hoard that rounds to nothing is not on the board');
    assert.deepEqual((await m.loadLeaderboard(watched, 'trophies', 3, opts)).map((e) => e.score), want.slice(0, 3).map((e) => e.score));
    assert.ok(!seen.some((q) => /SUM\(it\.barter\)[\s\S]*SUM\(it\.barter\)/.test(q)), 'no board query adds the hoard up twice');
    for (const pl of [want[0], want[5], want.at(-1)]) {
      const r = await m.leaderboardRank(watched, pl.pubkey, 'trophies', opts);
      assert.deepEqual(r, { rank: want.filter((o) => o.score > pl.score).length + 1, score: pl.score }, 'a rank is how many are ahead, plus one');
    }
    assert.equal(await m.leaderboardRank(watched, 'pk0', 'trophies', opts), null, 'never entered: no rank');
    assert.equal(await m.leaderboardRank(watched, 'crumbs', 'trophies', opts), null);
    assert.ok(!seen.some((q) => /COUNT\(\*\) AS n FROM players p[\s\S]*SUM\(it\.barter\)/.test(q)), 'the count of who is ahead does not run the sum per player');
    assert.deepEqual(await m.loadLeaderboard(watched, 'trophies', 10, { ...opts, trophyIds: [] }), [], 'no world loaded: an empty board, not an error');
  });

  await checkAsync('migrations are written down as they run, and a skipped or doubled one stops the work (2026-11-10: nothing recorded which had been applied)', async () => {
    const mig = await import(new URL('./migrate.mjs', import.meta.url));
    const files = ['001_a.sql', '002_b.sql', '003_c.sql', '004_d.sql', 'README.md'];
    assert.deepEqual(mig.plan(files, ['001_a.sql', '002_b.sql']), { pending: ['003_c.sql', '004_d.sql'], last: '002_b.sql' });
    assert.deepEqual(mig.plan(files, []), { pending: files.slice(0, 4), last: null });
    assert.deepEqual(mig.plan(files, files.slice(0, 4)), { pending: [], last: '004_d.sql' });
    assert.match(mig.plan(files, null).stop, /no migration record yet/, 'no record: it never guesses');
    assert.match(mig.plan(files, ['001_a.sql', '003_c.sql']).stop, /Skipped: 002_b\.sql/, 'a skipped file stops everything after it');
    assert.match(mig.plan([...files, '004_e.sql'], ['001_a.sql']).stop, /share a number: 004_d\.sql and 004_e\.sql/, 'two sessions taking the same number');
    assert.match(mig.plan(files, ['001_a.sql', '009_z.sql']).stop, /not in this folder: 009_z\.sql/);
    assert.match(mig.plan([...files, 'fix.sql'], []).stop, /not named like a migration/);
    assert.deepEqual(mig.baselineNames(files, 3), ['001_a.sql', '002_b.sql', '003_c.sql']);
    const one = mig.withRecord('003_c.sql', 'UPDATE t SET a = 1; -- trailing note');
    assert.match(one, /-- trailing note\nINSERT INTO schema_migrations \(name, applied_at\) VALUES \('003_c\.sql', unixepoch\(\)\);\n$/, 'the record rides in the same file, clear of a last-line comment');
    // 380's first run on production (2026-11-10): a file already closed with `;`
    // was given a second one, and production refuses an empty statement. However
    // the file ends, what is sent holds its statements and the record, none empty.
    const endings = { closed: 'UPDATE t SET a = 1;\n', 'closed, then a note': 'UPDATE t SET a = 1;\n-- done\n', open: 'UPDATE t SET a = 1', 'open, then a note': 'UPDATE t SET a = 1 -- done' };
    for (const [how, sql] of Object.entries(endings)) {
      const parts = mig.withRecord('003_c.sql', sql).replace(/--[^\n]*/g, '').split(';').map((s) => s.trim());
      assert.deepEqual(parts.map((s) => s.split(' ')[0]), ['UPDATE', 'INSERT', ''], 'a file left ' + how + ': two statements, no empty one');
    }
    assert.throws(() => mig.withRecord("x'); DROP TABLE players;--.sql", ''), /not a migration name/);
    // and the real folder is in a state it can work from
    const real = readdirSync(new URL('../migrations/', import.meta.url));
    const p = mig.plan(real, []);
    assert.equal(p.stop, undefined, 'every real migration is named right and no two share a number');
    assert.equal(p.pending.length, real.filter((f) => f.endsWith('.sql')).length);
  });

  console.log(`\n${passed} regression checks pass`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
