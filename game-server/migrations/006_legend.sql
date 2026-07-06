-- The braggart's ledger: tallies the sheet can carry beyond the walls.
-- Counted always, published never — until the wanderer says 'publish sheet'.
-- pvp_kills counts too ("the world doesn't snitch" binds the world's
-- narration, not your own mouth): the count names no victim, and only its
-- owner can choose to surface it. Increments arrive with PvP (phase 7).
ALTER TABLE players ADD COLUMN kills INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN deaths INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN boss_kills INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN pvp_kills INTEGER NOT NULL DEFAULT 0;
