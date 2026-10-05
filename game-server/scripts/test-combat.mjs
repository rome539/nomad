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
      contents: "export {ZoneDO} from './zone'; export {attackPlayer,tickPvp} from './pvp';",
      resolveDir: root, loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'silent',
    plugins: [{ name: 'worker-text', setup(b) {
      b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ },
        async a => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' }));
    } }],
  });
  const { ZoneDO, attackPlayer, tickPvp } = await import(pathToFileURL(output));
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
} finally {
  if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
  else delete globalThis.crypto;
  await rm(dir, { recursive: true, force: true });
}
