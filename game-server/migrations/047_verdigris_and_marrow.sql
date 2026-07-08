-- The deep gets two new species (rome, 2026-07-08). The audit found the deep
-- DENSE enough (29 spawns / 32 rooms, tier-graded) but NARROW: four base
-- species, three behavior families, and 045/046 just sold counters to every
-- one of its threats (wardhide vs bleed, slick vs seize, padded vs stun,
-- pavise vs everything). Two additions, each hunting a build the deep can't
-- currently touch. (The anti-turtle "undertow-grasper" is ICEBOXED, not built.)
--
-- Also a tuning fix from the same pass: the twice-dead stunned at 0.25 — a
-- rare warden-maul's rate on a 9-spawn common; in a two-revenant dogpile you
-- were rung every other round. Folded to 0.12 (the hound's 0.15 stays the
-- scarier skull-ringer).

UPDATE mob_templates SET stun = 0.12 WHERE id = 'twice-dead';

-- ---- the verdigris-thing: the extraction monster ----
-- Its blows eat your GEAR's condition, not your blood (soft — CORRODE_WEAR in
-- zone-data.ts, sealed gear resists at its 0.4 wear-mult, so the seal finally
-- matters mid-fight). The naked player shrugs; the full-epic player is losing
-- equity every beat. Flesh threat kept mild on purpose: the fight is a bill,
-- not a wall. Lives in the wet rooms of the Drowned Reach.
INSERT OR REPLACE INTO mob_templates
(id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, bleed) VALUES
('verdigris-thing', 'a verdigris-thing',
 'Something man-shaped under a century of green crust, moving with the patience of corrosion itself. Where it touches, metal blooms and flakes; it does not seem interested in your blood at all. It is interested in what you are wearing.',
 3, 30, 2, 4, 900, 0, 'verdigris-scale', 0.50, 1, 0),

-- ---- the marrow-cantor: the Demesne finally has ears ----
-- LISTENERS + HOLLOW (sets in zone-data.ts): it wakes to your movement, not
-- your noise-of-fighting — walk the bone rooms quiet or it rises singing. And
-- it is old dry bone: every blow you land grinds your edge 8x (WEAPON_WEAR_
-- HOLLOW), so fast blades finally pay the bone-tax at the bottom, where the
-- loot is best. Quiet gear (felt soles, the shroud, the hood) now earns its
-- keep in the King's Demesne, not just the shallows.
('marrow-cantor', 'a marrow-cantor',
 'A tall frame of fused bone in the rags of a cantor''s robe, its jaw wired open mid-note. It does not see. It has never needed to. The hollow of its chest swells at every footfall, and what it hears, it sings toward — and the choir was never meant to sing alone.',
 4, 38, 4, 7, 1200, 0, 'knucklebone-rosary', 0.50, 2, 0);

-- Their trophies (the journal learns them like any creature; the keeper pays
-- modestly — common-tier proof, uncommon-tier proof).
INSERT OR REPLACE INTO item_templates
(id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed) VALUES
('verdigris-scale', 'a verdigris scale', 'A flake of green crust the size of a palm, still faintly warm. Metal remembers what touched it.', 'common', 0, '', 0, 1, 1, 0, 0.00, 0, 0),
('knucklebone-rosary', 'a knucklebone rosary', 'A cantor''s rosary strung from knucklebones, each bead worn smooth by a thumb that stopped being a thumb a long time ago.', 'uncommon', 0, '', 0, 1, 1, 0, 0.00, 0, 0);
UPDATE item_templates SET barter = 2 WHERE id = 'verdigris-scale';
UPDATE item_templates SET barter = 3 WHERE id = 'knucklebone-rosary';

-- ---- placement: verdigris in the wet, cantors on the bone roads ----
-- Deep species 4 -> 6; spawns 29 -> 37 (density ~1.16/room, still lean).
-- NOTE: a warm world never re-reads mob_spawns — run POST /admin/reseed after
-- shipping this, or the new species exist only in theory.
INSERT OR REPLACE INTO mob_spawns (template_id, room_id) VALUES
('verdigris-thing', 'black-canal'),
('verdigris-thing', 'leech-pools'),
('verdigris-thing', 'the-sump'),
('verdigris-thing', 'the-undertow'),
('marrow-cantor', 'bone-processional'),
('marrow-cantor', 'the-marrow-road'),
('marrow-cantor', 'kings-oratory'),
('marrow-cantor', 'bone-reliquary');
