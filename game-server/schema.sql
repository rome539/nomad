-- NOMAD authority schema (D1 / SQLite).
-- Static world + durable player records. Hot state (who's where, mob HP,
-- ground items) lives in the zone Durable Object; this is truth at rest.
-- World content is seeded by migrations/001_world_the_door.sql.

CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,
  zone        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  is_entry    INTEGER NOT NULL DEFAULT 0   -- a gate: enter/extract/bank here; a zone may have several
);

CREATE TABLE IF NOT EXISTS exits (
  room_id  TEXT NOT NULL,
  dir      TEXT NOT NULL,                  -- north|south|east|west|up|down
  to_room  TEXT NOT NULL,
  key_item TEXT,                           -- item_templates.id required to pass
  PRIMARY KEY (room_id, dir)
);

CREATE TABLE IF NOT EXISTS mob_templates (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,              -- with article: 'a scabby rat'
  description  TEXT NOT NULL,
  level        INTEGER NOT NULL,
  max_hp       INTEGER NOT NULL,
  dmg_min      INTEGER NOT NULL,
  dmg_max      INTEGER NOT NULL,
  respawn_secs INTEGER NOT NULL,
  is_boss      INTEGER NOT NULL DEFAULT 0,
  loot_item    TEXT,                       -- item_templates.id
  loot_chance  REAL NOT NULL DEFAULT 0     -- 0..1
);

CREATE TABLE IF NOT EXISTS mob_spawns (
  id          TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  room_id     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS item_templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,               -- with article: 'a tarnished key'
  description TEXT NOT NULL,
  rarity      TEXT NOT NULL                -- common|uncommon|rare|epic|legendary
);

-- Items lying in the world at zone start. Seeded spawns regrow after pickup
-- so shared keys never dead-end the dungeon.
CREATE TABLE IF NOT EXISTS ground_spawns (
  item_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  PRIMARY KEY (item_id, room_id)   -- keeps re-run seeds idempotent
);

CREATE TABLE IF NOT EXISTS players (
  pubkey     TEXT PRIMARY KEY,             -- hex pubkey (from npub)
  name       TEXT NOT NULL,
  room_id    TEXT NOT NULL,
  hp         INTEGER NOT NULL,
  max_hp     INTEGER NOT NULL,
  created_at INTEGER NOT NULL,             -- unix seconds
  last_seen  INTEGER NOT NULL
);

-- Loot ledger. event_id is the dungeon-signed Nostr event when the game key
-- is configured (same authority pattern as castr catches).
CREATE TABLE IF NOT EXISTS player_items (
  id          TEXT PRIMARY KEY,            -- uuid per drop instance
  pubkey      TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  event_id    TEXT
);

CREATE INDEX IF NOT EXISTS idx_player_items_pubkey ON player_items(pubkey);
