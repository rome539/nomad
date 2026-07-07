-- The albino rat — a lucky find, and a nasty one. Pale as a grub, pink-eyed and
-- blind-white, carried like an omen by the people who trade down here — but it is
-- NOT a rat in the ways that matter. Bigger, stronger, wrong; it stands its
-- ground where a rat would run and mauls what a rat could only nip. Finding one
-- is a fight worth the risk: they nest on a dropped smoke, and a pale pelt barters.
--
-- Built as a BLOODLINE VARIANT of the rat (the same machinery as the fleet-rat
-- and the brood-rat), at a lower chance than either — so it surfaces VERY RARELY
-- wherever rats already run: the first floor above all, where the rats are
-- thickest. To give it a home in the deep as well, a couple of rat-dens go into
-- the dark below (the carrion and the wormholes, where vermin would gather), so
-- the pale one can turn up down there too — rarer still, and worth more when it does.

-- ---- the pale pelt: a small trophy, barter feedstock with a lucky sheen ----
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('pale-pelt', 'a pale pelt', 'The hide of an albino rat, white going to grey, oddly fine to the touch. The kind of small lucky thing that changes hands for more than it weighs.', 'rare');

-- ---- the creature: a rat's shape, a far worse thing's strength ----
-- Fairly strong (rome) — L3, on the order of a grave-hyena, with a festering
-- bite (bleed). The rare rat that mauls the careless who took it for vermin.
INSERT OR REPLACE INTO mob_templates
(id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, bleed) VALUES
('albino-rat', 'an albino rat',
 'A rat grown to the colour of something kept from the light its whole life — pale to the point of translucence, its eyes two beads of wet pink, whiskers ghosting the dark. It is bigger than it has any right to be, and it regards you without fear, and there is something in its stillness that makes the hair stand on your arms.',
 3, 42, 5, 8, 120, 0, 'pale-pelt', 0.80, 1, 2);

-- ---- very rare cousin of the common rat (rarer than fleet or brood) ----
INSERT OR REPLACE INTO mob_variants (base_id, variant_id, chance) VALUES
('rat', 'albino-rat', 0.03);

-- ---- the lucky smoke: the pale rat has a habit of dying on a dry cigarette ----
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
('albino-rat', 'dry-cigarettes', 0.50);

-- ---- rat-dens in the deep, so the pale one has dark to turn up in ----
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
('rat-deep-1', 'rat', 'worm-cloister'),
('rat-deep-2', 'rat', 'carrion-gallery');
