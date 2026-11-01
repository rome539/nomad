-- THE PIT HYENAS SPREAD OUT (rome, 2026-10-31). The four grave-hyenas of the
-- pits (mig 346) had their homes bunched in the west, so most of the pits never
-- saw one. Two of them move: every room of the pits is now within three steps
-- of a hyena's home, and no two homes are nearer than four. Rows keep their ids
-- (mig 309); zone-data DEN_MOVES carries each live hyena to its new home on load.
UPDATE mob_spawns SET room_id = 'the-bone-fan'       WHERE id = 'hyena-1';  -- was the Den Mouths
UPDATE mob_spawns SET room_id = 'the-burning-ground' WHERE id = 'hyena-3';  -- was the Laughing Ground
