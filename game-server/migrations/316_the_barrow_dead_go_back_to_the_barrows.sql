-- 316: THE BARROW-DEAD GO BACK TO THE BARROWS, AND THE DEEP DROWNS FEWER
-- (rome, 2026-10-20). The census read the barrow-wight and the drowned thing
-- top of the world, and every one of them was in the deep - half of all that
-- lives down there was one of these two.
--
-- The wight's own words are "the old dead out of the barrows, and the barrows
-- are older than the fortress": so six of the eighteen go back to the world's
-- cairns and graves, on mid-road ground and none by the start. Ids kept, so
-- no live creature's spawn id shifts (mig 309); the six already standing walk
-- out with their dens (zone-data DEN_MOVES), they do not wait to die first.
UPDATE mob_spawns SET room_id = 'the-drovers-cairn'   WHERE id = 'wight-5';                  -- from drowned-barracks
UPDATE mob_spawns SET room_id = 'the-roadside-graves' WHERE id = 'wight-4';                  -- from deep-ossuary
UPDATE mob_spawns SET room_id = 'the-cairn-shoulder'  WHERE id = 'wight-10';                 -- from bone-reliquary
UPDATE mob_spawns SET room_id = 'the-boundary-cairn'  WHERE id = 'deep2-twice-drain-run';    -- from the-drain-run
UPDATE mob_spawns SET room_id = 'the-graves'          WHERE id = 'deep2-twice-long-pews';    -- from the-long-pews
UPDATE mob_spawns SET room_id = 'the-cairn-line'      WHERE id = 'deep2-twice-feeling-wall'; -- from the-feeling-wall

-- The drowned thing is the deep's own garrison, drowned together, and the
-- surface has its own drowned already (the miller, the mire-walker, the
-- ferryman), so five are cut rather than moved: fifteen to ten, each taken
-- from beside another, so every flooded stretch still holds one. The live
-- ones go with their rows (ai.reconcilePopulation trims to the table).
DELETE FROM mob_spawns WHERE id IN ('drowned-2', 'drowned-6', 'drowned-4',
  'deep2-drowned-sunk-bell', 'deep2-drowned-brine-cellar');
