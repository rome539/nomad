-- THE WORLD REMEMBERS (rome, 2026-11-02). What happens out there is written
-- down where it happened: every wanderer's death, every boss put down, a den
-- raised or given up or fallen in, a gatehouse boarded and opened again, the
-- fever settling and lifting. Each region keeps its own record at one place in
-- it (chronicle.ts RECORDS: the rolls, the rods, the cairn...), read with a
-- close look there; the keeper at every gate passes on the notable rows, and
-- forgets them as they age. Rows are never deleted: the record keeps them all
-- and shows the newest.
CREATE TABLE IF NOT EXISTS chronicle (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  at       INTEGER NOT NULL,
  region   TEXT NOT NULL,              -- the room's own region ('' the fortress)
  room_id  TEXT NOT NULL,
  kind     TEXT NOT NULL,              -- slain, died, den-raised, den-left, den-fell, boarded, opened, fever, fever-lifted
  who      TEXT NOT NULL DEFAULT '',   -- the wanderer it happened to, or by
  what     TEXT NOT NULL DEFAULT '',   -- the creature, the killer, the gatehouse
  notable  INTEGER NOT NULL DEFAULT 0  -- 1: news the keeper passes on
);
CREATE INDEX IF NOT EXISTS idx_chronicle_region ON chronicle (region, at);
CREATE INDEX IF NOT EXISTS idx_chronicle_notable ON chronicle (notable, at);
