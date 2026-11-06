// THE MOUNTAIN'S BIRDS FLY OUT TO FEED (rome, 2026-11-06). A bird lives on foot
// around its home like anything else. When it is hungry and nothing it eats is on
// that ground, it takes off, is off the map while it flies (the drake's `aloft`,
// which every room index already honours), and comes down by the nearest food.
// Once down it feeds or hunts by the ordinary rules, then flies home; if it finds
// nothing it goes home hungry and rests before it tries again. A bird in a fight,
// held, hurt or asleep does not go, so flying is never an escape.
import type { ZoneDO } from "./zone";
import type { Creature } from "./zone-types";
import { hungers } from "./ai";
import { MOUNTAIN_QUARTER_ROOMS } from "./detail";
import { cap, isNight } from "./zone-util";
import * as beasts from "./beasts";
import {
  CARRION_ROOMS, CORPSE_TRACES, FLIGHT_CHECK_MS, FLIGHT_MIN_MS, FLIGHT_MS_PER_ROOM, FLIGHT_RANGE, FLIGHT_REST_MS,
  FLIGHT_STAY_MS, HUNGRY_AT, MOUNTAIN_FLIERS, NOCTURNAL, PREYS_ON, TERRITORY_RADIUS, WOUNDED_FRACTION,
} from "./zone-data";

const lineOf = (z: ZoneDO, id: string): string => MOUNTAIN_FLIERS.has(id) ? id : (z.variantBase.get(id) ?? id);

/** Whether this room feeds this bird right now. */
function foodIn(z: ZoneDO, c: Creature, line: string, room: string): boolean {
  const eats = PREYS_ON.get(c.templateId) ?? PREYS_ON.get(line);
  if (eats?.size) return z.creaturesInRoom(room).some((o) => eats.has(o.templateId) && !o.hidden);
  return CARRION_ROOMS.has(room) || (z.traces.get(room) ?? []).some((t) => CORPSE_TRACES.has(t.kind));
}

/** The nearest food in the air's reach, unless there is some on the ground it can walk. */
function findFood(z: ZoneDO, c: Creature, line: string): { room: string; dist: number } | undefined {
  const world = z.world!;
  const summit = MOUNTAIN_QUARTER_ROOMS.summit ?? [];
  let best: { room: string; dist: number } | undefined;
  for (const [room, dist] of z.nearby(c.roomId, FLIGHT_RANGE)) {
    if (best && dist >= best.dist) continue;
    if (z.regionOf(room) !== "mountain" || world.entryRooms.has(room) || world.safeRooms.has(room) || summit.includes(room)) continue;
    if (foodIn(z, c, line, room)) best = { room, dist };
  }
  return best && best.dist > TERRITORY_RADIUS ? best : undefined;
}

function canGo(z: ZoneDO, c: Creature): boolean {
  if (c.target || c.asleep || c.stunned || c.heldBy || c.holding || c.hidden || c.drift !== undefined) return false;
  const t = z.world!.mobTemplates.get(c.templateId);
  if (!t || c.hp < t.max_hp * (1 - WOUNDED_FRACTION)) return false;
  for (const s of z.sessions.values()) if (s.target === c.id) return false;
  return true;
}

function takeOff(z: ZoneDO, c: Creature, to: string, dist: number, now: number): void {
  const t = z.world!.mobTemplates.get(c.templateId)!;
  const from = c.roomId;
  z.roomFeed(from, `${cap(t.name)} opens its wings and is gone.`, undefined, false);
  c.flightTo = to;
  beasts.note(z, "flights", now);
  c.aloft = now + Math.max(FLIGHT_MIN_MS, dist * FLIGHT_MS_PER_ROOM);
  c.awayUntil = undefined;
  c.huntFor = undefined;
  z.noteCreaturesChanged();
  z.refreshRoomCtx(from);
}

function land(z: ZoneDO, c: Creature, now: number): void {
  const t = z.world!.mobTemplates.get(c.templateId)!;
  const to = c.flightTo && z.world!.rooms.has(c.flightTo) ? c.flightTo : (c.home ?? c.roomId);
  c.roomId = to;
  c.flightTo = undefined;
  c.aloft = undefined;
  if (to === c.home) {
    c.awayUntil = undefined;
    if (hungers(c.templateId) && c.hunger >= HUNGRY_AT) c.flightRestUntil = now + FLIGHT_REST_MS;
  } else {
    c.awayUntil = now + FLIGHT_STAY_MS;
    c.nextWanderAt = c.awayUntil; // it stays by the food
  }
  z.noteCreaturesChanged();
  z.roomFeed(to, `${cap(t.name)} comes down out of the sky.`, undefined, false);
  z.refreshRoomCtx(to);
}

export function tick(z: ZoneDO, now: number): void {
  const state = z.groups;
  if (now - (state.flownAt ?? 0) < FLIGHT_CHECK_MS) return;
  state.flownAt = now;
  for (const c of [...z.creatures.values()]) {
    const line = lineOf(z, c.templateId);
    if (!MOUNTAIN_FLIERS.has(line) || z.regionOf(c.home ?? c.roomId) !== "mountain") continue;
    if (c.aloft !== undefined) {
      if (c.flightTo && now >= c.aloft) land(z, c, now);
      continue;
    }
    if (!canGo(z, c)) continue;
    const hungry = hungers(c.templateId) && c.hunger >= HUNGRY_AT;
    if (c.awayUntil !== undefined) {
      if (!hungry || now >= c.awayUntil) {
        const home = c.home ?? c.roomId;
        const dist = z.nearby(c.roomId, FLIGHT_RANGE).get(home) ?? FLIGHT_RANGE;
        takeOff(z, c, home, dist, now);
      }
      continue;
    }
    if (!hungry || now < (c.flightRestUntil ?? 0)) continue;
    if (NOCTURNAL.has(c.templateId) ? !isNight(now) : isNight(now)) continue; // out in its own hours
    const food = findFood(z, c, line);
    if (food) takeOff(z, c, food.room, food.dist, now);
  }
}
