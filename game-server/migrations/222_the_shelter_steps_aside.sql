-- 222 the shelter steps aside (rome, 2026-08-15: fix the shelter).
--
-- THE SHELTER STONE WAS A SANCTUARY STANDING IN A DOORWAY. Measured by blocking
-- each safe room in turn and re-checking what the rest of the world could still
-- reach:
--
--     room                  band       exits   rooms sealed off
--     The Shelter Stone     road         2      *** 210 ***
--     The Fern Pit          wood         4          2
--     The Holly Hedge       wood         3          1
--     ...all 23 others                   1          0
--
-- Twenty-three of the twenty-six sanctuaries in the world are side-pockets: one
-- exit, step in, step back out, and nothing behind them. The Shelter Stone was
-- the only one sitting ON a through-route — and not just any route. It is room
-- six of thirteen on the climb, and the climb is the ONLY land connection
-- between the road and the Crossing. Every soul crossing the map walks through
-- that room.
--
-- Which made it the one place in the game where a player could hold the whole
-- world's traffic from inside a room nothing can reach into. Park there, watch
-- everyone who crosses, step out at the moment of your choosing, step back into
-- sanctuary. Two hundred and ten rooms on the far side of one man in a box.
--
-- It also read backwards on its own terms. A shelter stone is an overhang you
-- get UNDER when the weather turns — something you step aside into. This one was
-- not beside the path. It WAS the path.
--
-- ---- what changes ----------------------------------------------------------
-- The stone steps aside and the road goes past it. A new room, The Crag Foot,
-- takes its place in the line, so the climb keeps all thirteen of its rooms and
-- every distance across the map is unchanged. The Shelter Stone hangs north off
-- it with a single exit — the same shape as every other hideaway in the game.
--
-- After this, blocking the Shelter Stone seals nothing at all. The sanctuary
-- promise is untouched: it still cannot be reached into, you still cannot be
-- followed in. It simply stops being somewhere everyone else is obliged to walk.
--
-- The corridor itself is NOT addressed here and is still thirteen rooms of
-- single file with no way round. That is a separate argument about whether a
-- pass should have alternatives, and it wants deciding on its own rather than
-- smuggling in behind a bug fix.

-- The stone moves off the line (its description already reads as an overhang
-- above the path rather than a stretch of it, so nothing needs rewriting).
UPDATE rooms SET map_y = 9 WHERE id = 'the-shelter-stone';

-- ...and the path it used to be goes on without it.
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-crag-foot', 'door', 'The Crag Foot',
   'The path runs along the base of the crag here with the rock going up sheer on the north side and nothing much on the other, so that everything on this stretch walks in the shadow of it for a hundred paces whatever the hour. Water comes off the top in a thin constant thread and has cut a groove in the stone at the bottom to prove how long it has been doing it. A little way up, out of the wet, there is an overhang big enough to get under.',
   0, 0, 'road', 0, 0, 36, 10);

-- Unpick the old line: rope post <-> shelter <-> scarp top.
DELETE FROM exits WHERE room_id = 'the-rope-post'     AND to_room = 'the-shelter-stone';
DELETE FROM exits WHERE room_id = 'the-shelter-stone' AND to_room = 'the-rope-post';
DELETE FROM exits WHERE room_id = 'the-shelter-stone' AND to_room = 'the-scarp-top';
DELETE FROM exits WHERE room_id = 'the-scarp-top'     AND to_room = 'the-shelter-stone';

-- The climb, continuous again and the same length as it was.
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-rope-post', 'east', 'the-crag-foot', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-crag-foot', 'west', 'the-rope-post', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-crag-foot', 'east', 'the-scarp-top', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-scarp-top', 'west', 'the-crag-foot', NULL);

-- And the stone itself: one way in, one way out, like every other hideaway.
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-crag-foot', 'north', 'the-shelter-stone', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-shelter-stone', 'south', 'the-crag-foot', NULL);
