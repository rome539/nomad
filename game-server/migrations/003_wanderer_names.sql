-- Guests get wanderer names, not pubkey stubs. `named` = the player chose
-- their name (or a client adopted their Nostr profile name); auto-minted
-- names stay 0 so clients know they may be overruled.
ALTER TABLE players ADD COLUMN named INTEGER NOT NULL DEFAULT 0;

-- Anyone not wearing the default stub (first 8 chars of their own pubkey)
-- chose their name.
UPDATE players SET named = 1 WHERE name != SUBSTR(pubkey, 1, 8);
