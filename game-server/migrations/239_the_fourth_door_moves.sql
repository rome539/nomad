-- 239 the fourth door moves to the slabs (rome, 2026-08-19).
--
-- He walked the foot and said the Hollow Under sits too close to the Stell. The
-- distances agreed with him, and the problem was bigger than the room he named:
-- the mountain's four doors were the TIGHTEST cluster of gates in the world.
--
--     mountain    3   Shieling <-> Stell
--                 3   Stell    <-> Hollow Under
--                 6   Shieling <-> Hollow Under, and 6/7/8 to the Shelter Crag
--     fortress    5, 6, 6      a keep, and dense on purpose
--     wood        10, 10, 13
--     road        16
--     crossing    20
--
-- Three of the four stood inside a six-room pocket — tighter than the fortress's
-- own ring — which made that corner of the foot trivially safe and left one bank
-- doing nothing the other two did not already do.
--
-- THE SLABS is ten rooms from the nearest of the three that stay, the furthest
-- any foot room gets from them, and it puts a door on the wet southern ground,
-- which had none. New spread: 3 / 6 / 7 / 8 / 10 / 10 — close to the wood's
-- shape. The Shieling-to-Stell 3 is untouched, deliberately: he named one gate
-- and moving a second is his call to make, not mine.
--
-- WHAT MOVES WITH IT. A gate is somebody living there, so the prose moves too —
-- the woman under the erratic is gone and her fire is old ash, and the widest
-- joint in the slabs has been roofed with a levered slab and has smoke coming
-- out of it. Both descriptions below are generated from regions/mountain-1.rooms
-- so the live world and the source cannot drift.
--
-- AND THE GOAT COMES OFF THE DOORSTEP. There was a feral goat seeded in the
-- Slabs. A body inside a gate is a body nothing can reach and nothing can refill
-- (applyArrivals filters entry rooms out of a line's homes), so it would have
-- stood in the doorway for the life of the world. Moved to the Wet Slabs, one
-- room south, which is the same ground and not a door.

UPDATE rooms SET is_entry = 0, is_spawn = 0, description = 'The erratic sits on three points and the fourth corner is off the ground, and under it there is a dry floor of sand the size of a small room, out of the wind and out of the rain and out of the sight of everything. Somebody lived in here. There is a ring of stones for a fire with nothing in it but old ash, and the sand was swept once, long enough ago that the swept edge has gone soft and the wind has put a drift across the doorway.' WHERE id = 'the-hollow-under';
UPDATE rooms SET is_entry = 1, is_spawn = 1, description = 'Bare rock in great tilted sheets, swept clean by the water that comes over them when the hill is full, with the joints between them opened into cracks you could put an arm down. Dry, they are the fastest walking on the mountain, and they are not often dry. The widest joint has been roofed: a slab levered flat across it and packed at the ends, with a hole for smoke and smoke coming out of it. Whoever did that picked the one place on this hillside the water goes past instead of over.' WHERE id = 'the-slabs';
UPDATE mob_spawns SET room_id = 'the-wet-slabs' WHERE room_id = 'the-slabs' AND template_id = 'feral-goat';
