-- The engraving (rome, 2026-07-13): gear remembers. STORIED GEAR — the
-- identity feature. In Tarkov every sword is fungible; in a classic MUD every
-- sword is static. NOMAD stands where neither can reach: one persistent
-- world, attested loot, death-drops — so an item can carry a HISTORY the
-- dungeon itself vouches for. The inversion: you don't lose your gear when
-- you die — your gear loses YOU, and carries you as a scar.
--
-- Architecture: the mint SERIAL is title, and title cracks at every transfer
-- (drop, death, trade — rome's 2026-07-05 law, unchanged). So the biography
-- can't ride the serial. Instead, the FIRST sealing ENGRAVES the piece — the
-- gate's assay mark, cut into the steel — and the ledger keys on that
-- engraving (lore_id), which endures through every hand and every floor
-- (groundLore, the wear-survives-drop pattern). Serials come and go with
-- claims; the mark is forever. Only GEAR is engraved — steel takes a mark,
-- a smoked haunch doesn't.
--
-- What writes the ledger: a kill with it in hand; a walk down past the black
-- door carrying it; a NEW owner sealing it (the chain of hands); an owner
-- dying while it's carried (the scar). Surfaced in `look`, attestable via
-- the loot cert someday. Story is the one currency that can't be farmed,
-- duped, or inflated.

ALTER TABLE player_items ADD COLUMN lore_id TEXT;

CREATE TABLE IF NOT EXISTS gear_deeds (
  lore_id     TEXT PRIMARY KEY,
  item_id     TEXT NOT NULL,
  kills       INTEGER NOT NULL DEFAULT 0,
  descents    INTEGER NOT NULL DEFAULT 0,
  owners      INTEGER NOT NULL DEFAULT 1,
  deaths      INTEGER NOT NULL DEFAULT 0,
  last_owner  TEXT,
  engraved_at INTEGER NOT NULL
);
