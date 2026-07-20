-- THE RECKONING: the in-game leaderboards. A wanderer's standing is snapshotted
-- to their own row ONLY when they opt in with `publish score` — the same opt-in
-- law as the sheet (nothing about you reaches other eyes unless you ask).
-- lb_published_at NULL = never entered the boards; the leaderboard view and the
-- Gamestr broadcast both read this same opted-in snapshot.
ALTER TABLE players ADD COLUMN lb_legend INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN lb_trophies INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN lb_published_at INTEGER;

-- Keep the ORDER BY ... LIMIT fast as the roster grows (build for a full world).
CREATE INDEX IF NOT EXISTS idx_players_lb_legend ON players(lb_legend);
CREATE INDEX IF NOT EXISTS idx_players_lb_trophies ON players(lb_trophies);
