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
  bleed: number; // claws/teeth: opens an armor-ignoring wound on the player it hits (0 = clean blow)
  stun: number; // heavy dead things: chance per landing hit to make the player lose their next swing
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
  staunch: number; // a dressing: HP it binds back when applied (and it clots the wound); 0 = not a dressing
  // THE TRAIT LEDGER (098): abilities live on the row, like armor and weight —
  // a comma list of tags, valued tags as name:value ("wall,thorns:2"). Parsed
  // once at world-load into traitMap; the code reads tags via trait()/hasTrait()
  // and never keys abilities to item ids again. Blank for most gear.
  traits: string;
  traitMap?: Map<string, number>;
}

// Parse "wall,thorns:2" → Map { wall→1, thorns→2 }. Unvalued tags read as 1.
export function parseTraits(raw: string | null | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const part of (raw ?? "").split(",")) {
    const tag = part.trim();
    if (!tag) continue;
    const at = tag.indexOf(":");
    if (at === -1) m.set(tag, 1);
    else m.set(tag.slice(0, at), Number(tag.slice(at + 1)) || 1);
  }
  return m;
}

// The one read every trait check goes through: 0 when absent (or no template),
// the tag's value when present (plain tags are 1).
export function trait(t: ItemTemplate | null | undefined, name: string): number {
  return t?.traitMap?.get(name) ?? 0;
}

export function hasTrait(t: ItemTemplate | null | undefined, name: string): boolean {
  return trait(t, name) > 0;
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
  // The trait ledger, parsed once: tags become a Map the combat math reads via
  // trait()/hasTrait(). (A DB from before 098 has no column — parse of
  // undefined yields the empty map, and every item is plain until the mig runs.)
  for (const it of items) it.traitMap = parseTraits(it.traits);

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

export async function recordPvpKill(db: D1Database, pubkey: string): Promise<void> {
  await db.prepare("UPDATE players SET pvp_kills = pvp_kills + 1 WHERE pubkey = ?").bind(pubkey).run();
}

// A boss ASSIST: your blood was in the fight, so the horror goes on your sheet
// too — but the kill itself stays the killer's (boss_kills only, never kills).
export async function recordBossAssist(db: D1Database, pubkey: string): Promise<void> {
  await db.prepare("UPDATE players SET boss_kills = boss_kills + 1 WHERE pubkey = ?").bind(pubkey).run();
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
  loreId?: string; // engraved gear: the gate's mark — its deeds-ledger key, enduring past every serial (077)
  acquiredAt?: number; // unix seconds the row was cut/taken — the deep-heart rots against this
  // THE TRAIT LOTTERY (099): what THIS copy rolled when it entered the world —
  // a comma list like the template's, on top of the template's own tags. Blank
  // for most gear. Parsed once into rolledMap; combat reads both (wearsTrait).
  rolledTraits?: string;
  rolledMap?: Map<string, number>;
}

// Carried = on the body (container ''). What sits in the lockbox or the vault
// is loaded separately and never scatters.
export async function loadInventory(db: D1Database, pubkey: string): Promise<CarriedItem[]> {
  const res = await db
    .prepare("SELECT id, item_id, signed_serial, equipped, condition, journal_id, lore_id, acquired_at, rolled_traits FROM player_items WHERE pubkey = ? AND container = '' ORDER BY acquired_at")
    .bind(pubkey)
    .all<{ id: string; item_id: string; signed_serial: number | null; equipped: number; condition: number; journal_id: string; lore_id: string; acquired_at: number; rolled_traits: string }>();
  return (res.results ?? []).map((r) => ({ rowId: r.id, itemId: r.item_id, serial: r.signed_serial, equipped: !!r.equipped, condition: r.condition ?? 100, journalId: r.journal_id || undefined, loreId: r.lore_id || undefined, acquiredAt: r.acquired_at, rolledTraits: r.rolled_traits || undefined, rolledMap: parseTraits(r.rolled_traits) }));
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
    .prepare("SELECT id, item_id, signed_serial, condition, journal_id, lore_id, acquired_at, rolled_traits FROM player_items WHERE pubkey = ? AND container = ? ORDER BY acquired_at")
    .bind(pubkey, container)
    .all<{ id: string; item_id: string; signed_serial: number | null; condition: number; journal_id: string; lore_id: string; acquired_at: number; rolled_traits: string }>();
  return (res.results ?? []).map((r) => ({ rowId: r.id, itemId: r.item_id, serial: r.signed_serial, equipped: false, condition: r.condition ?? 100, journalId: r.journal_id || undefined, loreId: r.lore_id || undefined, acquiredAt: r.acquired_at, rolledTraits: r.rolled_traits || undefined, rolledMap: parseTraits(r.rolled_traits) }));
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

// THE RECKONING (mig 101): a wanderer's opt-in leaderboard snapshot, written to
// their own row when they run `publish score`. Read by both the in-game board
// and the Gamestr broadcast — same opted-in numbers, one source of truth.
export async function recordLeaderboard(db: D1Database, pubkey: string, legend: number, trophies: number): Promise<void> {
  await db
    .prepare("UPDATE players SET lb_legend = ?, lb_trophies = ?, lb_published_at = ? WHERE pubkey = ?")
    .bind(Math.max(0, Math.round(legend)), Math.max(0, Math.round(trophies)), nowSec(), pubkey)
    .run();
}

export interface LbEntry {
  pubkey: string;
  name: string;
  score: number;
}

// The top N on a board — opted-in wanderers only, best first. `board` is a fixed
// whitelist (never user input), so the column name is safe to interpolate.
export async function loadLeaderboard(db: D1Database, board: "legend" | "trophies", limit: number): Promise<LbEntry[]> {
  const col = board === "trophies" ? "lb_trophies" : "lb_legend";
  const res = await db
    .prepare(`SELECT pubkey, name, ${col} AS score FROM players WHERE lb_published_at IS NOT NULL AND ${col} > 0 ORDER BY ${col} DESC, lb_published_at ASC LIMIT ?`)
    .bind(limit)
    .all<LbEntry>();
  return res.results ?? [];
}

// A wanderer's own rank on a board (1-based), or null if they've not entered it.
export async function leaderboardRank(db: D1Database, pubkey: string, board: "legend" | "trophies"): Promise<{ rank: number; score: number } | null> {
  const col = board === "trophies" ? "lb_trophies" : "lb_legend";
  const me = await db
    .prepare(`SELECT ${col} AS score, lb_published_at AS pub FROM players WHERE pubkey = ?`)
    .bind(pubkey)
    .first<{ score: number; pub: number | null }>();
  if (!me || me.pub === null || me.score <= 0) return null;
  const ahead = await db
    .prepare(`SELECT COUNT(*) AS n FROM players WHERE lb_published_at IS NOT NULL AND ${col} > ?`)
    .bind(me.score)
    .first<{ n: number }>();
  return { rank: (ahead?.n ?? 0) + 1, score: me.score };
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
  // A heart lifted off the floor keeps the hour it was CUT, not the hour it was
  // found — otherwise dropping a spent heart and picking it up again would wash
  // it clean, and the ten-minute window would mean nothing.
  acquiredAt = nowSec(),
  // What this copy rolled at mint (099). Blank for keeper stock and anything
  // already-owned; a fresh loot drop fills it. Set at insert so the row is
  // whole in one write, like condition.
  rolledTraits = "",
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO player_items (id, pubkey, item_id, acquired_at, event_id, condition, rolled_traits) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(id, pubkey, itemId, acquiredAt, eventId, condition, rolledTraits)
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

// ---- the surveyor's ink: rooms charted onto one particular copy (097) ----
// Keyed by the same instanced identity a journal rides (journal_id on the pack
// row), so the drop/steal/death plumbing carries the ink with the paper.

export async function mapInkLoad(db: D1Database, mapId: string): Promise<string[]> {
  const res = await db
    .prepare("SELECT room_id FROM map_ink WHERE map_id = ?")
    .bind(mapId)
    .all<{ room_id: string }>();
  return (res.results ?? []).map((r) => r.room_id);
}

export async function mapInkAdd(db: D1Database, mapId: string, roomId: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO map_ink (map_id, room_id) VALUES (?, ?)")
    .bind(mapId, roomId)
    .run();
}

// ---- the engraving: gear that remembers (077) ----
// The deeds ledger keys on lore_id — the gate's mark, cut at first sealing,
// enduring past every cracked serial and every floor it lies on.

export interface GearDeeds {
  kills: number;
  descents: number;
  owners: number;
  deaths: number;
}

export async function setItemLoreId(db: D1Database, rowId: string, loreId: string): Promise<void> {
  await db.prepare("UPDATE player_items SET lore_id = ? WHERE id = ?").bind(loreId, rowId).run();
}

export async function deedsCreate(db: D1Database, loreId: string, itemId: string, pubkey: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO gear_deeds (lore_id, item_id, owners, last_owner, engraved_at) VALUES (?, ?, 1, ?, ?)")
    .bind(loreId, itemId, pubkey, nowSec())
    .run();
}

export async function deedsLoad(db: D1Database, loreId: string): Promise<GearDeeds | null> {
  const row = await db
    .prepare("SELECT kills, descents, owners, deaths FROM gear_deeds WHERE lore_id = ?")
    .bind(loreId)
    .first<GearDeeds>();
  return row ?? null;
}

// One deed, one notch. The columns are closed-set so this stays injection-proof.
export async function deedsBump(db: D1Database, loreId: string, deed: "kills" | "descents" | "deaths"): Promise<void> {
  await db.prepare(`UPDATE gear_deeds SET ${deed} = ${deed} + 1 WHERE lore_id = ?`).bind(loreId).run();
}

// A sealing hand: if it isn't the hand the ledger last knew, the chain grows.
export async function deedsOwner(db: D1Database, loreId: string, pubkey: string): Promise<void> {
  await db
    .prepare("UPDATE gear_deeds SET owners = owners + 1, last_owner = ? WHERE lore_id = ? AND last_owner != ?")
    .bind(pubkey, loreId, pubkey)
    .run();
}

// When a pack row was acquired (epoch SECONDS). Used to tell whether a perishable
// thing (the corpse-key heart) is still fresh enough to be worth anything.
export async function itemAcquiredAt(db: D1Database, rowId: string): Promise<number | null> {
  const row = await db.prepare("SELECT acquired_at FROM player_items WHERE id = ?").bind(rowId).first<{ acquired_at: number }>();
  return row ? row.acquired_at : null;
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
