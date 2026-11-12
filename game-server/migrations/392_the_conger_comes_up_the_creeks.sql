-- 392: THE CONGER COMES UP THE CREEKS (rome, 2026-11-12). Nothing on the crossing
-- killed a marsh hound but the drake; the conger now takes one, and three of the
-- eight move off the open channels into the marsh creeks, where the hounds walk.
-- A conger never leaves its water, so this is the only way they meet. Ids kept
-- (mig 309); the ones standing go with their homes (zone-data DEN_MOVES).
UPDATE mob_spawns SET room_id = 'the-wide-creek' WHERE id = 'spawn-conger@the-green-water#312'; -- from the-green-water
UPDATE mob_spawns SET room_id = 'the-crooked-creek' WHERE id = 'spawn-conger@the-deep-mark#313'; -- from the-deep-mark
UPDATE mob_spawns SET room_id = 'the-creek-mouth' WHERE id = 'spawn-conger@the-under-rope#314'; -- from the-under-rope
