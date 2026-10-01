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
    stdin: { contents: "export {ZoneDO} from './zone'; export {CATCHUP_MAX_STEPS, SIM_STEP_MS, CATCHUP_CAP_MS} from './zone-data';", resolveDir: join(root, 'src'), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: join(dir, 'zone.mjs'), logLevel: 'silent',
  });
  const { ZoneDO, CATCHUP_MAX_STEPS, SIM_STEP_MS, CATCHUP_CAP_MS } = await import(pathToFileURL(join(dir, 'zone.mjs')));
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
  assert.ok(z.creatures.size > 700);
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
  } finally { Date.now = realNow; }
} finally {
  db.close(); saved.close(); rmSync(dir, { recursive: true, force: true });
}
