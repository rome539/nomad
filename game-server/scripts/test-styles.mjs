// The ways of fighting (styles.ts): a charger, a heavy and a pack, against a
// stub world with fixed dice. No network, no database.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'nomad-styles-'));
const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
// rand() reads this: 0 makes every chance() true, ~1 makes every one false.
let roll = 0;
let lit = true;
try {
  const output = join(dir, 'styles.mjs');
  await build({
    stdin: {contents: "export * from './styles'; export * as E from './exhaustion';", resolveDir: root, loader: 'ts'}, bundle: true, platform: 'node', format: 'esm',
    outfile: output, logLevel: 'silent',
  });
  const S = await import(pathToFileURL(output));
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
    getRandomValues(a) { a.fill(roll); return a; },
  } });

  const T = { 'wild-boar': 34, 'the-baited-bear': 76, 'grey-wolf': 26, 'lead-wolf': 54, rat: 11, 'fen-viper': 18,
    'great-gull': 28, 'the-great-crab': 85, skeleton: 20, 'pale-crawler': 30, footpad: 18, 'the-sapper': 34 };
  function world(creatures, weapon = null) {
    const feed = [];
    const z = {
      creatures: new Map(creatures.map((c) => [c.id, c])),
      world: { mobTemplates: new Map(Object.entries(T).map(([id, hp]) => [id, { id, name: `a ${id}`, max_hp: hp }])) },
      creaturesInRoom(r) { return [...this.creatures.values()].filter((c) => c.roomId === r); },
      equippedItem: () => weapon,
      roomFeed: (_r, text) => feed.push(text),
      send: (_s, text) => feed.push(text),
      litFor: () => lit,
      refreshRoomCtx: () => {},
      sessions: new Map(),
      equippedArmor: (p) => p.armor ?? 0,
      reachable: () => true,
      outOfWorld: () => false,
      roomDist: (a, b) => (a === b ? 0 : 1),
      creatureFirstStrike: async (c, _t, v) => { v.hp -= 10; feed.push('FIRST STRIKE ' + c.id); },
    };
    return { z, feed };
  }
  const tmpl = (id) => ({ id, name: `a ${id}`, max_hp: T[id] });
  const you = (target = null) => ({ pubkey: 'you', name: 'You', stance: 'steady', target, hp: 60, maxHp: 60 });
  const now = Date.now();

  { // CHARGER
    const boar = { id: 'b', templateId: 'wild-boar', roomId: 'r', hp: 34, target: 'you' };
    const { z } = world([boar]);
    const first = S.creatureBlow(z, boar, tmpl('wild-boar'), you('b'), now);
    assert.equal(first.mult, 2, 'the first blow of a fight is a charge');
    assert.ok(first.line);
    assert.equal(S.playerSwing(z, you('b'), boar, tmpl('wild-boar'), null, now + 4000).mult, 1.5, 'blown after the charge: takes half again');
    assert.equal(S.playerSwing(z, you('b'), boar, tmpl('wild-boar'), null, now + 6000).mult, 1, '...for one round only');
    assert.equal(S.creatureBlow(z, boar, tmpl('wild-boar'), you('b'), now + 4000).mult, 1, 'no charge while it is in the fight');
    assert.equal(S.creatureBlow(z, boar, tmpl('wild-boar'), you('b'), now + 30_000).mult, 2, 'broke off and came back: charges again');
    const boar2 = { id: 'b2', templateId: 'wild-boar', roomId: 'r', hp: 34, target: 'you' };
    const spear = { tmpl: { name: 'a boar spear', traitMap: new Map([['reach', 1]]) } };
    const { z: z2 } = world([boar2], spear);
    const set = S.creatureBlow(z2, boar2, tmpl('wild-boar'), you('b2'), now);
    assert.equal(set.mult, 1, 'a spear set against it takes the charge');
    assert.ok(set.line.includes('a boar spear'));
    const boar3 = { id: 'b3', templateId: 'wild-boar', roomId: 'r', hp: 34, target: 'you' };
    S.entryStrike(boar3, now);
    assert.equal(S.creatureBlow(z, boar3, tmpl('wild-boar'), you('b3'), now + 4000).mult, 1, 'the rush in was the charge: no second one');
    console.log('PASS: charger charges from a standstill, is blown after, and a spear takes it.');
  }

  { // HEAVY
    const bear = { id: 'h', templateId: 'the-baited-bear', roomId: 'r', hp: 76, target: 'you' };
    const { z, feed } = world([bear]);
    roll = 0; // every knock-down roll comes up
    const mults = [], knocks = [];
    for (let i = 0; i < 6; i++) {
      S.E.creatureAttempt(bear, now + i * 4000);
      const b = S.creatureBlow(z, bear, tmpl('the-baited-bear'), you('h'), now + i * 4000);
      mults.push(Math.round(b.mult * 10) / 10); knocks.push(b.knock);
    }
    assert.deepEqual(mults, [1, 1, 1, 1, 1, 1], 'old heavy percentage decay must not stack with raw exhaustion');
    assert.equal(S.E.creatureDamage(bear, 20),17,'sixth attack uses five prior attempts: floor(5*5/8)=3 raw loss');
    assert.deepEqual(knocks, [true, true, true, true, false, false], 'only a fresh one knocks you down');
    assert.ok(S.tell(z, bear, 'you').includes('heaving'), 'and the look shows it');
    S.E.recoverCreature(bear,now+20000,false);
    S.E.recoverCreature(bear,now+60000,false);
    S.E.creatureAttempt(bear,now+60000);
    assert.equal(S.E.creatureDamage(bear,20),20);
    const rested = S.creatureBlow(z, bear, tmpl('the-baited-bear'), you('h'), now + 60_000);
    assert.equal(rested.mult, 1, 'rested: fresh again');
    roll = 0xffffffff;
    assert.equal(S.creatureBlow(z, bear, tmpl('the-baited-bear'), you('h'), now + 64_000).knock, false, 'the knock is a roll, not a certainty');
    roll = 0;
    console.log('PASS: heavy starts fresh, tires with every blow, knocks down only while fresh, rests back.');
  }

  { // PACK
    const a = { id: 'w1', templateId: 'grey-wolf', roomId: 'r', hp: 26, target: 'you' };
    const b = { id: 'w2', templateId: 'grey-wolf', roomId: 'r', hp: 26, target: 'you' };
    const lead = { id: 'w3', templateId: 'lead-wolf', roomId: 'r', hp: 54, target: 'you' };
    const { z, feed } = world([a, b, lead]);
    const facingA = you('w1');
    assert.equal(S.creatureBlow(z, a, tmpl('grey-wolf'), facingA, now).mult, 1, 'the one you face bites from the front');
    const side = S.creatureBlow(z, b, tmpl('grey-wolf'), facingA, now);
    assert.equal(side.mult, 1.4, 'the one you are not facing comes in from the side');
    assert.ok(lead.leads, 'the named lead leads');
    assert.ok(S.tell(z, lead, 'you').includes('lead'), 'and the look shows which one');
    z.creatures.delete('w3'); // the lead is killed
    assert.equal(S.creatureBlow(z, b, tmpl('grey-wolf'), facingA, now + 4000).mult, 1, 'lead dead: no more flanking');
    assert.equal(feed.filter((l) => l.includes('lead one down')).length, 1, 'the room is told once');
    assert.equal(S.creatureBlow(z, b, tmpl('grey-wolf'), facingA, now + 8000).mult, 1, 'and it stays that way');
    // a whole new pack in the same room, long after: no ghost of the old lead
    const n1 = { id: 'n1', templateId: 'grey-wolf', roomId: 'r', hp: 26, target: 'you' };
    const n2 = { id: 'n2', templateId: 'grey-wolf', roomId: 'r', hp: 26, target: 'you' };
    const n3 = { id: 'n3', templateId: 'lead-wolf', roomId: 'r', hp: 54, target: 'you' };
    z.creatures.clear(); for (const c of [n1, n2, n3]) z.creatures.set(c.id, c);
    const before = feed.length;
    assert.equal(S.creatureBlow(z, n2, tmpl('grey-wolf'), you('n1'), now + 11 * 60_000).mult, 1.4, 'a new pack later flanks again');
    assert.equal(feed.length, before, 'and nothing is announced about the old lead');
    const lone = { id: 'w9', templateId: 'grey-wolf', roomId: 'q', hp: 26, target: 'you' };
    const { z: z2 } = world([lone]);
    assert.equal(S.creatureBlow(z2, lone, tmpl('grey-wolf'), you('x'), now).mult, 1, 'one wolf alone is no pack');
    console.log('PASS: pack flanks while the lead lives, and loses its shape when it falls.');
  }

  const blade = (speed, extra = {}) => ({ tmpl: { name: 'a blade', speed, bleed: 1, stun: 0, traitMap: new Map(), ...extra } });
  const maul = { tmpl: { name: 'a maul', speed: 1, bleed: 0, stun: 0.2, traitMap: new Map() } };

  { // SWARM
    const rats = [1, 2, 3, 4].map((i) => ({ id: 'r' + i, templateId: 'rat', roomId: 'r', hp: 11, target: 'you' }));
    const { z, feed } = world(rats);
    assert.equal(S.creatureBlow(z, rats[0], tmpl('rat'), you(), now).mult, 1.75, 'three others on you: each bite is worse');
    z.creatures.delete('r4'); z.creatures.delete('r3');
    assert.equal(S.creatureBlow(z, rats[0], tmpl('rat'), you(), now + 4000).mult, 1.25, 'thinned out: the bite weakens');
    assert.equal(feed.filter((l) => l.includes('less sure')).length, 1, 'and the room hears it');
    console.log('PASS: swarm bites worse in numbers and weaker as it thins.');
  }

  { // STRIKER
    const viper = { id: 'v', templateId: 'fen-viper', roomId: 'r', hp: 18, target: 'you' };
    const { z } = world([viper]);
    roll = 0.3 * 0xffffffff; // rand() = 0.3: under the slow dodge, over the fast one
    assert.ok(S.playerSwing(z, you('v'), viper, tmpl('fen-viper'), blade(1), now).miss, 'slow steel misses it');
    assert.equal(S.playerSwing(z, you('v'), viper, tmpl('fen-viper'), blade(3), now).miss, undefined, 'fast steel finds it');
    S.creatureBlow(z, viper, tmpl('fen-viper'), you('v'), now);
    assert.equal(S.playerSwing(z, you('v'), viper, tmpl('fen-viper'), blade(1), now + 4000).miss, undefined, 'after it bites, your next swing cannot miss');
    roll = 0;
    console.log('PASS: striker dodges slow steel and is open after it bites.');
  }

  { // BIRDS
    T['hill-eagle'] = 34; T['gibbet-crow'] = 14; T['carrion-vulture'] = 40;
    // a gull: in reach on every pass, wheels off only after you hit it, then comes round again
    const gull = { id: 'g', templateId: 'great-gull', roomId: 'r', hp: 28, target: 'you' };
    const { z } = world([gull]);
    roll = 0;
    assert.equal(S.beforeAttack(z, gull, tmpl('great-gull'), you('g'), now), false, 'a gull unhit keeps pressing');
    assert.equal(S.beforeAttack(z, gull, tmpl('great-gull'), you('g'), now + 4000), false, '...and pressing');
    gull.hp = 20; // you land one
    assert.equal(S.beforeAttack(z, gull, tmpl('great-gull'), you('g'), now + 8000), true, 'hit, it wheels off');
    assert.ok(S.playerSwing(z, you('g'), gull, tmpl('great-gull'), blade(2), now + 12000).miss, 'out of reach for that pass');
    assert.equal(S.beforeAttack(z, gull, tmpl('great-gull'), you('g'), now + 12000), false, 'and comes round again');
    assert.equal(S.playerSwing(z, you('g'), gull, tmpl('great-gull'), blade(2), now + 16000).miss, undefined, 'in reach on the pass');
    // a crow: on foot; hit and hurt, it flaps up; it drops back when you are open
    const crow = { id: 'c', templateId: 'gibbet-crow', roomId: 'r', hp: 14, target: 'you' };
    const { z: zc } = world([crow]);
    roll = 0.9 * 0xffffffff; // no lucky lifts
    assert.equal(S.beforeAttack(zc, crow, tmpl('gibbet-crow'), you('c'), now), false, 'a crow fights on foot');
    crow.hp = 5; // hit, and under half
    assert.equal(S.beforeAttack(zc, crow, tmpl('gibbet-crow'), you('c'), now + 4000), true, 'hit and hurt, it flaps up');
    const bleeding = { ...you('c'), hp: 10 };
    roll = 0.5 * 0xffffffff;
    assert.equal(S.beforeAttack(zc, crow, tmpl('gibbet-crow'), bleeding, now + 8000), false, 'and drops on you when you are open');
    // an eagle: the one that fights from the air
    const eagle = { id: 'e', templateId: 'hill-eagle', roomId: 'r', hp: 34, target: 'you' };
    const { z: ze } = world([eagle]);
    roll = 0;
    assert.equal(S.beforeAttack(ze, eagle, tmpl('hill-eagle'), you('e'), now), false, 'it opens on the ground');
    S.creatureBlow(ze, eagle, tmpl('hill-eagle'), you('e'), now);
    assert.equal(S.beforeAttack(ze, eagle, tmpl('hill-eagle'), you('e'), now + 4000), true, 'it strikes, then climbs');
    assert.ok(S.playerSwing(ze, you('e'), eagle, tmpl('hill-eagle'), blade(2), now + 8000).miss, 'a sword cannot reach it');
    assert.equal(S.playerSwing(ze, you('e'), eagle, tmpl('hill-eagle'), blade(1, { traitMap: new Map([['reach', 1]]) }), now + 8000).miss, undefined, 'a spear can');
    roll = 0;
    assert.equal(S.beforeAttack(ze, eagle, tmpl('hill-eagle'), you('e'), now + 8000), false, 'it stoops');
    // a vulture fights on the ground
    const vul = { id: 'v', templateId: 'carrion-vulture', roomId: 'r', hp: 40, target: 'you' };
    const { z: zv } = world([vul]);
    vul.turnHp = 40; vul.hp = 10;
    assert.equal(S.beforeAttack(zv, vul, tmpl('carrion-vulture'), you('v'), now), false, 'a vulture never takes to the air mid-fight');
    roll = 0;
    console.log('PASS: gulls pass and wheel, crows fight on foot and flap up, eagles fight from the air, vultures stay down.');
  }

  { // PINCHER
    const crab = { id: 'c', templateId: 'the-great-crab', roomId: 'r', hp: 85, target: 'you' };
    const { z } = world([crab]);
    roll = 0;
    assert.equal(S.creatureBlow(z, crab, tmpl('the-great-crab'), you('c'), now).pin, true, 'a claw can take your arm');
    const held = { ...you('c'), seizedBy: 'c' };
    assert.equal(S.playerSwing(z, held, crab, tmpl('the-great-crab'), blade(2), now).mult, 0.6, 'and you hit weakly while it has it');
    console.log('PASS: pincher pins an arm and weakens your blows.');
  }

  { // HOLLOW
    const bones = { id: 's', templateId: 'skeleton', roomId: 'r', hp: 20, target: 'you' };
    const { z } = world([bones]);
    assert.equal(S.playerSwing(z, you('s'), bones, tmpl('skeleton'), blade(2), now).mult, 0.7, 'an edge skates off bone');
    assert.equal(S.playerSwing(z, you('s'), bones, tmpl('skeleton'), maul, now).mult, 1.3, 'weight breaks it');
    console.log('PASS: hollow shrugs edges and breaks under weight.');
  }

  { // LURKER
    const crawler = { id: 'l', templateId: 'pale-crawler', roomId: 'r', hp: 30, target: 'you' };
    const { z } = world([crawler]);
    lit = true; roll = 0;
    assert.equal(S.beforeAttack(z, crawler, tmpl('pale-crawler'), you('l'), now), false, 'in your light it stays and fights');
    lit = false;
    assert.equal(S.beforeAttack(z, crawler, tmpl('pale-crawler'), you('l'), now), true, 'in the dark it goes back into it');
    assert.ok(S.playerSwing(z, you('l'), crawler, tmpl('pale-crawler'), blade(2), now + 4000).miss, 'and you swing at nothing');
    assert.equal(S.beforeAttack(z, crawler, tmpl('pale-crawler'), you('l'), now + 4000), false, 'it comes again');
    const drop = S.creatureBlow(z, crawler, tmpl('pale-crawler'), you('l'), now + 4000);
    assert.equal(drop.mult, 1.5, 'out of the dark, heavy');
    lit = true;
    console.log('PASS: lurker fades back into the dark without your light and comes again.');
  }

  { // CUTTHROAT + FOLK
    const pad = { id: 'f', templateId: 'footpad', roomId: 'r', hp: 18, target: 'you' };
    const { z } = world([pad]);
    roll = 0;
    assert.equal(S.creatureBlow(z, pad, tmpl('footpad'), you('f'), now).feint, true, 'a footpad feints');
    const sapper = { id: 'p', templateId: 'the-sapper', roomId: 'r', hp: 34, target: 'you' };
    const { z: z2, feed } = world([sapper]);
    assert.equal(S.playerSwing(z2, you('p'), sapper, tmpl('the-sapper'), blade(2), now).mult, 1, 'healthy: steady');
    sapper.hp = 15;
    assert.equal(S.playerSwing(z2, you('p'), sapper, tmpl('the-sapper'), blade(2), now).mult, 0.6, 'hurt: guarded against the edge');
    assert.equal(S.playerSwing(z2, you('p'), sapper, tmpl('the-sapper'), maul, now).mult, 1, 'weight goes through the guard');
    sapper.hp = 5;
    assert.equal(S.creatureBlow(z2, sapper, tmpl('the-sapper'), you('p'), now).mult, 1.5, 'nearly done: reckless');
    assert.equal(feed.length, 2, 'each change of stance is told once');
    console.log('PASS: cutthroats feint; folk go guarded, then reckless, and say so.');
  }

  { // WOLVES GO FOR THE WEAKEST
    T['grey-wolf'] = 26;
    const w = { id: 'w', templateId: 'grey-wolf', roomId: 'r', hp: 26, target: 'tank' };
    const { z, feed } = world([w]);
    const tank = { pubkey: 'tank', name: 'Tank', roomId: 'r', hp: 60, maxHp: 60, armor: 12, target: 'w' };
    const hurt = { pubkey: 'hurt', name: 'Hurt', roomId: 'r', hp: 15, maxHp: 60, armor: 2, target: null };
    z.sessions.set('tank', tank); z.sessions.set('hurt', hurt);
    S.pickTarget(z, w, tmpl('grey-wolf'));
    assert.equal(w.target, 'hurt', 'it leaves the armoured one for the bleeding one');
    assert.ok(feed.some((l) => l.includes('You are the one it wants')));
    hurt.hp = 58; hurt.armor = 11; // nearly as sound as the other: no flip-flop
    S.pickTarget(z, w, tmpl('grey-wolf'));
    assert.equal(w.target, 'hurt', 'it does not swap back for a hair of difference');
    console.log('PASS: wolves go for the weakest, and do not flip-flop.');
  }

  { // A WOUNDED BOAR TURNS
    const boar = { id: 'wb', templateId: 'wild-boar', roomId: 'r', hp: 34, target: 'you' };
    const { z, feed } = world([boar]);
    S.creatureBlow(z, boar, tmpl('wild-boar'), you('wb'), now); // the opening charge
    boar.hp = 6;
    S.beforeAttack(z, boar, tmpl('wild-boar'), you('wb'), now + 4000);
    assert.ok(feed.some((l) => l.includes('does not run')), 'it turns');
    assert.equal(S.creatureBlow(z, boar, tmpl('wild-boar'), you('wb'), now + 4000).mult, 2, 'and comes with one more charge');
    S.beforeAttack(z, boar, tmpl('wild-boar'), you('wb'), now + 8000);
    assert.equal(S.creatureBlow(z, boar, tmpl('wild-boar'), you('wb'), now + 8000).mult, 1, 'only once');
    console.log('PASS: a wounded boar turns and charges again, once.');
  }

  { // THE BEAR BLUFFS
    const mk = () => ({ id: 'b', templateId: 'the-baited-bear', roomId: 'r', hp: 76, target: 'you', grudges: [] });
    // stand there: it usually lets you be
    let bear = mk(); let w = world([bear]); let me = { ...you('b'), roomId: 'r' }; w.z.sessions.set('you', me);
    w.z.world.mobTemplates.get('the-baited-bear').max_hp = 76;
    assert.equal(S.beforeAttack(w.z, bear, tmpl('the-baited-bear'), me, now), true, 'the first rush stops short');
    assert.equal(bear.target, null, 'it is not on you, so you are not swinging at it');
    roll = 0; // the leave roll comes up
    await S.tickHabits(w.z, now + 7000);
    assert.equal(bear.target, null, 'it lets you be');
    assert.ok(w.feed.some((l) => l.includes('lets you be')));
    // stand there and it does not: it comes on
    bear = mk(); w = world([bear]); me = { ...you('b'), roomId: 'r' }; w.z.sessions.set('you', me);
    S.beforeAttack(w.z, bear, tmpl('the-baited-bear'), me, now);
    roll = 0xffffffff;
    await S.tickHabits(w.z, now + 7000);
    assert.equal(bear.target, 'you', 'or it comes on for real');
    // walk away: over
    bear = mk(); w = world([bear]); me = { ...you('b'), roomId: 'r' }; w.z.sessions.set('you', me);
    S.beforeAttack(w.z, bear, tmpl('the-baited-bear'), me, now);
    me.roomId = 'elsewhere';
    await S.tickHabits(w.z, now + 7000);
    assert.equal(bear.bluffing, undefined); assert.equal(bear.target, null, 'backed off: it is over');
    // the next rush inside ten minutes is no bluff
    me.roomId = 'r'; bear.target = 'you';
    assert.equal(S.beforeAttack(w.z, bear, tmpl('the-baited-bear'), me, now + 60_000), false, 'ignore the warning and the next is real');
    roll = 0;
    console.log('PASS: the bear bluffs; leave and it is over, stand and it usually goes, the second time is real.');
  }

  { // CATS STALK
    T.lynx = 52;
    const cat = { id: 'k', templateId: 'lynx', roomId: 'a', hp: 52, target: null, nextWanderAt: now + 999999 };
    const { z, feed } = world([cat]);
    const me = { ...you(), roomId: 'b', movedAt: now };
    z.sessions.set('you', me);
    S.stalksInstead(cat, me, now);
    await S.tickHabits(z, now + 1000);
    assert.equal(cat.walkingTo, 'b', 'it follows a room behind');
    assert.ok(cat.nextWanderAt <= now + 1000, 'and keeps up');
    cat.roomId = 'b';
    await S.tickHabits(z, now + 3000);
    assert.equal(cat.target, null, 'you are still moving: it waits');
    await S.tickHabits(z, now + 9000);
    assert.equal(cat.target, 'you', 'you stood still: it springs');
    assert.ok(feed.some((l) => l.startsWith('FIRST STRIKE')), 'with a first strike');
    console.log('PASS: cats follow a room behind and spring when you stand still.');
  }

  { // KNOCKED OUT OF THE AIR
    const gull = { id: 'kg', templateId: 'great-gull', roomId: 'r', hp: 28, target: 'you', airborneUntil: now + 5000 };
    const { z, feed } = world([gull]);
    S.thrownAt(z, gull, tmpl('great-gull'), you('kg'), now);
    assert.ok(gull.airborneUntil > now, 'one throw: it lurches but stays up');
    S.thrownAt(z, gull, tmpl('great-gull'), you('kg'), now + 1000);
    assert.equal(gull.airborneUntil, undefined, 'the second brings it down');
    assert.equal(gull.stunned, true, 'dazed');
    assert.ok(feed.some((l) => l.includes('out of the air')));
    gull.turnHp = 0; gull.hp = -1; // even hit, it cannot get up
    gull.hp = 20; gull.turnHp = 28;
    roll = 0;
    assert.equal(S.beforeAttack(z, gull, tmpl('great-gull'), you('kg'), now + 4000), false, 'grounded: it fights on the ground');
    assert.equal(S.playerSwing(z, you('kg'), gull, tmpl('great-gull'), blade(2), now + 4000).miss, undefined, 'and a blade reaches it');
    console.log('PASS: two throws knock a bird out of the air, and it stays down a while.');
  }
} finally {
  if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
  await rm(dir, { recursive: true, force: true });
}
