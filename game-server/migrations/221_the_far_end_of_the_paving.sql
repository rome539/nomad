-- 221 four doors on the east road (rome, 2026-08-15: build dens on the east side
-- too, so a player has to choose where home is — and keep the mountain in mind,
-- it is next).
--
-- EVERY HOME IN THE GAME WAS IN ONE BAND. Six holdings, all six on the den
-- ground, so "where do you live" had one answer and the choice the whole feature
-- rests on — one hold per player, give one up to take another — was a choice
-- between the old village and nothing.
--
-- THEY HAD TO BE FAR OUT, which is why these are new rooms rather than a flag on
-- rooms that already exist (rome's ruling, and he is right): a den shelf survives
-- death. Put a home near a gate and it stops being a home and becomes a free
-- locker on the safe side of the risk — carry the haul a few rooms instead of
-- running it back to the hatch, and the extraction loop the game rests on
-- quietly stops mattering.
--
-- HOW FAR IS MEASURED IN WALKING STEPS TO THE NEAREST GATE, and there are TEN
-- gates, not three: the road alone has two, and the Relay House is one of them.
-- That is the trap in doing this by eye instead of by walking the graph — a site
-- that looks remote on the map can be ten steps from a door.
--
--     The Black Hut          6      <- the village today
--     The Warrener's Lodge   9
--     The Smithy            10
--     The Reeve's House     11
--     The North House       12
--     The Mill              13     <- the furthest home in the game until now
--     ---- these ----       21
--
-- TWENTY-ONE, AND THE NUMBER TOOK THREE PASSES. The first draft sat four doors
-- round one yard, which rebuilds the village somewhere else and offers one choice
-- (east or west) dressed as four. The second spread them along the road but hung
-- them straight off it, which caps out at 16-18 steps, because the road runs
-- BETWEEN two gates and nothing on it is ever truly far from both.
--
-- So the distance is built rather than found. Each den sits at the end of a SPUR
-- that leaves the road and goes somewhere — peat ground, sheep ground, a sunken
-- lane, the incline — and every room of that spur is another step from a gate.
-- Four spurs, ten rooms, four doors, all four at exactly 21: eight steps further
-- out than anything the world has now, and a real walk home carrying anything.
--
--     off The Spring Line   south   turf road    -> The Peat House      21
--     off The Scarp Spring  north   sheep trod   -> The Herd's Hut      21
--     off The Beck Head     south   deep lane    -> The Well House      21
--     off The Last Paving   south   sledge track -> The Winding House   21
--
-- They do not touch each other and none is visible from another: the spurs leave
-- the road at different points and run in different directions, two south, one
-- north, one down the hill.
--
-- The band is 'road', which is the other half of the trade. The village is a
-- village — six doors within shouting distance and the den ground's own arcs.
-- This is the road: nobody near you, and you get the road's weather, the spate,
-- the carrier, and the bear that walks it. Nothing here is entry or safe ground,
-- so the migrants can den in these rooms too.
--
-- FOUR DOORS, NOT SIX. Scarcity is the feature: the way in for the next nomad is
-- meant to be finding somebody who will take him in, not an empty room. The
-- hairpins at x31 and everything above them are untouched on purpose — that is
-- the climb, and the climb belongs to the mountain that is coming next.

-- ---- SPUR ONE: south off The Spring Line, onto the peat ---------------------
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-turf-road', 'door', 'The Turf Road',
   'A causeway of brushwood and old sleepers laid straight out across ground that will not carry a cart otherwise, sunk to its edges and springing underfoot with every step. Water stands on both sides of it in long black cuts. It was built to get out to the peat and back before dark, and it has been sinking gently ever since somebody last troubled to lay a new course on it.',
   0, 0, 'road', 0, 0, 27, 13);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-turf-road', 'north', 'the-spring-line', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-spring-line', 'south', 'the-turf-road', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-turf-stacks', 'door', 'The Turf Stacks',
   'Cut peat stood up in herringbone stacks to dry, rows of them, most collapsed into black heaps and a few still standing exactly as they were built. The cuttings themselves step away in terraces with water lying in the bottom of each one. Somebody worked a whole season out here and never came back for the last of it, and the last of it is still stacked and waiting.',
   0, 0, 'road', 0, 0, 27, 14);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-turf-stacks', 'north', 'the-turf-road', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-turf-road', 'south', 'the-turf-stacks', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-peat-house', 'door', 'The Peat House',
   'A long drying shed at the end of the cuttings, walled in stone to waist height and boarded above it with gaps left deliberately between every board, so the wind goes through and the wet goes out. Half of it is still stacked to the roof with fuel nobody burned. It is the driest building for a mile in any direction and it smells of smoke that has not been lit in two hundred years.',
   0, 0, 'road', 0, 1, 27, 15);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-peat-house', 'north', 'the-turf-stacks', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-turf-stacks', 'south', 'the-peat-house', NULL);

-- ---- SPUR TWO: north off The Scarp Spring, up onto the sheep ground ---------
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-sheep-trod', 'door', 'The Sheep Trod',
   'A path a hand''s breadth wide, worn into the turf by animals going single file to the same place every day for longer than anybody was counting. It contours the slope instead of climbing it, which is the difference between a track made by sheep and a track made by men. Follow it and it will take you somewhere useful, because they were not walking it for nothing.',
   0, 0, 'road', 0, 0, 28, 8);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sheep-trod', 'south', 'the-scarp-spring', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-scarp-spring', 'north', 'the-sheep-trod', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-wether-fold', 'door', 'The Wether Fold',
   'A round fold of drystone built out on the open hill, high enough to turn a wind and no higher, with a gap for a gate that has no gate in it. The wall is beautifully made — every stone chosen, nothing mortared, the whole thing standing dry for centuries. Inside, the ground is a different green from everything around it, and it will be for a long time yet.',
   0, 0, 'road', 0, 0, 28, 7);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-wether-fold', 'south', 'the-sheep-trod', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sheep-trod', 'north', 'the-wether-fold', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-herds-hut', 'door', 'The Herd''s Hut',
   'One room, built into the slope with turf over the roof so that from uphill it is barely a building at all. A stone bed shelf down one side, a hearth at the end with the smoke-hole above it, and a door that faces away from the weather. A man lived up here through the summers with the flock and went down again before the snow, and everything in the way it is built says he expected to be alone and did not mind.',
   0, 0, 'road', 0, 1, 28, 6);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-herds-hut', 'south', 'the-wether-fold', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-wether-fold', 'north', 'the-herds-hut', NULL);

-- ---- SPUR THREE: south off The Beck Head, down the deep lane ----------------
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-deep-lane', 'door', 'The Deep Lane',
   'A lane worn so far below the fields that the hedges meet overhead and you walk in green half-light with the roots of the thorn standing out of the banks at shoulder height. Nothing dug this. It is simply the depth that feet and hooves and rainwater get to in eight hundred years of everyone going the same way.',
   0, 0, 'road', 0, 0, 28, 13);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-deep-lane', 'north', 'the-beck-head', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-beck-head', 'south', 'the-deep-lane', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-well-house', 'door', 'The Well House',
   'A stone hood built straight over the springhead at the lane''s end, barrel-vaulted, with a flagged floor and a channel cut through it so the water crosses the room and leaves by the far wall without ever touching your feet. It is cold in here in a way that has nothing to do with the season, and it is the one building on this road that will never run dry. Somebody has cut a cross into the keystone, and somebody later has scratched a tally beside it.',
   0, 0, 'road', 0, 1, 28, 14);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-well-house', 'north', 'the-deep-lane', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-deep-lane', 'south', 'the-well-house', NULL);

-- ---- SPUR FOUR: south off The Last Paving, down the incline -----------------
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-sledge-track', 'door', 'The Sledge Track',
   'A dead straight scar running down the hillside at a pitch no cart could hold, with the sleeper beds still in it and the stone flush worn to a polish down the middle of each one. Loaded sledges came down this on a rope and the empties went back up on the same rope. Standing on it, the thing you notice is how little there was between the load and the bottom if the rope ever went.',
   0, 0, 'road', 0, 0, 30, 11);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sledge-track', 'north', 'the-paving-end', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-paving-end', 'south', 'the-sledge-track', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-winding-house', 'door', 'The Winding House',
   'The drum house at the foot of the incline: a stone shed built round a horizontal timber drum as thick through as a man, the rope long since rotted off it and the brake lever still standing at half. It is dry, it is out of the wind, and the drum makes a wall down the middle of the room that a person could very easily sleep behind. Whoever worked the brake sat where you are standing and listened to the load coming down.',
   0, 0, 'road', 0, 1, 30, 12);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-winding-house', 'north', 'the-sledge-track', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sledge-track', 'south', 'the-winding-house', NULL);

-- ---- AND NONE OF THEM IS A CUL-DE-SAC (rome, 2026-08-15) --------------------
-- The spurs as first drawn were dead ends, and a dead end is a gift to anybody
-- waiting in it: one doorway to camp, and a man who walks down to his own door
-- with a full pack has nowhere to go but through whoever followed him. The
-- deeper the spur ran to buy distance, the worse that got.
--
-- So the far country is a NETWORK instead of four blind alleys. Five connecting
-- rooms tie the spurs to each other and back to the road at points nobody can
-- watch at once, and every den now has two ways out that leave the road in
-- different places.
--
-- The distance is unharmed, which is the thing to check: every one of these
-- joins the road at a room already 18-19 steps out, so the SHORTEST walk to a
-- gate from any of the four doors is still exactly 21. A second way out is not
-- a shortcut — it is the difference between a home and a trap.

-- The moss path: ties the peat ground to the well, west door to south door.
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-moss-path', 'door', 'The Moss Path',
   'A line of flat stones laid one stride apart across ground too soft to take a path, half of them tipped and all of them furred over with moss. It runs between the peat workings and the spring and it was put down by people who used both every day. Step off the stones and you go in to the ankle, and there is no arguing with it.',
   0, 0, 'road', 0, 0, 28, 15);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-moss-path', 'west', 'the-peat-house', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-peat-house', 'east', 'the-moss-path', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-moss-path', 'north', 'the-well-house', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-well-house', 'south', 'the-moss-path', NULL);

-- The beck lane: a second way off the incline, back along the water.
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-beck-lane', 'door', 'The Beck Lane',
   'A cart track running along the near bank with the water on one side and a thorn hedge on the other, wide enough for one load and no more. There are passing places cut into the hedge every so often, which tells you how often two of them met and what happened when they did.',
   0, 0, 'road', 0, 0, 29, 12);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-beck-lane', 'west', 'the-beck-head', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-beck-head', 'east', 'the-beck-lane', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-beck-lane', 'east', 'the-winding-house', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-winding-house', 'west', 'the-beck-lane', NULL);

-- And the hill way: the sheep ground gets a second descent, off the quarry turn.
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-spring-bank', 'door', 'The Spring Bank',
   'A steep bank of short turf with water seeping out of it all along one line, so that the whole slope is dark and soft at that height and dry above and below. Sheep have cut a dozen little terraces across it going sideways, and every one of them is easier walking than going straight up.',
   0, 0, 'road', 0, 0, 29, 9);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-spring-bank', 'south', 'the-quarry-turn', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-quarry-turn', 'north', 'the-spring-bank', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-hill-gate', 'door', 'The Hill Gate',
   'A gap in a wall that runs clean over the shoulder of the hill and out of sight both ways, with the gateposts still standing and the gate itself long gone. Everything that crosses this hill crosses it here, because the wall gives it no choice, and the ground in the gap is worn down a foot below the turf either side.',
   0, 0, 'road', 0, 0, 29, 8);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-hill-gate', 'south', 'the-spring-bank', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-spring-bank', 'north', 'the-hill-gate', NULL);

INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-top-wall', 'door', 'The Top Wall',
   'The wall at its highest point, running dead straight along the ridge with the whole country falling away on both sides of it. Somebody built this by carrying every stone up here. Standing beside it you can see the road below going east, the peat ground south, and a long way west to where the light stops.',
   0, 0, 'road', 0, 0, 29, 7);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-top-wall', 'south', 'the-hill-gate', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-hill-gate', 'north', 'the-top-wall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-top-wall', 'west', 'the-wether-fold', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-wether-fold', 'east', 'the-top-wall', NULL);

-- The hut's own second door. The loop above gave the Wether Fold two ways out
-- and left the HUT sitting behind it, which is the same trap one room further
-- in — block the fold and the herd's man is sealed in his own house. A
-- choke-point check over the finished map catches exactly this and nothing else
-- catches it, because on the picture it looks like a loop.
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
  ('the-hut-yard', 'door', 'The Hut Yard',
   'A scrape of level ground behind the hut with a low wall round two sides of it, where the peats were stacked and the water butt stood and a man could stand out of the wind to do anything that needed both hands. A path goes on east from it along the top, because whoever lived here did not only ever come and go one way.',
   0, 0, 'road', 0, 0, 29, 6);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-hut-yard', 'west', 'the-herds-hut', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-herds-hut', 'east', 'the-hut-yard', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-hut-yard', 'south', 'the-top-wall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-top-wall', 'north', 'the-hut-yard', NULL);
