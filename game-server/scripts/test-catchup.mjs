// Cold-login regression: real world data, synthetic simulation, no network.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'nomad-catchup-'));
const db = new DatabaseSync(':memory:');
const saved = new DatabaseSync(':memory:');
try {
  await build({
    stdin: { contents: "export {ZoneDO} from './zone'; export {replayWeather} from './events'; export {CATCHUP_MAX_STEPS, SIM_STEP_MS, CATCHUP_CAP_MS, RAIN_SETTLED_END_ODDS, WEATHER_STEP_MS} from './zone-data';", resolveDir: join(root, 'src'), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: join(dir, 'zone.mjs'), logLevel: 'silent',
  });
  const { ZoneDO, replayWeather, CATCHUP_MAX_STEPS, SIM_STEP_MS, CATCHUP_CAP_MS, RAIN_SETTLED_END_ODDS, WEATHER_STEP_MS } = await import(pathToFileURL(join(dir, 'zone.mjs')));
  db.exec(readFileSync(join(root, 'schema.sql'), 'utf8'));
  for (const file of readdirSync(join(root, 'migrations')).filter(f => f.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(root, 'migrations', file), 'utf8'));
  }
  const statement = (query, args = []) => ({
    bind: (...values) => statement(query, values),
    all: async () => ({ results: db.prepare(query).all(...args) }),
    first: async () => db.prepare(query).get(...args) ?? null,
    run: async () => ({ meta: db.prepare(query).run(...args) }),
  });
  const storage = {
    sql: { exec(query, ...args) { const rows = saved.prepare(query).all(...args); rows.toArray = () => rows; return rows; } },
    get: async () => undefined, delete: async () => {}, transactionSync: fn => fn(),
    getAlarm: async () => null, setAlarm: async () => {},
  };
  const state = { storage, getWebSockets: () => [], waitUntil: () => {} };
  const env = { DB: { prepare: statement, batch: async rows => Promise.all(rows.map(row => row.all())) }, RELAYS: '' };
  const z = new ZoneDO(state, env);
  await z.init('door');
  assert.ok(z.world.rooms.size > 1200);
  assert.ok(z.creatures.size > 600); // a full world, not a broken load (659 after the 2026-10-20 thinning, migs 315-318)
  console.log(`World fixture: ${z.world.rooms.size} rooms, ${z.creatures.size} creatures.`);
  const realNow = Date.now;
  const now = realNow();
  Date.now = () => now;
  try {
    let steps = 0;
    const applyRot = z.applyRot.bind(z);
    z.applyRot = (...args) => { steps++; return applyRot(...args); };
    for (const gap of [0, 30_000, 5 * SIM_STEP_MS, 8 * 3_600_000, CATCHUP_CAP_MS, 2 * CATCHUP_CAP_MS]) {
      // Age the wander clocks too: a fresh seed with future clocks barely moves
      // during replay and concealed the cost of waking an actual sleeping world.
      z.savedAt = now - gap;
      for (const c of z.creatures.values()) {
        c.nextWanderAt = z.savedAt;
        c.hp = 1;
        c.target = 'synthetic-offline-target';
      }
      steps = 0;
      const started = performance.now();
      z.catchUp();
      assert.equal(steps, Math.min(Math.ceil(gap / SIM_STEP_MS), CATCHUP_MAX_STEPS));
      assert.equal(z.savedAt, now);
      assert.equal(z.lastEcologyAt, now);
      for (const c of z.creatures.values()) {
        assert.ok(z.world.rooms.has(c.roomId));
        if (gap > 0) { assert.equal(c.target, null); assert.ok(c.hp > 1); }
      }
      console.log(`PASS: ${gap / 3_600_000}h offline, ${steps} sweeps, ${Math.round(performance.now() - started)}ms; clock and creatures valid.`);
    }
    await z.persist();
    const restored = new ZoneDO(state, env);
    await restored.init('door');
    assert.equal(restored.savedAt, now);
    assert.ok(restored.creatures.size > 0);
    restored.applyRot = () => assert.fail('A saved catch-up must not replay after restart');
    restored.catchUp();
    console.log('PASS: completed catch-up survives restart without replaying the gap.');

    // THE SKY MOVES WHILE THE WORLD SLEEPS. A settled rain over the road and
    // ten hours with nobody on: it should still be falling about as often as
    // ten hours of its own rolls allow - never every time, which is what a
    // sleeping world used to do.
    const FAR = Number.MAX_SAFE_INTEGER, gap = 10 * 3_600_000, trials = 300;
    // The real relay, asked to speak mid-replay, stops before it reads anything.
    const relayFeed = ZoneDO.prototype.relayFeed;
    relayFeed.call({ replaying: true, get world() { throw new Error('relayed during a replay'); } }, 'mudzone-door', 'x');
    let heard = 0;
    restored.relayFeed = function (tag, text) { if (this.replaying) heard++; return relayFeed.call(this, tag, text); };
    let still = 0;
    for (let i = 0; i < trials; i++) {
      const from = now - gap;
      restored.events.set('rain', { phase: 'active', until: from + WEATHER_STEP_MS, data: 'settled', bands: ['road'], since: { road: from } });
      restored.events.set('storm', { phase: 'idle', until: FAR });
      restored.events.set('skyroll', { phase: 'idle', until: FAR }); // no new weather: this rain alone
      await replayWeather(restored, from, now);
      assert.equal(restored.replaying, false);
      if (restored.events.get('rain').phase === 'active') still++;
    }
    const expect = Math.pow(1 - RAIN_SETTLED_END_ODDS, gap / WEATHER_STEP_MS);
    const share = still / trials;
    assert.ok(share < 0.95, `the rain must end while nobody is on (${share})`);
    assert.ok(Math.abs(share - expect) < 0.12, `still raining ${share}, its own odds say ${expect.toFixed(2)}`);
    assert.ok(heard > 0, 'the replay does speak - the relay is what keeps it in');
    console.log(`PASS: settled rain, 10h asleep: still falling ${Math.round(share * 100)}% (odds ${Math.round(expect * 100)}%); ${heard} lines held off the feed.`);
    // ...and it starts weather too, over the longest gap, inside the budget.
    restored.events.set('rain', { phase: 'idle', until: FAR });
    restored.events.set('skyroll', { phase: 'idle', until: now - CATCHUP_CAP_MS + 60_000 });
    const t0 = performance.now();
    await replayWeather(restored, now - CATCHUP_CAP_MS, now);
    assert.ok(restored.events.get('skyroll').until > now, 'the sky roll is booked past the gap');
    console.log(`PASS: 14 days asleep: the sky rolled on through it, ${Math.round(performance.now() - t0)}ms.`);
  } finally { Date.now = realNow; }
} finally {
  db.close(); saved.close(); rmSync(dir, { recursive: true, force: true });
}
