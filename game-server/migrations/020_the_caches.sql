-- Phase C — locked caches. The scarcest gear (the epics, the rare shields and
-- helms) doesn't drop from anything. It waits behind a lock, in the deep and in
-- the two hideaway cracks, and the keys are rare finds off elites and the King.
-- Find a key, spend it on a strongbox, take what's inside; the box re-locks and
-- refills on a slow clock, so it's a loop, not a one-time gift.
--
-- The boss finally means more than a trophy: he's the reliable source of the
-- reliquary key — the only fast way to the epic hoard in the undercroft.

-- ---- the keys (rare finds; consumed on use) ----
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('strongbox-key', 'a notched iron key', 'A stubby iron key, teeth worn round. It fits the strongboxes the dead hid in the walls.', 'uncommon'),
('reliquary-key', 'a black key',        'A long key of blackened iron, cold past all reason. Whatever it opens was meant to stay shut.', 'rare');

-- ---- cache fixtures: a locked box in a room, its key, and how fast it refills ----
CREATE TABLE IF NOT EXISTS caches (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL,
  name        TEXT NOT NULL,               -- with article: 'an iron strongbox'
  description TEXT NOT NULL,
  key_item    TEXT NOT NULL,               -- item_templates.id needed to open it
  refill_secs INTEGER NOT NULL DEFAULT 900 -- how long it stays sprung/empty after a looting
);

-- ---- what a cache can hold: each rolled independently on open ----
CREATE TABLE IF NOT EXISTS cache_loot (
  cache_id TEXT NOT NULL,
  item_id  TEXT NOT NULL,
  chance   REAL NOT NULL,
  PRIMARY KEY (cache_id, item_id)
);

-- ---- which creatures drop which keys, and how rarely ----
CREATE TABLE IF NOT EXISTS mob_keys (
  template_id TEXT NOT NULL,
  key_item    TEXT NOT NULL,
  drop_chance REAL NOT NULL,
  PRIMARY KEY (template_id, key_item)
);

-- Two strongboxes in the hideaway cracks (rare gear), one reliquary in the deep
-- undercroft (the epic hoard). Strongboxes refill in 15 min, the reliquary 30.
INSERT OR REPLACE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
('box-bone',   'bone-nook',    'an iron strongbox',  'A banded strongbox wedged deep in the bone-gap, its lock crusted but sound. Something shifts inside when you breathe near it.', 'strongbox-key', 900),
('box-crack',  'hollow-crack', 'a bricked-up niche', 'A niche behind loose brick, mortared shut and then forced and re-shut by hands long gone. A keyhole gleams in the dark.',      'strongbox-key', 900),
('reliquary',  'undercroft',   'a sealed reliquary', 'A squat iron reliquary on a plinth of black stone, banded and riveted and utterly still. The cold off it aches your teeth.',    'reliquary-key', 1800);

-- Strongbox 1 (bone-nook): rare kit.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-bone', 'boiled-cuirass',     0.5),
('box-bone', 'iron-bound-shield',  0.5),
('box-bone', 'warden-greathelm',   0.35),
('box-bone', 'notched-greatsword', 0.35),
-- Strongbox 2 (hollow-crack): more rare kit.
('box-crack', 'headtaker-axe',  0.5),
('box-crack', 'fleshing-knife', 0.5),
('box-crack', 'warden-maul',    0.4),
('box-crack', 'hyena-mantle',   0.35),
-- The reliquary (undercroft): the epic hoard.
('reliquary', 'deadplate-harness',   0.4),
('reliquary', 'flanged-mace',        0.4),
('reliquary', 'reaver-glaive',       0.35),
('reliquary', 'widow-maker',         0.35),
('reliquary', 'warden-tower-shield', 0.45);

-- Keys off the dead: strongbox keys from the elites, the black key mostly from
-- the King (and once in a great while off a warden).
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
('warden',         'strongbox-key', 0.10),
('dire-hyena',     'strongbox-key', 0.08),
('cutpurse',       'strongbox-key', 0.06),
('forgotten-king', 'reliquary-key', 0.60),
('warden',         'reliquary-key', 0.03);
