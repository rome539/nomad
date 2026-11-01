// CARVING (rome, 2026-11-01, mig 358). A loose rock, worked with a tool that
// can cut stone, comes out as a small stone carving: a random one, with no
// worth to anybody. How well it is cut is the best tool in the pack (the
// chisels, and the stone tools the world already had, CARVE_TOOLS). `place`
// sets it down where you stand, and there it stays: nobody can pick it up.
// Inside its carver's own den it lasts; anywhere else it weathers - worn, then
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
import { cap, nameMatches } from "./zone-util";
import { CARVE_TOOLS, CARVE_QUALITY, CARVINGS, CARVING_ITEM, CARVE_ROOM_CAP, CARVE_WEATHER_MS } from "./zone-data";

export interface PlacedCarving {
  id: string;
  kind: string;
  quality: number;
  carver: string;
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
  const rows = await z.env.DB.prepare("SELECT id, kind, quality, carver, room_id, inside, lasting, placed_at FROM carvings WHERE room_id != ''")
    .all<{ id: string; kind: string; quality: number; carver: string; room_id: string; inside: string; lasting: number; placed_at: number }>();
  for (const r of rows.results ?? []) {
    const c: PlacedCarving = { id: r.id, kind: r.kind, quality: r.quality, carver: r.carver, roomId: r.room_id, inside: r.inside, lasting: !!r.lasting, placedAt: r.placed_at };
    out.set(c.roomId, [...(out.get(c.roomId) ?? []), c]);
  }
  return out;
}

// The ones standing where this wanderer is: the same room, the same side of
// the same den door, and not weathered away.
function here(z: ZoneDO, session: Session, now: number): PlacedCarving[] {
  const side = insideOf(z, session.pubkey)?.holder ?? "";
  return (z.carvings.get(session.roomId) ?? []).filter((c) => c.inside === side && stage(c, now) < 3);
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
export async function carveRock(z: ZoneDO, session: Session, words: string): Promise<boolean> {
  if (!/^(the |a )?(loose )?(rock|stone)$/i.test(words.trim())) return false;
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
  z.roomFeed(session.roomId, `${session.name} sits working at a rock with ${tool}.`, session.pubkey, false);
  z.creatureNoise(session.roomId);
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
  const side = insideOf(z, session.pubkey)?.holder ?? "";
  const lasting = side !== "" && side === session.pubkey;
  // Three to a spot: a fourth puts the most weathered of them out of its place.
  const standing = here(z, session, now);
  if (standing.length >= CARVE_ROOM_CAP) {
    const gone = [...standing].sort((a, b) => (stage(b, now) - stage(a, now)) || (a.placedAt - b.placedAt))[0];
    z.carvings.set(session.roomId, (z.carvings.get(session.roomId) ?? []).filter((c) => c.id !== gone.id));
    await z.env.DB.prepare("DELETE FROM carvings WHERE id = ?").bind(gone.id).run();
  }
  // A carving carried since before its record (or one that lost it) is made
  // whole here with what can be known: a crude cut, by whoever sets it down.
  let rec = carried.loreId
    ? await z.env.DB.prepare("SELECT quality, carver FROM carvings WHERE id = ?").bind(carried.loreId).first<{ quality: number; carver: string }>()
    : null;
  const id = carried.loreId ?? uuid();
  if (!rec) {
    rec = { quality: 0, carver: session.name };
    await z.env.DB.prepare("INSERT INTO carvings (id, kind, quality, carver, carver_pk, carved_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, kind, 0, session.name, session.pubkey, now).run();
  }
  await z.env.DB.prepare("UPDATE carvings SET room_id = ?, inside = ?, lasting = ?, placed_at = ? WHERE id = ?")
    .bind(session.roomId, side, lasting ? 1 : 0, now, id).run();
  session.items.splice(session.items.indexOf(carried), 1);
  await removeItemRow(z.env.DB, carried.rowId);
  const placed: PlacedCarving = { id, kind, quality: rec.quality, carver: rec.carver, roomId: session.roomId, inside: side, lasting, placedAt: now };
  z.carvings.set(session.roomId, [...(z.carvings.get(session.roomId) ?? []), placed]);
  const name = z.world!.itemTemplates.get(carried.itemId)?.name ?? `a stone ${kind}`;
  z.send(session, `You set ${name} down, and leave it where it stands.`);
  z.roomFeed(session.roomId, `${session.name} sets ${name} down and leaves it there.`, session.pubkey, false);
  z.sendStatus(session);
  z.refreshRoomCtx(session.roomId);
  z.markSimDirty();
}

// What the room says of them.
export function roomLines(z: ZoneDO, session: Session): string[] {
  const now = Date.now();
  return here(z, session, now).map((c) => {
    const s = stage(c, now);
    if (s === 2) return "A weathered stone shape sits here, almost past knowing.";
    return `A stone ${c.kind} sits here, ${s === 1 ? "worn soft" : CARVE_QUALITY[c.quality]}.`;
  });
}

// The close look at one standing here.
export function lookPlaced(z: ZoneDO, session: Session, arg: string): string | null {
  const now = Date.now();
  const words = arg.replace(/^(the|a|an)\s+/i, "").replace(/^stone\s+/i, "").trim().toLowerCase();
  const found = here(z, session, now).find((c) => {
    if (stage(c, now) === 2) return /^(stone|shape|carving|weathered.*)$/.test(words);
    return words === c.kind || words === "carving";
  });
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
