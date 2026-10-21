-- 320: THE WOOD'S OWN BEARS (rome, 2026-10-21). Three brown bears for the five
-- caves of mig 319. The baited bear on the road is a thing people did, one
-- fairground bear with a bearward's story, so more of IT would break that
-- story; these are the animal itself, which was always here. Its numbers sit
-- just under the baited bear's: healthier, and less mean - the baited one keeps
-- the edge it was beaten into. It bluffs first, eats the wood's game and the
-- wood's floor both, and moves between its caves (zone-data CAVE_DWELLERS).
INSERT OR IGNORE INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('brown-bear', 'a brown bear',
  'It is a long way bigger than the doorway of anything you would build, and it moves through the trees without seeming to have to push. The coat is thick and brown and grizzled on the shoulders, and the hump over them is all muscle. It has stopped, and it has turned its head, and it is deciding about you with a patience that has never once been in a hurry.',
  5, 70, 8, 14, 5400, 0, 'bear-pelt', 0.5, 2, NULL, 0, 0.15, 3);

-- One to each of three caves to start, spread across the wood: the ridge (north-
-- west), the wall (north-east) and the boundary stone (south-west). Ids on every
-- row (mig 309). They will not stay where they were put.
INSERT OR IGNORE INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-bbear-1', 'brown-bear', 'the-ridge-cave'),
  ('spawn-bbear-2', 'brown-bear', 'the-wall-cave'),
  ('spawn-bbear-3', 'brown-bear', 'the-boundary-cave');
