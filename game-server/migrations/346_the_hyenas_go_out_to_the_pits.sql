-- THE HYENAS GO OUT TO THE PITS (rome, 2026-10-29): mostly outside the halls,
-- and still met in them now and then. Four of the six grave-hyenas that started
-- inside the fortress now start in the pits (mig 345). The two in the Hyena Den
-- stay where they are, and every one of them still wanders, so the halls keep
-- seeing them.
--
-- The rows keep their ids (mig 309: an id is what ties a live creature to its
-- row), and zone-data DEN_MOVES carries each live hyena along on load.
UPDATE mob_spawns SET room_id = 'the-den-mouths'      WHERE id = 'hyena-1';  -- was the catacomb
UPDATE mob_spawns SET room_id = 'the-last-pit'        WHERE id = 'hyena-2';  -- was the kennels
UPDATE mob_spawns SET room_id = 'the-laughing-ground' WHERE id = 'hyena-3';  -- was the kennels
UPDATE mob_spawns SET room_id = 'the-bone-heaps'      WHERE id = 'hyena-4';  -- was the larder
