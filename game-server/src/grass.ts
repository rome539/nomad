// GRASS IS EATEN DOWN (rome, 2026-11-07). On the mountain a grazing room holds
// GRASS_BITES mouthfuls; a meal there takes one, and they grow back one every
// GRASS_REGROW_MS. A room grazed bare feeds nothing until it grows, so a herd
// that stays put goes hungry and moves on: the hungry step looks for grass next
// door, the daily round for the nearest grass, and a herd hungry long enough
// draws a new home (groups.ts). Everywhere else the ground still never runs dry.
//
// Kept in memory: a restart grows every room back, which two hours would do anyway.

import type { ZoneDO } from "./zone";
import { GRASS_BITES, GRASS_REGROW_MS, THIEVES, VERMIN } from "./zone-data";

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

/** For tests: forget every patch. */
export function resetForTest(z: ZoneDO): void { patches.delete(z); }
