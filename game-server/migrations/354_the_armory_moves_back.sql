-- THE ARMORY MOVES BACK FROM THE GATES (rome, 2026-10-31). The Stripped Armory
-- and the Issue Room over it stood four and five steps from three gates, which
-- is no walk at all for the one room in the fortress that was never emptied.
-- They go together, because the armory's own text points at the Issue Room (the
-- bones lie face up under the one patch of ceiling the dust has been shaken
-- off), to the far end of a new wing of the garrison's stores (mig 355), eight
-- steps from the nearest gate and nine for the Issue Room.
--
-- The armory keeps its id, so its picture, its features, its bell door and
-- everything keyed on it go with it. Its old square was a crossroads of five
-- doors, and those five stay: mig 355 puts a new room there, the Five Ways,
-- and the wardens' and the cook's rounds walk through it instead.
--
-- This half only lifts the two rooms off their squares and takes away the five
-- old doors both ways; the builder (mig 355) is strictly additive and cannot
-- move a room that already exists. The bell door between the armory and the
-- Issue Room is untouched.

DELETE FROM exits WHERE room_id = 'armory' AND dir IN ('west', 'south', 'north', 'east', 'down');
DELETE FROM exits WHERE room_id = 'scullery' AND dir = 'east' AND to_room = 'armory';
DELETE FROM exits WHERE room_id = 'kennels' AND dir = 'north' AND to_room = 'armory';
DELETE FROM exits WHERE room_id = 'gallery' AND dir = 'south' AND to_room = 'armory';
DELETE FROM exits WHERE room_id = 'hall' AND dir = 'west' AND to_room = 'armory';
DELETE FROM exits WHERE room_id = 'forge' AND dir = 'up' AND to_room = 'armory';

-- The new squares, at the east end of the wing. Up is the (-1,-1) diagonal, so
-- the Issue Room sits up and to the left of the armory, as it did before.
UPDATE rooms SET map_x = 6, map_y = 30 WHERE id = 'armory';
UPDATE rooms SET map_x = 5, map_y = 29 WHERE id = 'the-issue-room';
