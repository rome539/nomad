-- Knowledge becomes loot. Two new things to carry, buy, lose, and steal:
--
--   MAPS tell you the shape of the place. The surveyor's map is true and dear;
--   the crude map is cheap and half a lie — it'll show you a way that isn't
--   there. The dungeon itself never lies (walk an exit, you go where it really
--   leads); the cheap paper does.
--
--   The JOURNAL is a hunter's bestiary. Study a thing and kill a few and it
--   writes itself down — name, habits, then the hard numbers. The catch: the
--   book is a thing you carry, so it drops when you die, and whoever picks it
--   up inherits everything you learned. Its pages live keyed to the book, not
--   to you (journal_logs, below), so the knowledge travels with the paper.
--
-- Engine reads these by id (like scrap-iron): see MAP_ITEMS / JOURNAL_ITEM in
-- zone.ts. Pure data here but for those id hooks.

-- ---- the three new carryables ----
-- Not gear, not food — slot '' and edible 0. barter lets the keeper buy them
-- back (a looted journal is worth something even to someone who can't read it).
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, barter) VALUES
('surveyor-map',
 'a surveyor''s map',
 'A real chart of the under-halls, inked by some patient hand that walked every corridor and lived to draw it. Every room, every stair, set down true. Worth more than most of what you''ll kill for it.',
 'rare', 20),
('crude-map',
 'a crude map',
 'A smeared scrap of a map, copied by someone who half-remembered the way and guessed the rest. Some of it is right. Some of it will walk you into the dark by a door that was never there.',
 'common', 1),
('hunters-journal',
 'a hunter''s journal',
 'A water-stained field journal, its pages ruled for a careful hand: a column for the thing, a column for how it moves, a column for how it dies. Most of it is blank. What isn''t was bought in blood.',
 'uncommon', 5);

-- ---- the bestiary itself: keyed to the BOOK, so it's stolen with the book ----
-- One row per (journal, creature). `studied` is a flag set by the study action;
-- `kills` counts. Detail tier is read from the pair (see journalTier in zone.ts):
--   studied only            -> habits, no numbers
--   killed                  -> a rough combat read
--   studied AND kills >= 3  -> the full account
CREATE TABLE IF NOT EXISTS journal_logs (
  journal_id  TEXT NOT NULL,   -- the book's stable id (survives drop/steal)
  template_id TEXT NOT NULL,   -- mob_templates.id
  kills       INTEGER NOT NULL DEFAULT 0,
  studied     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (journal_id, template_id)
);

-- A carried journal remembers which book it is, so its pages find it again
-- after it's dropped and picked up by someone else. Empty for everything else.
ALTER TABLE player_items ADD COLUMN journal_id TEXT NOT NULL DEFAULT '';

-- ---- the keeper deals in knowledge: the true map dear, the rest fair ----
INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
('surveyor-map',    40),
('crude-map',        3),
('hunters-journal',  8);

-- ---- crude maps also turn up in the dark: off the dead who once carried them ----
-- The map-sellers of the deep are all dead now; their bad copies still circulate.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
('cutpurse',   'crude-map', 0.06),
('cutthroat',  'crude-map', 0.08),
('skeleton',   'crude-map', 0.03),
('warden',     'crude-map', 0.04);

-- ---- and a real surveyor's map is a genuine cache prize, rarely ----
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-bone',  'surveyor-map', 0.10),
('box-crack', 'surveyor-map', 0.10),
('box-deep',  'surveyor-map', 0.12);
