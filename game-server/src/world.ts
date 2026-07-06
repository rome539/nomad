// Static world (D1 is truth at rest) + durable player records.
// The zone DO loads this once and keeps hot state in memory.
import { nowSec } from "./util";
import { uniqueName } from "./names";

export interface Room {
  id: string;
  zone: string;
  name: string;
  description: string;
  is_entry: number;
  is_safe: number; // a hideaway ("a crack in the wall") no creature will enter
}

export interface Exit {
  room_id: string;
  dir: string;
  to_room: string;
  key_item: string | null;
}

export interface MobTemplate {
  id: string;
  name: string;
  description: string;
  level: number;
  max_hp: number;
  dmg_min: number;
  dmg_max: number;
  respawn_secs: number;
  is_boss: number;
  loot_item: string | null;
  loot_chance: number;
  armor: number; // hide/plate: flat damage turned per hit taken
  gear_item: string | null; // what it visibly wields/wears — droppable on death
  gear_drop: number; // odds the gear survives the fall (it arrives worn)
}

export interface MobSpawn {
  id: string;
  template_id: string;
  room_id: string;
}

export interface ItemTemplate {
  id: string;
  name: string;
  description: string;
  rarity: string;
  edible: number;
  heal: number;
  lure: number; // hungry creatures smell it and eat it
  dmg: number; // weapons add their bite to bare hands (the equipped one counts)
  slot: string; // '' | 'weapon' | 'armor' | 'helm' | 'feet' | 'cloak' | 'shield' — where it goes ON
  armor: number; // worn items subtract this from each hit that lands (armor SUMS across worn slots)
  speed: number; // swings per round (fast steel strikes twice, lighter each)
  sweep: number; // foes caught per swing (a cleaver drags through a crowd)
  weight: number; // mobility cost: worn weight SUMS (incl. weapon+shield); 0 total = quick (dodge, clean flight)
  stun: number; // blunt weapons: chance per landing hit to make the foe skip its next swing
  block: number; // shields: chance to negate an incoming hit whole (works even weighed down)
  bleed: number; // fast weapons: armor-ignoring damage per tick while the wound is fresh
  barter: number; // what the gate keeper credits it at in trade; 0 = he waves it away
}

export interface GroundSpawn {
  item_id: string;
  room_id: string;
  regrows: number; // only the shrine regrows its gifts
}

// A locked box fixed in a room. Its loot pool is rolled per entry on open; the
// key is consumed, and it re-locks/refills after refillSecs.
export interface Cache {
  id: string;
  roomId: string;
  name: string;
  description: string;
  keyItem: string;
  refillSecs: number;
  loot: { itemId: string; chance: number }[];
}

// Which creature drops which key, and how rarely.
export interface MobKey {
  templateId: string;
  keyItem: string;
  chance: number;
}

// A rare bloodline: when a base creature's ground refills, sometimes the
// variant arrives instead (the roll lives in zone.ts).
export interface MobVariant {
  baseId: string;
  variantId: string;
  chance: number;
}

// One entry in the bench's recipe book: scrap (plus maybe a trophy) in,
// fresh gear out.
export interface ForgeRecipe {
  itemId: string;
  scrap: number;
  material: string | null;
  materialQty: number;
}

// One line of the gate keeper's stock: an item and its cost in trade value.
export interface FenceStock {
  itemId: string;
  cost: number;
}

export interface World {
  zone: string;
  entryRoom: string; // canonical gate — the default when one must be named
  entryRooms: Set<string>; // every gate: enter, extract, and bank at any of them
  safeRooms: Set<string>; // hideaways no creature will follow you into
  rooms: Map<string, Room>;
  exits: Map<string, Exit[]>; // room_id -> exits
  mobTemplates: Map<string, MobTemplate>;
  mobSpawns: MobSpawn[];
  itemTemplates: Map<string, ItemTemplate>;
  groundSpawns: GroundSpawn[];
  caches: Cache[];
  mobKeys: MobKey[];
  forgeRecipes: ForgeRecipe[];
  fenceStock: FenceStock[];
  mobVariants: MobVariant[];
}

export async function loadWorld(db: D1Database, zone: string): Promise<World> {
  const rooms = (await db.prepare("SELECT * FROM rooms WHERE zone = ?").bind(zone).all<Room>())
    .results ?? [];
  if (rooms.length === 0) throw new Error(`zone '${zone}' has no rooms — run db:init`);
  const roomIds = new Set(rooms.map((r) => r.id));

  const allExits = (await db.prepare("SELECT * FROM exits").all<Exit>()).results ?? [];
  const allSpawns = (await db.prepare("SELECT * FROM mob_spawns").all<MobSpawn>()).results ?? [];
  const allGround = (await db.prepare("SELECT * FROM ground_spawns").all<GroundSpawn>()).results ?? [];
  const templates = (await db.prepare("SELECT * FROM mob_templates").all<MobTemplate>()).results ?? [];
  const items = (await db.prepare("SELECT * FROM item_templates").all<ItemTemplate>()).results ?? [];

  // Locked caches, their loot pools, and mob key-drops. Guarded: a DB that
  // hasn't run the Phase-C migration yet just has no caches (world still loads).
  let caches: Cache[] = [];
  let mobKeys: MobKey[] = [];
  try {
    const cacheRows = (await db.prepare("SELECT * FROM caches").all<{ id: string; room_id: string; name: string; description: string; key_item: string; refill_secs: number }>()).results ?? [];
    const lootRows = (await db.prepare("SELECT * FROM cache_loot").all<{ cache_id: string; item_id: string; chance: number }>()).results ?? [];
    const keyRows = (await db.prepare("SELECT * FROM mob_keys").all<{ template_id: string; key_item: string; drop_chance: number }>()).results ?? [];
    caches = cacheRows
      .filter((c) => roomIds.has(c.room_id))
      .map((c) => ({
        id: c.id, roomId: c.room_id, name: c.name, description: c.description,
        keyItem: c.key_item, refillSecs: c.refill_secs,
        loot: lootRows.filter((l) => l.cache_id === c.id).map((l) => ({ itemId: l.item_id, chance: l.chance })),
      }));
    mobKeys = keyRows.map((k) => ({ templateId: k.template_id, keyItem: k.key_item, chance: k.drop_chance }));
  } catch { /* pre-Phase-C DB: no cache tables yet */ }

  // The bench's recipe book and the gate keeper's stock. Same guard: a DB
  // that hasn't run the Phase-D/E migrations just has no forge and no fence.
  let forgeRecipes: ForgeRecipe[] = [];
  let fenceStock: FenceStock[] = [];
  try {
    const recipeRows = (await db.prepare("SELECT * FROM forge_recipes").all<{ item_id: string; scrap: number; material: string | null; material_qty: number }>()).results ?? [];
    forgeRecipes = recipeRows.map((r) => ({ itemId: r.item_id, scrap: r.scrap, material: r.material, materialQty: r.material_qty }));
  } catch { /* pre-Phase-D DB: no forge yet */ }
  try {
    const stockRows = (await db.prepare("SELECT * FROM fence_stock").all<{ item_id: string; cost: number }>()).results ?? [];
    fenceStock = stockRows.map((s) => ({ itemId: s.item_id, cost: s.cost }));
  } catch { /* pre-Phase-E DB: no fence yet */ }
  let mobVariants: MobVariant[] = [];
  try {
    const variantRows = (await db.prepare("SELECT * FROM mob_variants").all<{ base_id: string; variant_id: string; chance: number }>()).results ?? [];
    mobVariants = variantRows.map((v) => ({ baseId: v.base_id, variantId: v.variant_id, chance: v.chance }));
  } catch { /* pre-bloodlines DB: variants keep their old fixed dens */ }

  // A DB without the barter column serves undefined — normalize so the engine
  // can trust the number.
  for (const i of items) i.barter = i.barter ?? 0;

  const exits = new Map<string, Exit[]>();
  for (const e of allExits) {
    if (!roomIds.has(e.room_id)) continue;
    const list = exits.get(e.room_id) ?? [];
    list.push(e);
    exits.set(e.room_id, list);
  }

  const gates = rooms.filter((r) => r.is_entry === 1);
  const entry = gates[0] ?? rooms[0];

  return {
    zone,
    entryRoom: entry.id,
    entryRooms: new Set((gates.length ? gates : [entry]).map((r) => r.id)),
    safeRooms: new Set(rooms.filter((r) => r.is_safe === 1).map((r) => r.id)),
    rooms: new Map(rooms.map((r) => [r.id, r])),
    exits,
    mobTemplates: new Map(templates.map((t) => [t.id, t])),
    mobSpawns: allSpawns.filter((s) => roomIds.has(s.room_id)),
    itemTemplates: new Map(items.map((i) => [i.id, i])),
    groundSpawns: allGround.filter((g) => roomIds.has(g.room_id)),
    caches,
    mobKeys,
    forgeRecipes,
    fenceStock,
    mobVariants,
  };
}

// ---- durable player records ----

export const PLAYER_MAX_HP = 60;

export interface PlayerRow {
  pubkey: string;
  name: string;
  named: number; // 1 = chosen by the player (or adopted profile), 0 = dungeon-minted
  room_id: string;
  hp: number;
  max_hp: number;
  created_at: number;
  last_seen: number;
  kills: number; // creatures destroyed
  deaths: number;
  boss_kills: number;
  pvp_kills: number; // self-publishable only; the world's narration never names killers
  stance: string; // "reckless" | "steady" | "guarded" — persisted play-style
}

// Persist the character's fighting stance. Keyed by pubkey, so it follows the
// key across browsers/devices like the rest of the player row.
export async function setStance(db: D1Database, pubkey: string, stance: string): Promise<void> {
  await db.prepare("UPDATE players SET stance = ? WHERE pubkey = ?").bind(stance, pubkey).run();
}

// The tallies feed the publishable sheet, so they live in D1, not just the
// session — a legend survives disconnects.
export async function recordKill(db: D1Database, pubkey: string, boss: boolean): Promise<void> {
  await db
    .prepare(`UPDATE players SET kills = kills + 1${boss ? ", boss_kills = boss_kills + 1" : ""} WHERE pubkey = ?`)
    .bind(pubkey)
    .run();
}

export async function recordDeath(db: D1Database, pubkey: string): Promise<void> {
  await db.prepare("UPDATE players SET deaths = deaths + 1 WHERE pubkey = ?").bind(pubkey).run();
}

export async function getOrCreatePlayer(
  db: D1Database,
  pubkey: string,
  entryRoom: string,
): Promise<{ row: PlayerRow; created: boolean }> {
  const row = await db
    .prepare("SELECT * FROM players WHERE pubkey = ?")
    .bind(pubkey)
    .first<PlayerRow>();
  if (row) {
    // Pre-003 players still wearing a pubkey stub get a real name on arrival.
    if (!row.named && /^[0-9a-f]{8}$/.test(row.name)) {
      row.name = await uniqueName(db);
      await db.prepare("UPDATE players SET name = ? WHERE pubkey = ?").bind(row.name, pubkey).run();
    }
    // The world grew tougher, and so did you: anyone on the old cap is raised to
    // the current one — a one-time buff, arriving as a full wind. (Only ever
    // raises; a healthy player mid-run isn't docked.)
    if (row.max_hp < PLAYER_MAX_HP) {
      row.max_hp = PLAYER_MAX_HP;
      row.hp = PLAYER_MAX_HP;
      await db.prepare("UPDATE players SET max_hp = ?, hp = ? WHERE pubkey = ?").bind(PLAYER_MAX_HP, PLAYER_MAX_HP, pubkey).run();
    }
    return { row, created: false };
  }

  const player: PlayerRow = {
    pubkey,
    name: await uniqueName(db),
    named: 0,
    room_id: entryRoom,
    hp: PLAYER_MAX_HP,
    max_hp: PLAYER_MAX_HP,
    created_at: nowSec(),
    last_seen: nowSec(),
    kills: 0,
    deaths: 0,
    boss_kills: 0,
    pvp_kills: 0,
    stance: "steady",
  };
  await db
    .prepare(
      "INSERT INTO players (pubkey, name, named, room_id, hp, max_hp, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(player.pubkey, player.name, player.named, player.room_id, player.hp, player.max_hp, player.created_at, player.last_seen)
    .run();
  return { row: player, created: true };
}

// Claim a display name. Returns false if another soul already answers to it.
export async function renamePlayer(
  db: D1Database,
  pubkey: string,
  name: string,
): Promise<boolean> {
  const taken = await db
    .prepare("SELECT pubkey FROM players WHERE name = ? COLLATE NOCASE AND pubkey != ?")
    .bind(name, pubkey)
    .first<{ pubkey: string }>();
  if (taken) return false;
  await db.prepare("UPDATE players SET name = ?, named = 1 WHERE pubkey = ?").bind(name, pubkey).run();
  return true;
}

export async function savePlayer(
  db: D1Database,
  pubkey: string,
  roomId: string,
  hp: number,
): Promise<void> {
  await db
    .prepare("UPDATE players SET room_id = ?, hp = ?, last_seen = ? WHERE pubkey = ?")
    .bind(roomId, hp, nowSec(), pubkey)
    .run();
}

// One carried thing: its ledger row, what it is, and whether the gate has
// sealed the claim (serial from the mint ledger; null = provisional).
export interface CarriedItem {
  rowId: string;
  itemId: string;
  serial: number | null;
  equipped: boolean; // worn/wielded — at most one per slot
  condition: number; // 0-100; use + rust wear it down (sealed gear is frozen)
  journalId?: string; // only a journal: the stable id its pages are keyed to
}

// Carried = on the body (container ''). What sits in the lockbox or the vault
// is loaded separately and never scatters.
export async function loadInventory(db: D1Database, pubkey: string): Promise<CarriedItem[]> {
  const res = await db
    .prepare("SELECT id, item_id, signed_serial, equipped, condition, journal_id FROM player_items WHERE pubkey = ? AND container = '' ORDER BY acquired_at")
    .bind(pubkey)
    .all<{ id: string; item_id: string; signed_serial: number | null; equipped: number; condition: number; journal_id: string }>();
  return (res.results ?? []).map((r) => ({ rowId: r.id, itemId: r.item_id, serial: r.signed_serial, equipped: !!r.equipped, condition: r.condition ?? 100, journalId: r.journal_id || undefined }));
}

// Persist a gear instance's worn-down condition (rounded to the D1 integer).
// Called lazily — on leave, on seal, and when something breaks — not per tick.
export async function setItemCondition(db: D1Database, rowId: string, condition: number): Promise<void> {
  await db.prepare("UPDATE player_items SET condition = ? WHERE id = ?").bind(Math.max(0, Math.round(condition)), rowId).run();
}

// Put a pack instance on, or take it off. The engine keeps at most one equipped
// item per slot; this just persists the flag so it survives a reconnect.
export async function setEquipped(db: D1Database, rowId: string, equipped: boolean): Promise<void> {
  await db.prepare("UPDATE player_items SET equipped = ? WHERE id = ?").bind(equipped ? 1 : 0, rowId).run();
}

// What rests in a gate container ('lockbox' | 'vault'): beyond the reach of
// anything that happens to the body that owns it. Condition is preserved.
export async function loadContainer(db: D1Database, pubkey: string, container: string): Promise<CarriedItem[]> {
  const res = await db
    .prepare("SELECT id, item_id, signed_serial, condition, journal_id FROM player_items WHERE pubkey = ? AND container = ? ORDER BY acquired_at")
    .bind(pubkey, container)
    .all<{ id: string; item_id: string; signed_serial: number | null; condition: number; journal_id: string }>();
  return (res.results ?? []).map((r) => ({ rowId: r.id, itemId: r.item_id, serial: r.signed_serial, equipped: false, condition: r.condition ?? 100, journalId: r.journal_id || undefined }));
}

// Move a pack instance into a gate container, or back onto the body (''). The
// equipped flag is always cleared — nothing stays wielded in a box.
export async function setContainer(db: D1Database, rowId: string, container: string): Promise<void> {
  await db.prepare("UPDATE player_items SET container = ?, equipped = 0 WHERE id = ?").bind(container, rowId).run();
}

// The gate seals a claim: one mint row, serial-numbered, and the pack entry
// remembers its number. Returns the serial.
export async function mintClaim(
  db: D1Database,
  rowId: string,
  itemId: string,
  rarity: string,
  pubkey: string,
): Promise<number> {
  const row = await db
    .prepare(
      "INSERT INTO mints (loot_id, item_id, rarity, pubkey, minted_at) VALUES (?, ?, ?, ?, ?) RETURNING serial",
    )
    .bind(rowId, itemId, rarity, pubkey, nowSec())
    .first<{ serial: number }>();
  const serial = row!.serial;
  await db.prepare("UPDATE player_items SET signed_serial = ? WHERE id = ?").bind(serial, rowId).run();
  return serial;
}

export async function setMintEvent(db: D1Database, serial: number, eventId: string): Promise<void> {
  await db.prepare("UPDATE mints SET event_id = ? WHERE serial = ?").bind(eventId, serial).run();
}

// A claim released on purpose (dropped, eaten): the seal cracks, the ledger notes it.
export async function voidMint(db: D1Database, serial: number): Promise<void> {
  await db.prepare("UPDATE mints SET voided_at = ? WHERE serial = ?").bind(nowSec(), serial).run();
}

export async function insertLoot(
  db: D1Database,
  id: string,
  pubkey: string,
  itemId: string,
  eventId: string | null,
  condition = 100, // gear pried off the fallen arrives worn, not fresh
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO player_items (id, pubkey, item_id, acquired_at, event_id, condition) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(id, pubkey, itemId, nowSec(), eventId, condition)
    .run();
}

// Death scatters EVERYTHING carried — sealed included; the seal is title, not
// armor (rome's rule, 2026-07-05). Only the gate containers never stir.
export async function clearCarriedInventory(db: D1Database, pubkey: string): Promise<void> {
  await db
    .prepare("DELETE FROM player_items WHERE pubkey = ? AND container = ''")
    .bind(pubkey)
    .run();
}

// Removes one specific pack row (drop, eat, a fumbled weapon).
export async function removeItemRow(db: D1Database, rowId: string): Promise<void> {
  await db.prepare("DELETE FROM player_items WHERE id = ?").bind(rowId).run();
}

// ---- journals: a bestiary keyed to the book, so it travels when the book does ----

// Stamp a pack row with the journal id it carries (set once, when the book
// first comes into the world; re-stamped onto the fresh row when it's picked
// back up so the pages find their book again).
export async function setItemJournalId(db: D1Database, rowId: string, journalId: string): Promise<void> {
  await db.prepare("UPDATE player_items SET journal_id = ? WHERE id = ?").bind(journalId, rowId).run();
}

export interface JournalRow {
  templateId: string;
  kills: number;
  studied: boolean;
}

// Every entry written in a given book.
export async function journalLoad(db: D1Database, journalId: string): Promise<JournalRow[]> {
  const res = await db
    .prepare("SELECT template_id, kills, studied FROM journal_logs WHERE journal_id = ?")
    .bind(journalId)
    .all<{ template_id: string; kills: number; studied: number }>();
  return (res.results ?? []).map((r) => ({ templateId: r.template_id, kills: r.kills, studied: !!r.studied }));
}

// One more kill of a creature, written in the book you were holding when it fell.
export async function journalBumpKill(db: D1Database, journalId: string, templateId: string): Promise<void> {
  await db
    .prepare(
      "INSERT INTO journal_logs (journal_id, template_id, kills, studied) VALUES (?, ?, 1, 0) " +
      "ON CONFLICT(journal_id, template_id) DO UPDATE SET kills = kills + 1",
    )
    .bind(journalId, templateId)
    .run();
}

// Mark a creature studied in the book (the observation half of a full account).
export async function journalStudy(db: D1Database, journalId: string, templateId: string): Promise<void> {
  await db
    .prepare(
      "INSERT INTO journal_logs (journal_id, template_id, kills, studied) VALUES (?, ?, 0, 1) " +
      "ON CONFLICT(journal_id, template_id) DO UPDATE SET studied = 1",
    )
    .bind(journalId, templateId)
    .run();
}
