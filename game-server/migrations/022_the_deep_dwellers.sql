-- Populate the deep. Three new dwellers, built SOFT (below the dire-hyena in raw
-- numbers) — the danger is in their tricks, not their stats, and every trick has
-- an answer. The King and his reliquary move to the bottom, so the epic hoard is
-- a true descent: down the flooded crypts, past the dwellers, to the throne.
--
-- Behaviours live in zone.ts (DROWNERS seize you in the water; LURKERS wait
-- unseen and drop on the careless; REVENANTS rise once before they truly fall).

-- ---- deep trophies (barter feedstock; the pearl is a deep prize) ----
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('grave-pearl', 'a grave-pearl', 'A pearl the colour of a drowned moon, prised from something that had no business holding it. Cold, heavy, and worth more than it should be.', 'rare'),
('pale-claw',   'a pale claw',   'A long, translucent claw, still faintly warm. You try not to think about what it was reaching for.', 'common');

-- ---- the three deep-dwellers (soft stats; the mechanics carry the threat) ----
INSERT OR REPLACE INTO mob_templates
(id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop) VALUES
('the-drowned', 'a drowned thing',
 'Bloated and patient, it stands hip-deep where the water is stillest and does not so much move as arrive. When it takes hold of you, it does not let go until one of you is finished.',
 3, 30, 3, 6, 90, 0, 'grave-pearl', 0.4, 1, 'iron-bound-shield', 0.06),
('pale-crawler', 'a pale crawler',
 'Blind, boneless, and the colour of things kept from the light. You will not see it in the dark of the deep — only feel it, once, before it is on you.',
 3, 22, 4, 7, 70, 0, 'pale-claw', 0.5, 0, 'fleshing-knife', 0.06),
('twice-dead', 'a barrow-wight',
 'One of the old dead who never learned to stay so. Put it down and it lies still a moment, gathering itself — and then, unhurried, it stands back up and comes on again.',
 3, 22, 3, 5, 90, 0, 'finger-bone', 0.5, 1, 'notched-greatsword', 0.05);

-- ---- move the King and his reliquary to the bottom of the deep ----
-- The throne is the destination now; the undercroft is just the mouth.
DELETE FROM mob_spawns WHERE template_id='forgotten-king';
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
('king', 'forgotten-king', 'sunken-throne');
-- The reliquary (the epic hoard) sits in the King's Hoard, behind the throne —
-- you beat him for the black key, then loot what he took to the grave.
UPDATE caches SET room_id='kings-hoard' WHERE id='reliquary';

-- A strongbox on the way down, so the descent pays before the boss (rare kit,
-- opened with the strongbox keys the deep-dwellers sometimes carry).
INSERT OR REPLACE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
('box-deep', 'root-vault', 'a root-bound coffer', 'A strongbox swallowed by the roots, half-crushed and still shut. The wood has grown around the lock like it means to keep it.', 'strongbox-key', 1200);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-deep', 'warden-tower-shield', 0.4),
('box-deep', 'boiled-cuirass',     0.4),
('box-deep', 'headtaker-axe',      0.35),
('box-deep', 'warden-maul',        0.35);

-- ---- deep spawns: dwellers in their proper dark ----
-- The Drowned hold the flooded SIDE rooms only (never the spine you must cross —
-- their grip stops you fleeing, so they'd wall the road; in a branch, they're a
-- risk you choose to take). Crawlers wait unseen in the dark dead-ends and stairs.
-- Barrow-wights keep the crypts and the road down to the throne.
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
('drowned-1', 'the-drowned', 'black-canal'),
('drowned-2', 'the-drowned', 'the-weir'),
('drowned-3', 'the-drowned', 'weeping-cells'),
('drowned-4', 'the-drowned', 'sunken-gallery'),
('crawler-1', 'pale-crawler', 'root-vault'),
('crawler-2', 'pale-crawler', 'deep-ossuary'),
('crawler-3', 'pale-crawler', 'silted-stair'),
('crawler-4', 'pale-crawler', 'bone-processional'),
('wight-1', 'twice-dead', 'the-descent'),
('wight-2', 'twice-dead', 'drowned-nave'),
('wight-3', 'twice-dead', 'black-threshold'),
('wight-4', 'twice-dead', 'deep-ossuary');

-- The deep-dwellers occasionally carry a strongbox key — so the deep can feed
-- its own coffer without a run all the way back to the surface elites.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
('the-drowned', 'strongbox-key', 0.05),
('twice-dead',  'strongbox-key', 0.04);
