-- 305: TWO MORE RATS BELOW (rome, 2026-10-18).
--
-- The lower deep's four crawler dens (the-eel-run, the-cold-pantry,
-- the-wormcast-pit, the-silt-fall) sat four to seven rooms from the nearest rat,
-- so a hungry crawler there had to walk up into the old deep to eat. One rat run
-- in the undertow and one at the chute's foot bring every one of them within
-- three rooms of food. Placed by a walk of the room graph, not by eye.
INSERT OR IGNORE INTO mob_spawns (id, template_id, room_id) VALUES
  ('rat-deep-5', 'rat', 'the-undertow'),
  ('rat-deep-6', 'rat', 'the-chute-foot');
