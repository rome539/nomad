// THE MAP TELLS THE TRUTH (rome, 2026-10-29). Every compass exit must point the
// way it says on the map: the room an exit calls "west" has to be drawn to the
// west - one square or more, never behind, never off to the side further than it
// is ahead. The wood is exempt between its own rooms: it is a maze on purpose.
//
//   node scripts/check-map-true.mjs            (local D1)
//   node scripts/check-map-true.mjs --remote   (live D1)
import { execFileSync } from 'node:child_process';

const remote = process.argv.includes('--remote');
const sql = `SELECT e.room_id a, e.dir d, e.to_room b, ra.map_x ax, ra.map_y ay, rb.map_x bx, rb.map_y by,
  ra.region ar, rb.region br FROM exits e JOIN rooms ra ON ra.id = e.room_id JOIN rooms rb ON rb.id = e.to_room`;
const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'nomad', remote ? '--remote' : '--local', '--json', '--command', sql],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 });
const rows = JSON.parse(out)[0].results;
const W = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
const bad = rows.filter((e) => {
  if (!W[e.d] || e.ax === null || e.bx === null) return false;
  if (e.ar === 'wood' && e.br === 'wood') return false;
  const [wx, wy] = W[e.d], dx = e.bx - e.ax, dy = e.by - e.ay;
  const along = dx * wx + dy * wy, across = Math.abs(dx * wy - dy * wx);
  return !(along > 0 && across <= along);
});
if (bad.length) {
  console.error(`${bad.length} exits point the wrong way on the map:`);
  for (const e of bad.slice(0, 40)) console.error(`  ${e.a} --${e.d}--> ${e.b}   drawn (${e.bx - e.ax}, ${e.by - e.ay})`);
  process.exit(1);
}
console.log(`map is true: every compass exit outside the wood (${rows.length} exits checked) points the way it says`);
