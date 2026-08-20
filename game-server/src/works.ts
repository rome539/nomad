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
// It is a ONE-WAY DOOR, not an eviction. Whoever is already inside when the
// boards go up stays inside, keeps everything behind the door, and leaves when
// they feel like leaving — the closure only ever refuses the way IN. See
// tickWorks for why (rome, 2026-08-12).
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
// That cost used to BE the draw weight, and it is not any more.
//
// ── EVERY DOOR HAS THE SAME CHANCE (rome, 2026-08-20) ────────────────────────
//
// Weighting the draw by cost was defensible on paper and indefensible once the
// table was printed. Measured on the live map at fourteen gates:
//
//     the-ferry-house  25.0%   ...   the-stell  0.8%   the-shieling  0.4%
//
// Two doors did a third of all the closing and four of them effectively never
// shut at all. That is not a rare event, it is a promise — and the reason the
// Shieling scored 0.4% is that it sits three rooms from the Stell, which is a
// fact about how the mountain's doors were placed and has nothing to do with
// whether a crew would turn up there.
//
// A works closure is people arriving at a door with timber. They do not read a
// traffic model. The draw is UNIFORM over every door not vetoed below.
//
// The cost is still measured, because it is the only number that says what a
// door is actually worth and it is worth being able to look at. It simply does
// not choose any more.
//
// The safety rules are measured the same way and cannot rot: a closure is
// rejected if it would strand any room, and a door is never shut if it is the
// last one open. Both are computed against the graph as it is, not as it was.
import type { ZoneDO } from "./zone";
import type { World } from "./world";
import {
  WORKS_GAP_MIN_MS, WORKS_GAP_MAX_MS, WORKS_LEN_MIN_MS, WORKS_LEN_MAX_MS,
  WORKS_MAX_SHUT, WORKS_SECOND_ODDS, SURFACE_BANDS,
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
  strands: Set<string>;                    // gates that are the ONLY way home for something
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
  const strands = new Set<string>();
  for (const gate of gates) {
    const without = walkHome(world, gates.filter((g) => g !== gate), reach);
    // STRANDING IS A REFUSAL, NOT A COST, and it is now tracked on its own.
    // It used to be folded into the weight as a zero, which worked only while
    // the weight was what chose the door. The draw is uniform now (see
    // pickWorks) and a zero no longer means anything to it, so the veto needs
    // its own set or a door that is somebody's only way home would be drawn
    // like any other.
    if (without.stranded > base.stranded) strands.add(gate);
    // The weight is still measured. Nothing picks with it any more, but it is
    // the only number that says what a door is actually worth, and the gate
    // audit reads it.
    weight.set(gate, without.stranded > base.stranded ? 0 : Math.max(0, without.avg - base.avg));
  }
  return { reach, weight, strands, gates };
}

// ── Choosing a door ──────────────────────────────────────────────────────────

/**
 * Pick a gate to shut. EVERY DOOR HAS THE SAME CHANCE (rome, 2026-08-20).
 *
 * It used to draw weighted by what shutting the door cost the world's average
 * walk home, and that produced a table nobody would defend out loud: the ferry
 * house drew 25% of all closures and the Shieling drew 0.4%, so two doors in
 * the game did nearly all the closing and four of them effectively never shut
 * at all. A works closure is a crew turning up at a door. Crews do not read a
 * traffic model, and a door that never closes is not a door with a low
 * probability, it is a door with a promise.
 *
 * The measured weight is still computed (planWorks) because it is the only
 * number that says what a door is worth — it just does not choose any more.
 *
 * The ONE thing that still vetoes a door is stranding: if shutting it leaves
 * some room with no reachable open gate at all, it is not drawn. That is not a
 * preference, it is the guarantee that you can always bank somewhere.
 */
export function pickWorks(plan: WorksPlan, shut: string[]): string | null {
  const openNow = plan.gates.filter((g) => !shut.includes(g));
  if (openNow.length <= 1) return null; // never the last door standing
  const candidates = openNow.filter((g) => !plan.strands.has(g));
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
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

  // ── THE DOOR IS ONE-WAY, AND NOBODY IS PUT OUT OF IT ────────────────────────
  //
  // Earlier cuts of this design evicted: the moment a gate boarded up, everyone
  // behind the door was walked into the gate room, and then a standing sweep
  // walked out anyone who somehow got back in. rome ruled that out (2026-08-12).
  // The closure is now a ONE-WAY DOOR and nothing more:
  //
  //   • standing inside when the boards go up costs you nothing. You stay, with
  //     the counter, the bench, the box and the fire, for as long as you care to
  //     stay — worksBar stands down for anyone already out of the world, so
  //     everything behind the door keeps working for whoever is behind it.
  //   • 'out' is never barred. Leaving is leaving.
  //   • and once you are out, that is that: `in` refuses, the chip is gone, and
  //     the hatch/forge/vault cannot be conjured from the gate room. Everyone
  //     else is looking at planks.
  //
  // So the pressure lands exactly where it should — on the walk home to a door
  // that will not open — and never on the wanderer who was already warming their
  // hands when the carpenters arrived. Being inside a boarded gatehouse is a
  // legal, stable state, which is also what closes the desync a player hit under
  // the old rule (Lunapilot, 2026-08-09): she was inside and outside at once
  // because an eviction raced the door. There is no eviction left to race.

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
 * Shut it. Anyone already behind the door STAYS behind it — the boards go up
 * around them, not against them, and they keep the counter and the fire until
 * they choose to walk out. What the closure takes is the way back IN.
 */
function closeTheDoor(z: ZoneDO, gate: string): void {
  const world = z.world!;
  const name = world.rooms.get(gate)?.name ?? "the gatehouse";
  for (const s of z.sessions.values()) {
    if (s.roomId !== gate || !z.outOfWorld(s)) continue;
    // Told plainly, because it changes what leaving MEANS for them: the step out
    // is now a step they don't take back.
    z.send(
      s,
      "Men come in through the back with trestles and a bundle of planks, and set to work around you. " +
      "The keeper carries on as if none of it were happening. Nobody asks you to leave — but the boards are going up over the door, " +
      "and when you step out of it you will not be stepping back in.",
      "evt",
    );
  }
  z.roomFeedBands(
    SURFACE_BANDS,
    `Word comes down the road: ${name} is shutting up for works. The door will be boarded until it is done.`,
    "evt",
  );
}
