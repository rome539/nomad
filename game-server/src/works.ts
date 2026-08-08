// THE GATEHOUSE CLOSES FOR WORKS (rome, 2026-08-07/08).
//
// A gatehouse shuts for a few hours — under construction, being rebuilt — and
// while it is shut the door will not open. The GATE ROOM IS UNTOUCHED: still
// walkable, still a spawn, still on the map, still the same room. What goes is
// everything BEHIND the door at once — the lockbox and the vault, the keeper's
// hatch, the forge and the smelter, the smoke racks, the wall chart, and the
// safe step out of the world. You walked here carrying everything and there is
// nowhere to put it and nowhere to stand.
//
// That is the walk-home pressure — the load-bearing wall of the whole design —
// applied on a dial. It never adds a rule. It removes a convenience, in one
// place, for a while.
//
// ── WHY THERE IS NO TABLE OF DOORS IN THIS FILE ──────────────────────────────
//
// The first cut of this design hardcoded the seven gates into banks, with the
// cost of shutting each one measured by hand off the live graph. rome killed
// it in one line: THE MAP IS STILL EXPANDING. A constant naming today's doors
// and today's distances is wrong the day a room is added behind one of them,
// and wrong in the worst way — silently, with the numbers still looking right.
//
// So nothing here is written down. The module MEASURES the world it is handed,
// at init, every time it loads:
//
//   • BFS from every gate over the real exit graph.
//   • The world's baseline: the average walk from any room to its nearest gate.
//   • Per gate, the cost of shutting IT: how much that average rises without it.
//
// That cost is the draw weight. A door whose closure nobody would notice is
// almost never drawn; a door that is the only thing standing between a region
// and a very long walk is drawn often. This is what the hand-built bank table
// was trying to approximate, and it does it without knowing a single room name
// — add a wing to the wood tomorrow and the door that serves it gets heavier by
// itself, because it genuinely became more important.
//
// The safety rules are measured the same way and cannot rot: a closure is
// rejected if it would strand any room, and a door is never shut if it is the
// last one open. Both are computed against the graph as it is, not as it was.
import type { ZoneDO } from "./zone";
import type { World } from "./world";
import type { Session } from "./zone-types";
import {
  WORKS_GAP_MIN_MS, WORKS_GAP_MAX_MS, WORKS_LEN_MIN_MS, WORKS_LEN_MAX_MS,
  WORKS_MAX_SHUT, WORKS_SECOND_ODDS, WORKS_MIN_WEIGHT, SURFACE_BANDS,
} from "./zone-data";
import { randInt, chance } from "./rng";

// ── Measuring the map ────────────────────────────────────────────────────────

/** Every room's distance from one gate, over the real exit graph. */
function walkFrom(world: World, from: string): Map<string, number> {
  const dist = new Map<string, number>([[from, 0]]);
  const queue = [from];
  for (let head = 0; head < queue.length; head++) {
    const here = queue[head];
    const step = dist.get(here)! + 1;
    for (const exit of world.exits.get(here) ?? []) {
      if (dist.has(exit.to_room)) continue;
      dist.set(exit.to_room, step);
      queue.push(exit.to_room);
    }
  }
  return dist;
}

/**
 * The world's average walk home, given a set of gates standing open — and the
 * count of rooms that can reach NO open gate at all. The average is the number
 * the design cares about; the stranded count is the veto.
 */
function walkHome(
  world: World, open: string[], reach: Map<string, Map<string, number>>,
): { avg: number; stranded: number } {
  let sum = 0, counted = 0, stranded = 0;
  for (const roomId of world.rooms.keys()) {
    let best = Infinity;
    for (const gate of open) {
      const d = reach.get(gate)?.get(roomId);
      if (d !== undefined && d < best) best = d;
    }
    if (best === Infinity) { stranded++; continue; }
    sum += best; counted++;
  }
  return { avg: counted ? sum / counted : 0, stranded };
}

export interface WorksPlan {
  reach: Map<string, Map<string, number>>; // gate -> every room's distance from it
  weight: Map<string, number>;             // gate -> how much shutting it costs the world
  gates: string[];
}

/**
 * Read the map. Called once per world load — cheap enough at four hundred rooms
 * (one BFS per gate) and it must NOT be cached across loads, because the whole
 * point is that it re-reads a map that grew.
 */
export function planWorks(world: World): WorksPlan {
  const gates = [...world.entryRooms].filter((g) => world.rooms.has(g));
  const reach = new Map<string, Map<string, number>>();
  for (const gate of gates) reach.set(gate, walkFrom(world, gate));
  const base = walkHome(world, gates, reach);
  const weight = new Map<string, number>();
  for (const gate of gates) {
    const without = walkHome(world, gates.filter((g) => g !== gate), reach);
    // Stranding is not a cost, it is a refusal — a door that is the only way
    // home for anything gets weight 0 here and is vetoed outright below.
    weight.set(gate, without.stranded > base.stranded ? 0 : Math.max(0, without.avg - base.avg));
  }
  return { reach, weight, gates };
}

// ── Choosing a door ──────────────────────────────────────────────────────────

/**
 * Pick a gate to shut, weighted by what shutting it actually costs the world.
 * Returns null when nothing may close — every candidate strands somebody, or
 * there is nothing left worth shutting.
 */
export function pickWorks(plan: WorksPlan, shut: string[]): string | null {
  const openNow = plan.gates.filter((g) => !shut.includes(g));
  if (openNow.length <= 1) return null; // never the last door standing
  const candidates: { gate: string; w: number }[] = [];
  for (const gate of openNow) {
    const w = plan.weight.get(gate) ?? 0;
    if (w <= 0) continue; // a door whose closure strands somebody, or costs nothing at all
    candidates.push({ gate, w: Math.max(w, WORKS_MIN_WEIGHT) });
  }
  if (!candidates.length) return null;
  const total = candidates.reduce((sum, c) => sum + c.w, 0);
  let roll = Math.random() * total;
  for (const c of candidates) { roll -= c.w; if (roll <= 0) return c.gate; }
  return candidates[candidates.length - 1].gate;
}

/** Would shutting these leave every room a way home? The veto, measured live. */
export function safeToShut(world: World, plan: WorksPlan, shut: string[]): boolean {
  const open = plan.gates.filter((g) => !shut.includes(g));
  if (!open.length) return false;
  return walkHome(world, open, plan.reach).stranded === walkHome(world, plan.gates, plan.reach).stranded;
}

// ── The state of the doors ───────────────────────────────────────────────────

/** Is this gate's door shut for works right now? */
export function shutForWorks(z: ZoneDO, roomId: string): boolean {
  return (z.works.get(roomId) ?? 0) > Date.now();
}

/** The gates currently shut. */
export function shutGates(z: ZoneDO): string[] {
  const now = Date.now();
  return [...z.works.entries()].filter(([, until]) => until > now).map(([id]) => id);
}

// ── What a shut door says ────────────────────────────────────────────────────

// The refusal is deliberately not a system message. It is a door with a plank
// across it and somebody's work on the other side: the world being busy with
// its own business, which is the register the whole game speaks in.
const REFUSALS = [
  "The door is planked over and a hand-lettered board hangs off it: WORKS. Something heavy shifts inside, and a voice you don't know tells nobody in particular to mind the lintel.",
  "Boards across the door, nailed from the inside. Through the gap: bare trestles where the counter was, the hatch shutter off its runners and propped against the wall.",
  "The door does not give. There is scaffolding lashed up the inside of the frame and the smell of new-cut timber and lime, and whoever is working has no interest in the noise you make.",
];

export function worksRefusal(): string {
  return REFUSALS[randInt(0, REFUSALS.length - 1)];
}

/** The line a shut gate room carries in its description. */
export function worksBlurb(): string {
  return "The gatehouse door is planked over and boarded, and there is a board nailed to it: WORKS. Nothing behind it is open to you.";
}

// ── The clock ────────────────────────────────────────────────────────────────

/**
 * Start and end closures. Called from the world-rolls block of the tick, so it
 * runs on the world's own clock whether or not anyone is watching, and catches
 * up correctly across a hibernation.
 */
export function tickWorks(z: ZoneDO, now: number): void {
  const world = z.world;
  if (!world || !z.worksPlan) return;

  // ── the works finish ──
  for (const [gate, until] of [...z.works.entries()]) {
    if (until > now) continue;
    z.works.delete(gate);
    const name = world.rooms.get(gate)?.name ?? "the gatehouse";
    z.roomFeedBands(
      SURFACE_BANDS,
      `Word goes round that the works at ${name} are finished — the boards are off the door, and the fire is lit.`,
      "evt",
    );
  }

  // ── the works begin ──
  // A WORLD THAT HAS NEVER CONSIDERED WORKS WAITS ITS FIRST GAP FIRST. Unset is
  // 0, and 0 is in the past, so without this the very first tick after the ship
  // — or after any world that predates this field wakes up — boards a gatehouse
  // instantly, with a live player possibly standing in it. Schedule, don't fire.
  if (!z.nextWorksAt) {
    z.nextWorksAt = now + randInt(WORKS_GAP_MIN_MS, WORKS_GAP_MAX_MS);
    return;
  }
  if (now < z.nextWorksAt) return;
  z.nextWorksAt = now + randInt(WORKS_GAP_MIN_MS, WORKS_GAP_MAX_MS);

  // THE DOUBLE IS A PROPERTY OF THE EVENT, NOT OF THE SCHEDULE. First cut rolled
  // for a second closure only at the next scheduled consideration — which, with
  // works lasting 2–5h and the clock coming round every 5–9h, meant the first
  // had almost always ended before the second was ever considered. Simulated 90
  // days: 313 closures, not one of them a pair. So the companion is rolled HERE,
  // the moment works begin: the world has a bad week, rather than a calendar.
  let shut = shutGates(z);
  for (let n = 0; n < WORKS_MAX_SHUT; n++) {
    if (shut.length >= WORKS_MAX_SHUT) break;
    if (n > 0 && !chance(WORKS_SECOND_ODDS)) break; // the first is the event; the second is the rare one
    const gate = pickWorks(z.worksPlan, shut);
    if (!gate) break;
    if (!safeToShut(world, z.worksPlan, [...shut, gate])) break; // nothing is ever stranded
    z.works.set(gate, now + randInt(WORKS_LEN_MIN_MS, WORKS_LEN_MAX_MS));
    closeTheDoor(z, gate);
    shut = [...shut, gate];
  }
}

/**
 * Shut it, and put out anyone standing inside. NOBODY IS EVER SHUT IN: if you
 * are behind the door when the works start you are walked out to the gate room
 * you came in by, holding everything you were holding. The closure takes the
 * gatehouse away; it never takes your footing.
 */
function closeTheDoor(z: ZoneDO, gate: string): void {
  const world = z.world!;
  const name = world.rooms.get(gate)?.name ?? "the gatehouse";
  const inside: Session[] = [];
  for (const s of z.sessions.values()) {
    if (s.roomId === gate && z.outOfWorld(s)) inside.push(s);
  }
  for (const s of inside) {
    z.send(
      s,
      "The keeper straightens up and starts putting things away, and does not stop when you speak to him. " +
      "Men come in through the back with trestles and a bundle of planks. You are outside before you have quite agreed to be.",
      "evt",
    );
    void z.leaveGatehouse(s); // the same door you'd have walked out of — nothing is confiscated, nothing is moved
  }
  z.roomFeedBands(
    SURFACE_BANDS,
    `Word comes down the road: ${name} is shutting up for works. The door will be boarded until it is done.`,
    "evt",
  );
}
