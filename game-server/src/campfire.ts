// THE CAMPFIRE (rome, 2026-10-29). The one fire a wanderer can make in the
// open, out of the den materials the world now leaves lying about: a bundle of
// split wood, and a spark. The spark is a torch (lit in your hand or cold in
// the pack, and NOT spent — a torch is only ever the light now, never the
// fire), or a loose rock struck on a piece of scrap iron, which takes a few
// goes and costs nothing but the trying.
//
// What a campfire is for, everywhere it is read:
//   - cook (verbs.cmdCook): the only flame in the open that cooks. A torch on
//     the ground does not, any more.
//   - warmth (cough.warm, the rest tick): the chill lets go of you and the
//     cold stops eating your rest, as by a den's hearth.
//   - drying (cough.ts): the wet comes off you at once.
//   - light (zone.roomLit): it lights the room for everyone in it, fire-fear
//     breaks off from it and lurkers cannot spring in it — the same open flame
//     as a torch on the stone, and the most visible thing you can do.
//
// ANYWHERE ON THE MAP (rome, 2026-10-29; it was open ground only at first).
// The rain refuses it and puts out one that is burning, out on open ground
// where the rain lands (a roof or the canopy keeps it off); the tide and the
// sea put it out; the deep's exhale pulls it apart as it does a torch; and
// the WIND blows it out (rome, 2026-10-29) and will not let one be lit,
// wherever nothing breaks it: a roof, the canopy, or a shelter's walls.

import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import * as events from "./events";
import { underCover } from "./detail";
import { removeItemRow } from "./world";
import { chance } from "./rng";
import {
  WOOD_ID, SCRAP_ID, TORCH_ITEM,
  CAMPFIRE_MS, CAMPFIRE_MAX_MS, CAMPFIRE_STRIKE_ODDS, SHELTER_ROOMS,
} from "./zone-data";

// Everyone standing here sees the room's light change: the status carries
// the picture's lit flag, and the room text re-reads the light.
// In a dark room the fire is the difference between seeing it and not, so
// anyone without a light of their own is shown the room again — the way a
// torch lit or a floor torch dying already does (light.ts).
function repaint(z: ZoneDO, roomId: string): void {
  const dark = z.isDark(roomId);
  for (const s of z.sessions.values()) {
    if (s.roomId !== roomId || z.outOfWorld(s)) continue;
    z.sendStatus(s);
    if (dark && !z.carriesLight(s)) z.send(s, z.describeRoom(s, false));
  }
  z.refreshRoomCtx(roomId);
}

/** Is a campfire burning in this room? */
export function burning(z: ZoneDO, roomId: string, now = Date.now()): boolean {
  return now < (z.campfires.get(roomId) ?? 0);
}

/** Are you standing at one? (Warmth and drying read this.) */
export function warmsYou(z: ZoneDO, s: Session, now = Date.now()): boolean {
  return !z.outOfWorld(s) && burning(z, s.roomId, now);
}

// The sky the fire reads (a seam the tests can set).
export const sky = { raining: events.raining, windy: events.windy };

// The rain reaches the fire unless the canopy holds it off (the same shelter
// the torch's refusal honours).
function rainedOn(z: ZoneDO, roomId: string): boolean {
  return sky.raining(z, roomId) && !underCover(roomId);
}
// The wind reaches the fire unless something breaks it.
function windBlown(z: ZoneDO, roomId: string): boolean {
  return sky.windy(z, roomId) && !underCover(roomId) && !SHELTER_ROOMS.has(roomId);
}
function inWater(z: ZoneDO, roomId: string): boolean {
  return events.tideFlooded(z, roomId) || events.seaUnder(z, roomId) || events.exhaling(z, roomId);
}

/** What you have to strike a spark with, best first — or null. */
export function sparkOf(z: ZoneDO, s: Session): "lit" | "torch" | "strike" | null {
  if (z.carriesLight(s)) return "lit"; // torch, brand or lantern: any flame you hold will start one
  if (s.items.some((c) => c.itemId === TORCH_ITEM && c.serial === null)) return "torch";
  const rock = s.items.some((c) => c.itemId === "loose-rock");
  const iron = s.items.some((c) => c.itemId === SCRAP_ID && c.serial === null);
  return rock && iron ? "strike" : null;
}

/** Could a fire be made or fed here, by you, right now? (The chip asks.) */
export function canTend(z: ZoneDO, s: Session): boolean {
  if (z.outOfWorld(s) || z.inCombat(s)) return false;
  if (rainedOn(z, s.roomId) || inWater(z, s.roomId) || windBlown(z, s.roomId)) return false;
  if (!s.items.some((c) => c.itemId === WOOD_ID && c.serial === null)) return false;
  return burning(z, s.roomId) ? (z.campfires.get(s.roomId)! - Date.now()) < CAMPFIRE_MAX_MS - CAMPFIRE_MS : !!sparkOf(z, s);
}

// 'campfire' (bonfire, stoke; and 'light fire', 'feed fire'): make one, or
// put another bundle on the one that is burning.
export async function cmdCampfire(z: ZoneDO, session: Session): Promise<void> {
  if (z.outOfWorld(session)) return z.send(session, "There is a fire in here already, and it is not yours to build.");
  if (z.inCombat(session)) return z.send(session, "Not with something trying to kill you.");
  const roomId = session.roomId;
  if (events.exhaling(z, roomId)) return z.send(session, "The air itself is moving down here. It would pull a fire apart before it caught.");
  if (inWater(z, roomId)) return z.send(session, "You are standing in water. There is nowhere here dry enough to lay a fire.");
  if (rainedOn(z, roomId)) return z.send(session, "The rain would have it out before it ever caught.");
  if (windBlown(z, roomId)) return z.send(session, "The wind would have it out before it ever caught. It wants somewhere out of the wind.");

  const wood = session.items.find((c) => c.itemId === WOOD_ID && c.serial === null);
  const now = Date.now();
  const until = z.campfires.get(roomId) ?? 0;

  // FEEDING. Anyone may, the fire is nobody's.
  if (until > now) {
    if (!wood) return z.send(session, "The fire is burning. It would take a bundle of split wood to keep it going longer, and you have none.");
    if (until - now > CAMPFIRE_MAX_MS - CAMPFIRE_MS) return z.send(session, "The fire is as big as it wants to be. Another bundle would only smother it.");
    session.items.splice(session.items.indexOf(wood), 1);
    await removeItemRow(z.env.DB, wood.rowId);
    z.campfires.set(roomId, until + CAMPFIRE_MS);
    z.send(session, "You lay another bundle on the fire. It settles, smokes, and takes.", "gain");
    z.roomFeed(roomId, `${session.name} feeds the fire.`, session.pubkey, false);
    z.markSimDirty();
    return;
  }

  if (!wood) return z.send(session, "A fire wants wood — a bundle of split wood — and you have none.");
  const spark = sparkOf(z, session);
  if (!spark) return z.send(session, "You have the wood and nothing to light it with. A torch would do it, or a rock struck hard on a piece of scrap iron.");
  if (!chance(spark === "strike" ? CAMPFIRE_STRIKE_ODDS : 1)) {
    z.send(session, "You strike the rock down the iron and the sparks jump and die in the wood. Again.");
    z.roomFeed(roomId, `${session.name} crouches over a bundle of wood, striking sparks.`, session.pubkey, false);
    return;
  }

  session.items.splice(session.items.indexOf(wood), 1);
  await removeItemRow(z.env.DB, wood.rowId);
  z.campfires.set(roomId, now + CAMPFIRE_MS);
  z.send(session, (spark === "strike"
    ? "A spark lands right and sits in the wood, and you breathe on it until it is a flame. The fire takes."
    : spark === "lit"
    ? "You hold your flame to the wood until the bundle catches. The fire takes, and the light in your hand is none the worse for it."
    : "You put the torch to the wood and hold it there until the bundle catches, then grind the torch out again. The fire takes, and the torch is still yours.")
    + " ('cook' a catch on it; 'campfire' again feeds it.)", "gain");
  z.roomFeed(roomId, `${session.name} gets a fire going, and the light of it comes up around you.`, session.pubkey, false);
  repaint(z, roomId);
  z.markSimDirty();
  await z.ensureAlarm();
}

// Burnt out, rained out, or the water came up over it. Rides tickLights.
export function tickCampfires(z: ZoneDO, now: number): void {
  for (const [roomId, until] of z.campfires) {
    const blown = events.exhaling(z, roomId);
    const gusted = !blown && windBlown(z, roomId);
    const drowned = !blown && !gusted && (rainedOn(z, roomId) || inWater(z, roomId));
    if (now < until && !drowned && !blown && !gusted) continue;
    z.campfires.delete(roomId);
    for (const s of z.sessions.values()) {
      if (s.roomId !== roomId || z.outOfWorld(s)) continue;
      z.send(s, blown ? "The deep breathes out and the fire goes flat, streams sideways, and is gone."
        : gusted ? "The wind gets into the fire and tears it apart — sparks go off across the ground and the wood is left smoking."
        : drowned ? "The fire dies under the water with a long hiss, and the smoke goes flat along the ground."
        : "The fire burns down to embers and goes out.", "amb");
    }
    repaint(z, roomId);
    z.markSimDirty();
  }
}
