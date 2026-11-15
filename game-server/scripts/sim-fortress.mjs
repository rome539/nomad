// THE FORTRESS, RUN FORWARD. The fortress's twin of sim-road.mjs: not a test, a reading.
// Runs the real ZoneDO and its real beat on a private copy of the local D1, with no
// players and a false clock, and prints the open ground's, the keep's and the deep's
// animals and hollow at intervals. See living-regions.md at the repo root.
//   node --no-warnings scripts/sim-fortress.mjs old|new [hours]
// old = the fortress's living rules switched off, new = as written.
// NOMAD_SIM_DB_DIR, if set, is a folder holding a D1 copy to run on instead of the
// local one (the local D1 can be behind production).
import { createRequire } from 'node:module';
import { readFile, mkdtemp, readdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const [,, scenario = 'new', hoursArg = '48'] = process.argv;
const HOURS = Number(hoursArg), root = new URL('..', import.meta.url).pathname;
const req = createRequire(join(root, 'package.json')); const { build } = req('esbuild'); const { DatabaseSync } = req('node:sqlite');
const dir = await mkdtemp(join(tmpdir(), 'nomad-sim-')); const out = join(dir, 'b.mjs');
await build({ stdin: { contents: "export {ZoneDO} from './zone'; export * as zd from './zone-data'; export * as beasts from './beasts'; export * as groups from './groups';", resolveDir: join(root, 'src'), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'silent', external: ['cloudflare:*'],
  plugins: [{ name: 'text', setup(b) { b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ }, async (a) => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' })); } }] });
const { ZoneDO, zd, beasts, groups } = await import(pathToFileURL(out));
const RD = Date; let NOW = RD.UTC(2026, 10, 13, 17);
globalThis.Date = class extends RD { constructor(...a) { a.length ? super(...a) : super(NOW); } static now() { return NOW; } };
const log = console.log; console.log = () => {}; console.warn = () => {};
const d1 = process.env.NOMAD_SIM_DB_DIR || join(root, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
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
  for (const t of [zd.OUT_ROAMERS, zd.OUT_GROUPS, zd.UPPER_ROAMERS, zd.UPPER_GROUPS, zd.DEEP_ROAMERS]) t.clear();
  zd.PACK_HUNTERS.delete('grave-hyena');
  for (const l of ['skeleton', 'warden', 'marrow-cantor']) zd.WALKING_DEAD.delete(l);
  for (const r of zd.FORTRESS_SCRAPS) zd.FORAGE_ROOMS.delete(r);
}
await z.init('door');
const W = z.world;
// a line counts its rare blood with it (the scary rat and the brood mother are the rat's)
const REGIONS = { out: ['rat', 'feral-goat', 'gibbet-crow', 'grave-hyena', 'dire-hyena'], upper: ['rat', 'grave-hyena', 'skeleton', 'warden'], deep: ['rat', 'pale-crawler', 'twice-dead', 'marrow-cantor'] };
const lineOf = (c) => z.variantBase.get(c.templateId) ?? c.templateId;
const rows = {}; for (const s of W.mobSpawns) { const k = z.regionOf(s.room_id) + ' ' + (z.variantBase.get(s.template_id) ?? s.template_id); rows[k] = (rows[k] ?? 0) + 1; }
const ev = { errors: 0 };
const snap = (h) => {
  const n = {}, rooms = {};
  for (const c of z.creatures.values()) {
    const reg = z.regionOf(c.roomId); if (!REGIONS[reg]) continue; const k = reg + ' ' + lineOf(c);
    n[k] = (n[k] ?? 0) + 1; (rooms[k] ??= new Set()).add(c.roomId);
  }
  log(`\n[${scenario}] hour ${h}  errors=${ev.errors}`);
  for (const reg in REGIONS) log(`  ${reg.padEnd(5)} ` + REGIONS[reg].map((l) => `${l} ${n[reg + ' ' + l] ?? 0}/${rows[reg + ' ' + l] ?? 0}${rooms[reg + ' ' + l] ? ` (${rooms[reg + ' ' + l].size} rooms)` : ''}`).join(' | '));
  const gs = {}; for (const g of Object.values(z.groups.packs)) { const r = groups.groupRegion(g); if (REGIONS[r]) gs[r + ' ' + g.line] = (gs[r + ' ' + g.line] ?? 0) + 1; }
  log('  groups: ' + (Object.entries(gs).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'));
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
const text = beasts.lines(z, NOW).join('\n'); const at = text.indexOf('THE OPEN GROUND');
log('\n' + (at >= 0 ? text.slice(at) : text));
process.exit(0);
