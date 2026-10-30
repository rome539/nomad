// THE HERDS (rome, 2026-10-25). The land holds the animals, not a timer.
//
// Before this, every line refilled on one clock: kill a deer and a wait started,
// shorter with more players online, longer the emptier the line was, and the
// body walked in at a mouth. Nothing about it answered the hunting, and two
// players could take the wood down to nothing on screen and keep it there.
//
// Now each living line (ECO_LINES) is a herd per REGION. The spawn rows in that
// region are what the land carries and where the herd lives. It comes back
// three ways, all of them owed by the hour and paid as whole bodies:
//
//   BIRTHS   the herd still standing breeds — fastest at half-full, slow near
//            empty or full (logistic). A birth starts beside a living
//            herd-mate that no player can see, and walks to an open home.
//            Predators breed on the prey standing in their region.
//   STRAYS   drift in off the edge of the map at the region's nearest mouth,
//            fastest when the region is empty, nothing when it is full.
//   FLOOR    below a fifth of the limit, one walks in for every hunter
//            standing in the region (one at least), so a crowd thins the
//            ground and never empties it.
//
// Lines that are not herds (the hollow, the road's walkers) keep their timer
// (ai.scheduleArrivals) and get the floor on top of it. Bosses, mothers on
// their nests, the drowned and the posted sentinels are none of this.
import type { ZoneDO } from "./zone";
import type { World } from "./world";
import type { Creature } from "./zone-types";
import { isNight, skyBand } from "./zone-util";
import { randInt } from "./rng";
import { mintCreature } from "./ai";
import * as conditions from "./conditions";
import {
  ECO_LINES, HOLLOW, BROODERS, DROWNERS, SENTINELS, PREYS_ON, ROAMING_DENS,
  HERD_PACE_SECS, HERD_BIRTH_PER_H, HERD_BIRTH_MIN, HERD_BIRTH_MAX, HERD_STRAY_FRAC,
  HERD_FLOOR_FRAC, HERD_FLOOR_PER_HUNTER_PER_H, HERD_NO_PREY_SHARE,
  ROOTED, NOCTURNAL, SURFACE_FORAGE, ROUND_REGIONS, ROUND_RANGE, HUNT_RECHECK_MS,
  ROUND_BASKERS, WARM_GROUND, SCAVENGERS, CARRION_ROOMS, HUNTS_NOT_CARRION, WARY_STAYS_IN,
} from "./zone-data";

const AT = "_at"; // the clock, kept in the same saved map as what each herd is owed

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

/** A line that breeds as a herd rather than refilling on a timer. */
export function isHerd(world: World, id: string): boolean {
  const t = world.mobTemplates.get(id);
  return !!t && !t.is_boss && ECO_LINES.has(id) && !HOLLOW.has(id)
    && !BROODERS.has(id) && !DROWNERS.has(id) && !SENTINELS.has(id);
}

/** A line the floor keeps from ever reaching zero. */
export function floors(world: World, id: string): boolean {
  const t = world.mobTemplates.get(id);
  return !!t && !t.is_boss && !BROODERS.has(id) && !SENTINELS.has(id);
}

/** A line's pace against the 300s line the rates are written for. */
function pace(respawnSecs: number): number {
  return HERD_PACE_SECS / Math.max(1, respawnSecs);
}

/** What one region owes one line, per hour, as [births, strays + floor]. */
export function ratesFor(
  herd: boolean, respawnSecs: number, n: number, k: number, hunters: number, preyShare: number, draw = 1,
): [number, number] {
  if (k <= 0 || n >= k) return [0, 0];
  const room = 1 - n / k;
  let births = 0, strays = 0;
  if (herd) {
    const r = Math.min(HERD_BIRTH_MAX, Math.max(HERD_BIRTH_MIN, HERD_BIRTH_PER_H * pace(respawnSecs)));
    births = r * n * room * preyShare;
    strays = HERD_STRAY_FRAC * k * room * preyShare * draw;
  }
  const floor = n < k * HERD_FLOOR_FRAC
    ? Math.max(1, hunters) * HERD_FLOOR_PER_HUNTER_PER_H * Math.min(1, pace(respawnSecs))
    : 0;
  return [births, strays + floor];
}

/** Advance every herd to `now`. Live tick and offline catch-up both call it. */
export function tick(z: ZoneDO, now: number, silent: boolean): void {
  const world = z.world;
  if (!world) return;
  const last = z.herds.get(AT);
  z.herds.set(AT, now);
  if (last === undefined || now <= last) return; // the first beat only starts the clock
  const hours = (now - last) / 3_600_000;

  // What the land carries, by line and region, and where each line's rows are.
  const capOf = new Map<string, number>();
  const capsBand = new Map<string, Map<string, number>>();
  const rowsBy = new Map<string, Map<string, number>>();
  for (const s of world.mobSpawns) {
    capOf.set(s.template_id, (capOf.get(s.template_id) ?? 0) + 1);
    const band = z.regionOf(s.room_id);
    let m = capsBand.get(s.template_id);
    if (!m) { m = new Map(); capsBand.set(s.template_id, m); }
    m.set(band, (m.get(band) ?? 0) + 1);
    let r = rowsBy.get(s.template_id);
    if (!r) { r = new Map(); rowsBy.set(s.template_id, r); }
    r.set(s.room_id, (r.get(s.room_id) ?? 0) + 1);
  }
  // What is standing, counted the way the timers count it: a variant with its
  // own rows is its own line, a rolled promotion folds into its base.
  const lineOf = (id: string): string => capOf.has(id) ? id : (z.variantBase.get(id) ?? id);
  const alive = new Map<string, number>();
  const aliveBand = new Map<string, Map<string, number>>();
  const homed = new Map<string, Map<string, number>>();
  const mates = new Map<string, string[]>(); // "line@band" -> rooms its living members stand in
  for (const c of z.creatures.values()) {
    const line = lineOf(c.templateId);
    alive.set(line, (alive.get(line) ?? 0) + 1);
    // Counted where it LIVES, not where it stands: a stray still walking in
    // from a mouth in the next region is already this region's, or the wood
    // would go on owing deer that are on their way to it.
    const band = z.regionOf(c.home ?? c.roomId);
    let m = aliveBand.get(line);
    if (!m) { m = new Map(); aliveBand.set(line, m); }
    m.set(band, (m.get(band) ?? 0) + 1);
    const at = c.home ?? c.roomId;
    let h = homed.get(line);
    if (!h) { h = new Map(); homed.set(line, h); }
    h.set(at, (h.get(at) ?? 0) + 1);
    if (z.regionOf(c.roomId) === band) { // a birth starts beside one that is home
      const key = `${line}@${band}`;
      const list = mates.get(key) ?? [];
      list.push(c.roomId);
      mates.set(key, list);
    }
  }
  // Who is out hunting, by region. A player at a gate is not on the ground.
  const hunters = new Map<string, number>();
  for (const s of z.sessions.values()) {
    if (z.outOfWorld(s)) continue;
    const band = z.regionOf(s.roomId);
    hunters.set(band, (hunters.get(band) ?? 0) + 1);
  }
  const watched = new Set<string>();
  for (const s of z.sessions.values()) watched.add(s.roomId);

  for (const [line, bands] of capsBand) {
    const tmpl = world.mobTemplates.get(line);
    if (!tmpl) continue;
    const herd = isHerd(world, line);
    if (!herd && !floors(world, line)) continue;
    for (const [band, k] of bands) {
      const key = `${line}@${band}`;
      const n = aliveBand.get(line)?.get(band) ?? 0;
      if (n >= k || (alive.get(line) ?? 0) >= (capOf.get(line) ?? 0)) { z.herds.delete(key); continue; }
      const [births, rest] = ratesFor(herd, tmpl.respawn_secs, n, k, hunters.get(band) ?? 0, herd ? preyShare(z, line, band, capsBand, aliveBand) : 1, conditions.drawFor(z, line, band));
      const sick = conditions.sickIn(z, line, band);
      const bornHere = sick ? 0 : births; // the sick do not breed
      const total = bornHere + rest;
      if (total <= 0) { z.herds.delete(key); continue; }
      let owed = (z.herds.get(key) ?? 0) + total * hours;
      let standing = n;
      while (owed >= 1 && standing < k && (alive.get(line) ?? 0) < (capOf.get(line) ?? 0)) {
        // An open home in this region: a room not yet holding as many of the
        // line as it has rows for. Every row full means nowhere to put it.
        const rows = [...(rowsBy.get(line) ?? new Map<string, number>())]
          .filter(([r]) => z.regionOf(r) === band && !world.entryRooms.has(r));
        const open = rows.filter(([r, cnt]) => (homed.get(line)?.get(r) ?? 0) < cnt).map(([r]) => r);
        let homes = open.length ? open : rows.map(([r]) => r);
        // A roaming line takes fresh ground, but fresh ground IN THIS REGION:
        // rolled across every region it lives in, a deer owed to the road
        // would settle in the wood and the wood would hold one more than it
        // carries.
        if (ROAMING_DENS.has(line)) {
          const ground = [...world.rooms.keys()].filter((r) =>
            z.regionOf(r) === band && !world.entryRooms.has(r) && !world.safeRooms.has(r));
          if (ground.length) homes = ground;
        }
        if (!homes.length) break;
        const home = homes[randInt(0, homes.length - 1)];
        // Born or walked in, in proportion to what was owed. A birth needs a
        // herd-mate out of sight of every player: nothing appears in a room
        // with someone watching it.
        const hidden = (mates.get(key) ?? []).filter((r) => !watched.has(r));
        const born = bornHere > 0 && hidden.length > 0 && Math.random() < bornHere / total;
        const c = mintCreature(z, tmpl, home, now, born ? hidden[randInt(0, hidden.length - 1)] : undefined, true);
        owed -= 1;
        standing++;
        alive.set(line, (alive.get(line) ?? 0) + 1);
        let h = homed.get(line);
        if (!h) { h = new Map(); homed.set(line, h); }
        h.set(c.home ?? home, (h.get(c.home ?? home) ?? 0) + 1);
        if (!silent && !born) {
          const t = world.mobTemplates.get(c.templateId) ?? tmpl;
          z.roomFeed(c.roomId, `${cap(t.name)} creeps out of the dark.`, undefined, false);
          z.roomSound(c.roomId, "Something stirs {dir}.", undefined, undefined, false, { act: "rustle" });
          z.refreshRoomCtx(c.roomId);
        }
      }
      // Never bank a backlog past the next body: a long sleep is paid in the
      // loop above, and a full region owes nothing.
      z.herds.set(key, standing >= k ? 0 : Math.min(owed, 1));
    }
  }
}

/** How much of what a predator eats is standing in this region (0..1). */
function preyShare(
  z: ZoneDO, line: string, band: string,
  capsBand: Map<string, Map<string, number>>, aliveBand: Map<string, Map<string, number>>,
): number {
  const prey = PREYS_ON.get(line);
  if (!prey?.size) return 1; // not a hunter: it eats the floor, or the dead
  let held = 0, room = 0;
  for (const p of prey) {
    const k = capsBand.get(p)?.get(band) ?? 0;
    if (!k) continue;
    room += k;
    held += Math.min(k, aliveBand.get(p)?.get(band) ?? 0);
  }
  return room > 0 ? Math.max(HERD_NO_PREY_SHARE, held / room) : HERD_NO_PREY_SHARE;
}

// ---- THE DAILY ROUND (rome, 2026-10-25) ----
//
// The same ten rooms should not hold the same animals at noon, at dusk and at
// midnight. A herd animal in the wood, the crossing or the mountain keeps two
// kinds of ground: the FEEDING ground (SURFACE_FORAGE — the lawns and rides,
// the beds and the tideline, the mountain's grass) and everything else, which
// is cover. In its waking hours it goes out to the nearest feeding ground
// within ROUND_RANGE of home and keeps to it; the rest of the time it keeps to
// cover around home. The day's animals wake at dawn and dusk (they are asleep
// at night already, NAPPERS); the night's (NOCTURNAL) wake through the dark.
// It is an errand like the others in creatureMoves' anchor — water, a bear's
// forage, a hunt all come first.

/** Whether this animal keeps the daily round at all. */
export function keepsRound(z: ZoneDO, c: Creature): boolean {
  const world = z.world!;
  if (ROOTED.has(c.templateId) || DROWNERS.has(c.templateId) || c.drift !== undefined || c.target) return false;
  const base = z.variantBase.get(c.templateId);
  if (!isHerd(world, c.templateId) && !(base && isHerd(world, base))) return false;
  return ROUND_REGIONS.has(z.regionOf(c.home ?? c.roomId));
}

/** Whether this room is where this kind of animal feeds. */
export function feedsAt(templateId: string, room: string): boolean {
  if (ROUND_BASKERS.has(templateId)) return WARM_GROUND.has(room);
  if (SCAVENGERS.has(templateId) && !HUNTS_NOT_CARRION.has(templateId) && CARRION_ROOMS.has(room)) return true;
  return SURFACE_FORAGE.has(room);
}

/** Out feeding, or lying up, at this hour. */
export function roundPhase(templateId: string, now: number): "feed" | "rest" {
  const night = isNight(now);
  if (NOCTURNAL.has(templateId)) return night ? "feed" : "rest";
  if (night) return "rest";
  const band = skyBand(now);
  return band === 0 || band === 4 ? "feed" : "rest";
}

// WARY (rome, 2026-10-25). Ground that is being hunted hard (conditions.ts,
// HUNTED) changes its prey: the day's animals give up the dawn and come out
// only in the last light, half of them do not come out at all, and any of them
// bolts when someone walks in on it (ai.waryBolt). The hunters are not wary;
// they are what the prey is wary of. It lasts as long as the condition does.
// Ground THICK with hunters (2026-10-26) makes its prey the same: what is being
// hunted does not ask by whom.

/** Prey on hunted ground. */
export function wary(z: ZoneDO, c: Creature): boolean {
  const line = z.variantBase.get(c.templateId) ?? c.templateId;
  if (!isHerd(z.world!, line) || PREYS_ON.get(line)?.size || SCAVENGERS.has(line)) return false;
  const kind = conditions.of(z, z.regionOf(c.home ?? c.roomId))?.kind;
  return kind === "hunted" || kind === "thick";
}

/** Whether this wary animal keeps to cover today: the same answer all day, a new one tomorrow. */
function staysIn(c: Creature, now: number): boolean {
  const key = `${c.id}:${Math.floor(now / 86_400_000)}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296 < WARY_STAYS_IN;
}

/** This animal's hour: its round, as the hunting has bent it. */
export function phaseFor(z: ZoneDO, c: Creature, now: number): "feed" | "rest" {
  const p = roundPhase(c.templateId, now);
  if (p !== "feed" || !wary(z, c)) return p;
  if (!NOCTURNAL.has(c.templateId) && skyBand(now) === 0) return "rest"; // the dawn is given up
  return staysIn(c, now) ? "rest" : "feed";
}

/** A booming herd is out at every waking hour: too many of them to keep to cover (conditions.ts). */
function outInBoom(z: ZoneDO, c: Creature, now: number): boolean {
  return (!isNight(now) || NOCTURNAL.has(c.templateId)) && conditions.booming(z, c);
}

/** The feeding ground to walk to this hour, or undefined to stay on home ground. */
export function roundGround(z: ZoneDO, c: Creature, now: number): string | undefined {
  if (!keepsRound(z, c) || (phaseFor(z, c, now) !== "feed" && !outInBoom(z, c, now)) || !c.home) {
    c.roundFor = undefined;
    return undefined;
  }
  if ((c.roundAt ?? 0) > now && c.roundFor) return c.roundFor;
  c.roundAt = now + HUNT_RECHECK_MS;
  const band = z.regionOf(c.home);
  const out = z.nearby(c.home, ROUND_RANGE);
  let best: string | undefined, bestD = Infinity;
  for (const [room, d] of out) {
    if (d < bestD && feedsAt(c.templateId, room) && z.regionOf(room) === band) { bestD = d; best = room; }
  }
  return (c.roundFor = best);
}

/** Of the steps it may take inside its range, the ones onto the ground this hour wants. */
export function roundExits<E extends { to_room: string }>(z: ZoneDO, c: Creature, exits: E[], now: number): E[] {
  if (!keepsRound(z, c)) return exits;
  const feeding = phaseFor(z, c, now) === "feed" || outInBoom(z, c, now);
  // Feeding: onto feeding ground — but only once it has one to be out on, or
  // an animal with none in reach would be pushed about for nothing.
  if (feeding && !c.roundFor) return exits;
  const keep = exits.filter((e) => feedsAt(c.templateId, e.to_room) === feeding);
  return keep.length ? keep : exits;
}

// THE ROUND'S SIGN (rome, 2026-10-25: the ground shows what happened). A herd
// animal leaving feeding ground has grazed it; one getting up out of cover to
// go and feed has lain there. Neither says what it was — cropped turf and a
// pressed-down bed are read, not named.
const SIGN_EVERY_MS = 30 * 60_000;
export function leaveSign(z: ZoneDO, c: Creature, from: string, now: number): void {
  if (!keepsRound(z, c)) return;
  const kind = feedsAt(c.templateId, from) ? "graze"
    : phaseFor(z, c, now) === "feed" ? "lie" : undefined;
  if (!kind) return;
  // ONE of each to a room, freshened in place: a herd that grazes a lawn all
  // day must not crowd the room's twelve traces and push a kill's blood out.
  const had = (z.traces.get(from) ?? []).find((t) => t.kind === kind);
  if (had) { if (now - had.at >= SIGN_EVERY_MS) had.at = now; return; }
  z.addTrace(from, { kind, at: now });
}
