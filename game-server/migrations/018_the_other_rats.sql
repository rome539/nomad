-- Two rats that aren't fights, they're situations (behavior lives in zone.ts:
-- RUNNERS and BROODERS). This is only their flesh.
--
-- The fleet-rat never stands and fights — it bolts the instant it can. You
-- already swing first (the living get initiative), so your blow lands as it
-- breaks for the door; then it's gone and you give chase, room to room, landing
-- one hit each time you corner it. Dawdle and it skitters off before you strike.
--
-- The brood-rat is the opposite: nest-bound, won't flee, won't wander — and
-- while she lives and is left alone she keeps BIRTHING scabby rats into her room
-- (up to a few at a time). Clear the room and ignore her and it fills right back
-- up. Engaging her stops the births; killing her stops them for good. A living
-- source of the infestation, not a stat block.

INSERT OR REPLACE INTO mob_templates
(id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop) VALUES
('fleet-rat', 'a scary rat',
 'Lean and wire-quick, all nerves and no nerve. It never once looks like it means to fight you — only to be elsewhere, immediately, and it is very good at elsewhere.',
 1, 6, 1, 1, 25, 0, 'rat-meat', 0.8, 0, NULL, 0),
('brood-rat', 'a swollen brood-rat',
 'Bloated near to bursting and slung low with young, she does not run and she does not chase. She holds her patch of dark and makes more of herself in it, patiently, for as long as she is left to.',
 2, 18, 1, 3, 75, 0, 'rat-meat', 0.6, 0, NULL, 0);

-- Fleet-rats haunt the open rooms where there's always another way out (the
-- hall's crossroads, the gallery's long run). Brood-mothers nest in the dank
-- dead-ends (the well shaft, the sodden library). Never a gate — the threshold.
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
('fleet-1', 'fleet-rat', 'hall'),
('fleet-2', 'fleet-rat', 'gallery'),
('brood-1', 'brood-rat', 'well'),
('brood-2', 'brood-rat', 'library');
