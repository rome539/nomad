-- 374: THE HERD PEOPLE GO UP THE HILL (rome, 2026-11-06). Every herd, milker and
-- fold dog stood one to three steps from a gate. They move to the grass of the
-- shelves, at least ten steps from any gate, the distance a wolf keeps. Ids kept,
-- so no live creature's spawn id shifts (mig 309); the ones already standing walk
-- out with their dens (zone-data DEN_MOVES), they do not wait to die first.
UPDATE mob_spawns SET room_id = 'the-shelf-head' WHERE id = 'spawn-the-herd@the-last-pasture#627'; -- from the-last-pasture
UPDATE mob_spawns SET room_id = 'the-terrace' WHERE id = 'spawn-the-herd@the-high-fold#626'; -- from the-high-fold
UPDATE mob_spawns SET room_id = 'the-long-shelf' WHERE id = 'spawn-the-herd@the-wether-ledge#628'; -- from the-wether-ledge
UPDATE mob_spawns SET room_id = 'the-broken-terrace' WHERE id = 'spawn-the-herd@the-hanging-turf#625'; -- from the-hanging-turf
UPDATE mob_spawns SET room_id = 'the-third-band' WHERE id = 'spawn-the-herd@the-bealach#624'; -- from the-bealach
UPDATE mob_spawns SET room_id = 'the-heather-step' WHERE id = 'spawn-the-milker@the-milking-fold#632'; -- from the-milking-fold
UPDATE mob_spawns SET room_id = 'the-upper-heather' WHERE id = 'spawn-the-milker@the-turf-wall#635'; -- from the-turf-wall
UPDATE mob_spawns SET room_id = 'the-last-green' WHERE id = 'spawn-the-milker@the-peat-hags#633'; -- from the-peat-hags
UPDATE mob_spawns SET room_id = 'the-scoop-of-grass' WHERE id = 'spawn-the-milker@the-rush-hollow#634'; -- from the-rush-hollow
UPDATE mob_spawns SET room_id = 'the-lower-band' WHERE id = 'spawn-a-fold-dog@the-goat-track#3'; -- from the-goat-track
UPDATE mob_spawns SET room_id = 'the-rake' WHERE id = 'spawn-a-fold-dog@the-bracken-slope#0'; -- from the-bracken-slope
UPDATE mob_spawns SET room_id = 'the-hanging-floor' WHERE id = 'spawn-a-fold-dog@the-cotton-grass#1'; -- from the-cotton-grass
UPDATE mob_spawns SET room_id = 'the-south-bank' WHERE id = 'spawn-a-fold-dog@the-first-rise#2'; -- from the-first-rise
UPDATE mob_spawns SET room_id = 'the-cloud-foot' WHERE id = 'spawn-a-fold-dog@the-track-head#4'; -- from the-track-head
