// HOW THE CAVE UNDER THE WOOD FIGHTS (cave-plan.md step 4, 2026-11-24). Its own
// file, so zone.ts carries only the calls. Every rule here answers the state of
// the fight, the light or the hour, never a count of rounds (combat styles law):
//   the mole hounds hear you two rooms off, and a flame in their faces blunts them
//   the cougar breaks off when the fight turns, and drags its kills down home
//   the spider's bite holds, and bites harder the longer it holds
//   the bats, the diggers and the lamp-man go for your light
//   the diggers call each other
//   the lamp-man shutters his lamp when he is hurt and comes back out of the dark
//   the bats go out to the mouths at dusk and home at dawn, through whoever is there
import type { ZoneDO } from "./zone";
import type { Creature, Session } from "./zone-types";
import type { MobTemplate } from "./world";
import { chance, pick, randInt } from "./rng";
import { cap, isDusk, isDawn } from "./zone-util";
import { hpLabel } from "./util";
import { addGrudge, ate } from "./ai";
import { lurkAway, type Blow } from "./styles";
import { saveWell, steadyLit } from "./light";
import { CAVE_GROUND } from "./cave-ground";
import {
  HEARS_FAR, HEAR_ROOMS, FOOTFALL_HEED_ODDS, LIGHT_DAZZLED, DAZZLED_MULT, LIGHT_TAKERS, LANTERN_TAKERS,
  BREAKS_OFF, BREAK_OFF_AT, KILL_DRAGGERS, HOLD_BITERS, HOLD_BITE_ODDS, HOLD_STEP, HOLD_MAX,
  CALLERS, CALL_ROOMS, CALL_EVERY_MS, LAMP_MEN, SHUTTER_AT, SHUTTER_STEP, SHUTTER_BACK_MS, LAMP_RETURN_ROOMS,
  DARK_FIRST_MULT, DARK_MISS_ODDS, FLIGHT_BATS, FLIGHT_NIP_EVERY_MS, FLIGHT_NIP_ODDS, FLIGHT_SNUFF_ODDS,
  CATCHES_ONLY_ON,
} from "./zone-data";
import { GROUND_OF } from "./mountain-ground";

// A blow this long after his last one is the first of a new fight.
const FIGHT_GAP_MS = 60_000;
const inCave = (z: ZoneDO, roomId: string): boolean => z.regionOf(roomId) === "cave";
const MOUTHS = new Set(CAVE_GROUND.mouth);

/** Every creature within `reach` rooms of `roomId` (the room itself included). */
function near(z: ZoneDO, roomId: string, reach: number, kinds: Set<string>): Creature[] {
  const out: Creature[] = [];
  for (const c of z.creatures.values()) {
    if (!kinds.has(c.templateId) || c.hp <= 0) continue;
    if (c.roomId === roomId || z.roomDist(c.roomId, roomId) <= reach) out.push(c);
  }
  return out;
}

/** Send it walking to `roomId`, soon. The wander step closes the distance a room at a time. */
function sendTo(c: Creature, roomId: string, now: number): void {
  c.walkingTo = roomId;
  c.asleep = false;
  c.sleepUntil = undefined;
  c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 6000));
}

// ---- THE HOUNDS' EARS -----------------------------------------------------------

/** You walked into a cave room: the mole hounds in earshot may come to it. */
export function footfall(z: ZoneDO, session: Session, stealthMult: number, now = Date.now()): void {
  if (!inCave(z, session.roomId) || session.away) return;
  for (const c of near(z, session.roomId, HEAR_ROOMS, HEARS_FAR)) {
    if (c.roomId === session.roomId || c.target || c.asleep || c.holding || c.walkingTo === session.roomId) continue;
    if (!chance(FOOTFALL_HEED_ODDS * stealthMult)) continue;
    sendTo(c, session.roomId, now);
  }
}

/** A fight in a cave room: every mole hound in earshot comes to it. */
export function fightHeard(z: ZoneDO, roomId: string, now = Date.now()): void {
  if (!inCave(z, roomId)) return;
  for (const c of near(z, roomId, HEAR_ROOMS, HEARS_FAR)) {
    if (c.roomId === roomId || c.target || c.asleep || c.holding) continue;
    sendTo(c, roomId, now);
  }
}

// ---- BEFORE ITS TURN ------------------------------------------------------------

/** True = it does not attack this round (it broke off, or shuttered and went). */
export function beforeAttack(z: ZoneDO, creature: Creature, tmpl: MobTemplate, victim: Session, now: number): boolean {
  const id = creature.templateId;
  if (CALLERS.has(id) && now - (creature.calledAt ?? 0) > CALL_EVERY_MS) call(z, creature, tmpl, now);
  if (BREAKS_OFF.has(id) && !creature.brokeOff && creature.hp < tmpl.max_hp * BREAK_OFF_AT) {
    creature.brokeOff = true;
    return intoTheDark(z, creature, victim,
      `${cap(tmpl.name)} breaks off, and is gone into the dark before you can follow it.`);
  }
  if (LAMP_MEN.has(id)) {
    const at = creature.shutHp === undefined ? tmpl.max_hp * SHUTTER_AT : creature.shutHp - tmpl.max_hp * SHUTTER_STEP;
    // A fire he cannot put out lights him wherever he goes in the room: no dark to go into.
    if (creature.hp < at && !z.roomLit(creature.roomId)) {
      creature.shutHp = creature.hp;
      z.fxPose(creature.roomId, id, "shutter");
      creature.backAt = now + randInt(SHUTTER_BACK_MS[0], SHUTTER_BACK_MS[1]);
      creature.backFor = victim.pubkey;
      // GONE, NOT NEXT DOOR: with the lamp shut he is in no room anyone can see
      // into until he opens it again (the flier's off-the-map, ai.drakePassage).
      creature.aloft = creature.backAt;
      return intoTheDark(z, creature, victim,
        `The shutter of ${tmpl.name}'s lamp snaps closed. The light goes out, and he goes with it.`, false);
    }
  }
  return false;
}

function intoTheDark(z: ZoneDO, creature: Creature, victim: Session, line: string, walks = true): boolean {
  const from = creature.roomId;
  const to = walks ? lurkAway(z, from) : undefined;
  creature.target = null;
  for (const s of z.sessions.values()) if (s.target === creature.id) s.target = null;
  z.send(victim, line, "dmgin");
  z.roomFeed(from, line.replace(/\byou\b/g, "anyone"), victim.pubkey, false);
  if (to) {
    creature.roomId = to;
    z.refreshRoomCtx(to);
  }
  z.noteCreaturesChanged();
  z.refreshRoomCtx(from);
  return true;
}

/** A digger calls, and the diggers in earshot leave what they are at and come. */
function call(z: ZoneDO, creature: Creature, tmpl: MobTemplate, now: number): void {
  creature.calledAt = now;
  const room = creature.roomId;
  z.fxPose(room, creature.templateId, "call");
  z.roomFeed(room, `${cap(tmpl.name)} throws his head back and calls, a dry cracked sound with no breath behind it.`, undefined, false);
  z.roomSound(room, "A dry, cracked call carries {dir}, and another answers it.", undefined, undefined, false, { mob: creature.templateId, act: "call" });
  for (const c of near(z, room, CALL_ROOMS, CALLERS)) {
    if (c === creature || c.roomId === room || c.target) continue;
    c.calledTo = room; // a called digger never calls from the room it was called to
    sendTo(c, room, now);
  }
}

// ---- ITS BLOW -------------------------------------------------------------------

/** How hard the blow it is about to land is, by the cave's rules (into `out`). */
export function blow(z: ZoneDO, creature: Creature, tmpl: MobTemplate, victim: Session, now: number, out: Blow): void {
  const id = creature.templateId;
  if (LIGHT_DAZZLED.has(id) && (z.carriesLight(victim) || z.roomLit(creature.roomId))) {
    out.mult *= DAZZLED_MULT;
    out.flourish ??= ", its great eyes screwed half shut against the light.";
  }
  if (LAMP_MEN.has(id) && creature.outOfDark) {
    creature.outOfDark = false;
    out.mult *= DARK_FIRST_MULT;
    out.line ??= `${cap(tmpl.name)} comes at you with the lamp swinging open in his hand.`;
  } else if (LAMP_MEN.has(id) && !z.litFor(victim) && (!creature.lastBlowAt || now - creature.lastBlowAt > FIGHT_GAP_MS)) {
    out.mult *= DARK_FIRST_MULT;
    out.line ??= `${cap(tmpl.name)} is on you out of the dark before you know where he is.`;
  }
  if (HOLD_BITERS.has(id)) {
    if (victim.seizedBy === creature.id) {
      creature.holdRounds = (creature.holdRounds ?? 0) + 1;
      out.mult *= Math.min(HOLD_MAX, 1 + HOLD_STEP * creature.holdRounds);
      out.flourish ??= ", the fangs working deeper.";
    } else creature.holdRounds = 0;
  }
}

/** After a blow of its has landed on a living victim. */
export function landed(z: ZoneDO, creature: Creature, tmpl: MobTemplate, victim: Session): void {
  const id = creature.templateId;
  const odds = LIGHT_TAKERS.get(id);
  if (odds && chance(odds)) takeLight(z, victim, tmpl, LANTERN_TAKERS.has(id));
  if (HOLD_BITERS.has(id) && !victim.seizedBy && chance(HOLD_BITE_ODDS)) {
    victim.seizedBy = creature.id;
    creature.holdRounds = 0;
    z.send(victim, `${cap(tmpl.name)} sinks its fangs in and holds on. (break free: keep fighting)`, "seize");
  }
}

/** Put out what the victim carries: an open flame, or a lantern only if `lantern`. */
export function takeLight(z: ZoneDO, s: Session, tmpl: MobTemplate | null, lantern: boolean): boolean {
  if (!z.carriesLight(s) || s.litSource === "brand") return false;
  const was = s.litSource;
  if (was === "lantern" && (!lantern || steadyLit(s))) return false; // the lamp-man's own lamp: no blow puts it out
  if (was === "lantern") saveWell(z, s);
  s.litUntil = undefined; s.litSource = undefined; s.litRow = undefined; s.torchWarned = false;
  const dark = !z.outOfWorld(s) && !z.litFor(s) ? " The dark closes in." : "";
  const who = tmpl ? cap(tmpl.name) : "Something";
  z.send(s, was === "lantern"
    ? `${who} knocks the lantern's shutter closed in your hand.${dark}`
    : `${who} goes through the flame, and the torch gutters out.${dark}`, "dmgin");
  z.sendStatus(s);
  return true;
}

/** A swing the player is about to land: does it go wide in the dark? */
export function playerMisses(z: ZoneDO, session: Session, creature: Creature): string | undefined {
  if (LAMP_MEN.has(creature.templateId) && !z.litFor(session) && chance(DARK_MISS_ODDS)) {
    return "You swing at where the lamp was, and the dark there is empty.";
  }
  return undefined;
}

// ---- THE KILL THE COUGAR DRAGS DOWN ---------------------------------------------

/** A dragger that killed outside the cave takes the meal home instead of eating
 *  here. True = it is dragging (the caller skips the meal). */
export function dragsKill(z: ZoneDO, creature: Creature, owed: number): boolean {
  if (!KILL_DRAGGERS.has(creature.templateId) || inCave(z, creature.roomId)) return false;
  const home = creature.home;
  if (!home || !inCave(z, home) || !Number.isFinite(z.roomDist(creature.roomId, home))) return false;
  creature.dragTo = home;
  creature.dragMeal = owed;
  creature.walkingTo = home;
  creature.nextWanderAt = Math.min(creature.nextWanderAt, Date.now() + randInt(3000, 8000));
  return true;
}

/** Can this hunter take this prey here? Only on the ground named for it (CATCHES_ONLY_ON). */
export function catchesHere(z: ZoneDO, hunter: Creature, prey: Creature): boolean {
  const line = (id: string) => z.variantBase.get(id) ?? id;
  const kinds = CATCHES_ONLY_ON.get(line(hunter.templateId))?.get(line(prey.templateId));
  if (!kinds) return true;
  return (GROUND_OF.get(hunter.roomId) ?? []).some((k) => kinds.includes(k));
}

// ---- EVERY LIVE BEAT ------------------------------------------------------------

export function act(z: ZoneDO, c: Creature, now: number): void {
  const id = c.templateId;
  const tmpl = z.world!.mobTemplates.get(id);
  if (!tmpl) return;
  if (c.brokeOff && c.hp >= tmpl.max_hp) c.brokeOff = false;
  if (LAMP_MEN.has(id) && c.hp >= tmpl.max_hp) c.shutHp = undefined;
  if (c.dragTo) dragStep(z, c, tmpl);
  if (FLIGHT_BATS.has(id)) nip(z, c, tmpl, now);
}

/** The world beat: a shuttered lamp-man is off the map, so no room's beat reaches him. */
export function tick(z: ZoneDO, now: number): void {
  for (const c of z.creatures.values()) {
    // The bats go out at dusk wherever they are, not only near a player (2026-11-24:
    // the turn sat in the live beat, so a roost nobody was near never went out).
    if (FLIGHT_BATS.has(c.templateId)) flightTurn(z, c, now);
    if (!c.backAt || now < c.backAt) continue;
    const tmpl = z.world!.mobTemplates.get(c.templateId);
    if (tmpl) comesBack(z, c, tmpl, now);
  }
}

function dragStep(z: ZoneDO, c: Creature, tmpl: MobTemplate): void {
  const prey = c.prey;
  if (c.roomId === c.dragTo) {
    // Home: it eats, and what it leaves is the grubbets'.
    ate(c, Date.now(), "kill", c.dragMeal ?? 0, undefined, undefined);
    z.addTrace(c.roomId, { kind: "remains", at: Date.now(), label: prey ?? "something" });
    z.roomFeed(c.roomId, `${cap(tmpl.name)} lets go of what it has dragged down here, and settles over it.`, undefined, false);
    z.fxFed(c.roomId, c.templateId);
    c.dragTo = undefined; c.dragMeal = undefined; c.prey = undefined; c.walkingTo = undefined;
    z.refreshRoomCtx(c.roomId);
    return;
  }
  // The way it went is marked: blood on the ground, a room at a time.
  if (c.walkingTo !== c.dragTo) c.walkingTo = c.dragTo;
  const last = (z.traces.get(c.roomId) ?? []).some((t) => t.kind === "drip" && t.label === "a dragged kill" && Date.now() - t.at < 60_000);
  if (!last) z.addTrace(c.roomId, { kind: "drip", at: Date.now(), label: "a dragged kill" });
}

function comesBack(z: ZoneDO, c: Creature, tmpl: MobTemplate, now: number): void {
  const pk = c.backFor;
  c.backAt = undefined; c.backFor = undefined;
  // The lamp opens again wherever he is: back on the map, whatever comes next.
  c.aloft = undefined;
  z.noteCreaturesChanged();
  const from = c.roomId;
  const s = pk ? [...z.sessions.values()].find((x) => x.pubkey === pk) : undefined;
  const near = !!s && s.hp > 0 && !z.outOfWorld(s) && z.reachable(s) && inCave(z, s.roomId)
    && (s.roomId === c.roomId || z.roomDist(c.roomId, s.roomId) <= LAMP_RETURN_ROOMS)
    && !z.roomLit(s.roomId); // a fire there: he will not come into it
  if (!s || !near) { z.refreshRoomCtx(from); return; }
  c.roomId = s.roomId;
  c.target = s.pubkey;
  c.outOfDark = true; // blow(): back out of the dark, the heavier blow
  addGrudge(z, c, s.pubkey);
  z.noteCreaturesChanged();
  z.send(s, `A lamp opens in the dark at your side, and ${tmpl.name} is there.`, "dmgin big");
  z.roomFeed(s.roomId, `A lamp opens in the dark, and ${tmpl.name} is there beside ${s.name}.`, s.pubkey, false);
  if (from !== s.roomId) z.refreshRoomCtx(from);
  z.refreshRoomCtx(s.roomId);
}

// ---- THE BATS GO OUT ------------------------------------------------------------

function flightTurn(z: ZoneDO, c: Creature, now: number): void {
  if (c.hp <= 0) return;
  const way = isDusk(now) ? "out" : isDawn(now) ? "home" : undefined;
  if (way === c.flying) return;
  c.flying = way;
  if (way === "out") {
    let best: string | undefined, d = Number.POSITIVE_INFINITY;
    for (const m of MOUTHS) { const dm = z.roomDist(c.roomId, m); if (dm < d) { d = dm; best = m; } }
    if (best) sendTo(c, best, now);
  } else if (way === "home" && c.home) sendTo(c, c.home, now);
}

function nip(z: ZoneDO, c: Creature, tmpl: MobTemplate, now: number): void {
  if (!c.flying || !c.walkingTo || c.target) return; // only while it is on its way
  if (now - (c.nipAt ?? 0) < FLIGHT_NIP_EVERY_MS) return;
  c.nipAt = now;
  for (const s of z.sessions.values()) {
    if (s.roomId !== c.roomId || s.hp <= 0 || z.outOfWorld(s) || !z.reachable(s) || !chance(FLIGHT_NIP_ODDS)) continue;
    s.hp = Math.max(1, s.hp - 1);
    z.send(s, `${pick(["A bat", "Another bat", "A bat going past"])} catches you with a tooth on its way through. [${hpLabel(s.hp, s.maxHp)}]`, "dmgin");
    if (chance(FLIGHT_SNUFF_ODDS)) takeLight(z, s, tmpl, false);
    z.sendStatus(s);
    break; // one bat, one nip
  }
}

/** The look of it, when the cave has something to say (before the general reads). */
export function doing(z: ZoneDO, c: Creature): string | null {
  if (c.dragTo) return `dragging ${c.prey ?? "a kill"} by the neck, backing toward the dark`;
  if (FLIGHT_BATS.has(c.templateId)) {
    if (c.target) return "flitting about your head, in and out of the light";
    if (c.flying) return "streaming past overhead with the rest of the roost";
    if (!c.asleep) return "hanging from the roof, wings folded, its head turning";
  }
  return null;
}
