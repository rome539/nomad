-- 225 two ways out of the wood (rome, 2026-08-17: we need more exits out of the
-- woods onto the road).
--
-- THE WOOD HAD THREE DOORS AND TWO OF THEM WERE THE SAME DOOR. Measured across
-- the live map, every wood/road crossing in the game:
--
--     The Eaves (deepwood)      <-> The Gap in the Trees
--     The Osier Beds (carr)     <-> The Osier Landing
--     The Willow Margin (carr)  <-> The Willow Landing
--
-- Three rows for 172 rooms, and the last two are both the carr, a few steps
-- apart. So the wood has effectively two ways in, and 77 of its rooms stand ten
-- or more steps from any road room. By quarter, nearest road:
--
--     deepwood  20 rooms   1     worked     22   4
--     carr      32         1     sunken     24   5  (mean 9)
--     enclosure 23         2     holding    35   7  (mean 11)
--     heath      9        12     heart       7  19
--
-- The heart stays hard on purpose — that is what a heart is, and the woodward
-- lives in it. The rest was a bottleneck nobody chose.
--
-- WHY THERE WERE ONLY THREE, which is the part worth writing down: the wood
-- occupies y -8..6 and the road y 10..24, and the deserted village fills the
-- whole band between them (x -27..-31, y 7..12). The two bands do not touch
-- anywhere on the grid. The three crossings that exist are the only places the
-- geometry ever allowed, so this is not a case of doors left off — there was
-- nowhere to hang one.
--
-- There are exactly three channels of unused map from the wood's north edge
-- south to the road, and one of them is disqualified: The Fern Pit is a
-- sanctuary, and creatures cannot enter safe ground. A crossing through it
-- would be a one-way valve — players walk it, animals never can — which is the
-- opposite of the point, since half of what a door into the wood is for is
-- letting the wood's game spread onto the road and the road's onto it.
--
-- So the other two, five rooms each, on empty cells the whole way:
--
--     The Under-Eaves (-26,5) south --5-- The Gorse Tunnel (-26,11)
--     The Cold Seep   (-24,5) south --5-- The Broken Cross (-24,11)
--
-- Both open the SUNKEN quarter, which is the wood's most cut-off large ground
-- and holds its deepest pockets, and both put a wood door either side of the
-- village, so the holdings get a back way into the trees.
--
-- THE BAND IS 'road' FOR ALL TEN, and that is load-bearing rather than
-- cosmetic. 'road' is a FORAGE_REGION, so this ground feeds what walks it the
-- moment it exists; it is a MIGRATE_BAND, so animals can settle here; and none
-- of the ten is entry or safe ground, so nothing is a valve and migrants can den
-- in them. The wood/road boundary now falls at the two existing wood rooms'
-- south exits, which is where a wood should end: at the last of the trees.
--
-- The two ways are deliberately not the same kind of place. One is the lane the
-- village walked to fetch its fuel; the other is the way it carried its dead.

-- ---- WAY ONE: south off The Under-Eaves, the village's fuel road ------------
-- Runs down the east side of the village (The Reeve's House and The North House
-- stand one column west of it) and comes out where the gorse begins.

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-wood-gate', 'door', 'The Wood-Gate',
   'The last of the trees stop in a line here, and where the lane goes through them there is a gate, or the posts of one — two oak stumps set deep with the iron still in them and no gate hung between. It was here to keep stock out of the growing wood, which means somebody was minding both sides of it. Underfoot the ground changes in a single step, from leaf litter to a rutted way with grass down the middle of it.',
   0, 0, 'road', 0, 0, -26, 6);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-wood-gate', 'north', 'the-under-eaves', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-under-eaves', 'south', 'the-wood-gate', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-faggot-stack', 'door', 'The Faggot Stack',
   'Cut wood bound in bundles and stood in long ricks beside the lane to season, the way it was always done: cut in the winter, stacked here, carried down as the village needed it. Most of the ricks have gone over and rotted into ridges you can still count. Two have not, and the bindings on those are still tight, and the wood in them is still dry.',
   0, 0, 'road', 0, 0, -26, 7);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-faggot-stack', 'north', 'the-wood-gate', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-wood-gate', 'south', 'the-faggot-stack', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-fuel-road', 'door', 'The Fuel Road',
   'The lane has worn itself down below the level of the fields on either side, a hand''s depth a century, until the banks stand at your shoulder and the roots of the hedge on top of them are out in the air. Nothing came up here but firewood and nothing went up but people fetching it. It is the plainest kind of road there is: made entirely by use, and pointed at one thing.',
   0, 0, 'road', 0, 0, -26, 8);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-fuel-road', 'north', 'the-faggot-stack', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-faggot-stack', 'south', 'the-fuel-road', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-bank-and-ditch', 'door', 'The Bank and Ditch',
   'A bank with a ditch on its wood side, running away east and west as far as you can follow it, thrown up to say where the common ended and the lord''s trees began. The lane cuts straight through it at a gap that was cut on purpose and kept clear. Standing in the gap you are standing in the argument: everything behind you was somebody''s, everything ahead of you was everybody''s.',
   0, 0, 'road', 0, 0, -26, 9);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-bank-and-ditch', 'north', 'the-fuel-road', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-fuel-road', 'south', 'the-bank-and-ditch', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-gorse-break', 'door', 'The Gorse Break',
   'Gorse has taken the bottom of the lane and closed over most of it, and what is left is a low green passage you go through bent, with the old ruts still under your feet where you cannot see them. It flowers even now, out of season, the way gorse does. Somewhere ahead the light widens where the road runs.',
   0, 0, 'road', 0, 0, -26, 10);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-gorse-break', 'north', 'the-bank-and-ditch', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-bank-and-ditch', 'south', 'the-gorse-break', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-gorse-break', 'south', 'the-gorse-tunnel', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-gorse-tunnel', 'north', 'the-gorse-break', NULL);

-- ---- WAY TWO: south off The Cold Seep, the corpse road ----------------------
-- It ends at The Broken Cross, which has been a waystone since the road was
-- written — and a wayside cross at the foot of a track out of the wood is what
-- a corpse road always ended at. The road was here first; this only names it.

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-lych-way', 'door', 'The Lych Way',
   'A path that keeps to itself, narrow and straight where every other way through this ground wanders, and worn deep although nothing about it goes anywhere useful. It leaves the wet wood at its darkest corner and holds one line south. Paths like this were walked in one direction with something heavy on four shoulders, and in the other empty, and that is why they are straight.',
   0, 0, 'road', 0, 0, -24, 6);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-lych-way', 'north', 'the-cold-seep', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-cold-seep', 'south', 'the-lych-way', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-wet-furlong', 'door', 'The Wet Furlong',
   'Low ground the path has no choice but to cross, where the water off the wood spreads out and stands all year and the way is carried over it on stones laid end to end, half of them tipped. Rushes stand in the water on both sides, dense enough to hide a dog. Whatever went along here went slowly through this part, and had to.',
   0, 0, 'road', 0, 0, -24, 7);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-wet-furlong', 'north', 'the-lych-way', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-lych-way', 'south', 'the-wet-furlong', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-coffin-stone', 'door', 'The Coffin Stone',
   'A flat slab set waist-high on two uprights at the side of the path, out on its own with nothing else near it. It is the right height to take a weight off shoulders without setting it on the ground, and the right length, and the top of it is worn smoother than weather alone would do. The bearers stopped here. That is the whole of what it is for.',
   0, 0, 'road', 0, 0, -24, 8);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-coffin-stone', 'north', 'the-wet-furlong', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-wet-furlong', 'south', 'the-coffin-stone', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-rush-ground', 'door', 'The Rush Ground',
   'Open ground gone entirely over to rushes, standing to the waist in dark clumps with the path a parting through them that closes behind you. Rushes were cut here for floors and for lights, and the cutting is what kept them useful; nobody has cut anything for a long time. The wood is a low dark line behind you now, and there is sky.',
   0, 0, 'road', 0, 0, -24, 9);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-rush-ground', 'north', 'the-coffin-stone', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-coffin-stone', 'south', 'the-rush-ground', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-cross-field', 'door', 'The Cross Field',
   'The last field before the road, ridged and furrowed under the grass in long waves you feel through your boots before you see them. The path runs the length of it and comes out at the corner where the ways meet, and the broken cross standing there is visible from here, small and pale against the hedge. Everything carried down this way stopped at that stone before it went on.',
   0, 0, 'road', 0, 0, -24, 10);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-cross-field', 'north', 'the-rush-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-rush-ground', 'south', 'the-cross-field', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-cross-field', 'south', 'the-broken-cross', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-broken-cross', 'north', 'the-cross-field', NULL);
