// THE COUGH (rome, 2026-10-24). A cough is heard: the one coughing, the room
// they stand in, and the rooms through the wall, and it is NOISE like any other,
// so it brings the curious. Something has happened to you, and now you are loud.
//
// What brings one on:
//   - the rat king's sickness, while it lives, anywhere in the fortress (ratking.ts)
//   - the drowned's black water, for a while after one drags you under
//   - a chill: cold and wet long enough with nothing to warm you, until you do.
//     It is being WET that counts, not the rain (rome, 2026-10-29): the rain or
//     the water soaks you and you stay soaked after (isWet), and once the chill
//     is in your chest rest mends you at half speed and the cold out there takes a point
//     every CHILL_BITE_MS, down to CHILL_FLOOR and no further.
//   - smoke: the charcoal clamp, or a den whose hearth and smoke rack are curing
//   - dust: a fortress wall coming down on top of you (events.ts, the breach)

import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { chance, pick } from "./rng";
import * as events from "./events";
import * as den from "./den";
import * as campfire from "./campfire";
import { underCover } from "./detail";
import {
  WET_DRY_MS, CHILL_BITE_MS, CHILL_FLOOR,
  COUGH_WATER_MS, COUGH_WATER_PER_MIN, COUGH_CHILL_AFTER_MS, COUGH_CHILL_PER_MIN, COUGH_SMOKE_PER_MIN,
  COUGH_WATER_LINES, COUGH_CHILL_LINES, COUGH_SMOKE_LINES, COUGH_DUST_LINES,
} from "./zone-data";

// Heard as well as read: the one coughing, the room, and through the wall.
export function cough(z: ZoneDO, s: Session, line: string): void {
  const sound = [{ act: "cough", dir: "" }];
  z.send(s, line, undefined, undefined, sound);
  for (const o of z.sessions.values()) {
    if (o === s || o.roomId !== s.roomId || z.outOfWorld(o)) continue;
    z.send(o, `${s.name} doubles over coughing, loud enough to carry.`, undefined, undefined, sound);
  }
  z.roomSound(s.roomId, "Somebody is coughing {dir}, hard, and cannot stop.", undefined, undefined, false, { act: "cough" });
  z.creatureNoise(s.roomId);
}

// The drowned dragged you under: you will be bringing the water up for a while.
export function swallowedWater(s: Session, now = Date.now()): void {
  s.coughWaterUntil = Math.max(s.coughWaterUntil ?? 0, now + COUGH_WATER_MS);
  soak(s, now);
}

// THE WET. Soaked through until WET_DRY_MS after the last of the water.
export function isWet(s: Session, now = Date.now()): boolean {
  return (s.wetUntil ?? 0) > now;
}
export function soak(s: Session, now = Date.now()): void {
  s.wetUntil = Math.max(s.wetUntil ?? 0, now + WET_DRY_MS);
}

// A wall came down on the room: everybody in it coughs on the dust, now.
export function dust(z: ZoneDO, roomId: string): void {
  for (const s of z.sessions.values()) {
    if (s.roomId === roomId && !z.outOfWorld(s) && s.hp > 0) cough(z, s, pick(COUGH_DUST_LINES));
  }
}

// The weather the chill reads (a seam the tests can set).
export const weather = {
  coldBites: events.coldBites, raining: events.raining, windy: events.windy,
  inWater: (z: ZoneDO, roomId: string) => events.tideFlooded(z, roomId) || events.seaUnder(z, roomId),
};

// Is the water landing on you? The rain on open ground (not under the canopy,
// not under a roof), and the tide or the sea you are standing in.
function wetting(z: ZoneDO, s: Session): boolean {
  if (z.inGatehouse.has(s.pubkey) || z.inDen?.has(s.pubkey)) return false; // under a roof
  return (weather.raining(z, s.roomId) && !underCover(s.roomId)) || weather.inWater(z, s.roomId);
}

function warm(z: ZoneDO, s: Session, now: number): boolean {
  return z.inGatehouse.has(s.pubkey) || den.hearthWarm(z, s) || (s.warmUntil ?? 0) > now || campfire.warmsYou(z, s, now);
}
// A fire dries you: the gatehouse's, a den's hearth, a campfire. (Soup warms
// you from the inside; it does not dry your coat.)
function byAFire(z: ZoneDO, s: Session, now: number): boolean {
  return z.inGatehouse.has(s.pubkey) || den.hearthWarm(z, s) || campfire.warmsYou(z, s, now);
}

// THE WET, once a minute: soaked by the water, dried by a fire or by time (the
// wind twice as fast). Told when it changes, never why.
function tickWet(z: ZoneDO, s: Session, now: number): void {
  const was = isWet(s, now);
  if (!z.outOfWorld(s) && wetting(z, s)) {
    soak(s, now);
    if (!was) {
      z.send(s, weather.inWater(z, s.roomId)
        ? "The water is over your boots and through everything you have on."
        : "The rain has soaked you through.");
      z.sendStatus(s); // the bar says it until you are dry
    }
    return;
  }
  if (!was) return;
  if (byAFire(z, s, now)) s.wetUntil = 0;
  else if (!z.outOfWorld(s) && weather.windy(z, s.roomId)) s.wetUntil = (s.wetUntil ?? 0) - 60_000; // the wind dries you twice as fast
  if (!isWet(s, now)) { z.send(s, "You are dry again."); z.sendStatus(s); }
}

export function smoky(z: ZoneDO, roomId: string): boolean {
  if (z.roomHasFirekeeper(roomId)) return true; // the charcoal clamp, banked and breathing
  for (const d of z.dens.values()) {
    if (d.roomId !== roomId || !d.hearth || !d.smoke) continue;
    if (Object.keys(z.curingCount(roomId)).length) return true; // the rack has meat in the smoke
  }
  return false;
}

// Once a minute (ratking.roll's clock is its own): the water, the chill, the smoke.
const lastTick = new WeakMap<ZoneDO, number>();
export function tick(z: ZoneDO, now: number): void {
  if (now - (lastTick.get(z) ?? 0) < 60_000) return;
  lastTick.set(z, now);
  for (const s of z.sessions.values()) {
    if (s.hp <= 0) continue;
    tickWet(z, s, now);
    // THE CHILL keeps its count whatever else is going on.
    const out = z.outOfWorld(s);
    if (warm(z, s, now)) {
      const wasChilled = !!s.chilled;
      s.chilled = false; s.chillMs = 0;
      if (wasChilled) { z.send(s, "The warmth gets into your chest at last, and the cough lets go of you."); z.sendStatus(s); }
    } else if (!out && weather.coldBites(z, s.roomId) && (isWet(s, now) || z.wearsTrait(s, "sodden"))) {
      s.chillMs = (s.chillMs ?? 0) + 60_000;
      if (!s.chilled && s.chillMs >= COUGH_CHILL_AFTER_MS) {
        s.chilled = true;
        s.chillBiteAt = now;
        z.send(s, "The cold and the wet have got into your chest. You will be coughing until you get warm.");
        z.sendStatus(s);
      } else if (s.chilled && now - (s.chillBiteAt ?? 0) >= CHILL_BITE_MS) {
        // Still out in it with the chill in you: it takes a point, never the last of you.
        s.chillBiteAt = now;
        const floor = Math.ceil(s.maxHp * CHILL_FLOOR);
        if (s.hp > floor) {
          s.hp = Math.max(floor, s.hp - 1);
          z.send(s, "You are shaking hard now, and the cold is taking something out of you it will not give back.", "dmgin");
          z.sendStatus(s);
        }
      }
    } else {
      s.chillMs = Math.max(0, (s.chillMs ?? 0) - 30_000);
    }
    if (out) continue;
    // One cough a minute at most, whatever is causing it.
    if ((s.coughWaterUntil ?? 0) > now && chance(COUGH_WATER_PER_MIN)) cough(z, s, pick(COUGH_WATER_LINES));
    else if (smoky(z, s.roomId) && chance(COUGH_SMOKE_PER_MIN)) cough(z, s, pick(COUGH_SMOKE_LINES));
    else if (s.chilled && chance(COUGH_CHILL_PER_MIN)) cough(z, s, pick(COUGH_CHILL_LINES));
  }
}

export function resetForTest(z: ZoneDO): void { lastTick.delete(z); }
