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
import * as caveShift from "./cave-shift";
import {
  HEARS_FAR, HEAR_ROOMS, FOOTFALL_HEED_ODDS, LIGHT_DAZZLED, DAZZLED_MULT, LIGHT_TAKERS, LANTERN_TAKERS,
  BREAKS_OFF, BREAK_OFF_AT, KILL_DRAGGERS, HOLD_BITERS, HOLD_BITE_ODDS, HOLD_STEP, HOLD_MAX,
  CALLERS, CALL_ROOMS, CALL_EVERY_MS, LAMP_MEN, SHUTTER_AT, SHUTTER_BACK_MS, LAMP_RETURN_ROOMS,
  DARK_FIRST_MULT, DARK_MISS_ODDS, FLIGHT_BATS, FLIGHT_NIP_EVERY_MS, FLIGHT_NIP_ODDS, FLIGHT_SNUFF_ODDS,
  CATCHES_ONLY_ON, DIGGERS_FACES, MINE_MIN_MS, MINE_MAX_MS, STRIKE_MIN_MS, STRIKE_MAX_MS,
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
export function sendTo(c: Creature, roomId: string, now: number): void {
  c.walkingTo = roomId;
  c.asleep = false;
  c.sleepUntil = undefined;
  c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 6000));
}

// ---- THE HOUNDS' EARS -----------------------------------------------------------

/** A hound hears HEAR_ROOMS off; a long-eared one a room further, a stone-deaf one nothing (wild-traits.ts). */
function earshot(z: ZoneDO, c: Creature, roomId: string): boolean {
  if (c.traits?.includes("stone-deaf")) return false;
  const reach = HEAR_ROOMS + (c.traits?.includes("long-eared") ? 1 : 0);
  return c.roomId === roomId || z.roomDist(c.roomId, roomId) <= reach;
}

/** You walked into a cave room: the mole hounds in earshot may come to it. */
export function footfall(z: ZoneDO, session: Session, stealthMult: number, now = Date.now()): void {
  if (!inCave(z, session.roomId) || session.away) return;
  for (const c of near(z, session.roomId, HEAR_ROOMS + 1, HEARS_FAR)) {
    if (!earshot(z, c, session.roomId)) continue;
    if (c.roomId === session.roomId || c.target || c.asleep || c.holding || c.walkingTo === session.roomId) continue;
    if (!chance(FOOTFALL_HEED_ODDS * stealthMult)) continue;
    sendTo(c, session.roomId, now);
  }
}

/** A fight in a cave room: every mole hound in earshot comes to it. */
export function fightHeard(z: ZoneDO, roomId: string, now = Date.now()): void {
  if (!inCave(z, roomId)) return;
  for (const c of near(z, roomId, HEAR_ROOMS + 1, HEARS_FAR)) {
    if (!earshot(z, c, roomId)) continue;
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
    // ONCE A FIGHT (2026-11-25): he goes into the dark once, at half his health, and
    // comes back once; after that he stays until one of you is dead. Going again at
    // every quarter made a fight he could leave and come back to without end.
    // A fire he cannot put out lights him wherever he goes in the room: no dark to go into.
    if (creature.shutHp === undefined && creature.hp < tmpl.max_hp * SHUTTER_AT && !z.roomLit(creature.roomId)) {
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
  // The lamp-man puts your light out ONCE a fight (2026-11-25): light another and he
  // leaves it be, or a fight with him was a torch gone every few blows.
  const spent = LAMP_MEN.has(id) && !!creature.snuffedFor?.includes(victim.pubkey);
  if (odds && !spent && chance(odds) && takeLight(z, victim, tmpl, LANTERN_TAKERS.has(id)) && LAMP_MEN.has(id))
    (creature.snuffedFor ??= []).push(victim.pubkey);
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

/** The lamp-man's lamp lights the room he stands in, until he shutters it (then he is off the map). */
export function lampLights(z: ZoneDO, roomId: string): boolean {
  for (const c of z.creatures.values()) {
    if (LAMP_MEN.has(c.templateId) && c.roomId === roomId && c.hp > 0 && c.aloft === undefined) return true;
  }
  return false;
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
  if (LAMP_MEN.has(id) && c.hp >= tmpl.max_hp) { c.shutHp = undefined; c.snuffedFor = undefined; } // whole again: the next fight is a new one
  if (c.dragTo) dragStep(z, c, tmpl);
  if (FLIGHT_BATS.has(id)) nip(z, c, tmpl, now);
  if (CALLERS.has(id)) mines(z, c, tmpl, now);
}

// ---- THE DIGGERS AT THE WORK (2026-11-26) ------------------------------------------

/** A digger come to a face on its round stops and works it, and the pick is heard. */
function mines(z: ZoneDO, c: Creature, tmpl: MobTemplate, now: number): void {
  if (c.target || c.asleep || !DIGGERS_FACES.has(c.roomId) || caveShift.sentTo(z, c)) { c.workingAt = undefined; return; } // sent to a fall: no stopping to cut rock
  if (c.workingAt !== c.roomId) {
    c.workingAt = c.roomId;
    c.nextWanderAt = Math.max(c.nextWanderAt, now + randInt(MINE_MIN_MS, MINE_MAX_MS));
    c.strikeAt = now + randInt(2000, 8000);
    return;
  }
  if (now >= c.nextWanderAt || now < (c.strikeAt ?? 0)) return;
  c.strikeAt = now + randInt(STRIKE_MIN_MS, STRIKE_MAX_MS);
  z.fxPose(c.roomId, c.templateId, "attack");
  z.roomFeed(c.roomId, `${cap(tmpl.name)} swings his pick into the rock face, and chips of stone fly.`, undefined, false);
  z.roomSound(c.roomId, "The ring of a pick on rock comes {dir}, a stroke, and a while after it another.", undefined, undefined, false, { mob: c.templateId, act: "metal" });
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
  if (c.hp <= 0 || c.traits?.includes("roost-bound")) return; // it stays home (wild-traits.ts)
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

// ---------------------------------------------------------------------------
// THE SINGING STONES (cave-plan.md, the Ring of Nine; 2026-11-25). The way down is
// a puzzle, and the ring itself gives nothing away. Each of the nine stones gives a
// little under a foot and sounds its own note, always the same one. Far up in the
// Sounding Room, where the dome gathers the whole cave, whoever stands still and
// listens hears the stones singing a phrase of four under everything else; the
// phrase is new every time the stone opens, so one player's answer is spent once
// it is used. Each step's note goes up into the rock, and something far above
// gives it back: that is the thread to the Sounding Room. Learn which stone sounds which note, then step the four
// in the phrase's order, and the tenth stone in the middle tilts up on its edge
// over steps going down, open to anyone for a while; then it settles. A wrong note
// is only a note: nothing says so, and the phrase has to be begun again.
export const RING_ROOM = "the-ring-of-nine";
export const RING_KEY = "breathing-stone";
export const RING_DOOR = RING_ROOM + ":down";
export const SOUNDING_ROOM = "the-sounding-room";
const RING_OPEN_MS = 4 * 60_000;    // how long the middle stone stands up on its edge
const RING_PHRASE = 4;              // notes in the phrase
const RING_FORGET_MS = 2 * 60_000;  // a phrase left this long is begun again
const ORDINAL = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];
export const RING_NOTES = [
  "a deep note, like a bell under water",
  "a thin high note",
  "a dry click",
  "a long ringing note",
  "a hollow knock",
  "a low hum you feel in your teeth",
  "a sharp crack, like ice",
  "a soft sigh",
  "a grinding groan",
];
const ringHeard = new WeakMap<object, { n: number; at: number }>();
const ringSong = new WeakMap<object, number[]>();

/** The phrase the stones sing now: four stones (0 = the first round from the door), never
 *  the same twice running. A new one is drawn each time the stone opens. */
export function ringPhrase(z: object): number[] {
  let out = ringSong.get(z);
  if (!out) {
    out = [];
    while (out.length < RING_PHRASE) { const k = randInt(0, 8); if (k !== out.at(-1)) out.push(k); }
    ringSong.set(z, out);
  }
  return out;
}

/** What the dome gives back to whoever stands still in the Sounding Room and listens. */
export function soundingLine(z: object): string {
  const [a, b, c, d] = ringPhrase(z).map((k) => RING_NOTES[k]);
  return `Under it all, faint and far down, stones are singing: ${a}; then ${b}; then ${c}; then ${d}. A silence, and then the same four again.`;
}

/** Walking in, your foot finds the nearest stone and it sings: the room shows what the
 *  stones do, with no word of what to do with it. Not a step of the phrase. */
export function ringEntry(z: ZoneDO, s: Session): void {
  if (s.roomId !== RING_ROOM || z.openDoors.has(RING_DOOR)) return;
  z.send(s, `Your foot comes down on the nearest of the nine stones as you come in. It gives a finger's breadth under you and sounds: ${RING_NOTES[0]}. The note goes up into the rock overhead, and somewhere far above, something gives it back.`);
  z.roomFeed(s.roomId, `The nearest stone gives under ${s.name}'s foot as they come in, and sounds: ${RING_NOTES[0]}.`, s.pubkey, false);
}

/** The stones' refusal at the way down: there is no door, only the floor. */
export const RING_SHUT = "The nine stones lie flush and heavy in the floor round the tenth, each in its joint. There is no way down.";

/** `step on <stone>` (or pry, press, push, lift...) in the ring. False when the words are not about the stones. */
export function pryRing(z: ZoneDO, s: Session, arg: string, now: number): boolean {
  if (s.roomId !== RING_ROOM) return false;
  const a = arg.toLowerCase().replace(/^(on|onto|upon)\s+/, "").replace(/^(the|a)\s+/, "");
  if (!/stone|slab|flag|ring|^\d+$|^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|middle)\b/.test(a)) return false;
  if (z.openDoors.has(RING_DOOR)) { z.send(s, "The middle stone already stands up on its edge, and the steps go down under it."); return true; }
  const num = a.match(/\b([1-9]|10)(?:st|nd|rd|th)?\b/);
  let n = num ? +num[1] - 1 : ORDINAL.findIndex((o) => new RegExp("\\b" + o + "\\b").test(a));
  if (/tenth|middle|centre|center/.test(a)) n = 9;
  if (n < 0) { z.send(s, "Nine stones round a tenth, each the size of a table. Which one?"); return true; }
  if (n === 9) { z.send(s, "The tenth stone, in the middle, is worn deep, and it does not give at all."); return true; }
  const note = RING_NOTES[n];
  z.send(s, `The ${ORDINAL[n]} stone gives a finger's breadth under your weight, and sounds: ${note}. The note goes up into the rock overhead, and somewhere far above, something gives it back.`);
  z.roomFeed(s.roomId, `${s.name} steps onto one of the nine stones, and it sounds: ${note}.`, s.pubkey, false);
  const phrase = ringPhrase(z);
  const was = ringHeard.get(s);
  const at = was && now - was.at < RING_FORGET_MS ? was.n : 0;
  const got = n === phrase[at] ? at + 1 : n === phrase[0] ? 1 : 0;
  if (got < RING_PHRASE) { ringHeard.set(s, { n: got, at: now }); return true; }
  ringHeard.delete(s);
  ringSong.delete(z); // the next time, the stones sing something else
  z.openDoors.add(RING_DOOR);
  z.doorCloseAt.set(RING_DOOR, now + RING_OPEN_MS);
  z.send(s, "The note does not die. The other three answer it from under the floor, all together, and the tenth stone in the middle shifts, and grinds, and tilts up on its edge, slow and heavy, and stands. Under it steps go down, and the cold pours up out of them into your face.", "unlock");
  z.roomFeed(s.roomId, "The stones sing all together under the floor, and the tenth stone in the middle tilts up on its edge over steps going down.", s.pubkey, false);
  z.roomSound(s.roomId, "Stone sings, and then grinds slowly on stone, {dir}.");
  return true;
}

/** The stone settles back into its joint (from the zone's door clock). */
export function ringSettles(z: ZoneDO): void {
  z.roomFeedBands(new Set(["cave"]), "Somewhere in the dressed stone, a great stone settles into its joint with a sound like a held breath let go.", undefined, true, "grind");
}
