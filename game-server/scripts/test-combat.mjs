// Actual combat handlers with deterministic dice and no network or database.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'nomad-combat-'));
const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
try {
  const output = join(dir, 'combat.mjs');
  await build({
    stdin: {
      contents: "export {ZoneDO} from './zone'; export {attackPlayer,tickPvp} from './pvp'; export {LINKDEAD_MS,TICK_MS} from './zone-data'; export * as E from './exhaustion';",
      resolveDir: root, loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'silent',
    plugins: [{ name: 'worker-text', setup(b) {
      b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ },
        async a => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' }));
    } }],
  });
  const { ZoneDO, attackPlayer, tickPvp, LINKDEAD_MS, TICK_MS, E } = await import(pathToFileURL(output));
  {
    for (const [weight,rounds] of [[0,50],[2,39],[6,27],[10,20],[15,16]]) {
      const e=E.readExhaustion(undefined,0);
      for(let i=1;i<=rounds;i++){E.exert(e,weight);if(i<rounds)assert.ok(e.units<1000);}
      assert.equal(e.units,1000);
    }
    for (const [units,penalty] of [[0,0],[199,0],[200,2],[399,2],[400,4],[999,8],[1000,10]]) {
      assert.equal(E.playerPenalty({units}),penalty);
      assert.equal(E.playerDamage(12,{units}),12-penalty);
      assert.equal(E.playerDamage(1,{units}),1);
    }
    const e={units:1000,at:0,mode:'rest'};
    E.recover(e,4000,'combat');assert.equal(e.units,800);
    E.recover(e,40000,'passive');assert.equal(e.units,800);
    E.recover(e,50000);assert.equal(e.units,700);
    E.recover(e,49000);E.recover(e,50000);assert.equal(e.units,700);
    for (const mode of ['passive','rest','fire']) {
      const split={units:1000,at:0,mode},whole={...split};
      for(let ms=1;ms<=10000;ms++)E.recover(split,ms);
      E.recover(whole,10000);
      assert.equal(split.units,whole.units,'millisecond '+mode+' recovery must not accumulate rounding error');
      assert.equal(E.playerPenalty(split),E.playerPenalty(whole));
    }
    for (const [id,p] of Object.entries(E.CREATURE_ENDURANCE)) {
      const c={templateId:id};
      for(let i=0;i<=p[0];i++){
        E.creatureAttempt(c,i*4000);
        const effort=c.exertion?.effort;
        E.creatureAttempt(c,i*4000+1);assert.equal(c.exertion?.effort,effort);
      }
      assert.equal(E.creatureDamage(c,20),20-p[1],id);
      const t=(p[0]+1)*4000;
      E.recoverCreature(c,t,false);E.recoverCreature(c,t+p[2]*500,false);
      if(p[0])assert.ok(Math.abs(c.exertion.effort-p[0]/2)<1e-8,id+' half recovery');
      E.recoverCreature(c,t+p[2]*1000,false);E.creatureAttempt(c,t+p[2]*1000);
      assert.equal(E.creatureDamage(c,20),20,id+' full recovery');
    }
    console.log('PASS: equipment rates, integer penalties, elapsed/mode accounting and every creature endurance profile.');
  }
  // Midpoint body roll (4), no fumbles, crits, blocks, or random afflictions.
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
    getRandomValues(array) { array.fill(2147483648); return array; },
  } });
  const player = name => ({
    pubkey: name, name, roomId: 'hall', hp: 60, maxHp: 60,
    stance: 'steady', items: [], pvpTarget: null, target: null, staggered: false,
  });
  function fixture() {
    const z = new ZoneDO({}, {});
    for (const name of ['send', 'sendStatus', 'actorFeed', 'combatNoise',
      'refreshRoomCtx', 'markSimDirty', 'tellWounded']) z[name] = () => {};
    z.ensureAlarm = async () => {};
    z.wear = async () => {};
    z.equippedItem = () => null;
    z.equippedArmor = z.armorIgnore = z.dodgeBonus = z.equippedBlock = z.wornTrait = () => 0;
    z.wallDrag = () => 1;
    z.vitalsLottery = z.outOfWorld = () => false;
    z.reachable = () => true;
    z.playerHit = () => 'hit';
    const a = player('A'), b = player('B'), c = player('C');
    z.sessions = new Map([['A', a], ['B', b], ['C', c]]);
    return { z, a, b, c };
  }

  {
    const {z,a,b}=fixture();
    a.exhaustion={units:200,at:Date.now(),mode:'combat'};
    await attackPlayer(z,a,b);assert.equal(b.hp,56,'PvP opener loses two damage after mitigation');
    await tickPvp(z);assert.equal(b.hp,54,'normal PvP hit loses the same flat two');
    a.exhaustion.units=1000;await tickPvp(z);assert.equal(b.hp,53,'exhausted hits retain one damage');
    assert.equal(a.exhaustion.units,1000,'individual hits never add per-round effort');
    console.log('PASS: PvP opening and follow-up damage, final floor, no per-hit effort.');
  }
  {
    const { z, a, b } = fixture();
    await attackPlayer(z, a, b);
    assert.equal(b.hp, 54, 'the genuine ambush still lands immediately');
    for (let i = 0; i < 6; i++) await attackPlayer(z, a, b);
    await attackPlayer(z, b, a);
    assert.equal(b.hp, 54, 'repeating attack cannot add damage');
    assert.equal(a.hp, 60, 'the defender also waits for the round');
    await tickPvp(z);
    assert.equal(b.hp, 50);
    assert.equal(a.hp, 56);
    console.log('PASS: one ambush, no command-spam attacks, normal round replies.');
  }
  {
    const { z, a, b, c } = fixture();
    await attackPlayer(z, a, b);
    await attackPlayer(z, a, c);
    await attackPlayer(z, a, b);
    await attackPlayer(z, c, b);
    assert.equal(b.hp, 54, 'alternating targets cannot manufacture ambushes');
    assert.equal(c.hp, 60, 'retargeting waits for the round');
    assert.equal(c.pvpTarget, b.pubkey);
    console.log('PASS: switching opponents and joining an existing fight grant no free swings.');
  }
  {
    const { z, a, b } = fixture();
    a.target = 'creature';
    await attackPlayer(z, a, b);
    assert.equal(b.hp, 60, 'an existing PvE fight also prevents another immediate opener');
  }
  {
    const { z, a, b } = fixture();
    a.pvpTarget = b.pubkey; b.pvpTarget = a.pubkey; a.stunned = true;
    await attackPlayer(z, a, b);
    assert.equal(a.stunned, true, 'typing attack cannot clear stun');
    await tickPvp(z);
    assert.equal(a.stunned, false);
    assert.equal(b.hp, 60, 'the stunned fighter loses the scheduled attack');
    await tickPvp(z);
    assert.equal(b.hp, 56, 'attacks resume on the following round');
    console.log('PASS: commands preserve stun and the round consumes exactly one lost attack.');
  }
  {
    const { z, a, b } = fixture();
    const weapon = { tmpl: { name: 'test maul', dmg: 2, speed: 1, stun: 0.1, bleed: 0, traits: '' }, carried: {} };
    z.equippedItem = (s, slot) => s === a && slot === 'weapon' ? weapon : null;
    z.effDmg = () => 2;
    await attackPlayer(z, a, b);
    assert.equal(b.hp, 51);
    assert.equal(a.openedHeavy, true);
    await attackPlayer(z, a, b);
    await tickPvp(z);
    assert.equal(b.hp, 51, 'a blunt opener still spends the first scheduled attack');
    await tickPvp(z);
    assert.equal(b.hp, 45);
    console.log('PASS: heavy-weapon opening recovery is preserved.');
  }
  // Real server departure/expiry/alarm methods; no sockets or external writes.
  {
    const realNow = Date.now;
    let now = 100000;
    Date.now = () => now;
    function departure() {
      const { z, a, b } = fixture();
      const saves = [], alarms = [];
      z.trySavePlayer = async (...args) => saves.push(args);
      z.persist = async () => {};
      z.checkpointPlayers = async () => {};
      z.noteCreaturesChanged = () => {};
      z.state = { getWebSockets: () => [], storage: {
        getAlarm: async () => null, setAlarm: async at => alarms.push(at),
      } };
      z.ensureAlarm = ZoneDO.prototype.ensureAlarm.bind(z);
      return { z, a, b, saves, alarms };
    }
    try {
      for (const kind of ['outgoing-pve', 'incoming-pve', 'outgoing-pvp', 'incoming-pvp']) {
        const { z, a, b, saves, alarms } = departure();
        if (kind === 'outgoing-pve') a.target = 'mob';
        if (kind === 'incoming-pve') z.creatures.set('mob', { target: a.pubkey });
        if (kind === 'outgoing-pvp') a.pvpTarget = b.pubkey;
        if (kind === 'incoming-pvp') b.pvpTarget = a.pubkey;
        await z.onLeave(a);
        const deadline = a.linkdeadUntil;
        assert.equal(deadline, now + LINKDEAD_MS, kind);
        assert.equal(alarms[0], now + TICK_MS, 'last closed socket must not stop combat ticks');
        now += 1000;
        await z.onLeave(a); // close followed by error, or repeated callbacks
        assert.equal(a.linkdeadUntil, deadline);
        assert.ok(z.sessions.has(a.pubkey), 'duplicate disconnect cannot release early');
        now = deadline - 1;
        await z.releaseLinkdead(now);
        assert.ok(z.sessions.has(a.pubkey));
        now = deadline;
        await z.releaseLinkdead(now);
        assert.equal(z.sessions.has(a.pubkey), false, 'expired body must fade even while targeted');
        assert.equal(a.linkdeadUntil, undefined, 'expiry must not restart the timer');
        assert.equal(b.pvpTarget, null);
        assert.ok([...z.creatures.values()].every(c => c.target !== a.pubkey));
        assert.equal(saves.length, 2, 'initial and final state saved once each');
        const alarmCount = alarms.length;
        await z.ensureAlarm();
        assert.equal(alarms.length, alarmCount, 'no further alarms for an empty disconnected world');
      }
      {
        const { z, a } = departure();
        a.target = 'mob'; await z.onLeave(a);
        a.target = null; now += 1000;
        await z.releaseLinkdead(now);
        assert.equal(z.sessions.has(a.pubkey), false, 'combat ending releases before deadline');
      }
      {
        const { z, a, saves } = departure();
        await z.onLeave(a);
        assert.equal(z.sessions.has(a.pubkey), false, 'safe departure remains immediate');
        assert.equal(saves.length, 1);
      }
      {
        const { z, a, saves } = departure();
        a.target = 'mob'; await z.onLeave(a);
        const deadline = a.linkdeadUntil;
        const replacement = { ...a, linkdeadUntil: undefined };
        z.sessions.set(a.pubkey, replacement);
        await z.onLeave(a); // stale close belonging to the displaced socket
        now = deadline; await z.releaseLinkdead(now);
        assert.equal(z.sessions.get(a.pubkey), replacement);
        assert.equal(saves.length, 1, 'stale disconnect must not overwrite the reconnected player');
      }
      console.log('PASS: PvE/PvP departure, duplicate close, fixed expiry, early release, reconnect isolation and last-socket alarms.');
    } finally { Date.now = realNow; }
  }
} finally {
  if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
  else delete globalThis.crypto;
  await rm(dir, { recursive: true, force: true });
}
