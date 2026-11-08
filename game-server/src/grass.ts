// GRASS IS EATEN DOWN (rome, 2026-11-07). On the mountain a grazing room holds
// GRASS_BITES mouthfuls; a meal there takes one, and they grow back one every
// GRASS_REGROW_MS. A room grazed bare feeds nothing until it grows, so a herd
// that stays put goes hungry and moves on: the hungry step looks for grass next
// door, the daily round for the nearest grass, and a herd hungry long enough
// draws a new home (groups.ts). Everywhere else the ground still never runs dry.
//
// Kept in memory: a restart grows every room back, which two hours would do anyway.

import type { ZoneDO } from "./zone";
import { FORAGE_ROOMS, GRASS_BITES, GRASS_REGROW_MS, OWN_FORAGE_ROOMS, THIEVES, VERMIN } from "./zone-data";

type Patch = { left: number; at: number };
const patches = new WeakMap<ZoneDO, Map<string, Patch>>();
function of(z: ZoneDO): Map<string, Patch> {
  let m = patches.get(z);
  if (!m) patches.set(z, (m = new Map()));
  return m;
}

/** Whether this animal's meal in this room comes out of the grass. */
export function counts(z: ZoneDO, templateId: string, roomId: string): boolean {
  if (VERMIN.has(templateId) || THIEVES.has(templateId)) return false; // muck and scraps, not grass
  return z.regionOf(roomId) === "mountain";
}

/** Mouthfuls left in this room now, grown back since it was last eaten. */
export function left(z: ZoneDO, roomId: string, now: number): number {
  const m = of(z), p = m.get(roomId);
  if (!p) return GRASS_BITES;
  const grown = now > p.at ? Math.floor((now - p.at) / GRASS_REGROW_MS) : 0;
  if (grown <= 0) return p.left;
  p.left = Math.min(GRASS_BITES, p.left + grown);
  p.at += grown * GRASS_REGROW_MS;
  if (p.left >= GRASS_BITES) { m.delete(roomId); return GRASS_BITES; }
  return p.left;
}

/** Whether this animal can graze this room now (anything off the mountain always can). */
export function has(z: ZoneDO, templateId: string, roomId: string, now: number): boolean {
  return !counts(z, templateId, roomId) || left(z, roomId, now) > 0;
}

/** A meal taken here: one mouthful less. */
export function crop(z: ZoneDO, templateId: string, roomId: string, now: number): void {
  if (!counts(z, templateId, roomId)) return;
  const n = left(z, roomId, now), m = of(z), p = m.get(roomId);
  if (p) p.left = Math.max(0, n - 1);
  else m.set(roomId, { left: n - 1, at: now });
}

// THE GRASS CAN BE LOOKED AT (rome, 2026-11-08: no way to tell whether the
// grazers had eaten a room down). `look grass` in a grazing room says how much
// is left; a room eaten bare says so under its words; the keeper's key gets the
// count and the clock.

/** A room on the mountain whose grass is counted: grazing ground for anything. */
export function isGrassRoom(z: ZoneDO, roomId: string): boolean {
  if (z.regionOf(roomId) !== "mountain") return false;
  if (FORAGE_ROOMS.has(roomId)) return true;
  for (const set of OWN_FORAGE_ROOMS.values()) if (set.has(roomId)) return true;
  return false;
}

/** How much grass there is, said by somebody standing on it. */
export function words(n: number): string {
  return n >= GRASS_BITES ? "The grass here is thick and untouched."
    : n >= GRASS_BITES - 2 ? "The grass here has been cropped down in places, but there is plenty left on it."
    : n > 0 ? "The grass here is eaten down nearly to the roots, and there is not much left on it."
    : "The grass here is eaten down to the dirt. There is nothing left on it to graze.";
}

/** The line under a room's words, only when it is grazed bare. */
export function bareLine(z: ZoneDO, roomId: string, now: number): string {
  return isGrassRoom(z, roomId) && left(z, roomId, now) <= 0 ? "The grass here is eaten down to the dirt." : "";
}

/** The keeper's count: mouthfuls left and when the next grows back. */
export function keeperLine(z: ZoneDO, roomId: string, now: number): string {
  const n = left(z, roomId, now);
  const p = of(z).get(roomId);
  const next = p ? Math.max(0, p.at + GRASS_REGROW_MS - now) : 0;
  return `  keeper: grass ${n}/${GRASS_BITES}${n < GRASS_BITES ? ` · next grows back in ${Math.ceil(next / 60_000)}m` : ""}`;
}

/** For tests: forget every patch. */
export function resetForTest(z: ZoneDO): void { patches.delete(z); }
