// THE OTHER NOMAD (rome, 2026-10-05). One figure walks the whole world on its
// own: it goes from room to room, and when somebody is standing there it puts a
// hand out toward something — a way on, a beast, a thing on the floor, the
// person themselves — holds it, and lowers it. That is all it does. It does not
// speak, fight, trade, carry or die; nothing in the world can touch it and it
// touches nothing. It is drawn with the same nomad strip every player is.
//
// It lives in memory only. A cold start puts it down somewhere new, which is no
// different from never having met it where it was.
import type { ZoneDO } from "./zone";
import { POSES } from "./zone-data";
import { chance, pick, randInt } from "./rng";
import { nameMatches } from "./zone-util";

export const WANDERER_NAME = "a nomad";

export interface Wanderer {
  roomId: string;
  cameFrom?: string;        // the room it just left: it does not turn straight back
  pointAt?: string;         // what the hand is out toward, as the room reads it
  pointRef?: string;        // c:<creature> / p:<pubkey> / g:<item> — a thing that can leave
  pointsHere: number;       // how many times it has pointed in this room
  nextAt: number;           // when it next does anything
}

const LINGER_EMPTY_MS: [number, number] = [8_000, 25_000];   // nobody here: it keeps walking
const LINGER_WATCHED_MS: [number, number] = [20_000, 50_000]; // somebody here: it stays a while
const HOLD_MS: [number, number] = [8_000, 18_000];            // a hand stays out this long
const POINTS_PER_ROOM = 3;

export function isHere(z: ZoneDO, roomId: string): boolean {
  return !!z.wanderer && z.wanderer.roomId === roomId;
}

// `look nomad`, `attack nomad`, `point nomad`: does the word name it?
export function named(z: ZoneDO, roomId: string, arg: string): boolean {
  return isHere(z, roomId) && nameMatches(WANDERER_NAME, arg);
}

// The picture: the nomad strip's state, same as a player's.
export function folkState(z: ZoneDO): string {
  return z.wanderer?.pointAt ? "point" : "";
}

// "A nomad is here." for the room's own description.
export function roomLine(z: ZoneDO, roomId: string): string | null {
  const w = z.wanderer;
  if (!w || w.roomId !== roomId) return null;
  return w.pointAt ? `A nomad is here, ${POSES.point!.read.replace("{what}", w.pointAt)}.` : "A nomad is here.";
}

export const LOOK_TEXT = "Somebody on the road like you, in a travelling cloak with the hood up. The face is lost in it. They are not looking at you; they are looking at the room.";
export const UNTOUCHED_TEXT = "You go for the nomad and they are simply not where your hand arrives. They do not look round.";

function ms(r: [number, number]): number { return randInt(r[0], r[1]); }

function watchers(z: ZoneDO, roomId: string): number {
  let n = 0;
  for (const s of z.sessions.values()) if (s.roomId === roomId && !z.outOfWorld(s) && s.hp > 0) n++;
  return n;
}

function startRoom(z: ZoneDO): string | null {
  const world = z.world!;
  const rooms = [...world.rooms.keys()].filter((r) => !world.entryRooms.has(r) && !world.safeRooms.has(r));
  return rooms.length ? pick(rooms) : null;
}

// The beat. Cheap when nothing is due: one comparison.
export function tickWanderer(z: ZoneDO, now: number): void {
  if (!z.world) return;
  if (!z.wanderer) {
    const roomId = startRoom(z);
    if (!roomId) return;
    z.wanderer = { roomId, pointsHere: 0, nextAt: now + ms(LINGER_EMPTY_MS) };
    return;
  }
  const w = z.wanderer;
  // The hand follows the thing (verbs.pointStillThere): what walked off is not
  // pointed at a beat longer.
  if (w.pointAt && !stillThere(z, w)) return lower(z, w, now);
  if (now < w.nextAt) return;
  if (w.pointAt) return lower(z, w, now);
  if (watchers(z, w.roomId) && w.pointsHere < POINTS_PER_ROOM && chance(0.7) && point(z, w, now)) return;
  walk(z, w, now);
}

function point(z: ZoneDO, w: Wanderer, now: number): boolean {
  const target = choose(z, w.roomId);
  if (!target) return false;
  w.pointAt = target.what;
  w.pointRef = target.ref;
  w.pointsHere++;
  w.nextAt = now + ms(HOLD_MS);
  z.roomFeed(w.roomId, POSES.point!.room.replace("{name}", "A nomad").replace("{what}", target.what), undefined, false);
  z.refreshRoomCtx(w.roomId);
  return true;
}

function lower(z: ZoneDO, w: Wanderer, now: number): void {
  w.pointAt = undefined;
  w.pointRef = undefined;
  w.nextAt = now + ms(watchers(z, w.roomId) ? [4_000, 10_000] : LINGER_EMPTY_MS);
  z.roomFeed(w.roomId, "A nomad lowers their hand.", undefined, false);
  z.refreshRoomCtx(w.roomId);
}

function walk(z: ZoneDO, w: Wanderer, now: number): void {
  const world = z.world!;
  let exits = (world.exits.get(w.roomId) ?? []).filter(
    (e) => (!e.key_item || z.openDoors.has(`${w.roomId}:${e.dir}`)) && !world.safeRooms.has(e.to_room),
  );
  const onward = exits.filter((e) => e.to_room !== w.cameFrom);
  if (onward.length) exits = onward;
  if (!exits.length) { w.nextAt = now + ms(LINGER_EMPTY_MS); return; }
  const exit = pick(exits);
  const from = w.roomId;
  w.cameFrom = from;
  w.roomId = exit.to_room;
  w.pointsHere = 0;
  w.nextAt = now + ms(watchers(z, exit.to_room) ? LINGER_WATCHED_MS : LINGER_EMPTY_MS);
  z.roomFeed(from, `A nomad goes ${exit.dir}.`, undefined, false);
  z.roomFeed(exit.to_room, "A nomad walks in.", undefined, false);
  z.refreshRoomCtx(from);
  z.refreshRoomCtx(exit.to_room);
}

// Something the room already admits exists: a person, a beast in plain sight,
// a thing on the floor, a way out. People first — it is pointing for them.
function choose(z: ZoneDO, roomId: string): { what: string; ref?: string } | null {
  const world = z.world!;
  const people: { what: string; ref: string }[] = [];
  for (const s of z.sessions.values()) {
    if (s.roomId === roomId && z.reachable(s) && s.hp > 0) people.push({ what: s.name, ref: `p:${s.pubkey}` });
  }
  const beasts: { what: string; ref: string }[] = [];
  for (const c of z.creaturesInRoom(roomId)) {
    if (c.hidden) continue;
    const t = world.mobTemplates.get(c.templateId);
    if (t) beasts.push({ what: t.name, ref: `c:${c.id}` });
  }
  const things: { what: string; ref: string }[] = [];
  for (const itemId of z.ground.get(roomId) ?? []) {
    const t = world.itemTemplates.get(itemId);
    if (t) things.push({ what: t.name, ref: `g:${itemId}` });
  }
  const ways = (world.exits.get(roomId) ?? []).map((e) => ({ what: `the way ${e.dir}` }));
  const pools = [people, beasts, things, ways].filter((p) => p.length);
  if (!pools.length) return null;
  if (people.length && chance(0.3)) return pick(people);
  const rest = [beasts, things, ways].filter((p) => p.length);
  return pick(pick(rest.length ? rest : pools));
}

function stillThere(z: ZoneDO, w: Wanderer): boolean {
  const ref = w.pointRef;
  if (!ref) return true;
  const kind = ref.slice(0, 1), id = ref.slice(2);
  if (kind === "c") {
    const c = z.creatures.get(id);
    return !!c && c.roomId === w.roomId && !c.hidden;
  }
  if (kind === "p") {
    const s = z.sessions.get(id);
    return !!s && s.roomId === w.roomId && z.reachable(s) && s.hp > 0;
  }
  return (z.ground.get(w.roomId) ?? []).includes(id);
}
