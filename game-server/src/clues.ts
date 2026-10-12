// THE WORLD'S CLUES (rome, 2026-10-12). Three puzzles with no puzzle text in
// them: each one is something the living world does anyway, written down where
// a wanderer who is paying attention can read it. Nothing explains them.
//
//   TRACKS IN THE SNOW. While the snow lies on the mountain, everything that
//   walks leaves prints going the way it went. Follow the right ones.
//
//   THE BAD WATER. One water in the world at a time has something dead in it.
//   The animals come to drink, smell it, and back away. Go under and see why.
//
//   CROWS OVER THE DEAD. A fresh death out under the sky brings the crows, and
//   they can be seen wheeling from rooms away - until something eats the body,
//   or the dark comes down.
//
// Kept out of zone.ts on purpose (keep-zone-lean): the hooks there and in ai
// and verbs are a line or two each.
import type { ZoneDO } from "./zone";
import type { Creature, Trace } from "./zone-types";
import {
  FLIER_KIND, TRACK_PRINTS, TRACK_PRINT_DEFAULT, FOUL_WATERS, FOUL_ROTATE_MS, FOUL_LOOT,
  CROWS_DEAD_RANGE, CROWS_DEAD_FRESH_MS, CROWS_DEAD_MIN_HP, OUTDOOR_ROOMS,
} from "./zone-data";
import * as events from "./events";
import { isNight } from "./zone-util";

// ---- tracks in the snow ----

/** A creature has walked out of `from` going `dir`: under snow, it leaves prints. */
export function leaveTracks(z: ZoneDO, creature: Creature, from: string, dir: string, now: number): void {
  if (!events.snowed(z, from)) return;
  const kind = FLIER_KIND[creature.templateId];
  if (kind && kind !== "ground") return; // the hunters and the gulls cross it in the air
  z.addTrace(from, { kind: "track", at: now, id: creature.templateId, dir, label: creature.carries?.length ? "drag" : undefined });
}

/** How a set of prints reads, by age. */
export function trackLine(t: Trace, age: number): string {
  const prints = TRACK_PRINTS[t.id ?? ""] ?? TRACK_PRINT_DEFAULT;
  const drag = t.label === "drag" ? ", and something dragged alongside them" : "";
  return age < 10 * 60_000
    ? `Fresh tracks in the snow go ${t.dir}: ${prints}${drag}.`
    : `Tracks go ${t.dir}, softening as the snow fills them: ${prints}${drag}.`;
}

// ---- the bad water ----

/** The water that has something in it right now, or null once it has been found. */
export function foulWater(z: ZoneDO, now = Date.now()): string | null {
  const epoch = Math.floor(now / FOUL_ROTATE_MS);
  // A cheap scramble so the waters do not come round in list order.
  const room = FOUL_WATERS[((epoch * 2654435761) >>> 0) % FOUL_WATERS.length];
  if (!z.world?.rooms.has(room)) return null;
  const done = z.fishStock.get(`foul@${room}`);
  if (done && done.at > now) return null; // already brought up, until the next turn
  return room;
}

/** An animal at a water it will not drink from: true if it backed away. */
export function refusesWater(z: ZoneDO, creature: Creature, roomId: string): boolean {
  if (roomId !== foulWater(z)) return false;
  creature.refusedWater = roomId; // it goes elsewhere next time
  return true;
}

/** What a diver finds in the bad water, or null when this is not it. */
export function diveFoul(z: ZoneDO, roomId: string, now = Date.now()): string | null {
  if (roomId !== foulWater(z, now)) return null;
  const total = FOUL_LOOT.reduce((n, l) => n + l.weight, 0);
  let roll = Math.random() * total;
  let item = FOUL_LOOT[0].item;
  for (const l of FOUL_LOOT) { roll -= l.weight; if (roll < 0) { item = l.item; break; } }
  // Found: the water stays clean until the next turn of the clock.
  const turnEnds = (Math.floor(now / FOUL_ROTATE_MS) + 1) * FOUL_ROTATE_MS;
  z.fishStock.set(`foul@${roomId}`, { left: 0, at: turnEnds });
  return item;
}

// ---- crows over the dead ----

const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

/** From an open room in daylight: crows wheeling over the nearest fresh death in sight. */
export function crowsLine(z: ZoneDO, roomId: string, now = Date.now()): string | null {
  if (!OUTDOOR_ROOMS.has(roomId) || isNight(now) || events.foggy(z, roomId)) return null;
  const world = z.world!;
  const here = world.rooms.get(roomId);
  if (!here || here.map_x == null || here.map_y == null) return null;
  let best: { d: number; dx: number; dy: number } | null = null;
  for (const [rid, list] of z.traces) {
    if (rid === roomId || !OUTDOOR_ROOMS.has(rid)) continue;
    const r = world.rooms.get(rid);
    if (!r || r.map_x == null || r.map_y == null) continue;
    const dx = r.map_x - here.map_x, dy = r.map_y - here.map_y;
    const d = Math.max(Math.abs(dx), Math.abs(dy));
    if (d > CROWS_DEAD_RANGE || (best && d >= best.d)) continue;
    const fresh = list.some((t) => t.kind === "blood" && now - t.at < CROWS_DEAD_FRESH_MS
      && (t.id === "nomad" || !t.id || (world.mobTemplates.get(t.id)?.max_hp ?? 0) >= CROWS_DEAD_MIN_HP));
    if (fresh) best = { d, dx, dy };
  }
  if (!best) return null;
  // Map y runs south. Eight ways round, from north clockwise.
  const angle = Math.atan2(best.dx, -best.dy);
  const way = COMPASS[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
  return best.d <= 2
    ? `Crows are dropping out of the sky close by to the ${way}, one after another.`
    : `Far off to the ${way}, crows are wheeling low over something, and more are coming in.`;
}
