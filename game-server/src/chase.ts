// THE CHASE (rome, 2026-10-26: predators should chase the prey, and players
// too, for a few rooms). See CHASE_PREY in zone-data.ts for the why.
//
// A chase is one record on the hunter: what it is after (an animal or a
// wanderer), how many rooms it has left in it, and when it next comes through.
// Each beat (tick) it is asked where the quarry is:
//   * in this room   - an animal: rush it again (predation picks the chased one
//                      first and does not wait on its odds to try). A wanderer:
//                      the fight is on again.
//   * next door      - when the beat behind is up, it follows, and that costs a
//                      room of the chase.
//   * anywhere else  - the trail is lost, and the chase is over.
// Rooms run out, the quarry dies, gets through a gate or a barred door, or the
// hunter is hurt too badly to bother: over. A missed rush on a wolf's own
// ground and a wanderer running from a dog are the same machinery.
import type { ZoneDO } from "./zone";
import type { Creature, Session } from "./zone-types";
import { pick, randInt } from "./rng";
import { cap } from "./zone-util";
import { creatureMoves } from "./ai";
import {
  CHASE_PREY, CHASE_PLAYERS, CHASE_LAG_MIN_MS, CHASE_LAG_MAX_MS, CHASE_RUSH_MS, CHASE_LETS_GO,
  CHASE_MEMORY_MS, CHASE_LINES, HUNT_REST_MIN, HUNT_REST_MAX,
} from "./zone-data";

// Caught up: nothing to follow until it runs again. Not Infinity - the creature
// is saved as JSON, and Infinity comes back as null.
const HELD = Number.MAX_SAFE_INTEGER;

const lag = (now: number) => now + randInt(CHASE_LAG_MIN_MS, CHASE_LAG_MAX_MS);

/** The prey this hunter is running after, if it is in the room: it is the one rushed. */
export function chasedHere(z: ZoneDO, c: Creature): Creature | undefined {
  const id = c.chase?.mob;
  const quarry = id ? z.creatures.get(id) : undefined;
  return quarry && quarry.roomId === c.roomId ? quarry : undefined;
}

/**
 * A rush missed and the prey ran. A hunter that runs its prey down goes after
 * it; anything else stands blown, as every hunter used to. Returns whether a
 * chase is on.
 */
export function onMiss(c: Creature, victim: Creature, now: number): boolean {
  const range = CHASE_PREY[c.templateId];
  if (!range) return false;
  if (c.chase?.mob !== victim.id) c.chase = { mob: victim.id, left: randInt(range[0], range[1]), at: 0, since: now };
  if (c.chase.left <= 0) { c.chase = undefined; return false; }
  c.chase.at = lag(now);
  c.huntRestUntil = undefined;
  return true;
}

/** The rush landed (a kill, or a grip): the chase is over, it caught it. */
export function caught(c: Creature): void {
  if (c.chase?.mob) c.chase = undefined;
}

/**
 * A wanderer got out of the room this was fighting them in. A chaser comes
 * after them. Running again from the same one soon after is the same chase,
 * with the rooms it had left, not a fresh one.
 */
export function lostYou(z: ZoneDO, c: Creature, s: Session | undefined, now: number): void {
  const range = CHASE_PLAYERS[c.templateId];
  const tmpl = z.world!.mobTemplates.get(c.templateId);
  if (!range || !tmpl || !s || s.hp <= 0 || z.outOfWorld(s) || !z.reachable(s)) return;
  if (c.hp < tmpl.max_hp * CHASE_LETS_GO) return; // hurt this badly, it lets you go
  const same = c.chase?.pubkey === s.pubkey && now - c.chase.since < CHASE_MEMORY_MS;
  if (!same) c.chase = { pubkey: s.pubkey, left: randInt(range[0], range[1]), at: 0, since: now };
  if (c.chase!.left <= 0) return;
  c.chase!.at = lag(now);
  c.chase!.since = now;
}

function end(c: Creature, now: number): void {
  if (c.chase?.mob) c.huntRestUntil = now + randInt(HUNT_REST_MIN, HUNT_REST_MAX) * 60_000; // run out: blown, as a miss always left it
  c.chase = undefined;
}

// It has caught up with a wanderer: the fight is on again. Coming through the
// door after you, it gets the jump.
async function engage(z: ZoneDO, c: Creature, s: Session, arrived: boolean): Promise<void> {
  const tmpl = z.world!.mobTemplates.get(c.templateId)!;
  c.target = s.pubkey;
  if (!s.target) s.target = c.id;
  c.chase!.at = HELD; // caught up: nothing to follow until you run again
  if (arrived) {
    z.send(s, pick(CHASE_LINES).replace("{a}", cap(tmpl.name)), "dmgin");
    z.roomFeed(c.roomId, `${cap(tmpl.name)} comes in after ${s.name}.`, s.pubkey, false);
    await z.creatureFirstStrike(c, tmpl, s);
  }
  z.refreshRoomCtx(c.roomId);
}

/** Every beat: each chase follows, rushes, or ends. */
export async function tick(z: ZoneDO, now: number): Promise<void> {
  for (const c of [...z.creatures.values()]) {
    const ch = c.chase;
    if (!ch) continue;
    if (ch.at === HELD) {
      // Caught up: an animal waits on the rush (a miss sets it going again, a
      // catch ends it); a wanderer's chase is held in memory a while, in case
      // they run again.
      if (ch.mob ? z.creatures.get(ch.mob)?.roomId !== c.roomId : now - ch.since > CHASE_MEMORY_MS) c.chase = undefined;
      continue;
    }
    if (c.target || c.holding || c.stunned) { if (ch.mob) c.chase = undefined; continue; }
    let where: string | undefined, s: Session | undefined;
    if (ch.mob) where = z.creatures.get(ch.mob)?.roomId;
    else {
      s = z.sessions.get(ch.pubkey ?? "");
      if (s && s.hp > 0 && !z.outOfWorld(s) && z.reachable(s)) where = s.roomId;
    }
    if (!where) { end(c, now); continue; }
    if (where === c.roomId) {
      if (s) await engage(z, c, s, false);
      else { c.huntRestUntil = undefined; ch.at = HELD; } // predation rushes it this beat
      continue;
    }
    if (now < ch.at) continue;
    if (ch.left <= 0) { end(c, now); continue; }
    ch.left--;
    ch.to = where;
    await creatureMoves(z, c, now, "wander", false);
    ch.to = undefined;
    if (c.roomId !== where) { end(c, now); continue; } // not next door any more, or the way barred to it
    if (s) await engage(z, c, s, true);
    else { c.huntRestUntil = now + CHASE_RUSH_MS; ch.at = HELD; }
  }
}
