-- 317: RAVENS COME DOWN INTO THE WOOD (rome, 2026-10-20). The mountain held
-- thirty scarp ravens, one to every thirteen rooms, and a raven is a corvid:
-- strike one and every corvid within three rooms may come, and they scoop the
-- floor. Twelve come off the mountain, taken where two stood a step or two
-- apart, so every one left is four or more from the next and the named roosts
-- (the Raven Stone, the Gully Foot) keep theirs. Eight go to the wood - its
-- first corvids, on its tall trees and its banks, where a crag bird has height
-- or a face to work - and four are cut. Ids kept (mig 309); the eight standing
-- now fly down with their dens (zone-data DEN_MOVES).
UPDATE mob_spawns SET room_id = 'the-crows-oak'          WHERE id = 'spawn-scarp-raven@the-boulder-nose#516';
UPDATE mob_spawns SET room_id = 'the-old-boundary-stone' WHERE id = 'spawn-scarp-raven@the-grease-flat#527';
UPDATE mob_spawns SET room_id = 'the-crow-roost'         WHERE id = 'spawn-scarp-raven@the-ridge-walk#535';
UPDATE mob_spawns SET room_id = 'the-counterscarp'       WHERE id = 'spawn-scarp-raven@the-black-tower#515';
UPDATE mob_spawns SET room_id = 'the-high-crowns'        WHERE id = 'spawn-scarp-raven@the-brocken#518';
UPDATE mob_spawns SET room_id = 'the-fallen-crowns'      WHERE id = 'spawn-scarp-raven@the-cornice#519';
UPDATE mob_spawns SET room_id = 'the-felling-edge'       WHERE id = 'spawn-scarp-raven@the-crest-walk#521';
UPDATE mob_spawns SET room_id = 'the-bracken-edge'       WHERE id = 'spawn-scarp-raven@the-ramp-head#533';
DELETE FROM mob_spawns WHERE id IN (
  'spawn-scarp-raven@the-gorge-ground#526', 'spawn-scarp-raven@the-picked-ground#532',
  'spawn-scarp-raven@the-airy-step#512', 'spawn-scarp-raven@the-bad-step#514');
