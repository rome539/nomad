-- THE FLOORS (rome, 2026-11-03: the map's arrangement reads wrong, and the
-- inside of the fortress wants floors).
--
-- Every room already had a stratum: the overworks above, the ground, the halls,
-- the warrens and the deep. They were drawn as stripes stacked further and
-- further south of the fortress, so the inside of one building lay on the paper
-- as a column of land south of the open ground. Mig 167 lined their x up with
-- the stairs; their y was only ever "below the last stripe".
--
-- Now a room carries its floor as a fact, beside its square:
--    1  the overworks (towers and wall-tops)
--    0  the ground: everything outdoors, the mountain included (its height is
--       ground you climb, never floors)
--   -1  the halls        -2  the warrens        -3  the deep
--
-- and the three underground floors move north to sit under the fortress's own
-- outline. The shift per floor was chosen to make the stairs fall straight
-- down: across all 24 ways between floors the summed sideways-and-forward drift
-- is 42 squares, and the three gates' own stairs land within three squares of
-- the door above them. x is not touched, so mig 167's alignment stands.
--
-- Squares only have to be unique on a floor now. Up and down still read as a
-- diagonal on the paper within a floor (the mountain's climbs); between floors
-- the stair badge carries the way.

ALTER TABLE rooms ADD COLUMN map_z INTEGER NOT NULL DEFAULT 0;

UPDATE rooms SET map_z = 1 WHERE map_z = 0 AND id IN (
  'the-wall-walk', 'the-watch-turret', 'the-bell-cote', 'the-broken-battlement',
  'the-leaning-spire', 'the-rotted-scaffold', 'the-weepers-crown');
UPDATE rooms SET map_z = -1, map_y = map_y - 24 WHERE map_z = 0 AND map_y BETWEEN 25 AND 37;
UPDATE rooms SET map_z = -2, map_y = map_y - 33 WHERE map_z = 0 AND map_y BETWEEN 38 AND 45;
UPDATE rooms SET map_z = -3, map_y = map_y - 39 WHERE map_z = 0 AND map_y >= 46;
