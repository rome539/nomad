-- THE ANIMAL PATHS, REMEMBERED (rome, 2026-10-12). A wanderer who has watched an
-- animal take one of the hidden ways (mig 295, key_item 'beast-path') knows it
-- for good. One row per wanderer per path; the path is "roomId:dir", the same
-- shape as a door key everywhere else in the engine.
CREATE TABLE IF NOT EXISTS known_paths (
  pubkey TEXT NOT NULL,
  path   TEXT NOT NULL,
  at     INTEGER NOT NULL,   -- ms epoch it was learned
  PRIMARY KEY (pubkey, path)
);
CREATE INDEX IF NOT EXISTS idx_known_paths_pubkey ON known_paths (pubkey);
