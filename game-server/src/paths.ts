// THE ANIMAL PATHS (rome, 2026-10-12). Ways between rooms that only the animals
// use. They are not exits: world.ts keeps them in world.beastPaths, out of the
// exit lists, so no exits line, chip, compass, map or pathfinder ever shows one.
//
// The only way to learn one is to watch it used. Stand in the room when a deer
// or a wolf goes through where there is no path - or comes out of one - and you
// have seen the way, and it is yours for good (known_paths, mig 296). Nothing
// tells you to watch. A wanderer who knows a path can walk it, and only then
// does it appear in that wanderer's exits.
//
// Kept out of zone.ts on purpose (keep-zone-lean): the hooks there and in verbs,
// chips and ai are one line each.
import type { ZoneDO } from "./zone";
import type { Session, Creature } from "./zone-types";
import type { Exit } from "./world";
import { DRINKERS, GRAZERS, PREYS_ON, THIEVES, FOLK, HOLLOW, PROVISIONED, BEAST_PATH_GROUND } from "./zone-data";
import { cap } from "./zone-util";

const OPPOSITE: Record<string, string> = { north: "south", south: "north", east: "west", west: "east", up: "down", down: "up" };

/** Animals, not people and not the dead: the ones whose ways these are. */
export function walksPaths(templateId: string): boolean {
  if (THIEVES.has(templateId) || FOLK.has(templateId) || HOLLOW.has(templateId) || PROVISIONED.has(templateId)) return false;
  return DRINKERS.has(templateId) || GRAZERS.has(templateId) || PREYS_ON.has(templateId);
}

/** The paths out of a room. */
export function pathsFrom(z: ZoneDO, roomId: string): Exit[] {
  return z.world?.beastPaths?.get(roomId) ?? [];
}

function knownSet(z: ZoneDO, pubkey: string): Set<string> {
  let set = z.knownPaths.get(pubkey);
  if (!set) { set = new Set(); z.knownPaths.set(pubkey, set); }
  return set;
}

/** The paths out of the wanderer's room that this wanderer has seen used. */
export function knownPathsHere(z: ZoneDO, session: Session): Exit[] {
  const set = z.knownPaths.get(session.pubkey);
  if (!set?.size) return [];
  return pathsFrom(z, session.roomId).filter((e) => set.has(`${session.roomId}:${e.dir}`));
}

/** A known path in this direction, for cmdGo. */
export function knownPath(z: ZoneDO, session: Session, dir: string): Exit | undefined {
  return knownPathsHere(z, session).find((e) => e.dir === dir);
}

/** Read what a wanderer knows, once per session, out of D1. */
export async function loadKnownPaths(z: ZoneDO, pubkey: string): Promise<void> {
  if (z.pathsLoaded.has(pubkey)) return;
  z.pathsLoaded.add(pubkey);
  try {
    const rows = await z.env.DB.prepare("SELECT path FROM known_paths WHERE pubkey = ?").bind(pubkey).all<{ path: string }>();
    const set = knownSet(z, pubkey);
    for (const r of rows.results ?? []) set.add(r.path);
  } catch { z.pathsLoaded.delete(pubkey); } // a failed read must not cache "knows nothing"
}

function learn(z: ZoneDO, session: Session, key: string): void {
  const set = knownSet(z, session.pubkey);
  if (set.has(key)) return;
  set.add(key);
  z.env.DB.prepare("INSERT OR IGNORE INTO known_paths (pubkey, path, at) VALUES (?, ?, ?)")
    .bind(session.pubkey, key, Date.now()).run().catch(() => {});
}

/** Who in a room saw it: awake, alive, and in a room with light to see by. */
function watchers(z: ZoneDO, roomId: string): Session[] {
  if (z.isDark(roomId)) return [];
  return [...z.sessions.values()].filter((s) => s.roomId === roomId && s.hp > 0 && z.reachable(s));
}

/**
 * An animal has just gone from `from` through `exit`. Whoever saw it go, and
 * whoever saw it come out the other side, has seen the way. Returns the line
 * for each side; a side that is dark gets none, and the caller keeps its
 * ordinary line there - nobody saw where it went.
 */
export function animalTookPath(z: ZoneDO, creature: Creature, from: string, exit: Exit): { out?: string; in_?: string } {
  const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
  const ground = BEAST_PATH_GROUND[z.regionOf(from)] ?? BEAST_PATH_GROUND.wood;
  const back = pathsFrom(z, exit.to_room).find((e) => e.to_room === from);
  const backDir = back?.dir ?? OPPOSITE[exit.dir] ?? exit.dir;
  for (const s of watchers(z, from)) learn(z, s, `${from}:${exit.dir}`);
  if (back) for (const s of watchers(z, exit.to_room)) learn(z, s, `${exit.to_room}:${back.dir}`);
  return {
    out: z.isDark(from) ? undefined : `${cap(tmpl.name)} goes ${exit.dir} ${ground.through}, where there is no path.`,
    in_: z.isDark(exit.to_room) ? undefined : `${cap(tmpl.name)} comes out ${ground.outOf} to the ${backDir}, where there is no path.`,
  };
}
