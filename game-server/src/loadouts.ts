import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { hasTrait, loadContainer, type CarriedItem } from "./world";
import { uuid } from "./rng";

const SLOTS = ["weapon", "shield", "helm", "armor", "cloak", "feet"] as const;
type Slot = typeof SLOTS[number];
export interface Loadout {
  id: string;
  name: string;
  slots: Record<Slot, { row: string; name: string } | null>;
}

// The zone's event queue serializes this with all other inventory operations.
export async function handleLoadout(z: ZoneDO, session: Session, frame: any): Promise<string> {
  if (!session.away || !z.inGatehouse.has(session.pubkey) || !z.world!.entryRooms.has(session.roomId) || z.inCombat(session)) {
    return "Enter the gatehouse to manage loadouts.";
  }
  const sets = await z.savedLoadouts(session.pubkey);
  const chosen = sets.find(s => s.id === frame.id);
  const capture = (): Loadout["slots"] => Object.fromEntries(SLOTS.map(slot => {
    const item = session.items.find(c => c.equipped && z.world!.itemTemplates.get(c.itemId)?.slot === slot);
    return [slot, item ? { row: item.rowId, name: z.displayName(item) } : null];
  })) as Loadout["slots"];
  if (frame.action === "loadout-save") {
    const name = typeof frame.name === "string" ? frame.name.trim() : "";
    if (!name || name.length > 32 || /[\x00-\x1f\x7f]/.test(name)) return "Use a loadout name of 1–32 characters.";
    if (sets.length >= 20) return "You can keep up to 20 loadouts. Update or delete an existing one.";
    if (sets.some(s => s.name.toLowerCase() === name.toLowerCase())) return "That name exists. Select it and use Update to replace its gear.";
    await z.saveLoadouts(session.pubkey, [...sets, { id: uuid(), name, slots: capture() }]);
    return `Saved ${name} from what you are wearing.`;
  }
  if (!chosen) return "That loadout no longer exists.";
  if (frame.action === "loadout-delete") {
    await z.saveLoadouts(session.pubkey, sets.filter(s => s.id !== chosen.id));
    return `Removed loadout ${chosen.name}.`;
  }
  if (frame.action === "loadout-update") {
    await z.saveLoadouts(session.pubkey, sets.map(s => s.id === chosen.id ? { ...s, slots: capture() } : s));
    return `Updated ${chosen.name} from what you are wearing.`;
  }
  if (frame.action !== "loadout-equip") return "Unknown loadout action.";
  const all = [...session.items, ...await loadContainer(z.env.DB, session.pubkey, "lockbox"), ...await loadContainer(z.env.DB, session.pubkey, "vault")];
  const target: CarriedItem[] = [], missing: string[] = [];
  for (const slot of SLOTS) {
    const wanted = chosen.slots[slot];
    if (!wanted) continue;
    const item = all.find(c => c.rowId === wanted.row && z.world!.itemTemplates.get(c.itemId)?.slot === slot);
    if (item) target.push(item); else missing.push(wanted.name);
  }
  if (missing.length) return `Cannot equip ${chosen.name}. Missing: ${missing.join(", ")}. Nothing changed.`;
  const weapon = target.find(c => z.world!.itemTemplates.get(c.itemId)?.slot === "weapon");
  if (weapon && hasTrait(z.world!.itemTemplates.get(weapon.itemId)!, "two-handed") && target.some(c => z.world!.itemTemplates.get(c.itemId)?.slot === "shield")) {
    return "This set needs both hands and a shield. Nothing changed.";
  }
  const ids = new Set(target.map(c => c.rowId));
  const next = [...session.items, ...target.filter(c => !session.items.some(p => p.rowId === c.rowId))].map(c => ({ ...c, equipped: ids.has(c.rowId) }));
  const extra = z.slotsUsed(next, "pack") - z.packCap({ ...session, items: next });
  if (extra > 0) return `Make room for ${extra} more pack ${extra === 1 ? "slot" : "slots"} before changing sets. Nothing changed.`;
  const changed = next.filter(c => ids.has(c.rowId) || session.items.some(p => p.rowId === c.rowId && p.equipped));
  if (changed.length) {
    const rows = changed.map(c => c.rowId), marks = rows.map(() => "?").join(",");
    const equipped = changed.flatMap(c => [c.rowId, c.equipped ? 1 : 0]);
    const conditions = changed.flatMap(c => [c.rowId, c.condition]);
    // One guarded SQL statement: either every exact owned piece moves or none do.
    // Keep serials, rolled traits and current wear; never mint or substitute gear.
    const result = await z.env.DB.prepare(`UPDATE player_items SET container='',
      equipped=CASE id ${rows.map(() => "WHEN ? THEN ?").join(" ")} END,
      condition=CASE id ${rows.map(() => "WHEN ? THEN ?").join(" ")} END,
      container_at=CASE WHEN container<>'' THEN ? ELSE container_at END
      WHERE pubkey=? AND id IN (${marks}) AND container IN ('','lockbox','vault')
      AND (SELECT COUNT(*) FROM player_items WHERE pubkey=? AND id IN (${marks}) AND container IN ('','lockbox','vault'))=?
      RETURNING id`).bind(...equipped, ...conditions, Date.now(), session.pubkey, ...rows, session.pubkey, ...rows, rows.length).all();
    if (result.results.length !== rows.length) return "Your gear changed before the swap. Nothing changed; reopen your inventory.";
  }
  session.items = next;
  return `Equipped ${chosen.name}. Replaced gear is in your pack.`;
}
