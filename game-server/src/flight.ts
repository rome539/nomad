// BIRDS FLY OUT TO FEED (rome, 2026-11-06). A bird lives on foot
// around its home like anything else. When it is hungry and nothing it eats is on
// that ground, it takes off, is off the map while it flies (the drake's `aloft`,
// which every room index already honours), and comes down by the nearest food.
// Once down it feeds or hunts by the ordinary rules, then flies home; if it finds
// nothing it goes home hungry and rests before it tries again. A hunter whose prey
// has left does not sit out its time: it flies to the next thing it eats. A bird in a fight,
// held, hurt or asleep does not go, so flying is never an escape.
import type { ZoneDO } from "./zone";
import type { Creature } from "./zone-types";
import { forageGround, hungers, edibleBody, eatingNow } from "./ai";
import { MOUNTAIN_QUARTER_ROOMS } from "./detail";
import { cap, isNight } from "./zone-util";
import * as beasts from "./beasts";
import {
  CARRION_ROOMS, CORPSE_TRACES, CROWD_CAP, FLIGHT_CHECK_MS, FLIGHT_LOOK_MS, FLIGHT_MIN_MS, FLIGHT_MS_PER_ROOM, FLIGHT_RANGE, FLIGHT_REST_MS,
  FLIGHT_STAY_MS, FOOD_FLIERS, GRAZERS, HUNGRY_AT, NOCTURNAL, OUTDOOR_REGIONS, OUTDOOR_ROOMS, PREYS_ON, TERRITORY_RADIUS, WOUNDED_FRACTION,
} from "./zone-data";

const lineOf = (z: ZoneDO, id: string): string => FOOD_FLIERS.has(id) ? id : (z.variantBase.get(id) ?? id);

/** Whether this room feeds this bird right now. */
function foodIn(z: ZoneDO, c: Creature, line: string, room: string): boolean {
  const eats = PREYS_ON.get(c.templateId) ?? PREYS_ON.get(line);
  if (eats?.size && z.creaturesInRoom(room).some((o) => eats.has(o.templateId) && !o.hidden)) return true;
  // A bird that grazes and hunts both (the heron) flies to either (rome, 2026-11-08).
  if (GRAZERS.has(c.templateId) || GRAZERS.has(line)) return forageGround(z, c.templateId, room);
  if (eats?.size) return false;
  return (z.traces.get(room) ?? []).some(edibleBody); // bodies, never the bone floors (rome, 2026-11-08)
}

/** Open sky over it: a bird does not fly into a cave, a keep or a cellar. */
const underSky = (z: ZoneDO, room: string): boolean => OUTDOOR_ROOMS.has(room) || OUTDOOR_REGIONS.has(z.regionOf(room));

/** A full room draws no more birds, the same limit walking animals keep (CROWD_CAP). */
const hasSpace = (z: ZoneDO, room: string): boolean => z.creaturesInRoom(room).length < CROWD_CAP;

/** Where a bird comes down when its own home is full: the closest ground with space. */
function nearHome(z: ZoneDO, home: string): string {
  const world = z.world!;
  for (const room of z.nearby(home, TERRITORY_RADIUS).keys()) {
    if (z.regionOf(room) !== z.regionOf(home) || !underSky(z, room) || world.entryRooms.has(room) || world.safeRooms.has(room)) continue;
    if (hasSpace(z, room)) return room;
  }
  return home;
}

/** The nearest food in the air's reach, unless there is some on the ground it can walk. */
function findFood(z: ZoneDO, c: Creature, line: string, nearToo = false): { room: string; dist: number } | undefined {
  const world = z.world!;
  const summit = MOUNTAIN_QUARTER_ROOMS.summit ?? [];
  const region = z.regionOf(c.home ?? c.roomId);
  let best: { room: string; dist: number } | undefined;
  for (const [room, dist] of z.nearby(c.roomId, FLIGHT_RANGE)) {
    if (best && dist >= best.dist) continue;
    if (z.regionOf(room) !== region || !underSky(z, room) || world.entryRooms.has(room) || world.safeRooms.has(room) || summit.includes(room)) continue;
    if (foodIn(z, c, line, room) && hasSpace(z, room)) best = { room, dist };
  }
  return best && (nearToo || best.dist > TERRITORY_RADIUS) ? best : undefined;
}

/** It eats only the dead (no prey, no grazing): nothing to find on foot on the way, so near bodies are worth the flight (rome, 2026-11-07). */
const eatsOnlyDead = (c: Creature, line: string): boolean =>
  !(PREYS_ON.get(c.templateId) ?? PREYS_ON.get(line))?.size && !GRAZERS.has(c.templateId) && !GRAZERS.has(line);

/** A bird down at a meal with nothing left there for it: given a minute on the ground, and not blown from a rush or on a chase.
 *  A hunter's prey walks off; a carrion bird's body is eaten by others before it lands, and it looks again just the same
 *  (rome, 2026-11-08: a vulture starving at 99 sat out its stay twelve rooms from home with bodies a few rooms off). */
function preyHasLeft(z: ZoneDO, c: Creature, line: string, now: number): boolean {
  if (!(PREYS_ON.get(c.templateId) ?? PREYS_ON.get(line))?.size && !eatsOnlyDead(c, line)) return false;
  if (now < c.awayUntil! - FLIGHT_STAY_MS + FLIGHT_LOOK_MS || (c.huntRestUntil ?? 0) > now || c.chase) return false;
  // It walks the ground round where it landed, so prey it can walk to has not left.
  for (const room of z.nearby(c.awayAt ?? c.roomId, TERRITORY_RADIUS).keys()) if (foodIn(z, c, line, room)) return false;
  return true;
}

function canGo(z: ZoneDO, c: Creature): boolean {
  if (c.target || c.asleep || c.stunned || c.heldBy || c.holding || c.hidden || c.drift !== undefined || c.waitsOn) return false; // a vulture waiting on the hurt stays
  const t = z.world!.mobTemplates.get(c.templateId);
  if (!t || c.hp < t.max_hp * (1 - WOUNDED_FRACTION)) return false;
  if (c.awayUntil === undefined && !underSky(z, c.roomId)) return false; // indoors it has no way up
  for (const s of z.sessions.values()) if (s.target === c.id) return false;
  return true;
}

/** Done with a meal away, and already standing at home: no flight, it is simply home. */
function homeAlready(z: ZoneDO, c: Creature, now: number): boolean {
  if (c.roomId !== (c.home ?? c.roomId)) return false;
  c.awayUntil = undefined; c.awayAt = undefined;
  c.nextWanderAt = now;
  if (hungers(c.templateId) && c.hunger >= HUNGRY_AT) c.flightRestUntil = now + FLIGHT_REST_MS;
  z.noteCreaturesChanged();
  return true;
}

function takeOff(z: ZoneDO, c: Creature, to: string, dist: number, now: number): void {
  const t = z.world!.mobTemplates.get(c.templateId)!;
  const from = c.roomId;
  z.roomFeed(from, `${cap(t.name)} opens its wings and is gone.`, undefined, false);
  c.home ??= from;
  c.flightTo = to;
  beasts.note(z, "flights", now);
  c.aloft = now + Math.max(FLIGHT_MIN_MS, dist * FLIGHT_MS_PER_ROOM);
  c.awayUntil = undefined; c.awayAt = undefined;
  c.huntFor = undefined;
  z.noteCreaturesChanged();
  z.refreshRoomCtx(from);
}

function land(z: ZoneDO, c: Creature, now: number): void {
  const t = z.world!.mobTemplates.get(c.templateId)!;
  const home = c.home ?? c.roomId;
  let to = c.flightTo && z.world!.rooms.has(c.flightTo) ? c.flightTo : home;
  if (!hasSpace(z, to)) {
    if (to !== home) { // the room filled while it flew: it turns for home instead
      const dist = z.nearby(to, FLIGHT_RANGE).get(home) ?? FLIGHT_RANGE;
      c.flightTo = home;
      c.aloft = now + Math.max(FLIGHT_MIN_MS, dist * FLIGHT_MS_PER_ROOM);
      return;
    }
    to = nearHome(z, home);
  }
  c.roomId = to;
  const wentHome = c.flightTo === home;
  c.flightTo = undefined;
  c.aloft = undefined;
  if (wentHome) {
    c.awayUntil = undefined;
    c.awayAt = undefined;
    if (hungers(c.templateId) && c.hunger >= HUNGRY_AT) c.flightRestUntil = now + FLIGHT_REST_MS;
  } else {
    // DOWN, IT WALKS (rome, 2026-11-07). It was held in the one room it landed
    // in for the whole stay; now it hunts or picks over the rooms round it on
    // foot (ai.creatureMoves anchors it here), and flies when fed or at the end.
    c.awayUntil = now + FLIGHT_STAY_MS;
    c.awayAt = to;
    c.nextWanderAt = now;
  }
  z.noteCreaturesChanged();
  z.roomFeed(to, `${cap(t.name)} comes down out of the sky.`, undefined, false);
  z.refreshRoomCtx(to);
  z.fxPose(to, c.templateId, "landing"); // and the picture brings it down too (public.ts)
}

export function tick(z: ZoneDO, now: number): void {
  const state = z.groups;
  if (now - (state.flownAt ?? 0) < FLIGHT_CHECK_MS) return;
  state.flownAt = now;
  for (const c of [...z.creatures.values()]) {
    const line = lineOf(z, c.templateId);
    if (!FOOD_FLIERS.has(line)) continue;
    if (c.aloft !== undefined) {
      if (c.flightTo && c.flightTo !== (c.home ?? c.roomId) && eatsOnlyDead(c, line) && !foodIn(z, c, line, c.flightTo)) {
        // THE BODY WAS EATEN WHILE IT FLEW (rome, 2026-11-09: one dead vulture
        // brought birds down one after another onto bare bone). It turns for the
        // next body in reach, or for home, rather than coming down on nothing.
        const food = findFood(z, c, line, true);
        const to = food?.room ?? c.home ?? c.roomId;
        const dist = food?.dist ?? z.nearby(c.flightTo, FLIGHT_RANGE).get(to) ?? FLIGHT_RANGE;
        c.flightTo = to;
        c.aloft = now + Math.max(FLIGHT_MIN_MS, dist * FLIGHT_MS_PER_ROOM);
        z.noteCreaturesChanged();
        continue;
      }
      if (c.flightTo && now >= c.aloft) land(z, c, now);
      continue;
    }
    if (!canGo(z, c)) continue;
    // IT FINISHES ITS MEAL FIRST (rome, 2026-11-09: the scavengers kept flying off
    // the body). The bite takes its hunger under HUNGRY_AT at once, so a bird down
    // at a body went home on the next check with the meal hardly begun.
    if (eatingNow(c, now)) continue;
    const hungry = hungers(c.templateId) && c.hunger >= HUNGRY_AT;
    if (c.awayUntil !== undefined) {
      if (!hungry || now >= c.awayUntil) {
        if (homeAlready(z, c, now)) continue;
        const home = c.home ?? c.roomId;
        const dist = z.nearby(c.roomId, FLIGHT_RANGE).get(home) ?? FLIGHT_RANGE;
        takeOff(z, c, home, dist, now);
      } else if (preyHasLeft(z, c, line, now)) {
        // A hunter's meal walks off, where a scavenger's does not: it looks again
        // for what it eats, near or far, and in the wrong hours or with nothing
        // in reach it goes home.
        const inHours = NOCTURNAL.has(c.templateId) ? isNight(now) : !isNight(now);
        const food = inHours ? findFood(z, c, line, true) : undefined;
        if (food) takeOff(z, c, food.room, food.dist, now);
        else if (!homeAlready(z, c, now)) {
          const home = c.home ?? c.roomId;
          takeOff(z, c, home, z.nearby(c.roomId, FLIGHT_RANGE).get(home) ?? FLIGHT_RANGE, now);
        }
      }
      continue;
    }
    if (!hungry || now < (c.flightRestUntil ?? 0)) continue;
    if (NOCTURNAL.has(c.templateId) ? !isNight(now) : isNight(now)) continue; // out in its own hours
    // A carrion bird already standing on its meal does not fly; one with bodies
    // two or three rooms off flies to them instead of passing them over.
    const deadOnly = eatsOnlyDead(c, line);
    if (deadOnly && foodIn(z, c, line, c.roomId)) continue;
    const food = findFood(z, c, line, deadOnly);
    if (food) takeOff(z, c, food.room, food.dist, now);
    else c.flightRestUntil = now + FLIGHT_LOOK_MS * (0.75 + Math.random() * 0.5); // spread out, so the birds don't all search on one beat
  }
}
