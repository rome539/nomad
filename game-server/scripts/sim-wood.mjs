// THE WOOD AND ASSART END, RUN FORWARD. The wood's twin of sim-road.mjs and
// sim-fortress.mjs: not a test, a reading. Runs the real ZoneDO and its real beat on a
// private copy of the local D1, with no players and a false clock, and prints the wood's
// and Assart End's animals at intervals. See living-regions.md at the repo root.
//   node --no-warnings scripts/sim-wood.mjs old|new|measure [hours]
// old = the wood's and Assart End's living rules switched off, new = as written,
// measure = only the ground each line has (homes, and for a hunter the homes with prey
// in reach), no beats run.
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
await build({ stdin: { contents: "export {ZoneDO} from './zone'; export * as zd from './zone-data'; export * as md from './mountain-ground'; export * as beasts from './beasts'; export * as groups from './groups'; export * as ai from './ai';", resolveDir: join(root, 'src'), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'silent', external: ['cloudflare:*'],
  plugins: [{ name: 'text', setup(b) { b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ }, async (a) => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' })); } }] });
const { ZoneDO, zd, md, beasts, groups, ai } = await import(pathToFileURL(out));
const RD = Date; let NOW = RD.UTC(2026, 10, 17, 17);
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
  for (const t of [zd.WOOD_ROAMERS, zd.WOOD_GROUPS, zd.DEN_ROAMERS, zd.DEN_GROUPS]) t.clear();
  zd.PACK_HUNTERS.delete('grey-wolf'); zd.GROUND_HOLDERS.delete('grey-wolf'); zd.LAND_HOLDERS.delete('tawny-owl');
}
await z.init('door');
const W = z.world;
const REGIONS = { wood: [...new Set([...zd.WOOD_ROAMERS, 'brown-bear'])], den: ['rat', 'masterless-dog', 'roe-deer'] };
if (scenario === 'old') { REGIONS.wood = ['roe-deer', 'wood-stag', 'wild-boar', 'hedgehog', 'wood-sloth', 'grey-wolf', 'coyote', 'tawny-owl', 'scarp-raven', 'the-baited-bear', 'brown-bear']; REGIONS.den = ['rat', 'masterless-dog', 'roe-deer']; }
const lineOf = (c) => z.variantBase.get(c.templateId) ?? c.templateId;
const rows = {}; for (const s of W.mobSpawns) { const k = z.regionOf(s.room_id) + ' ' + (z.variantBase.get(s.template_id) ?? s.template_id); rows[k] = (rows[k] ?? 0) + 1; }

if (scenario === 'measure') {
  for (const reg of ['wood', 'den']) {
    log(`\n${reg.toUpperCase()}`);
    const roamers = reg === 'wood' ? zd.WOOD_ROAMERS : zd.DEN_ROAMERS;
    for (const line of roamers) {
      const homes = ai.livingHomes(z, line, reg);
      const eats = zd.PREYS_ON.get(line);
      let fed = 0;
      if (eats) {
        const preyRooms = new Set([...z.creatures.values()].filter((c) => eats.has(c.templateId) && z.regionOf(c.roomId) === reg).map((c) => c.roomId));
        for (const h of homes) if ([...z.nearby(h, zd.TERRITORY_RADIUS).keys()].some((r) => preyRooms.has(r))) fed++;
      }
      const ownRows = W.mobSpawns.filter((s) => s.template_id === line && z.regionOf(s.room_id) === reg);
      const onGround = ownRows.filter((s) => md.settlesOn(line, s.room_id)).length;
      log(`  ${line}: ${homes.length} homes for ${ownRows.length} rows (${onGround} rows already on its ground)${eats ? `, ${fed} with prey within 3 rooms` : ''}`);
    }
  }
  // rooms a gate cannot reach without a key: nothing is ever homed in them
  const reach = new Map(); const q = [...W.entryRooms]; for (const g of q) reach.set(g, 0);
  for (let i = 0; i < q.length; i++) for (const e of W.exits.get(q[i]) ?? []) if (!e.key_item && !reach.has(e.to_room)) { reach.set(e.to_room, 0); q.push(e.to_room); }
  for (const reg of ['wood', 'den']) log(`\n${reg}: rooms behind a keyed way only: ` + ([...W.rooms.keys()].filter((r) => z.regionOf(r) === reg && !reach.has(r)).join(', ') || 'none'));
  process.exit(0);
}

const ev = { errors: 0 };
const snap = (h) => {
  const n = {}, rooms = {};
  for (const c of z.creatures.values()) {
    const reg = z.regionOf(c.roomId); if (!REGIONS[reg]) continue; const k = reg + ' ' + lineOf(c);
    n[k] = (n[k] ?? 0) + 1; (rooms[k] ??= new Set()).add(c.roomId);
  }
  log(`\n[${scenario}] hour ${h}  errors=${ev.errors}`);
  for (const reg in REGIONS) log(`  ${reg.padEnd(4)} ` + REGIONS[reg].map((l) => `${l} ${n[reg + ' ' + l] ?? 0}/${rows[reg + ' ' + l] ?? 0}${rooms[reg + ' ' + l] ? ` (${rooms[reg + ' ' + l].size} rooms)` : ''}`).join(' | '));
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
const text = beasts.lines(z, NOW).join('\n'); const at = text.indexOf('THE WOOD');
log('\n' + (at >= 0 ? text.slice(at) : text));
process.exit(0);
