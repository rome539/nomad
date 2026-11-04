-- THE GRATE IS OVERHEAD (rome, 2026-11-03: at the Sewer Mouth down took him
-- out to the ground and up took him into the halls).
--
-- The Sewer Mouth lies two floors under the Black Fen (mig 365), and its own
-- words put the torn grate above it, but the way in from the fen was "up" and
-- the way out "down". Now you go down through the grate from the fen and up
-- through it to get out again. A room has one up, so the drain's way back
-- toward the fortress, to the Drowned Scullery a floor above, is north; the
-- scullery still goes down into the sewer.

DELETE FROM exits WHERE (room_id = 'the-black-fen' AND dir = 'up')
  OR (room_id = 'sewer' AND dir IN ('up', 'down'));
INSERT INTO exits (room_id, dir, to_room) VALUES
  ('the-black-fen', 'down', 'sewer'),
  ('sewer', 'up', 'the-black-fen'),
  ('sewer', 'north', 'scullery');
