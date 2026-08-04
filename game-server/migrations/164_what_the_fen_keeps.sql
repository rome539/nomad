-- WHAT THE FEN KEEPS (the population half of mig 163's eighteen rooms).
--
-- The road's own density is the measure, 0.23 to the room, so eighteen rooms
-- earn four. Placed on what the prose already says, and NOT spread evenly: the
-- three ways are not equally bad, and that is most of what makes choosing
-- between them a decision rather than a coin toss.
--
--   THE SALLY WAY   one body. The old causeway, the maintained one, the one a
--                   state built. It is the safe fen crossing, which is a
--                   sentence with 'fen' in it.
--   THE BLACK WAY   two. Longer, deeper, and it runs through the peat workings
--                   where the ground is water with a lid on.
--   THE GRAVE PATH  one, and it is the worst of the four. Short, foul, and it
--                   starts in a burial pit.
--
-- No new templates. The mire-walker is the wood's own drowned thing and this is
-- the water it came out of; the footpad is the road's, and a fen crossing that
-- nobody patrols is exactly where a road's thieves go when the road gets busy.
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-fen-1', 'the-mire-walker', 'the-tussock-ford'),    -- bottomless peat, and something in it
  ('spawn-fen-2', 'the-mire-walker', 'the-dead-alders'),     -- dark at noon under standing dead trees
  ('spawn-fen-3', 'footpad',         'the-rush-shore'),      -- rush higher than a man, on both sides of a board
  ('spawn-fen-4', 'the-mire-walker', 'the-quaking-flat');    -- ground that is not ground

-- WHAT LIES ABOUT. A fen is fuel and food and withies and nothing else: peat to
-- burn, cress and eels to eat, rods to weave. No gear, no scrap, no iron — this
-- is a way THROUGH, and the things on it are what you'd pick up in passing.
-- Torches at the two dark places, because the fen is the one crossing in the
-- world where being caught without a light is a drowning rather than a delay.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('watercress',  'the-open-water',     1),
  ('watercress',  'the-fen-edge',       1),
  ('torch',       'the-dead-alders',    1),
  ('torch',       'the-grave-drain',    1),
  ('loose-rock',  'the-sinking-path',   1),   -- the causeway is made of them
  ('loose-rock',  'the-willow-landing', 1),
  ('sloes',       'the-waste-foot',     1),
  ('beech-mast',  'the-osier-landing',  0);

-- NOT DONE, deliberately:
--
--   NO GATE. Three ways west and not one bank on any of them. The fen is the way
--   AROUND the road's throat, not a second fortress — putting a door out here
--   would answer the chokepoint by making the chokepoint pointless, which is not
--   the same as fixing it.
--
--   NO PATROL. The carrier walks the road because a road has somebody walking
--   it; the whole character of the fen is that nobody maintains it and nobody
--   is coming. That is the trade the two routes offer each other.
--
--   NO MILESTONE, NO SHELTER. Both are road furniture and both would make this
--   feel like a road. It is a way people used before there was a road.
