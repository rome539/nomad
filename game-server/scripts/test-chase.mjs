// The chase (chase.ts): a hunter that missed its rush runs the prey down, and
// a runner you got away from comes after you, a beat behind, for a few rooms.
// A stub world on a line of rooms with fixed dice. No network, no database.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'nomad-chase-'));
const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
let roll = 0; // 0: every chance() comes up and every randInt is its lowest
try {
  const output = join(dir, 'chase.mjs');
  await build({
    stdin: { contents: "export * as chase from './chase'; export { CHASE_PREY, CHASE_PLAYERS, CHASE_LAG_MAX_MS, CHASE_MEMORY_MS } from './zone-data';", resolveDir: root, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'silent',
    plugins: [{ name: 'text', setup(b) { b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ }, async () => ({ contents: '', loader: 'text' })); } }],
  });
  const { chase, CHASE_LAG_MAX_MS, CHASE_MEMORY_MS } = await import(pathToFileURL(output));
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues(a) { a.fill(roll); return a; }, randomUUID: () => 'u' } });

  const HP = { 'grey-wolf': 26, 'roe-deer': 16, 'hill-fox': 14, 'stone-adder': 12, lynx: 30, 'brown-bear': 70 };
  // a - b - c - d in a line, and a gate off d.
  function world() {
    const feed = [], said = [];
    const line = ['a', 'b', 'c', 'd'];
    const exits = new Map(line.map((r, i) => [r, [
      ...(i > 0 ? [{ dir: 'west', to_room: line[i - 1] }] : []),
      ...(i < line.length - 1 ? [{ dir: 'east', to_room: line[i + 1] }] : []),
      ...(r === 'd' ? [{ dir: 'north', to_room: 'gate' }] : []),
    ]]));
    const base = {
      creatures: new Map(), sessions: new Map(), traces: new Map(), ground: new Map(), events: new Map(), openDoors: new Set(), variantBase: new Map(), conditions: new Map(), condTrack: new Map(), herds: new Map(), snowUntil: 0,
      world: {
        exits, safeRooms: new Set(), entryRooms: new Set(['gate']), mobKeys: [], mobSpawns: [], mobVariants: [], itemTemplates: new Map(), rooms: new Map([...line, 'gate'].map((r) => [r, { id: r, name: r }])),
        mobTemplates: new Map(Object.entries(HP).map(([id, hp]) => [id, { id, name: `a ${id}`, max_hp: hp, dmg_min: 1, dmg_max: 2, armor: 0 }])),
      },
      roomFeed: (_r, text) => feed.push(text),
      send: (_s, text) => said.push(text),
      reachable: (s) => s.roomId !== 'gate' && !s.barred,
      outOfWorld: (s) => s.roomId === 'gate',
      creatureFirstStrike: async (c, _t, v) => { said.push('FIRST STRIKE ' + c.id); },
      roomDist: (x, y) => Math.abs(line.indexOf(x) - line.indexOf(y)),
      regionOf: () => 'wood',
      creaturesInRoom(r) { return [...this.creatures.values()].filter((c) => c.roomId === r); },
      nearby: () => new Map(),
    };
    // Anything else the move asks of the zone is a quiet no-op, or an empty map.
    const none = () => [][Symbol.iterator]();
    const empty = Object.assign(() => undefined, { get: () => undefined, has: () => false, values: none, keys: none, entries: none, size: 0, [Symbol.iterator]: none });
    const z = new Proxy(base, { get: (t, k) => (k in t ? t[k] : empty) });
    return { z, feed, said };
  }
  const mob = (z, id, templateId, roomId, extra = {}) => {
    const c = { id, templateId, roomId, home: roomId, hp: HP[templateId], hunger: 0, grudges: [], nextWanderAt: 0, target: null, ...extra };
    z.creatures.set(id, c);
    return c;
  };
  const now = 1_000_000_000;

  { // THE PREY
    const { z, feed } = world();
    const wolf = mob(z, 'w', 'grey-wolf', 'a');
    const deer = mob(z, 'd', 'roe-deer', 'a');
    wolf.huntRestUntil = now + 999_999;
    assert.equal(chase.onMiss(wolf, deer, now), true, 'a wolf goes after a deer it missed');
    assert.ok(wolf.chase.left >= 3 && wolf.chase.left <= 5, 'for three to five rooms');
    assert.equal(wolf.huntRestUntil, undefined, 'and is not left standing blown');
    deer.roomId = 'b'; // it ran
    await chase.tick(z, now);
    assert.equal(wolf.roomId, 'a', 'a beat behind, not at once');
    const left = wolf.chase.left;
    await chase.tick(z, now + CHASE_LAG_MAX_MS);
    assert.equal(wolf.roomId, 'b', 'it comes through after it');
    assert.equal(wolf.chase.left, left - 1, 'and that cost it a room');
    assert.ok(wolf.huntRestUntil > now && wolf.huntRestUntil < now + CHASE_LAG_MAX_MS + 10_000, 'it rushes again soon');
    assert.equal(chase.chasedHere(z, wolf), deer, 'and the deer is the one it rushes');
    chase.onMiss(wolf, deer, now + 10_000);
    assert.equal(wolf.chase.left, left - 1, 'missing again is the same chase, not a fresh one');
    chase.caught(wolf);
    assert.equal(wolf.chase, undefined, 'a catch ends it');
    void feed;
    console.log('PASS: a wolf that misses runs the deer down, a beat behind, a room at a time.');
  }

  { // RUN OUT
    const { z } = world();
    const wolf = mob(z, 'w', 'grey-wolf', 'a');
    const deer = mob(z, 'd', 'roe-deer', 'a');
    chase.onMiss(wolf, deer, now);
    wolf.chase.left = 1;
    deer.roomId = 'b';
    await chase.tick(z, now + CHASE_LAG_MAX_MS);
    assert.equal(wolf.roomId, 'b');
    chase.onMiss(wolf, deer, now + 20_000);
    assert.equal(wolf.chase, undefined, 'no rooms left: no chase');
    const fox = mob(z, 'f', 'hill-fox', 'c');
    const hare = mob(z, 'h', 'roe-deer', 'c');
    chase.onMiss(fox, hare, now);
    assert.ok(fox.chase.left >= 1 && fox.chase.left <= 2, 'a fox follows a miss only a little way');
    hare.roomId = 'a'; // two rooms off: the trail is lost
    await chase.tick(z, now + CHASE_LAG_MAX_MS);
    assert.equal(fox.chase, undefined, 'lost the trail, the chase is over');
    assert.ok(fox.huntRestUntil > now + 60_000, 'and it stands blown, as a miss always left it');
    for (const t of ['stone-adder', 'lynx', 'brown-bear']) {
      const h = mob(z, 'x' + t, t, 'a');
      assert.equal(chase.onMiss(h, deer, now), false, t + ' does not run its prey down');
    }
    console.log('PASS: the chase runs out, a lost trail ends it, and only the runners chase prey.');
  }

  { // YOU
    const { z, said, feed } = world();
    const wolf = mob(z, 'w', 'grey-wolf', 'a');
    const you = { pubkey: 'you', name: 'You', roomId: 'b', hp: 60, target: null };
    z.sessions.set('you', you);
    chase.lostYou(z, wolf, you, now);
    assert.ok(wolf.chase.left >= 2 && wolf.chase.left <= 4, 'a wolf you ran from comes after you, two to four rooms');
    await chase.tick(z, now + CHASE_LAG_MAX_MS);
    assert.equal(wolf.roomId, 'b');
    assert.equal(wolf.target, 'you', 'it has you again');
    assert.equal(you.target, 'w');
    assert.ok(said.some((l) => /grey-wolf/.test(l) && /after you|behind you/.test(l)), 'and you are told');
    assert.ok(said.includes('FIRST STRIKE w'), 'coming through after you, it gets the jump');
    assert.ok(feed.some((l) => /comes in after You/.test(l)), 'the room sees it');
    // you run again: the same chase, with what it had left
    const left = wolf.chase.left;
    wolf.target = null; you.roomId = 'c';
    chase.lostYou(z, wolf, you, now + 20_000);
    assert.equal(wolf.chase.left, left, 'running again soon is the same chase');
    wolf.chase.left = 0;
    you.roomId = 'd';
    chase.lostYou(z, wolf, you, now + 30_000);
    await chase.tick(z, now + 30_000 + CHASE_LAG_MAX_MS);
    assert.equal(wolf.roomId, 'b', 'spent: it lets you go');
    chase.lostYou(z, wolf, you, now + 30_000 + CHASE_MEMORY_MS + 1);
    assert.ok(wolf.chase.left > 0, 'long after, it is a fresh chase');
    console.log('PASS: a wolf you run from comes after you, gets the jump, and runs out.');
  }

  { // WAYS OUT
    const { z } = world();
    const you = { pubkey: 'you', name: 'You', roomId: 'b', hp: 60, target: null };
    z.sessions.set('you', you);
    const hurt = mob(z, 'w', 'grey-wolf', 'a', { hp: 8 });
    chase.lostYou(z, hurt, you, now);
    assert.equal(hurt.chase, undefined, 'hurt badly, it lets you go');
    for (const t of ['lynx', 'stone-adder', 'hill-fox']) {
      const c = mob(z, 'x' + t, t, 'a');
      chase.lostYou(z, c, you, now);
      assert.equal(c.chase, undefined, t + ' does not chase a wanderer');
    }
    const bear = mob(z, 'bear', 'brown-bear', 'a');
    chase.lostYou(z, bear, you, now);
    assert.ok(bear.chase.left >= 1 && bear.chase.left <= 2, 'a bear charges a short way');
    const wolf = mob(z, 'w2', 'grey-wolf', 'a');
    chase.lostYou(z, wolf, you, now);
    you.roomId = 'c';
    await chase.tick(z, now + CHASE_LAG_MAX_MS);
    assert.equal(wolf.chase, undefined, 'two rooms ahead, you are away');
    const dog = mob(z, 'w3', 'grey-wolf', 'd');
    you.roomId = 'd';
    chase.lostYou(z, dog, you, now);
    you.roomId = 'gate';
    await chase.tick(z, now + CHASE_LAG_MAX_MS);
    assert.equal(dog.roomId, 'd', 'nothing follows you through a gate');
    assert.equal(dog.chase, undefined);
    // behind a barred den door: in the same room, and out of its reach
    const hound = mob(z, 'w4', 'grey-wolf', 'a');
    you.roomId = 'b';
    chase.lostYou(z, hound, you, now);
    you.roomId = 'a'; you.barred = true; you.target = null;
    await chase.tick(z, now + CHASE_LAG_MAX_MS);
    assert.equal(hound.target, null, 'a barred door is a barred door');
    assert.equal(hound.chase, undefined);
    you.barred = false;
    // a safe room is a way it cannot take: it stays where it is
    z.world.safeRooms.add('c');
    const cur = mob(z, 'w5', 'grey-wolf', 'b');
    you.roomId = 'b';
    chase.lostYou(z, cur, you, now);
    you.roomId = 'c';
    await chase.tick(z, now + CHASE_LAG_MAX_MS);
    assert.equal(cur.roomId, 'b', 'it does not wander off another way instead');
    assert.equal(cur.chase, undefined);
    z.world.safeRooms.delete('c');
    // spent: it does not take another room
    const tired = mob(z, 'w6', 'grey-wolf', 'a');
    tired.chase = { pubkey: 'you', left: 0, at: now, since: now };
    you.roomId = 'b';
    await chase.tick(z, now + 1);
    assert.equal(tired.roomId, 'a', 'no rooms left in it');
    assert.equal(tired.chase, undefined);
    console.log('PASS: hurt, outrun, through a gate, or never a chaser: you get away.');
  }

  { // WIRED IN
    const ai = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8');
    const zone = readFileSync(new URL('../src/zone.ts', import.meta.url), 'utf8');
    assert.match(ai, /const after = chase\.onMiss\(creature, victim, now\);[^\n]*\n\s*if \(!after\) creature\.huntRestUntil/, 'a miss asks whether to chase');
    assert.match(ai, /chase\.caught\(creature\);/, 'a catch ends it');
    assert.match(ai, /const chased = chase\.chasedHere\(z, creature\);/, 'the chased one is rushed first');
    assert.match(ai, /if \(!chased && !chance\(PREDATION_ODDS\)\) return false;/, 'without waiting on the odds');
    assert.match(ai, /if \(winded\(victim, now\)\) \{/, 'a blown animal stands');
    assert.match(ai, /const chaseTo = mode === "wander" \? creature\.chase\?\.to : undefined;/);
    assert.match(ai, /creature\.drift === undefined && !chaseTo\)/, 'a chase is not pulled back to its ground');
    assert.match(zone, /styles\.lostPrey\(this, creature, victim, now\);[^\n]*\n\s*chase\.lostYou\(this, creature, victim, now\);/, 'losing you starts it');
    assert.match(zone, /await chase\.tick\(this, now\);/, 'and it runs every beat');
    console.log('PASS: the chase is wired into the hunt, the move, and the fight.');
  }
} finally {
  if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
  await rm(dir, { recursive: true, force: true });
}
