// CARVING (rome, 2026-11-01, mig 358). A loose rock, worked with a tool that
// can cut stone, comes out as a small stone carving: a random one, with no
// worth to anybody. How well it is cut is the best tool in the pack (the
// chisels, and the stone tools the world already had, CARVE_TOOLS). `place`
// sets it down where you stand, and there it stays: only its carver can take
// it up again, and a spot that already holds three takes no more. Inside its carver's own den it lasts; anywhere else it weathers - worn, then
// almost past knowing, then gone - over CARVE_WEATHER_MS.
//
// A carried carving is an ordinary pack row whose lore_id is its key in the
// carvings table, so its cut and its carver's name ride every path an engraving
// already rides: the floor, a trade, the keeping, a death. Placed carvings are
// held in memory (z.carvings, loaded on wake) because the room is described
// every step and that cannot wait on the database.

import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { pick, uuid } from "./rng";
import { removeItemRow, setItemLoreId } from "./world";
import { insideOf } from "./den";
import { gatehouseFeed } from "./gate";
import { cap, nameMatches, parseOrdinal } from "./zone-util";
import { CARVE_TOOLS, CARVE_QUALITY, CARVINGS, CARVING_ITEM, CARVE_ROOM_CAP, CARVE_WEATHER_MS } from "./zone-data";

export interface PlacedCarving {
  id: string;
  kind: string;
  quality: number;
  carver: string;
  carverPk: string; // only the hand that cut it can take it up again
  roomId: string;
  inside: string;   // the holder of the den it stands inside, "" out on the ground
  lasting: boolean; // set down inside its carver's own den
  placedAt: number; // ms
}

const ROCK = "loose-rock";
const kindOf = (itemId: string): string | undefined =>
  itemId.startsWith("carving-") && CARVINGS.includes(itemId.slice(8)) ? itemId.slice(8) : undefined;

// How far gone: 0 as carved, 1 worn, 2 almost past knowing, 3 gone.
export function stage(c: PlacedCarving, now: number): number {
  if (c.lasting) return 0;
  return Math.min(3, Math.floor(((now - c.placedAt) / CARVE_WEATHER_MS) * 3));
}

export async function loadCarvings(z: ZoneDO): Promise<Map<string, PlacedCarving[]>> {
  const out = new Map<string, PlacedCarving[]>();
  // What has weathered away while the world slept goes for good.
  await z.env.DB.prepare("DELETE FROM carvings WHERE room_id != '' AND lasting = 0 AND placed_at < ?")
    .bind(Date.now() - CARVE_WEATHER_MS).run();
  const rows = await z.env.DB.prepare("SELECT id, kind, quality, carver, carver_pk, room_id, inside, lasting, placed_at FROM carvings WHERE room_id != ''")
    .all<{ id: string; kind: string; quality: number; carver: string; carver_pk: string; room_id: string; inside: string; lasting: number; placed_at: number }>();
  for (const r of rows.results ?? []) {
    const c: PlacedCarving = { id: r.id, kind: r.kind, quality: r.quality, carver: r.carver, carverPk: r.carver_pk, roomId: r.room_id, inside: r.inside, lasting: !!r.lasting, placedAt: r.placed_at };
    out.set(c.roomId, [...(out.get(c.roomId) ?? []), c]);
  }
  return out;
}

// Which side of a door this wanderer is on: inside a den (its holder), behind a
// gate's door by the fire ("gatehouse"), or out on the ground (""). A carving
// set down stands on that side, and is seen only from it.
const GATEHOUSE_SIDE = "gatehouse";
function sideOf(z: ZoneDO, session: Session): string {
  return insideOf(z, session.pubkey)?.holder ?? (z.inGatehouse.has(session.pubkey) ? GATEHOUSE_SIDE : "");
}

// Where a carving set down by this wanderer is filed. The gatehouse is ONE
// room behind every gate - whoever comes in at any of them sits by the same
// fire - so what stands there is filed under the gatehouse itself, never under
// the gate a wanderer happened to come in by (rome, 2026-11-01: filed by gate,
// three carvings vanished for him on coming in at another).
function spotOf(z: ZoneDO, session: Session): string {
  return sideOf(z, session) === GATEHOUSE_SIDE ? GATEHOUSE_SIDE : session.roomId;
}

// The ones standing where this wanderer is: the same room, the same side of
// the same door, and not weathered away.
function here(z: ZoneDO, session: Session, now: number): PlacedCarving[] {
  const side = sideOf(z, session);
  return (z.carvings.get(spotOf(z, session)) ?? []).filter((c) => c.inside === side && stage(c, now) < 3);
}

// The best cut the pack can make (-1: none), and the tool that makes it.
export function bestTool(session: Session): { tier: number; itemId?: string } {
  let best: { tier: number; itemId?: string } = { tier: -1 };
  for (const c of session.items) {
    const t = CARVE_TOOLS[c.itemId];
    if (t !== undefined && t > best.tier) best = { tier: t, itemId: c.itemId };
  }
  return best;
}
const article = (w: string): string => (/^[aeiou]/.test(w) ? `an ${w}` : `a ${w}`);

// `carve rock`. Returns false when the words were not about a rock, so the
// graffiti carve goes on as before.
// The words that make `carve` the carving and not the wall (the gatehouse reads it too).
export const CARVE_ROCK = /^(the |a )?(loose )?(rock|stone)$/i;
export async function carveRock(z: ZoneDO, session: Session, words: string): Promise<boolean> {
  if (!CARVE_ROCK.test(words.trim())) return false;
  const rock = session.items.find((c) => c.itemId === ROCK && !c.equipped && c.serial === null)
    ?? session.items.find((c) => c.itemId === ROCK);
  if (!rock) { z.send(session, "You have no rock to work."); return true; }
  const { tier, itemId: toolId } = bestTool(session);
  if (tier < 0) { z.send(session, "You turn the rock over in your hand. Nothing you carry will cut it."); return true; }
  const kind = pick(CARVINGS);
  // The rock goes into the carving: its row is spent, then the carving is one.
  session.items.splice(session.items.indexOf(rock), 1);
  await removeItemRow(z.env.DB, rock.rowId);
  const got = await z.grantItem(session, CARVING_ITEM(kind));
  if (!got) { z.send(session, "You have no room for it."); return true; }
  const id = uuid();
  got.loreId = id;
  await setItemLoreId(z.env.DB, got.rowId, id);
  await z.env.DB.prepare("INSERT INTO carvings (id, kind, quality, carver, carver_pk, carved_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, kind, tier, session.name, session.pubkey, Date.now()).run();
  const tool = z.world!.itemTemplates.get(toolId!)?.name ?? "a chisel";
  z.send(session, `You turn the rock in your hand and work at it with ${tool}, chip by chip, until ${article(kind)} comes out of it. ${cap(CARVE_QUALITY[tier])}.`, "gain");
  // By the fire it is company, as a smoke is: the gatehouse hears it, the dark
  // outside the door does not.
  const line = `${session.name} sits working at a rock with ${tool}.`;
  if (z.outOfWorld(session)) gatehouseFeed(z, line, session.pubkey);
  else {
    z.roomFeed(session.roomId, line, session.pubkey, false);
    z.creatureNoise(session.roomId);
  }
  z.sendStatus(session);
  z.markSimDirty();
  return true;
}

// `place <carving>`: set it down here, for good.
export async function cmdPlace(z: ZoneDO, session: Session, arg: string): Promise<void> {
  if (!arg) return z.send(session, "Place what?");
  const carried = session.items.find((c) => kindOf(c.itemId) && nameMatches(z.world!.itemTemplates.get(c.itemId)?.name ?? "", arg));
  if (!carried) {
    return z.send(session, z.findCarried(session, arg) ? "That is not a thing you set down and leave." : "You carry nothing like that.");
  }
  const kind = kindOf(carried.itemId)!;
  const now = Date.now();
  const side = sideOf(z, session);
  const lasting = side !== "" && side === session.pubkey;
  // Three to a spot, and a full spot takes no more: nothing already standing is
  // ever put out to make room for another (rome, 2026-11-01).
  if (here(z, session, now).length >= CARVE_ROOM_CAP) {
    return z.send(session, "There is no room left here for another. You keep it.");
  }
  // A carving carried since before its record (or one that lost it) is made
  // whole here with what can be known: a crude cut, by whoever sets it down.
  let rec = carried.loreId
    ? await z.env.DB.prepare("SELECT quality, carver, carver_pk FROM carvings WHERE id = ?").bind(carried.loreId).first<{ quality: number; carver: string; carver_pk: string }>()
    : null;
  const id = carried.loreId ?? uuid();
  if (!rec) {
    rec = { quality: 0, carver: session.name, carver_pk: session.pubkey };
    await z.env.DB.prepare("INSERT INTO carvings (id, kind, quality, carver, carver_pk, carved_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, kind, 0, session.name, session.pubkey, now).run();
  }
  await z.env.DB.prepare("UPDATE carvings SET room_id = ?, inside = ?, lasting = ?, placed_at = ? WHERE id = ?")
    .bind(spotOf(z, session), side, lasting ? 1 : 0, now, id).run();
  session.items.splice(session.items.indexOf(carried), 1);
  await removeItemRow(z.env.DB, carried.rowId);
  const placed: PlacedCarving = { id, kind, quality: rec.quality, carver: rec.carver, carverPk: rec.carver_pk, roomId: spotOf(z, session), inside: side, lasting, placedAt: now };
  z.carvings.set(placed.roomId, [...(z.carvings.get(placed.roomId) ?? []), placed]);
  const name = z.world!.itemTemplates.get(carried.itemId)?.name ?? `a stone ${kind}`;
  z.send(session, `You set ${name} down, and leave it where it stands.`);
  const line = `${session.name} sets ${name} down and leaves it there.`;
  if (side === GATEHOUSE_SIDE) gatehouseFeed(z, line, session.pubkey);
  else {
    z.roomFeed(session.roomId, line, session.pubkey, false);
    z.refreshRoomCtx(session.roomId);
  }
  z.sendStatus(session);
  z.markSimDirty();
}

// Which standing carving the words name. Two of a kind are told apart the way
// two hyenas are ("second face", "face 2", "2.face"), counted in the order the
// room lists them; plain "face" is the first.
function named(z: ZoneDO, session: Session, arg: string, now: number): PlacedCarving | undefined {
  const clean = arg.trim().toLowerCase().replace(/^up\s+/, "").replace(/^(the|a|an|my)\s+/, "");
  const { nth, rest } = parseOrdinal(clean);
  const words = rest.replace(/^(the|a|an|my)\s+/, "").replace(/^stone\s+/, "").trim();
  const hits = here(z, session, now).filter((c) => stage(c, now) === 2
    ? /^(stone|shape|carving|weathered.*)$/.test(words)
    : words === c.kind || words === "carving");
  return hits[nth - 1];
}

// `get <carving>`: its carver takes it up again, and it goes back in the pack
// whole, with its cut and its name. Anyone else's stays where it was put.
// Returns false when nothing of the carver's own here answers to the words, so
// the ordinary floor (or the gatehouse's refusal) answers instead.
export async function pickUp(z: ZoneDO, session: Session, arg: string): Promise<boolean> {
  const now = Date.now();
  const found = named(z, session, arg, now);
  if (!found || found.carverPk !== session.pubkey) return false;
  const itemId = CARVING_ITEM(found.kind);
  if (!z.packRoom(session, itemId)) { z.send(session, "You have no room for it."); return true; }
  const got = await z.grantItem(session, itemId);
  if (!got) { z.send(session, "You have no room for it."); return true; }
  got.loreId = found.id;
  await setItemLoreId(z.env.DB, got.rowId, found.id);
  await z.env.DB.prepare("UPDATE carvings SET room_id = '', inside = '', lasting = 0, placed_at = 0 WHERE id = ?").bind(found.id).run();
  z.carvings.set(found.roomId, (z.carvings.get(found.roomId) ?? []).filter((c) => c.id !== found.id));
  const name = z.world!.itemTemplates.get(itemId)?.name ?? `a stone ${found.kind}`;
  z.send(session, `You take up ${name} again.`, "gain");
  const line = `${session.name} takes up ${name}.`;
  if (found.inside === GATEHOUSE_SIDE) gatehouseFeed(z, line, session.pubkey);
  else {
    z.roomFeed(session.roomId, line, session.pubkey, false);
    z.refreshRoomCtx(session.roomId);
  }
  z.sendStatus(session);
  z.markSimDirty();
  return true;
}

// What the room says of them: one at a time, a different one at random each
// look (rome, 2026-11-01), so a full spot reads as one carving, not a list.
export function roomLines(z: ZoneDO, session: Session): string[] {
  const now = Date.now();
  const all = here(z, session, now);
  if (!all.length) return [];
  const c = pick(all);
  const s = stage(c, now);
  if (s === 2) return ["A weathered stone shape sits here, almost past knowing."];
  return [`A stone ${c.kind} sits here, ${s === 1 ? "worn soft" : CARVE_QUALITY[c.quality]}.`];
}

// The close look at one standing here.
export function lookPlaced(z: ZoneDO, session: Session, arg: string): string | null {
  const now = Date.now();
  const found = named(z, session, arg, now);
  if (!found) return null;
  const s = stage(found, now);
  const base = z.world!.itemTemplates.get(CARVING_ITEM(found.kind))?.description ?? `A ${found.kind} cut out of a lump of rock.`;
  if (s === 2) return `A lump of rock worn almost back to what it was. You can just tell it was once a ${found.kind}. Something was cut into the base, and the weather has had it.`;
  return `${base} ${s === 1 ? "The cuts have gone soft and the edges are going." : `It is ${CARVE_QUALITY[found.quality]}.`} Cut into the base: ${found.carver}.`;
}

// The carried carving's own line, for a look at it in the pack or the keeping
// (lore.gearLedger asks here first: the same lore_id key an engraving uses).
export async function carriedLine(z: ZoneDO, loreId: string): Promise<string | null> {
  const r = await z.env.DB.prepare("SELECT quality, carver FROM carvings WHERE id = ?").bind(loreId)
    .first<{ quality: number; carver: string }>();
  if (!r) return null;
  return ` It is ${CARVE_QUALITY[r.quality] ?? CARVE_QUALITY[0]}. Cut into the base: ${r.carver}.`;
}
