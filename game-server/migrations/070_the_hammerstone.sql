-- 070: the hammerstone — the rare rock (rome, 2026-07-11: "we should have a
-- rare rock where its stronger"; tuned down same day: dmg 3, stun 0.25).
-- The loose rock's grim elder: dense past its size, it throws harder, can
-- ring a skull, NEVER shatters (THROW_TOUGH in code) — you walk over and
-- pick your argument back up — and it beats strongbox latches open 4 times
-- in 5 (the plain rock manages 1 in 10, and dies trying).
-- No fixed spawns (rome: "people just run to the same spots"): the world
-- MINTS one every 10-14h into a random room from HAMMERSTONE_HAUNTS
-- (zone-data) — the corpse-key pattern. You find it where stones turn up;
-- you can't farm a spot.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('hammerstone', 'a hammerstone',
   'River-smoothed and dense past its size, dark as the deep''s water. The old dead ground stones like this into skulls before anyone thought to sharpen iron. It sits in the palm like an argument already won.',
   'rare', 0, 0, 0, 3, '', 0, 1, 1, 1, 0.25, 0, 0, 3, 0);

DELETE FROM ground_spawns WHERE item_id = 'hammerstone';
