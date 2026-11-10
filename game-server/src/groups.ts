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
import * as grass from "./grass";
import { ate, creatureMoves, deadEatsAt, eatingNow, edibleBody, hungers, mountainHomes, preyFalls } from "./ai";
import {
  CARRION_ROOMS, GROUND_CHASE_ODDS, GROUND_DRIVEN, GROUND_DRIVEN_LEAVES, GROUND_HOLDERS, GROUND_KILL_ODDS, KILL_FRESH_MS,
  DAY_CYCLE_MS, HOME_FED_EXTRA_DAYS, HOME_MAX_DAYS, HOME_MIN_DAYS, MEAL_SMALL, RIVAL_AVOID_MS, RIVAL_REST_MS, SMALL_PREY, GROUP_GONE_MS, GROUP_LEAN_MS, GROUP_SWEEP_MS, HUNGRY_AT, MOUNTAIN_GROUPS, MOUNTAIN_ROAMERS,
  PACK_PREY, PREYS_ON, SCAVENGERS, SETTLES_BY_PREY, SURFACE_FORAGE, TERRITORY_RADIUS, BROWSERS, CRAG_ROOMS, GRASS_BITES, FLOCKS, SPREAD_ROOSTS,
  PACK_QUARRY, PACK_HUNT_RANGE, HUNT_RECHECK_MS, LAND_HOLDERS, LAND_BITE_ODDS, FOOD_PULL, LEAN_AGAIN_MS,
  BODY_HOLDERS, MOBBERS, MOB_AT, BODY_CHASE_ODDS, MOB_ODDS, BODY_AVOID_MS, BODY_REST_MS,
} from "./zone-data";

export interface Group { line: string; home: string; size: number; peak: number; leanSince?: number; leanMovedAt?: number; moveAt?: number; kept?: boolean; quarry?: string; quarryAt?: number }
export interface GroupsState { at: number; flownAt?: number; packs: Record<string, Group>; gone: Record<string, number>; tally?: beasts.Tally; lastTally?: beasts.Tally }
export interface Plan { home: string; group?: string; lone?: boolean }

function lineOf(z: ZoneDO, templateId: string): string {
  return MOUNTAIN_ROAMERS.has(templateId) ? templateId : (z.variantBase.get(templateId) ?? templateId);
}

/** Where this line's food is on the mountain, as room -> how much of it. */
function foodRooms(z: ZoneDO, line: string, now: number): Map<string, number> {
  const food = new Map<string, number>();
  const eats = new Set<string>([...(PREYS_ON.get(line) ?? []), ...(PACK_PREY.get(line)?.keys() ?? [])]);
  if (eats.size) {
    for (const c of z.creatures.values()) {
      if (c.aloft === undefined && eats.has(c.templateId) && z.regionOf(c.roomId) === "mountain") food.set(c.roomId, (food.get(c.roomId) ?? 0) + 1);
    }
    return food;
  }
  // A scavenger homes by its roost, the bone ground, though the bones feed it
  // nothing now; a goat by the crags it browses as well as the grass (rome, 2026-11-08).
  const ground = SCAVENGERS.has(line) ? CARRION_ROOMS : BROWSERS.has(line) ? new Set([...SURFACE_FORAGE, ...CRAG_ROOMS]) : SURFACE_FORAGE;
  // BY THE GRASS LEFT, NOT THE ROOMS (rome, 2026-11-08: the herds all slid to the
  // foot, which has most of the grazing rooms, eaten bare or not). A grazing room
  // counts for the mouthfuls still on it, so ground the herds have eaten down
  // stops pulling them and the uneaten grass higher up draws the next home.
  for (const r of ground) {
    if (z.world!.rooms.has(r) && z.regionOf(r) === "mountain") food.set(r, SCAVENGERS.has(line) ? 1 : grass.left(z, r, now) / GRASS_BITES);
  }
  return food;
}

/** Two lines after the same food. */
function sharesFood(a: string, b: string): boolean {
  const A = PREYS_ON.get(a), B = PREYS_ON.get(b);
  if (!A || !B) return false;
  for (const p of A) if (B.has(p)) return true;
  return false;
}

/** Does a holder of `owner`'s line keep one of `other`'s off its land: its own kind, or a smaller hunter after its food. */
export function keepsOff(z: ZoneDO, owner: string, other: string): boolean {
  if (owner === other) return true;
  const size = (l: string) => z.world!.mobTemplates.get(l)?.max_hp ?? 0;
  return sharesFood(owner, other) && size(owner) > size(other);
}

/** A home drawn at random across every fit room, each counting for more the more food is in reach of it. */
export function pickHome(z: ZoneDO, line: string, now: number, leaving?: string): string | undefined {
  const state = z.groups;
  const barred = new Set<string>();
  // Land already held by its own kind or a bigger hunter after its food (LAND_HOLDERS):
  // how many hold each room, its own kind counting three times over.
  const heldBy = new Map<string, number>();
  if (LAND_HOLDERS.has(line)) {
    const held = new Map<string, number>();
    for (const c of z.creatures.values()) {
      const other = lineOf(z, c.templateId);
      if (!c.home || held.has(c.home) || !(LAND_HOLDERS.has(other) || GROUND_HOLDERS.has(other))) continue;
      if (z.regionOf(c.home) === "mountain" && keepsOff(z, other, line)) held.set(c.home, other === line ? 3 : 1);
    }
    for (const [h, w] of held) for (const r of z.nearby(h, TERRITORY_RADIUS).keys()) heldBy.set(r, (heldBy.get(r) ?? 0) + w);
  } else if (SPREAD_ROOSTS.has(line)) {
    // Every home of a big carrion bird crowds the ground round it, so the least crowded
    // is drawn. ALL OF THEM TOGETHER (rome, 2026-11-09: a vulture, two bone-breakers and
    // the bone-dropper in one room): a vulture counts the bone-breakers' and the ravens'
    // homes as well as its own kind's, and so do they.
    for (const c of z.creatures.values()) {
      if (!c.home || !SPREAD_ROOSTS.has(lineOf(z, c.templateId)) || z.regionOf(c.home) !== "mountain") continue;
      for (const r of z.nearby(c.home, TERRITORY_RADIUS).keys()) heldBy.set(r, (heldBy.get(r) ?? 0) + 1);
    }
  }
  for (const [room, until] of Object.entries(state.gone)) {
    if (until <= now) { delete state.gone[room]; continue; }
    for (const r of z.nearby(room, TERRITORY_RADIUS).keys()) barred.add(r);
  }
  if (leaving) for (const r of z.nearby(leaving, TERRITORY_RADIUS).keys()) barred.add(r);
  const all = mountainHomes(z, line);
  // HERDS KEEP APART (rome, 2026-11-08: every herd of a line ended up packed into
  // two or three homes at the foot). A group's home is drawn at least 4 rooms from
  // every other group of its line, as hunters keep their land, while there is
  // such ground; with none, anywhere it fits.
  const apart = new Set<string>();
  const herd = MOUNTAIN_GROUPS.has(line) && (!PREYS_ON.has(line) || FLOCKS.has(line)); // herds and flocks, not the packs
  if (herd) for (const g of Object.values(state.packs)) {
    if (g.line === line) for (const r of z.nearby(g.home, TERRITORY_RADIUS).keys()) apart.add(r);
  }
  const spaced = all.filter((r) => !barred.has(r) && !apart.has(r));
  const unbarred = spaced.length ? spaced : all.filter((r) => !barred.has(r));
  // The least-held ground it can have: free land if there is any, and with none,
  // where the fewest rivals hold it rather than anywhere at all.
  const least = Math.min(...unbarred.map((r) => heldBy.get(r) ?? 0));
  const open = unbarred.filter((r) => (heldBy.get(r) ?? 0) === least);
  const pool = open.length ? open : all;
  if (!pool.length) return undefined;
  // FOOD TIPS THE ODDS, IT DOES NOT DECIDE THEM (rome, 2026-11-10: about two packs
  // in every three settled in the Shieling, and the grazers all lived at the
  // foot). A room counted one more for every prey animal or grazing room in reach,
  // so the hamlet's dozen rats in a few rooms pulled a wolf many times harder
  // than open ground, and the foot's thick grass did the same to a hind. Now a
  // room with food in reach counts for FOOD_PULL more at the most, however much
  // food it is; grass half eaten still pulls by what is left of it.
  const reach = new Map<string, number>();
  for (const [room, n] of foodRooms(z, line, now)) {
    for (const r of z.nearby(room, TERRITORY_RADIUS).keys()) reach.set(r, (reach.get(r) ?? 0) + n);
  }
  const weight = new Map<string, number>(pool.map((r) => [r, 1 + Math.min(FOOD_PULL, reach.get(r) ?? 0)]));
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
    // A herd with one place left takes no more newcomers: the next starts a herd of
    // its own on fresh ground (rome, 2026-11-08). A pack still fills to its size.
    const spare = PREYS_ON.has(line) && !FLOCKS.has(line) ? 0 : 1;
    const open = Object.entries(z.groups.packs).filter(([id, g]) => g.line === line && (counts.get(id) ?? 0) < g.size - spare);
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
      moveIfLean(z, [c], line, now, c, move);
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
      moveIfLean(z, list, g.line, now, g, move);
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
  z: ZoneDO, animals: Creature[], line: string, now: number,
  clock: { leanSince?: number; leanMovedAt?: number }, move: (home: string) => void,
): void {
  const hungry = animals.filter((c) => hungers(c.templateId) && c.hunger >= HUNGRY_AT).length;
  if (hungry * 2 <= animals.length) { clock.leanSince = undefined; return; }
  if (clock.leanSince === undefined) { clock.leanSince = now; return; }
  if (now - clock.leanSince < GROUP_LEAN_MS) return;
  // HUNGER MOVES IT ONCE, THEN IT GIVES THE NEW GROUND A DAY (rome, 2026-11-10:
  // most of the mountain is hungry most of the time, so a hungry loner drew a
  // new home every two hours, about 640 homes given up a day, and no home lasted
  // its 2-5 game days). Still hungry, it goes again a game day after the last.
  if (clock.leanMovedAt !== undefined && now - clock.leanMovedAt < LEAN_AGAIN_MS) return;
  const home = pickHome(z, line, now, animals[0].home ?? animals[0].roomId);
  if (!home) return;
  clock.leanSince = undefined;
  clock.leanMovedAt = now;
  move(home);
  beasts.note(z, "moved", now); // a home left through hunger is a home given up, as one that ran out its time is
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
    const fedFrom = wolf.hunger;
    wolf.hunger = SMALL_PREY.has(from) ? Math.max(0, wolf.hunger - MEAL_SMALL) : 0;
    ate(wolf, now, undefined, fedFrom - wolf.hunger, undefined, from);
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
    if (home) { rival.home = home; rival.moveAt = undefined; rival.kept = undefined; beasts.note(z, "moved", now); }
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

// Off a room for a while, the way a rival is kept off it (holdGround).
function keepOff(c: Creature, roomId: string, now: number): void {
  c.avoids = [...(c.avoids ?? []).filter((a) => a.until > now && a.roomId !== roomId), { roomId, until: now + BODY_AVOID_MS }];
  c.huntAt = 0;
  c.huntFor = undefined;
}
function ravensIn(z: ZoneDO, roomId: string, eagle: string): number {
  let n = 0;
  for (const c of z.creaturesInRoom(roomId)) if (MOBBERS.get(lineOf(z, c.templateId)) === eagle && !c.heldBy && !c.holding) n++;
  return n;
}

/** A bigger animal at a body runs a smaller scavenger off it (BODY_HOLDERS). True when it took the turn. */
export async function holdBody(
  z: ZoneDO, holder: Creature, now: number,
  flee: (c: Creature) => Promise<unknown> = (c) => creatureMoves(z, c, now, "flee", false),
): Promise<boolean> {
  // RARE BLOOD IS ITS LINE AT A BODY (2026-11-10): the old raven and the great
  // vulture were never run off, the bone-dropper never took a body, and an old
  // raven did not count as a raven against the eagle, because these matched on
  // the animal's own name. A line with its own row (the lead wolf) keeps it.
  const holderLine = lineOf(z, holder.templateId);
  const driven = BODY_HOLDERS.get(holder.templateId) ?? BODY_HOLDERS.get(holderLine);
  if (!driven || holder.target || holder.asleep || holder.stunned || holder.holding || holder.heldBy) return false;
  if ((holder.rivalRestUntil ?? 0) > now) return false;
  const roomId = holder.roomId;
  // At its meal, or a scavenger hungry enough for the body lying here.
  const atMeal = eatingNow(holder, now) && (holder.eatingOn === "kill" || holder.eatingOn === "carrion");
  const wants = atMeal || (SCAVENGERS.has(holder.templateId) && (holder.hunger ?? 0) >= deadEatsAt(holder.templateId)
    && (z.traces.get(roomId) ?? []).some(edibleBody));
  if (!wants) return false;
  // Several ravens are not run off: they push the eagle out instead (mobEagle).
  if ([...MOBBERS.values()].includes(holderLine) && ravensIn(z, roomId, holderLine) >= MOB_AT) return false;
  const rival = z.creaturesInRoom(roomId).find((c) => c.id !== holder.id && (driven.has(c.templateId) || driven.has(lineOf(z, c.templateId)))
    && !c.target && !c.hidden && !c.heldBy && !c.holding);
  if (!rival || !chance(BODY_CHASE_ODDS)) return false;
  const world = z.world!;
  const ht = world.mobTemplates.get(holder.templateId)!, rt = world.mobTemplates.get(rival.templateId)!;
  holder.rivalRestUntil = now + BODY_REST_MS;
  rival.asleep = false;
  rival.sleepUntil = undefined;
  const wasEating = eatingNow(rival, now);
  keepOff(rival, roomId, now);
  beasts.note(z, wasEating ? "stolen" : "chases", now);
  z.roomFeed(roomId, wasEating
    ? `${cap(ht.name)} comes at ${rt.name} over the body. ${cap(rt.name)} gives it up and goes.`
    : `${cap(ht.name)} goes for ${rt.name}, and ${rt.name} gets out of its way.`, undefined, false);
  z.roomSound(roomId, "A snarl and a beat of wings {dir}, and something going away.", undefined, undefined, false, { mob: holder.templateId, act: "fight" });
  await flee(rival);   // its meal, cut short, goes back on the body (digest)
  z.refreshRoomCtx(roomId);
  return true;
}

/** Ravens together push an eagle out of the room (MOBBERS). True when it took the turn. */
export async function mobEagle(
  z: ZoneDO, raven: Creature, now: number,
  flee: (c: Creature) => Promise<unknown> = (c) => creatureMoves(z, c, now, "flee", false),
): Promise<boolean> {
  const eagleId = MOBBERS.get(lineOf(z, raven.templateId));
  if (!eagleId || raven.target || raven.asleep || raven.stunned || raven.holding || raven.heldBy) return false;
  if ((raven.rivalRestUntil ?? 0) > now) return false;
  const roomId = raven.roomId;
  const eagle = z.creaturesInRoom(roomId).find((c) => lineOf(z, c.templateId) === eagleId && !c.target && !c.heldBy && !c.holding);
  if (!eagle || ravensIn(z, roomId, eagleId) < MOB_AT || !chance(MOB_ODDS)) return false;
  const world = z.world!;
  const et = world.mobTemplates.get(eagle.templateId)!;
  for (const c of z.creaturesInRoom(roomId)) if (MOBBERS.get(lineOf(z, c.templateId)) === eagleId) c.rivalRestUntil = now + BODY_REST_MS;
  eagle.asleep = false;
  eagle.sleepUntil = undefined;
  keepOff(eagle, roomId, now);
  beasts.note(z, "chases", now);
  z.roomFeed(roomId, `The ravens go up at ${et.name} together, calling, diving at it two and three at a time, and ${et.name} gives the place up to them.`, undefined, false);
  z.roomSound(roomId, "Ravens calling {dir}, a lot of them at once, angry.", undefined, undefined, false, { mob: raven.templateId, act: "fight" });
  await flee(eagle);
  z.refreshRoomCtx(roomId);
  return true;
}

/** Where a hungry pack wolf is going: the room its pack's quarry stands in, or
 *  nothing. A pack hunts when two or more of it are hungry; it keeps one animal
 *  until that one is dead or out of reach, then picks the nearest other. */
export function packQuarry(z: ZoneDO, c: Creature, now: number): string | undefined {
  const g = c.group ? z.groups.packs[c.group] : undefined;
  if (!g || !GROUND_HOLDERS.has(g.line) || (c.hunger ?? 0) < HUNGRY_AT) return undefined;
  let hungry = 0;
  for (const m of z.creatures.values()) if (m.group === c.group && (m.hunger ?? 0) >= HUNGRY_AT) hungry++;
  if (hungry < 2) { g.quarry = undefined; return undefined; }
  const reach = z.nearby(g.home, PACK_HUNT_RANGE);
  const fit = (q: Creature | undefined): q is Creature =>
    !!q && q.hp > 0 && PACK_QUARRY.has(lineOf(z, q.templateId)) && q.aloft === undefined && reach.has(q.roomId);
  let q = g.quarry ? z.creatures.get(g.quarry) : undefined;
  if (!fit(q)) {
    q = undefined;
    g.quarry = undefined;
    if ((g.quarryAt ?? 0) > now) return undefined; // looked a moment ago and found none
    g.quarryAt = now + HUNT_RECHECK_MS;
    let best = Infinity;
    for (const o of z.creatures.values()) {
      if (!fit(o)) continue;
      const d = reach.get(o.roomId)!;
      if (d < best) { best = d; q = o; }
    }
    if (!q) return undefined;
    g.quarry = q.id;
  }
  return q.roomId;
}

/** A land holder's beat on an intruder in its room on its own land. True when it took its turn. */
export async function holdLand(
  z: ZoneDO, holder: Creature, now: number,
  flee: (c: Creature) => Promise<unknown> = (c) => creatureMoves(z, c, now, "flee", false),
): Promise<boolean> {
  const line = lineOf(z, holder.templateId);
  if (!LAND_HOLDERS.has(line) || !holder.home || holder.target || holder.asleep || holder.stunned || holder.holding || holder.heldBy || holder.hidden) return false;
  if ((holder.rivalRestUntil ?? 0) > now) return false;
  const roomId = holder.roomId;
  if (!z.withinRadius(roomId, holder.home, TERRITORY_RADIUS)) return false;
  const rival = z.creaturesInRoom(roomId).find((c) => c.id !== holder.id && c.home !== holder.home && LAND_HOLDERS.has(lineOf(z, c.templateId))
    && keepsOff(z, line, lineOf(z, c.templateId)) && !c.target && !c.hidden && !c.heldBy && !c.holding);
  if (!rival || !chance(GROUND_CHASE_ODDS)) return false;
  const world = z.world!;
  const ht = world.mobTemplates.get(holder.templateId)!, rt = world.mobTemplates.get(rival.templateId)!;
  holder.rivalRestUntil = now + RIVAL_REST_MS;
  rival.asleep = false;
  rival.sleepUntil = undefined;
  const bit = chance(LAND_BITE_ODDS);
  if (bit) rival.hp = Math.max(1, rival.hp - Math.max(1, randInt(ht.dmg_min, ht.dmg_max) - rt.armor));
  beasts.note(z, "chases", now);
  z.roomFeed(roomId, bit
    ? `${cap(ht.name)} goes for ${rt.name} and gets its teeth in before ${rt.name} tears loose and runs.`
    : `${cap(ht.name)} goes for ${rt.name}. ${cap(rt.name)} does not wait for it, and runs.`, undefined, false);
  z.roomSound(roomId, "A snarl {dir}, and something going away fast.", undefined, undefined, false, { mob: holder.templateId, act: "fight" });
  if (bit) z.fxClash(roomId, holder.templateId, rival.templateId);
  rival.avoids = [
    ...(rival.avoids ?? []).filter((a) => a.until > now && a.roomId !== roomId),
    { roomId, until: now + RIVAL_AVOID_MS },
  ];
  rival.huntAt = 0;
  rival.huntFor = undefined;
  // Only one LIVING on the land gives up its home; one passing through is just run off.
  const livesHere = !!rival.home && z.withinRadius(rival.home, holder.home, TERRITORY_RADIUS);
  if (livesHere && (rival.drivenOff = (rival.drivenOff ?? 0) + 1) >= GROUND_DRIVEN_LEAVES) {
    rival.drivenOff = undefined;
    const home = pickHome(z, lineOf(z, rival.templateId), now, holder.home);
    if (home) { rival.home = home; rival.moveAt = undefined; rival.kept = undefined; beasts.note(z, "moved", now); }
  }
  await flee(rival);
  if (rival.roomId !== roomId) {
    holder.curious = rival.roomId;
    holder.nextWanderAt = now + randInt(4_000, 15_000);
  }
  z.refreshRoomCtx(roomId);
  return true;
}
