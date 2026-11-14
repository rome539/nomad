// THE ROAD, RUN FORWARD. The road's twin of sim-crossing.mjs: not a test, a reading.
// Runs the real ZoneDO and its real beat on a private copy of the local D1, with no
// players and a false clock, and prints the road's animals at intervals.
// See living-regions.md at the repo root.
//   node --no-warnings scripts/sim-road.mjs old|new|measure [hours]
// old = the road's living rules switched off, new = as written, measure = only
// the ground each line has (homes, and for a hunter the homes with prey in reach).
import { createRequire } from 'node:module';
import { readFile, mkdtemp, readdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const [,, scenario = 'new', hoursArg = '48'] = process.argv;
const HOURS = Number(hoursArg), root = new URL('..', import.meta.url).pathname;
const req = createRequire(join(root, 'package.json')); const { build } = req('esbuild'); const { DatabaseSync } = req('node:sqlite');
const dir = await mkdtemp(join(tmpdir(), 'nomad-sim-')); const out = join(dir, 'b.mjs');
await build({ stdin: { contents: "export {ZoneDO} from './zone'; export * as zd from './zone-data'; export * as md from './mountain-ground'; export * as beasts from './beasts'; export * as groups from './groups'; export * as ai from './ai';", resolveDir: join(root, 'src'), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'silent', external: ['cloudflare:*'],
  plugins: [{ name: 'text', setup(b) { b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ }, async (a) => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' })); } }] });
const { ZoneDO, zd, md, beasts, groups, ai } = await import(pathToFileURL(out));
const RD = Date; let NOW = RD.UTC(2026, 10, 13, 17);
globalThis.Date = class extends RD { constructor(...a) { a.length ? super(...a) : super(NOW); } static now() { return NOW; } };
const log = console.log; console.log = () => {}; console.warn = () => {};
const d1 = join(root, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const dbName = (await readdir(d1)).find((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
for (const f of (await readdir(d1)).filter((f) => f.startsWith(dbName))) await copyFile(join(d1, f), join(dir, f));
const sq = new DatabaseSync(join(dir, dbName));
const stmt = (s, args = []) => ({ bind: (...a) => stmt(s, a), all: async () => ({ results: sq.prepare(s).all(...args) }), first: async () => sq.prepare(s).get(...args) ?? null, run: async () => ({ meta: {} }) });
const db = { prepare: (s) => stmt(s), batch: async () => [] };
const kv = new Map();
const storage = { list: async () => new Map(), get: async (k) => kv.get(k), put: async (k, v) => { kv.set(k, v); }, delete: async (k) => kv.delete(k), setAlarm: async () => {}, getAlarm: async () => null, deleteAlarm: async () => {}, transactionSync: (f) => f(), sql: { exec: () => ({ toArray: () => [], one: () => null, [Symbol.iterator]: function* () {} }) } };
const state = { storage, getWebSockets: () => [], blockConcurrencyWhile: (f) => f(), setWebSocketAutoResponse() {}, abort() {}, acceptWebSocket() {} };
const z = new ZoneDO(state, { DB: db });
z.persist = async () => {}; z.ensureAlarm = async () => {};
if (scenario === 'old') {
  zd.ROAD_ROAMERS.clear(); zd.ROAD_GROUPS.clear();
  for (const l of ['otter', 'grey-heron', 'gill-adder']) zd.LAND_HOLDERS.delete(l);
  for (const l of ['masterless-dog', 'drove-dog']) zd.PACK_HUNTERS.delete(l);
  zd.SETTLES_BY_PREY.delete('otter');
}
await z.init('door');
const W = z.world; const xs = (r) => z.regionOf(r) === 'road';
const LINES = ['rat', 'roe-deer', 'feral-goat', 'otter', 'gill-adder', 'grey-heron', 'scarp-raven', 'masterless-dog', 'drove-dog', 'the-baited-bear'];
const lineOf = (c) => LINES.includes(c.templateId) ? c.templateId : (z.variantBase.get(c.templateId) ?? c.templateId);
const rows = {}; for (const s of W.mobSpawns) if (xs(s.room_id)) rows[s.template_id] = (rows[s.template_id] ?? 0) + 1;

// THE GROUND EACH LINE HAS (living-regions.md, step 4): homes, and for a hunter how
// many of them have something it eats within 3 rooms right now.
const measure = () => {
  for (const line of zd.ROAD_ROAMERS) {
    const homes = ai.livingHomes(z, line, 'road');
    const eats = zd.PREYS_ON.get(line);
    let fed = 0;
    if (eats) {
      const preyRooms = new Set([...z.creatures.values()].filter((c) => eats.has(c.templateId) && xs(c.roomId)).map((c) => c.roomId));
      for (const h of homes) if ([...z.nearby(h, zd.TERRITORY_RADIUS).keys()].some((r) => preyRooms.has(r))) fed++;
    }
    const rowsOnGround = W.mobSpawns.filter((s) => s.template_id === line && xs(s.room_id) && md.settlesOn(line, s.room_id)).length;
    log(`  ${line}: ${homes.length} homes for ${rows[line] ?? 0} rows (${rowsOnGround} rows already on its ground)${eats ? `, ${fed} with prey within 3 rooms` : ''}`);
  }
};
if (scenario === 'measure') { log('\nTHE ROAD, GROUND PER LINE'); measure(); process.exit(0); }

const ev = { errors: 0 };
const snap = (h) => {
  const n = {}, off = [];
  for (const c of z.creatures.values()) {
    const home = c.home ?? c.roomId; if (!xs(home)) continue; const l = lineOf(c); if (!LINES.includes(l)) continue;
    n[l] = (n[l] ?? 0) + 1;
    if (scenario !== 'old' && zd.ROAD_ROAMERS.has(l) && !md.settlesOn(l, home)) off.push(l);
  }
  const groupsBy = {};
  for (const g of Object.values(z.groups.packs)) if (groups.groupRegion(g) === 'road') (groupsBy[g.line] ??= []).push(g);
  log(`\n[${scenario}] hour ${h}  errors=${ev.errors}  on wrong ground (old animals)=${off.length}`);
  log('  ' + LINES.map((l) => `${l} ${n[l] ?? 0}/${rows[l] ?? 0}`).join(' | '));
  log('  groups: ' + Object.entries(groupsBy).map(([l, gs]) => `${l} ${gs.length}`).join(', '));
};
const STEP = zd.SLOW_ECOLOGY_MS; const steps = HOURS * 3600_000 / STEP; let tk = 0, worst = 0; const t0 = RD.now();
snap(0);
for (let i = 1; i <= steps; i++) {
  NOW += STEP; const a = performance.now();
  try { await z.tick(); } catch (e) { ev.errors++; if (ev.errors < 4) log('ERROR', e?.stack?.slice(0, 500)); }
  const d = performance.now() - a; tk += d; if (d > worst) worst = d;
  if (i % (HOURS * 120 / 4) === 0) snap(i / 120);
}
log(`\n[${scenario}] ran ${steps} beats; avg beat ${(tk / steps).toFixed(1)}ms worst ${worst.toFixed(0)}ms; wall ${((RD.now() - t0) / 1000).toFixed(0)}s`);
log('\n' + beasts.lines(z, NOW).join('\n').split('THE ROAD')[1]);
process.exit(0);
