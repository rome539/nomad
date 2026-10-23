-- WHAT A WANDERER HAS LEARNED THE KEEPER PAYS (rome, 2026-10-23). How many of
-- each kind of thing a player has sold him; at KEEPER_LEARN_SALES the barter
-- window shows that kind's price instead of its rough mark. Never shown itself.
CREATE TABLE IF NOT EXISTS keeper_known (
  pubkey  TEXT NOT NULL,
  item_id TEXT NOT NULL,
  sold    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pubkey, item_id)
);
