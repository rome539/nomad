// THE WHITE ROE (rome, 2026-11-01). The wood's own change, as the rat king is
// the fortress's, and made only of what the wood already had. The white roe
// stood in the rut's herds and nowhere else; now, about once a day while there
// is none, one comes into the wood on its own and stays until somebody kills
// it. Its description has always said what it does to a place - "every other
// living thing in this wood has somewhere it would rather be" - and while it
// walks the wood that is simply true:
//
//   - NOTHING SHARES ITS ROOM. Whatever is in a room it walks into leaves it,
//     and nothing steps into one it stands in (ai.creatureMoves asks shuns()).
//     The room it is in is the one quiet room in the wood, and it moves.
//   - THE FOLLOWERS COME. The follower is the maze's own thing, and its
//     description has always said it "moves when you move". Near the roe it
//     does: within WHITE_ROE_NEAR steps of it, every follower within reach of
//     you closes on you, unseen, one room at a time, quicker the nearer you are
//     to the roe, and it drops on you more readily (wakeMult). It never steps
//     into the roe's own room, so standing with the roe you are safe, and the
//     moment you step out of it, what has been following you is there.
//   - THE KEEPER SPEAKS OF IT at the gate, as he does of the king.
//   - KILLING IT IS THE COST. Whoever does has every animal in the wood
//     against them, as if each one had been hurt by them itself.
//
// It keeps to the wood (it is no MIGRANT, and wanders the wood's open ground
// with no territory to keep to: roams()).

import type { ZoneDO } from "./zone";
import type { Session, Creature } from "./zone-types";
import { chance, randInt, uuid, pick } from "./rng";
import { addGrudge, wakeListeners } from "./ai";
import { cap } from "./zone-util";
import {
  WHITE_ROE, WHITE_ROE_ROLL_PER_MIN, WHITE_ROE_NEAR, WHITE_ROE_FOLLOW_REACH, WHITE_ROE_FOLLOW_MS,
  WHITE_ROE_WAKE_PER_STEP, WHITE_ROE_KEEPER_PER_MIN, WHITE_ROE_KEEPER_GAP_MS, WHITE_ROE_KEEPER_LINES,
  WHITE_ROE_COMES, WHITE_ROE_SLAIN_LINES, WAKE_ENTER, INDOOR_ROOMS, HOLLOW, ROOTED, SENTINELS,
  WANDER_MIN_MS, WANDER_MAX_MS,
} from "./zone-data";

const FOLLOWER = "the-follower";
const WOOD = new Set(["wood"]);

type State = { lastRoll: number; seenAt: number; roe: Creature | null };
const states = new WeakMap<ZoneDO, State>();
function st(z: ZoneDO): State {
  let s = states.get(z);
  if (!s) { s = { lastRoll: 0, seenAt: -1, roe: null }; states.set(z, s); }
  return s;
}

// The white roe walking the wood now, if there is one. Read for every creature
// every beat, so it is looked up once a beat and kept.
export function roe(z: ZoneDO, now = Date.now()): Creature | null {
  const s = st(z);
  if (s.seenAt === now) return s.roe;
  s.seenAt = now;
  s.roe = null;
  for (const c of z.creatures.values()) {
    if (c.templateId === WHITE_ROE && c.hp > 0 && z.regionOf(c.roomId) === "wood") { s.roe = c; break; }
  }
  return s.roe;
}

// The open ground of the wood it walks: never under a roof, a gate or a refuge.
function openWood(z: ZoneDO, roomId: string): boolean {
  const w = z.world!;
  return z.regionOf(roomId) === "wood" && !INDOOR_ROOMS.has(roomId) && !w.entryRooms.has(roomId) && !w.safeRooms.has(roomId);
}

// Does this creature keep out of that room? Everything but the roe keeps out of
// the roe's room. ai.creatureMoves narrows a step by it (never stranding).
export function shuns(z: ZoneDO, creature: Creature, roomId: string, now = Date.now()): boolean {
  if (creature.templateId === WHITE_ROE) return false;
  const r = roe(z, now);
  return !!r && r.roomId === roomId;
}

// The roe's own step: anywhere in the wood's open ground, with no territory.
export function roams(creature: Creature): boolean {
  return creature.templateId === WHITE_ROE;
}
export function woodSteps<E extends { to_room: string }>(z: ZoneDO, exits: E[]): E[] {
  const open = exits.filter((e) => openWood(z, e.to_room));
  return open.length ? open : exits;
}

// Once a minute: with no roe, the roll; with one, the keeper's word.
export function roll(z: ZoneDO, now: number): void {
  const s = st(z);
  if (now - s.lastRoll < 60_000) return;
  s.lastRoll = now;
  if (roe(z, now)) { keeper(z, now); return; }
  if (chance(WHITE_ROE_ROLL_PER_MIN)) comes(z, now);
}

export function comes(z: ZoneDO, now: number): Creature | null {
  const tmpl = z.world!.mobTemplates.get(WHITE_ROE);
  if (!tmpl || roe(z, now)) return null;
  const rooms = [...z.world!.rooms.keys()].filter((r) => openWood(z, r));
  if (!rooms.length) return null;
  const at = pick(rooms);
  const c: Creature = {
    id: uuid(), templateId: WHITE_ROE, roomId: at, home: at,
    hp: tmpl.max_hp, hunger: randInt(0, 30), grudges: [], target: null,
    nextWanderAt: now + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
  };
  z.creatures.set(c.id, c);
  st(z).seenAt = -1;
  z.noteCreaturesChanged();
  z.refreshRoomCtx(at);
  z.roomFeedBands(WOOD, WHITE_ROE_COMES, undefined, false);
  return c;
}

const keeperSaid = new Map<string, number>(); // pubkey -> when the keeper last spoke of the roe to them
function keeper(z: ZoneDO, now: number): void {
  for (const s of z.sessions.values()) {
    if (!z.inGatehouse.has(s.pubkey)) continue;
    if (now - (keeperSaid.get(s.pubkey) ?? 0) < WHITE_ROE_KEEPER_GAP_MS || !chance(WHITE_ROE_KEEPER_PER_MIN)) continue;
    keeperSaid.set(s.pubkey, now);
    z.send(s, pick(WHITE_ROE_KEEPER_LINES), "amb");
  }
}

// NOTHING SHARES ITS ROOM. Run for every creature every beat: one standing in
// the roe's room that is free to go, goes. What cannot move does not (a rooted
// thing is the ground, a sentinel its post, the bosses their own); what is in a
// fight finishes it.
export async function makesWay(z: ZoneDO, creature: Creature, now: number,
  move: (c: Creature) => Promise<void>): Promise<void> {
  if (creature.templateId === WHITE_ROE || creature.target || creature.heldBy || creature.holding) return;
  const r = roe(z, now);
  if (!r || r.roomId !== creature.roomId) return;
  if (ROOTED.has(creature.templateId) || SENTINELS.has(creature.templateId)) return;
  if (z.world!.mobTemplates.get(creature.templateId)?.is_boss) return;
  creature.asleep = false;
  creature.sleepUntil = undefined;
  await move(creature);
}

// How near this wanderer is to the roe, in steps, if near enough to matter.
function nearRoe(z: ZoneDO, s: Session, now: number): number | null {
  const r = roe(z, now);
  if (!r || z.regionOf(s.roomId) !== "wood" || !z.reachable(s)) return null;
  const d = z.roomDist(s.roomId, r.roomId);
  return d <= WHITE_ROE_NEAR ? d : null;
}

// How much readier a follower is to drop on this wanderer: more, the nearer
// they are to the roe. 1 for anything else, or anyone not near it.
export function wakeMult(z: ZoneDO, c: Creature, s: Session, now = Date.now()): number {
  if (c.templateId !== FOLLOWER) return 1;
  const d = nearRoe(z, s, now);
  return d === null ? 1 : 1 + WHITE_ROE_WAKE_PER_STEP * (WHITE_ROE_NEAR + 1 - d);
}

// THE FOLLOWERS COME. A hidden follower, idle, with somebody near the roe
// within its reach, takes a step toward the nearest of them on its own clock,
// unseen. In their room, each step of its clock is a chance to drop on them.
export async function follows(z: ZoneDO, c: Creature, now: number): Promise<void> {
  if (c.templateId !== FOLLOWER || c.target || !c.hidden || c.asleep) return;
  if ((c.followAt ?? 0) > now) return;
  let quarry: Session | null = null, near = 0, far = Infinity;
  for (const s of z.sessions.values()) {
    const d = nearRoe(z, s, now);
    if (d === null) continue;
    const reach = z.roomDist(c.roomId, s.roomId);
    if (reach > WHITE_ROE_FOLLOW_REACH || reach >= far) continue;
    quarry = s; near = d; far = reach;
  }
  if (!quarry) return;
  c.followAt = now + WHITE_ROE_FOLLOW_MS * (1 + near);
  if (c.roomId === quarry.roomId) {
    await wakeListeners(z, quarry, c.roomId, WAKE_ENTER, "has been behind you for some time. Now it is on you!");
    return;
  }
  const exits = (z.world!.exits.get(c.roomId) ?? []).filter((e) => !e.key_item
    && !z.world!.entryRooms.has(e.to_room) && !z.world!.safeRooms.has(e.to_room) && !shuns(z, c, e.to_room, now));
  let step: string | null = null;
  for (const e of exits) {
    if (z.roomDist(e.to_room, quarry.roomId) < far) { step = e.to_room; break; }
  }
  if (!step) return;
  c.roomId = step; // silent: it is never seen moving
  z.noteCreaturesChanged();
}

// KILLING IT IS THE COST. Every animal in the wood holds it against the killer.
export function slain(z: ZoneDO, killer: Session): void {
  z.send(killer, pick(WHITE_ROE_SLAIN_LINES), "dmgin");
  for (const c of z.creatures.values()) {
    if (c.templateId === WHITE_ROE || HOLLOW.has(c.templateId) || z.regionOf(c.roomId) !== "wood") continue;
    addGrudge(z, c, killer.pubkey);
  }
  z.roomFeed(killer.roomId, `${cap(killer.name)} stands over the white roe.`, killer.pubkey, false);
  st(z).seenAt = -1;
}
