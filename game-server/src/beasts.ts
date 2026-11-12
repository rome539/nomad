// THE MOUNTAIN'S OWN COUNT (rome, 2026-11-06). The keeper's read on whether the
// living mountain is working: `beasts`, behind the same key as the census and
// kept out of it. What happened is tallied here as it happens and saved with the
// groups; everything else is read off the living world when asked.
import type { ZoneDO } from "./zone";
import type { Creature } from "./zone-types";
import { FOOD_FLIERS, SALT_HAMLET_ROOMS, SHIELING_HAMLET_ROOMS, roamsIn } from "./zone-data";

const DAY_MS = 24 * 3_600_000;
export interface Tally { since: number; moved?: number; flights: number; chases: number; caught: number; stolen: number; kills: Record<string, Record<string, number>>; crossingKills?: Record<string, Record<string, number>> }
type Event = "moved" | "flights" | "chases" | "caught" | "stolen";

const SHOWN = [
  "rat", "mountain-hare", "ptarmigan", "red-hind", "feral-goat", "hill-wolf", "hill-fox", "wildcat", "ermine", "snow-fox",
  "lynx", "glutton", "eagle-owl", "hill-eagle", "scarp-raven", "mountain-chough", "bone-breaker", "carrion-vulture",
];
// THE CROSSING'S SECTION (rome, 2026-11-12): the second living region, read the same way.
const CROSSING_SHOWN = [
  "rat", "water-vole", "wrack-crab", "devil-crab", "oystercatcher", "ford-eel", "bittern", "fen-viper", "great-gull", "grey-seal", "conger", "marsh-hound",
];
const lineOf = (z: ZoneDO, id: string): string => SHOWN.includes(id) || CROSSING_SHOWN.includes(id) || roamsIn(id) ? id : (z.variantBase.get(id) ?? id);
const onMountain = (z: ZoneDO, c: Creature): boolean => z.regionOf(c.home ?? c.roomId) === "mountain";
const onCrossing = (z: ZoneDO, c: Creature): boolean => z.regionOf(c.home ?? c.roomId) === "crossing";

function tally(z: ZoneDO, now: number): Tally {
  const state = z.groups;
  if (!state.tally || now - state.tally.since >= DAY_MS) {
    state.lastTally = state.tally;
    state.tally = { since: now, flights: 0, chases: 0, caught: 0, stolen: 0, kills: {} };
  }
  return state.tally;
}

export function note(z: ZoneDO, what: Event, now = Date.now()): void {
  const t = tally(z, now);
  t[what] = (t[what] ?? 0) + 1;
}

/** A living region's animal has died. `by` is what killed it: a creature's template, or "wanderers". */
export function noteKill(z: ZoneDO, victim: Creature, by: string, now = Date.now()): void {
  const line = lineOf(z, victim.templateId);
  if (!(onMountain(z, victim) && SHOWN.includes(line)) && !(onCrossing(z, victim) && CROSSING_SHOWN.includes(line))) return;
  if (onCrossing(z, victim)) {
    const row = ((tally(z, now).crossingKills ??= {})[line] ??= {});
    const who = by === "wanderers" ? by : lineOf(z, by);
    row[who] = (row[who] ?? 0) + 1;
    return;
  }
  const row = (tally(z, now).kills[line] ??= {});
  const who = by === "wanderers" ? by : lineOf(z, by);
  row[who] = (row[who] ?? 0) + 1;
}

const hoursAgo = (now: number, at: number): string => {
  const h = Math.round((now - at) / 3_600_000);
  return h < 1 ? "the last hour" : h === 1 ? "the last hour" : `the last ${h} hours`;
};

export function lines(z: ZoneDO, now: number): string[] {
  const world = z.world!;
  const name = (id: string) => (world.mobTemplates.get(id)?.name ?? id).replace(/^(an?|the) /i, "");
  const roomName = (id: string) => world.rooms.get(id)?.name ?? id;
  const out = ["THE MOUNTAIN", ""];

  const alive = new Map<string, number>();
  const wolves: Creature[] = [];
  const birdsIn = new Map<string, number>();
  let up = 0;
  for (const c of z.creatures.values()) {
    if (!onMountain(z, c)) continue;
    const line = lineOf(z, c.templateId);
    alive.set(line, (alive.get(line) ?? 0) + 1);
    if (line === "hill-wolf") wolves.push(c);
    if (c.aloft !== undefined && c.flightTo) up++;
    else if (FOOD_FLIERS.has(line)) birdsIn.set(c.roomId, (birdsIn.get(c.roomId) ?? 0) + 1);
  }

  const packs = new Map<string, number>();
  for (const c of wolves) if (c.group) packs.set(c.group, (packs.get(c.group) ?? 0) + 1);
  const alone = wolves.filter((c) => !c.group && c.lone).length;
  const unsorted = wolves.filter((c) => !c.group && !c.lone).length;
  const inHamlet = new Set(SHIELING_HAMLET_ROOMS);
  const hamlet = wolves.filter((c) => inHamlet.has(c.home ?? "") || inHamlet.has(c.roomId)).length;
  out.push(`Wolves: ${wolves.length} alive, ${alone} alone, ${hamlet} in the hamlet${unsorted ? `, ${unsorted} not sorted yet` : ""}`);
  for (const [id, n] of packs) out.push(`  pack of ${n} at ${roomName(z.groups.packs[id]?.home ?? "")}`);
  if (!packs.size) out.push("  no packs");

  out.push("", "Alive, against the limit:");
  const rows = new Map<string, number>();
  for (const s of world.mobSpawns) if (z.regionOf(s.room_id) === "mountain") rows.set(s.template_id, (rows.get(s.template_id) ?? 0) + 1);
  for (const line of SHOWN) out.push(`  ${name(line)}: ${alive.get(line) ?? 0} of ${rows.get(line) ?? 0}`);

  const busiest = [...birdsIn].sort((a, b) => b[1] - a[1])[0];
  out.push("", `Birds: ${up} in the air now, most in one room ${busiest ? `${busiest[1]} at ${roomName(busiest[0])}` : "none"}`);

  const t = tally(z, now);
  const told = (b: Tally) => `${b.moved ?? 0} homes given up, ${b.flights} flights, ${b.chases} chases, ${b.caught} small hunters caught, ${b.stolen} kills stolen`;
  out.push("", `In ${hoursAgo(now, t.since)}: ${told(t)}`);
  if (z.groups.lastTally) out.push(`The 24 hours before: ${told(z.groups.lastTally)}`);
  const killed = Object.entries(t.kills)
    .map(([line, by]) => ({ line, by, total: Object.values(by).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  if (killed.length) out.push("", "Killed in that time, and by what:");
  for (const { line, by, total } of killed) {
    const who = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([k, n]) => `${k === "wanderers" ? k : name(k)} ${n}`).join(", ");
    out.push(`  ${name(line)} ${total}: ${who}`);
  }
  out.push("", ...crossingLines(z, now));
  return out;
}

function crossingLines(z: ZoneDO, now: number): string[] {
  const world = z.world!;
  const name = (id: string) => (world.mobTemplates.get(id)?.name ?? id).replace(/^(an?|the) /i, "");
  const roomName = (id: string) => world.rooms.get(id)?.name ?? id;
  const out = ["THE CROSSING", ""];
  const alive = new Map<string, number>();
  const hounds: Creature[] = [];
  for (const c of z.creatures.values()) {
    if (!onCrossing(z, c)) continue;
    const line = lineOf(z, c.templateId);
    alive.set(line, (alive.get(line) ?? 0) + 1);
    if (line === "marsh-hound") hounds.push(c);
  }
  const packs = new Map<string, number>();
  for (const c of hounds) if (c.group) packs.set(c.group, (packs.get(c.group) ?? 0) + 1);
  const alone = hounds.filter((c) => !c.group && c.lone).length;
  const unsorted = hounds.filter((c) => !c.group && !c.lone).length;
  const inHamlet = new Set(SALT_HAMLET_ROOMS);
  const hamlet = hounds.filter((c) => inHamlet.has(c.home ?? "") || inHamlet.has(c.roomId)).length;
  out.push(`Marsh hounds: ${hounds.length} alive, ${alone} alone, ${hamlet} in the hamlet${unsorted ? `, ${unsorted} not sorted yet` : ""}`);
  for (const [id, n] of packs) out.push(`  pack of ${n} at ${roomName(z.groups.packs[id]?.home ?? "")}`);
  if (!packs.size) out.push("  no packs");
  // the herds and flocks: how many, and how big
  for (const line of ["grey-seal", "great-gull", "oystercatcher", "wrack-crab"]) {
    const sizes = new Map<string, number>();
    for (const c of z.creatures.values()) if (c.group && onCrossing(z, c) && lineOf(z, c.templateId) === line) sizes.set(c.group, (sizes.get(c.group) ?? 0) + 1);
    out.push(`  ${name(line)}: ${sizes.size ? [...sizes.values()].join(", ") : "none"} in company`);
  }
  out.push("", "Alive, against the limit:");
  const rows = new Map<string, number>();
  for (const s of world.mobSpawns) if (z.regionOf(s.room_id) === "crossing") rows.set(s.template_id, (rows.get(s.template_id) ?? 0) + 1);
  for (const line of CROSSING_SHOWN) out.push(`  ${name(line)}: ${alive.get(line) ?? 0} of ${rows.get(line) ?? 0}`);
  const killed = Object.entries(tally(z, now).crossingKills ?? {})
    .map(([line, by]) => ({ line, by, total: Object.values(by).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  if (killed.length) out.push("", `Killed in ${hoursAgo(now, tally(z, now).since)}, and by what:`);
  for (const { line, by, total } of killed) {
    const who = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([k, n]) => `${k === "wanderers" ? k : name(k)} ${n}`).join(", ");
    out.push(`  ${name(line)} ${total}: ${who}`);
  }
  return out;
}
