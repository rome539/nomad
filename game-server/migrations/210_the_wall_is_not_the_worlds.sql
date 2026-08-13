-- 210 the wall is not the world's (rome, 2026-08-12: make sure the gatehouse
-- map never wipes for a player).
--
-- It has wiped twice, for two different reasons, and both are the same mistake
-- written twice: a PLAYER'S RECORD was being kept in the WORLD'S state.
--
--   1. When the wall stopped being one communal list and became per-pubkey, the
--      old list had no author on it, so the load path dropped it on purpose.
--      Everyone's charts went at once, by design, in a comment that called it
--      "they get re-walked in a day."
--   2. It rides the sim blob (b:meta in the Durable Object's own SQLite), which
--      is the world's scratch state: mob positions, floor litter, door timers.
--      Anything that resets, rolls back, or fails to write that blob takes
--      every chart in the game with it — and reseed() cleared the map outright,
--      so one admin call would have wiped every wanderer's walking.
--
-- Player things live in D1. A character, their pack, their vault, their sealed
-- loot and their tallies are all here, and the reseed path explicitly does not
-- touch this database — that is the whole line between "the world" and "the
-- people in it." The wall chart is a player thing. It belongs here.
--
-- APPEND-ONLY IS THE ACTUAL GUARANTEE. Not "we are more careful now" — one row
-- per hall, written INSERT OR IGNORE the moment it is carved, and no code path
-- anywhere that deletes one. A blob can be stale, half-written or rolled back
-- and take its whole contents with it. A row cannot: the worst a bad write can
-- do to this table is fail to ADD, which costs a re-carve, not a chart.
--
-- The in-memory map stays as a read cache so every sync reader is unchanged;
-- D1 is the truth it is filled from, and existing marks are carried across on
-- first load so nobody loses what they have now.
CREATE TABLE IF NOT EXISTS wall_marks (
  pubkey  TEXT NOT NULL,
  room_id TEXT NOT NULL,
  at      INTEGER NOT NULL,   -- ms epoch it was carved; the wall keeps its own history
  PRIMARY KEY (pubkey, room_id)
);
CREATE INDEX IF NOT EXISTS idx_wall_marks_pubkey ON wall_marks (pubkey);
