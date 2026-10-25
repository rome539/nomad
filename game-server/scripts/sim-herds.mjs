// THE HERDS, RUN FORWARD (2026-10-25). Not a test: a reading. Runs the real
// herds.tick (src/herds.ts) on the wood's real numbers — 30 roe-deer, 21 grey
// wolves — minute by minute, with hunters killing what they meet and the
// wolves eating deer, and prints the wood hour by hour.
//   node scripts/sim-herds.mjs
// The hunting and the wolves' appetite are estimates written here, not the
// game's combat: a hunter finds and kills a deer about every 2 minutes and a
// wolf about every 5 when the wood is full, slower as it thins. Retune them
// against real kill logs when there are some.
import { createRequire } from 'node:module';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(new URL('..', import.meta.url).pathname);
const { build } = createRequire(join(root, 'package.json'))('esbuild');
const dir = await mkdtemp(join(tmpdir(), 'nomad-herds-'));
const out = join(dir, 'herds.mjs');
await build({
  stdin: { contents: "export * as herds from './herds';", resolveDir: join(root, 'src'), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'silent',
  plugins: [{ name: 'text', setup(b) { b.onLoad({ filter: /(?:nip46-bunker|(?:vault|nostr|qrcode)-bundle)\.js$/ }, async a => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' })); } }],
});
const { herds } = await import(pathToFileURL(out));
await rm(dir, { recursive: true, force: true });

const KD = 30, KW = 21, MIN = 60_000, HOUR = 60 * MIN;
const DEER_PER_MIN = 0.5, WOLF_PER_MIN = 0.2;

function wood() {
  const rooms = new Map(), mobSpawns = [];
  for (let i = 0; i < 60; i++) rooms.set('w' + i, { id: 'w' + i });
  for (let i = 0; i < KD; i++) mobSpawns.push({ template_id: 'roe-deer', room_id: 'w' + (i % 60) });
  for (let i = 0; i < KW; i++) mobSpawns.push({ template_id: 'grey-wolf', room_id: 'w' + ((i * 3) % 60) });
  const world = {
    rooms, mobSpawns, mobVariants: [], safeRooms: new Set(), entryRooms: new Set(), exits: new Map(),
    mobTemplates: new Map([
      ['roe-deer', { id: 'roe-deer', name: 'a roe-deer', max_hp: 16, respawn_secs: 300, is_boss: 0 }],
      ['grey-wolf', { id: 'grey-wolf', name: 'a grey wolf', max_hp: 26, respawn_secs: 600, is_boss: 0 }],
    ]),
  };
  const z = {
    world, creatures: new Map(), sessions: new Map(), herds: new Map(), variantBase: new Map(), conditions: new Map(),
    regionOf: () => 'wood', outOfWorld: () => false, roomDist: () => 1, rollCarry: () => undefined,
    noteCreaturesChanged() {}, roomFeed() {}, roomSound() {}, refreshRoomCtx() {},
  };
  for (const s of mobSpawns) {
    const id = 'c' + z.creatures.size;
    z.creatures.set(id, { id, templateId: s.template_id, roomId: s.room_id, home: s.room_id, hp: 1 });
  }
  return z;
}
const count = (z, t) => [...z.creatures.values()].filter((c) => c.templateId === t).length;
function killOne(z, t) {
  const c = [...z.creatures.values()].find((x) => x.templateId === t);
  if (c) z.creatures.delete(c.id);
  return !!c;
}

function run(hunters, hoursOn, hours = 24) {
  const z = wood();
  let now = 0;
  herds.tick(z, now, true); // starts the clock
  let owedD = 0, owedW = 0, eat = 0;
  const rows = [];
  let kills = 0;
  for (let m = 0; m < hours * 60; m++) {
    now += MIN;
    const on = m < hoursOn * 60 ? hunters : 0;
    z.sessions = new Map(Array.from({ length: on }, (_, i) => ['h' + i, { roomId: 'w0' }]));
    owedD += on * DEER_PER_MIN * (count(z, 'roe-deer') / KD);
    owedW += on * WOLF_PER_MIN * (count(z, 'grey-wolf') / KW);
    while (owedD >= 1) { owedD -= 1; if (killOne(z, 'roe-deer')) kills++; }
    while (owedW >= 1) { owedW -= 1; if (killOne(z, 'grey-wolf')) kills++; }
    // The wolves eat: a pack of four takes a deer about every 2.5 hours.
    const d = count(z, 'roe-deer');
    eat += (count(z, 'grey-wolf') / 4) * (1 / 150) * (d / (d + 5));
    while (eat >= 1) { eat -= 1; killOne(z, 'roe-deer'); }
    herds.tick(z, now, true);
    if ((m + 1) % 60 === 0) { rows.push({ h: (m + 1) / 60, deer: count(z, 'roe-deer'), wolves: count(z, 'grey-wolf'), kills }); kills = 0; }
  }
  return rows;
}

const scenarios = [
  ['Nobody hunts', 0, 0],
  ['2 players for 3 hours', 2, 3],
  ['2 players grind 8 hours', 2, 8],
  ['5 players for 3 hours', 5, 3],
  ['5 players all day', 5, 24],
  ['20 players all day', 20, 24],
];
for (const [name, n, hrs] of scenarios) {
  const rows = run(n, hrs);
  console.log(`\n## ${name}`);
  console.log('hour  deer  wolves  kills/h' + (n ? '  per player' : ''));
  for (const h of [1, 2, 3, 4, 6, 8, 10, 12, 16, 24]) {
    const r = rows[h - 1];
    console.log(`${String(h).padStart(4)}  ${String(r.deer).padStart(4)}  ${String(r.wolves).padStart(6)}  ${String(r.kills).padStart(7)}` + (n && h <= hrs ? `  ${(r.kills / n).toFixed(1).padStart(10)}` : ''));
  }
}
