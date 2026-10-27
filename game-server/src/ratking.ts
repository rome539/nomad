// THE RAT KING (rome, 2026-10-24). The first boss any wanderer meets: one
// enormous old rat, hound-sized, half-blind and crowned with a tangle of wire
// and bone, walking its rounds through the warrens (PATROLS). It is not seeded.
// It comes by a ROLL, about once a day while there is no king, and there is
// never more than one; once it is in the world it stays until someone kills it.
//
// While it lives, the warren rats are its: they go for anyone on sight with no
// grudge needed, they neither nap nor run, and they bite harder in a swarm.
// When it dies they go leaderless for a while, quicker to bolt than ever, until
// the next one comes. Its crown, worn, makes you the one the rats will not
// touch: no rat comes for its wearer, grudge or king or no (the trait
// RAT_CROWN_TRAIT exists on that crown and nowhere else).

import type { ZoneDO } from "./zone";
import type { Session, Creature } from "./zone-types";
import { chance, randInt, uuid, pick } from "./rng";
import * as coughing from "./cough";
import {
  RAT_KING, RAT_KING_HOME, RAT_KING_RATS, RAT_KING_ROLL_PER_MIN, RAT_KING_LEADERLESS_MS,
  RAT_KING_LEADERLESS_FLEE_MULT, RAT_CROWN_TRAIT, WARRENS_ROOMS, WANDER_MIN_MS, WANDER_MAX_MS,
  RAT_KING_COUGH_PER_MIN, RAT_KING_COUGH_RISE_MS, RAT_KING_COUGH_FADE_MS, RAT_KING_OMEN_PER_MIN, RAT_KING_KEEPER_PER_MIN, RAT_KING_KEEPER_GAP_MS, RAT_KING_COUGH_LINES, RAT_KING_OMEN_LINES, RAT_KING_KEEPER_LINES,
  FORTRESS_BANDS,
} from "./zone-data";

const FORTRESS_INSIDE = new Set(["upper", "deep"]); // the fortress past its gates

type State = { lastRoll: number; fellAt: number };
const states = new WeakMap<ZoneDO, State>();
function st(z: ZoneDO): State {
  let s = states.get(z);
  if (!s) { s = { lastRoll: 0, fellAt: 0 }; states.set(z, s); }
  return s;
}

export function kingAlive(z: ZoneDO): boolean {
  for (const c of z.creatures.values()) if (c.templateId === RAT_KING && c.hp > 0) return true;
  return false;
}

// A warren rat while the king is on its rounds: bold, and everyone's enemy.
export function bold(z: ZoneDO, c: Creature): boolean {
  return RAT_KING_RATS.has(c.templateId) && WARRENS_ROOMS.has(c.roomId) && kingAlive(z);
}

// The crown: no rat comes for its wearer, whatever it remembers.
export function spares(z: ZoneDO, c: Creature, s: Session): boolean {
  return (RAT_KING_RATS.has(c.templateId) || c.templateId === RAT_KING) && z.wearsTrait(s, RAT_CROWN_TRAIT);
}

// How much readier than usual a rat is to bolt: never while the king lives,
// sooner for a while after it falls.
export function fleeMult(z: ZoneDO, c: Creature, now = Date.now()): number {
  if (!RAT_KING_RATS.has(c.templateId)) return 1;
  if (bold(z, c)) return 0;
  return now - st(z).fellAt < RAT_KING_LEADERLESS_MS ? RAT_KING_LEADERLESS_FLEE_MULT : 1;
}

export function fell(z: ZoneDO, now = Date.now()): void { st(z).fellAt = now; }

// Once a minute: with no king, the roll; with one, its signs (below).
export function roll(z: ZoneDO, now: number): void {
  const s = st(z);
  if (now - s.lastRoll < 60_000) return;
  s.lastRoll = now;
  if (kingAlive(z)) { omens(z, now); return; }
  lingers(z, now);
  if (chance(RAT_KING_ROLL_PER_MIN)) crown(z, now);
}

// HOW THICK THE SICKNESS IS IN THE AIR, 0 to 1 (rome, 2026-10-27). It does not
// arrive with the king: it builds over RAT_KING_COUGH_RISE_MS from his coming,
// and it does not leave with him either, thinning out over RAT_KING_COUGH_FADE_MS
// after he falls. A king with no crownedAt (one from before this) is at full.
export function sickness(z: ZoneDO, now: number): number {
  for (const c of z.creatures.values()) {
    if (c.templateId !== RAT_KING || c.hp <= 0) continue;
    return c.crownedAt ? Math.min(1, Math.max(0, (now - c.crownedAt) / RAT_KING_COUGH_RISE_MS)) : 1;
  }
  const since = now - st(z).fellAt;
  return st(z).fellAt && since < RAT_KING_COUGH_FADE_MS ? 1 - since / RAT_KING_COUGH_FADE_MS : 0;
}

function inTheAir(z: ZoneDO, s: Session): boolean {
  return !z.inGatehouse.has(s.pubkey) && !z.outOfWorld(s) && FORTRESS_INSIDE.has(z.regionOf(s.roomId));
}

// After he falls: no more signs, only the cough, going.
function lingers(z: ZoneDO, now: number): void {
  const k = sickness(z, now);
  if (!k) return;
  for (const s of z.sessions.values()) if (inTheAir(z, s) && chance(RAT_KING_COUGH_PER_MIN * k)) cough(z, s);
}

// A RAT KING IS AN OMEN (rome, 2026-10-24: the old belief that one meant
// plague or disaster coming). While it lives the fortress shows it: the rats
// out in plain view, a rat dead with blood at its mouth, the walls loud; the
// keeper at the hatch says what that used to mean. And whoever walks the
// fortress catches something in the air down there and COUGHS: loud, heard
// next door, and noise like any other, so it brings the curious.
const keeperSaid = new Map<string, number>(); // pubkey -> when the keeper last spoke of the king to them
function omens(z: ZoneDO, now: number): void {
  const k = sickness(z, now);
  for (const s of z.sessions.values()) {
    if (z.inGatehouse.has(s.pubkey)) {
      const said = keeperSaid.get(s.pubkey) ?? 0;
      if (Date.now() - said >= RAT_KING_KEEPER_GAP_MS && chance(RAT_KING_KEEPER_PER_MIN)) {
        keeperSaid.set(s.pubkey, Date.now());
        z.send(s, pick(RAT_KING_KEEPER_LINES), "amb");
      }
      continue;
    }
    if (!inTheAir(z, s)) continue;
    if (chance(RAT_KING_COUGH_PER_MIN * k)) cough(z, s);
    else if (chance(RAT_KING_OMEN_PER_MIN)) z.send(s, pick(RAT_KING_OMEN_LINES), "amb");
  }
}

// The king's sickness in the air of the fortress (the cough itself is cough.ts).
export function cough(z: ZoneDO, s: Session): void {
  coughing.cough(z, s, pick(RAT_KING_COUGH_LINES));
}

export function crown(z: ZoneDO, now: number): Creature | null {
  const tmpl = z.world!.mobTemplates.get(RAT_KING);
  if (!tmpl || kingAlive(z)) return null;
  const c: Creature = {
    id: uuid(), templateId: RAT_KING, roomId: RAT_KING_HOME, home: RAT_KING_HOME,
    hp: tmpl.max_hp, hunger: randInt(20, 60), grudges: [], target: null, crownedAt: now,
    nextWanderAt: now + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
  };
  z.creatures.set(c.id, c);
  z.noteCreaturesChanged();
  z.refreshRoomCtx(RAT_KING_HOME);
  // Its coming is heard through the whole fortress, though not by the gatehouse fire.
  z.roomFeedBands(FORTRESS_BANDS, "Somewhere under the fortress every rat in the walls goes quiet at once, and then starts up again, louder.", undefined, false);
  return c;
}

export function resetForTest(z: ZoneDO): void { states.set(z, { lastRoll: 0, fellAt: 0 }); }
