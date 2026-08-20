-- THE COMPASS READS TRUE (2026-08-20).
--
-- Two exit pairs carried directions that contradict the map and each other:
--
--   • the-chapel-channel listed EAST to the-decoy-pipe, and the-decoy-pipe
--     listed EAST back to the-chapel-channel — walking east from either room
--     reached the other. The decoy pipe sits west of the chapel channel on the
--     map (x 45 vs 46), so the chapel channel's leg is WEST.
--
--   • the-marrow-road listed DOWN to the-gasping-dark, whose return was NORTH.
--     The two rooms stand side by side at the same depth (x 1 vs 2), so the
--     pair is west/east — the road's leg west, the dark's return east.
--
-- The sunken throne's lateral returns are left alone: its north, south, up and
-- down already serve the reliquary, the death cell, the black threshold and
-- the king's hoard, and "east to the eastern court, west to the western court"
-- is exactly what the map shows — those labels were always true.
--
-- Every change keeps its reverse exit paired (west <-> east).

UPDATE exits SET dir = 'west' WHERE room_id = 'the-chapel-channel' AND dir = 'east' AND to_room = 'the-decoy-pipe';
UPDATE exits SET dir = 'west' WHERE room_id = 'the-marrow-road' AND dir = 'down' AND to_room = 'the-gasping-dark';
UPDATE exits SET dir = 'east' WHERE room_id = 'the-gasping-dark' AND dir = 'north' AND to_room = 'the-marrow-road';
