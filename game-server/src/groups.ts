// THE MOUNTAIN'S GROUPS (rome, 2026-11-06). Where an animal settles is chance,
// with food tipping the odds, so the mountain is laid out differently as animals
// die and move. Some lines live in company (MOUNTAIN_GROUPS): a group shares one
// home, new animals join it while it has room, and a share of the line goes alone.
//
// A group broken down to one or none is finished: the last one left goes on as a
// loner and nothing new settles on that ground for a while, so the next group is
// somewhere else. Hunger moves them too: a group, or a loner, that has been hungry
// for GROUP_LEAN_MS gives up its ground and picks again. It walks there by the
// ordinary territory walk; nothing teleports.
import type { ZoneDO } from "./zone";
import type { Creature } from "./zone-types";
import { chance, randInt, uuid } from "./rng";
import { cap } from "./zone-util";
import * as beasts from "./beasts";
import { ate, creatureMoves, hungers, mountainHomes, preyFalls } from "./ai";
import {
  CARRION_ROOMS, GROUND_CHASE_ODDS, GROUND_DRIVEN, GROUND_DRIVEN_LEAVES, GROUND_HOLDERS, GROUND_KILL_ODDS, KILL_FRESH_MS,
  DAY_CYCLE_MS, HOME_FED_EXTRA_DAYS, HOME_MAX_DAYS, HOME_MIN_DAYS, MEAL_SMALL, RIVAL_AVOID_MS, RIVAL_REST_MS, SMALL_PREY, GROUP_GONE_MS, GROUP_LEAN_MS, GROUP_SWEEP_MS, HUNGRY_AT, MOUNTAIN_GROUPS, MOUNTAIN_ROAMERS,
  PACK_PREY, PREYS_ON, SCAVENGERS, SETTLES_BY_PREY, SURFACE_FORAGE, TERRITORY_RADIUS,
} from "./zone-data";

export interface Group { line: string; home: string; size: number; peak: number; leanSince?: number; moveAt?: number; kept?: boolean }
export interface GroupsState { at: number; flownAt?: number; packs: Record<string, Group>; gone: Record<string, number>; tally?: beasts.Tally; lastTally?: beasts.Tally }
export interface Plan { home: string; group?: string; lone?: boolean }

function lineOf(z: ZoneDO, templateId: string): string {
  return MOUNTAIN_ROAMERS.has(templateId) ? templateId : (z.variantBase.get(templateId) ?? templateId);
}

/** Where this line's food is on the mountain, as room -> how much of it. */
function foodRooms(z: ZoneDO, line: string): Map<string, number> {
  const food = new Map<string, number>();
  const eats = new Set<string>([...(PREYS_ON.get(line) ?? []), ...(PACK_PREY.get(line)?.keys() ?? [])]);
  if (eats.size) {
    for (const c of z.creatures.values()) {
      if (c.aloft === undefined && eats.has(c.templateId) && z.regionOf(c.roomId) === "mountain") food.set(c.roomId, (food.get(c.roomId) ?? 0) + 1);
    }
    return food;
  }
  for (const r of SCAVENGERS.has(line) ? CARRION_ROOMS : SURFACE_FORAGE) {
    if (z.world!.rooms.has(r) && z.regionOf(r) === "mountain") food.set(r, 1);
  }
  return food;
}

/** A home drawn at random across every fit room, each counting for more the more food is in reach of it. */
export function pickHome(z: ZoneDO, line: string, now: number, leaving?: string): string | undefined {
  const state = z.groups;
  const barred = new Set<string>();
  for (const [room, until] of Object.entries(state.gone)) {
    if (until <= now) { delete state.gone[room]; continue; }
    for (const r of z.nearby(room, TERRITORY_RADIUS).keys()) barred.add(r);
  }
  if (leaving) for (const r of z.nearby(leaving, TERRITORY_RADIUS).keys()) barred.add(r);
  const all = mountainHomes(z, line);
  const open = all.filter((r) => !barred.has(r));
  const pool = open.length ? open : all;
  if (!pool.length) return undefined;
  const weight = new Map<string, number>(pool.map((r) => [r, 1]));
  for (const [room, n] of foodRooms(z, line)) {
    for (const r of z.nearby(room, TERRITORY_RADIUS).keys()) {
      const w = weight.get(r);
      if (w !== undefined) weight.set(r, w + n);
    }
  }
  // A line that must have food close draws only from the rooms that have it, if any do.
  const fed = SETTLES_BY_PREY.has(line) ? [...weight].filter(([, w]) => w > 1) : [];
  const draw = fed.length ? fed : [...weight];
  let roll = Math.random() * draw.reduce((a, [, w]) => a + w, 0);
  for (const [r, w] of draw) {
    roll -= w;
    if (roll < 0) return r;
  }
  return pool[pool.length - 1];
}

function memberCounts(z: ZoneDO): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of z.creatures.values()) if (c.group) counts.set(c.group, (counts.get(c.group) ?? 0) + 1);
  return counts;
}

/** Decide where a new animal of this line goes: alone, into a group with room, or starting one. */
export function plan(z: ZoneDO, line: string, now: number): Plan | undefined {
  const cfg = MOUNTAIN_GROUPS.get(line);
  if (cfg && !chance(cfg.lone)) {
    const counts = memberCounts(z);
    const open = Object.entries(z.groups.packs).filter(([id, g]) => g.line === line && (counts.get(id) ?? 0) < g.size);
    if (open.length) {
      const [id, g] = open[randInt(0, open.length - 1)];
      return { home: g.home, group: id };
    }
    const home = pickHome(z, line, now);
    if (!home) return undefined;
    const id = uuid();
    z.groups.packs[id] = { line, home, size: randInt(cfg.min, cfg.max), peak: 0 };
    return { home, group: id };
  }
  const home = pickHome(z, line, now);
  return home ? { home, lone: cfg ? true : undefined } : undefined;
}

/** Put an animal where its plan says. */
export function join(c: Creature, p: Plan): void {
  c.home = p.home;
  c.group = p.group;
  c.lone = p.lone;
}

/** Look the mountain's groups over: break the finished, move the starving, sort out the undecided. */
export function tick(z: ZoneDO, now: number): void {
  const state = z.groups;
  if (now - state.at < GROUP_SWEEP_MS) return;
  state.at = now;
  const members = new Map<string, Creature[]>();
  let undecided: Creature | undefined;
  for (const c of z.creatures.values()) {
    const line = lineOf(z, c.templateId);
    if (!MOUNTAIN_ROAMERS.has(line) || c.drift !== undefined) continue;
    if (z.regionOf(c.home ?? c.roomId) !== "mountain") {
      if (c.group) { c.group = undefined; c.lone = true; } // it has left the mountain, and the group
      continue;
    }
    if (c.group) {
      const list = members.get(c.group) ?? [];
      list.push(c);
      members.set(c.group, list);
    } else if (MOUNTAIN_GROUPS.has(line) && !c.lone) {
      if (!undecided && !c.target) undecided = c;
    } else {
      const move = (home: string): void => { c.home = home; c.moveAt = undefined; c.kept = undefined; };
      moveIfLean(z, [c], line, now, c.leanSince, (t) => { c.leanSince = t; }, move);
      moveIfDue(z, [c], line, now, c, move);
    }
  }
  for (const [id, g] of Object.entries(state.packs)) {
    const list = members.get(id) ?? [];
    g.peak = Math.max(g.peak, list.length);
    if (list.length <= 1 && g.peak >= 2) {
      state.gone[g.home] = now + GROUP_GONE_MS;
      for (const c of list) { c.group = undefined; c.lone = true; }
      delete state.packs[id];
    } else if (!list.length) {
      delete state.packs[id];
    } else {
      for (const c of list) c.home = g.home;
      const move = (home: string): void => {
        g.home = home;
        g.moveAt = undefined;
        g.kept = undefined;
        for (const c of list) c.home = home;
      };
      moveIfLean(z, list, g.line, now, g.leanSince, (t) => { g.leanSince = t; }, move);
      moveIfDue(z, list, g.line, now, g, move);
    }
  }
  // Animals alive from before there were groups take their place one at a time,
  // so the mountain does not get up and walk all at once.
  if (undecided) {
    const p = plan(z, lineOf(z, undecided.templateId), now);
    if (p) join(undecided, p);
  }
}

/** Time up on this home: draws a new one, once a well-fed one has had its extra game day. */
function moveIfDue(
  z: ZoneDO, animals: Creature[], line: string, now: number,
  clock: { moveAt?: number; kept?: boolean }, move: (home: string) => void,
): void {
  if (clock.moveAt === undefined) {
    clock.moveAt = now + randInt(HOME_MIN_DAYS * DAY_CYCLE_MS, HOME_MAX_DAYS * DAY_CYCLE_MS);
    return;
  }
  if (now < clock.moveAt || animals.some((c) => c.target || c.heldBy || c.holding)) return;
  const hungry = animals.filter((c) => hungers(c.templateId) && c.hunger >= HUNGRY_AT).length;
  if (!clock.kept && hungry * 2 <= animals.length) {
    clock.kept = true;
    clock.moveAt = now + HOME_FED_EXTRA_DAYS * DAY_CYCLE_MS;
    return;
  }
  const home = pickHome(z, line, now, animals[0].home ?? animals[0].roomId);
  if (!home) return;
  move(home);
  beasts.note(z, "moved", now);
}

function moveIfLean(
  z: ZoneDO, animals: Creature[], line: string, now: number, since: number | undefined,
  setSince: (t: number | undefined) => void, move: (home: string) => void,
): void {
  const hungry = animals.filter((c) => hungers(c.templateId) && c.hunger >= HUNGRY_AT).length;
  if (hungry * 2 <= animals.length) { if (since !== undefined) setSince(undefined); return; }
  if (since === undefined) { setSince(now); return; }
  if (now - since < GROUP_LEAN_MS) return;
  setSince(undefined);
  const home = pickHome(z, line, now, animals[0].home ?? animals[0].roomId);
  if (home) move(home);
}

/** A wolf's beat on a smaller hunter sharing its room. True when it took the wolf's turn. */
export async function holdGround(
  z: ZoneDO, wolf: Creature, now: number,
  flee: (c: Creature) => Promise<unknown> = (c) => creatureMoves(z, c, now, "flee", false),
): Promise<boolean> {
  if (!GROUND_HOLDERS.has(lineOf(z, wolf.templateId)) || wolf.target || wolf.asleep || wolf.stunned || wolf.holding || wolf.heldBy) return false;
  if ((wolf.rivalRestUntil ?? 0) > now) return false;
  const roomId = wolf.roomId;
  const rival = z.creaturesInRoom(roomId).find((c) => c.id !== wolf.id && GROUND_DRIVEN.has(lineOf(z, c.templateId))
    && !c.target && !c.hidden && !c.heldBy && !c.holding);
  if (!rival) return false;
  const kill = (z.traces.get(roomId) ?? []).find((t) => t.kind === "blood" && t.prey && now - t.at < KILL_FRESH_MS);
  const group = wolf.group ? z.groups.packs[wolf.group] : undefined;
  const onGround = !!group && z.withinRadius(roomId, group.home, TERRITORY_RADIUS);
  if ((!onGround && !kill) || !chance(GROUND_CHASE_ODDS)) return false;
  const world = z.world!;
  const wt = world.mobTemplates.get(wolf.templateId)!, rt = world.mobTemplates.get(rival.templateId)!;
  wolf.rivalRestUntil = now + RIVAL_REST_MS;
  rival.asleep = false;
  rival.sleepUntil = undefined;
  const feed = (from: string): void => {
    wolf.hunger = SMALL_PREY.has(from) ? Math.max(0, wolf.hunger - MEAL_SMALL) : 0;
    ate(wolf, now);
    z.fxFed(roomId, wolf.templateId);
  };
  if (onGround && chance(GROUND_KILL_ODDS)) {
    preyFalls(z, rival, rt, wolf.templateId);
    beasts.note(z, "caught", now);
    feed(rival.templateId);
    z.roomFeed(roomId, `${cap(wt.name)} catches ${rt.name} before it can turn, and that is the end of it.`, undefined, false);
    z.roomSound(roomId, "A snarl {dir}, a thin scream, and then nothing.", undefined, undefined, false, { mob: wolf.templateId, act: "fight" });
    z.refreshRoomCtx(roomId);
    return true;
  }
  if (kill) { feed(kill.prey!); beasts.note(z, "stolen", now); } else beasts.note(z, "chases", now);
  z.roomFeed(roomId, kill
    ? `${cap(wt.name)} comes at ${rt.name} over its kill. ${cap(rt.name)} gives it up and runs, and the wolf puts its head down to what it left.`
    : `${cap(wt.name)} goes for ${rt.name}. ${cap(rt.name)} does not wait for it, and runs.`, undefined, false);
  z.roomSound(roomId, "A snarl {dir}, and something small going away fast.", undefined, undefined, false, { mob: wolf.templateId, act: "fight" });
  rival.avoids = [
    ...(rival.avoids ?? []).filter((a) => a.until > now && a.roomId !== roomId),
    { roomId, until: now + RIVAL_AVOID_MS },
  ];
  rival.huntAt = 0;
  rival.huntFor = undefined;
  if (onGround && (rival.drivenOff = (rival.drivenOff ?? 0) + 1) >= GROUND_DRIVEN_LEAVES) {
    rival.drivenOff = undefined;
    const home = pickHome(z, lineOf(z, rival.templateId), now, group!.home);
    if (home) { rival.home = home; rival.moveAt = undefined; rival.kept = undefined; }
  }
  await flee(rival);
  // The chase: a stolen meal holds it here; otherwise it runs after, a beat behind.
  if (!kill && rival.roomId !== roomId) {
    wolf.curious = rival.roomId;
    wolf.nextWanderAt = now + randInt(4_000, 15_000);
  }
  z.refreshRoomCtx(roomId);
  return true;
}
