-- THE ROAD OPENS A SEAM (the cut that lets mig 158 thread ten rooms into the
-- middle of the west road).
--
-- A road that gets longer in the MIDDLE has to stop going straight through
-- first. The Long Straight ran west into the Weed Paving and back; those two
-- exits come out here, and 158 reconnects both ends through the new stretch.
--
-- Cut before insert, in its own file, because the room pipeline only ever
-- WRITES exits — it has no way to take one back, and an INSERT onto a
-- (room_id, dir) that already exists is a primary-key error, not a replace.
DELETE FROM exits WHERE room_id = 'the-long-straight' AND dir = 'west';
DELETE FROM exits WHERE room_id = 'the-weed-paving'   AND dir = 'east';
