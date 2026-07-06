-- Extraction: the gate seals claims. Loot is provisional until carried out
-- to the Broken Gate; sealed loot survives anything the dungeon does to you
-- (rome's rule, 2026-07-04: the dungeon's signature protects you from the
-- dungeon — not from people). The lockbox holds what the gate has sealed.

-- Which pack entries the gate has sealed, and which rest in the lockbox.
ALTER TABLE player_items ADD COLUMN signed_serial INTEGER; -- NULL = provisional
ALTER TABLE player_items ADD COLUMN vaulted INTEGER NOT NULL DEFAULT 0;

-- The mint ledger: one row per sealed claim, serial-numbered. The blinded
-- public counter (phase 6) exposes serial + minted_at only; pubkey stays
-- private. superseded_by is reserved for phase 7 serial transfer when a
-- player-kill carries someone else's sealed loot out the gate.
CREATE TABLE IF NOT EXISTS mints (
  serial        INTEGER PRIMARY KEY AUTOINCREMENT,
  loot_id       TEXT NOT NULL,             -- player_items.id at mint time
  item_id       TEXT NOT NULL,
  rarity        TEXT NOT NULL,
  pubkey        TEXT NOT NULL,
  minted_at     INTEGER NOT NULL,          -- unix seconds
  event_id      TEXT,                      -- dungeon-signed event, once the key exists
  voided_at     INTEGER,                   -- claim released (dropped, eaten)
  superseded_by INTEGER
);

-- Steel is carried, never granted: weapons add their bite to bare hands.
ALTER TABLE item_templates ADD COLUMN dmg INTEGER NOT NULL DEFAULT 0;

INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg) VALUES
('rusted-sword', 'a rusted sword',
 'Orange scale flakes from the edge, but the weight is honest. It will bite harder than your fists.', 'common', 0, 0, 0, 2),
('graveblade', 'a graveblade',
 'A guard''s sword off the grave-shelves, oiled by no one and sharp anyway. The dark has kept it keen.', 'uncommon', 0, 0, 0, 4);

-- Deeper = better: the sword is a short detour, the graveblade sleeps with
-- the sleepers (a skeleton and the warden stand between you and it).
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
('rusted-sword', 'armory', 0),
('graveblade', 'barracks', 0);

-- The gate becomes a place: the moment of relief, the signing, the box.
UPDATE rooms SET description = description ||
 ' Set into the gatehouse wall is a row of iron lockboxes, each keyed to no key but its owner''s.'
WHERE id = 'gate';
