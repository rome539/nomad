-- 197 the folds have no roof (rome, 2026-08-11: "what about the fucking hiding
-- rooms on the fucking east road"). Same disease as mig 196, shipped earlier,
-- and in one place worse.
--
-- Measured against the road's four through-lines, seven of its eleven hideaways
-- sat ON a line -- a room you cannot avoid walking through:
--
--   the paving  41 rooms   carters-rest, shelter-stone, far-shore-stone
--   the drove   21 rooms   first-fold, shepherds-bothy, hanging-fold
--   the beck    29 rooms   osier-island
--
-- A ROAD IS NOT A CROSSING, and mig 196's rule does not transfer whole. A
-- wayside shelter standing on a road is the entire point of a wayside shelter;
-- the institution built rest-houses along its own highway and you are meant to
-- find them. What a road cannot carry is DENSITY. Three boltholes in a
-- twenty-one room drove is one every seven rooms, which means nothing that
-- lives out there can ever finish anything it starts.
--
-- So: keep the shelters that are shelters, and cut four.
--
-- THE FOLDS, both of them, and this one is not a judgement call -- the codebase
-- already said it out loud and then did the opposite. INDOOR_ROOMS, on why the
-- folds are excluded from it:
--
--     "The folds are walls with no roof and stay outdoors, which is the
--      difference between a fold and a bothy and the reason only one of them
--      is worth running to."
--
-- Both folds were marked safe regardless. A sheepfold is a wall in a field. It
-- rains on you in there, the wind comes over the top of it, and a wolf steps
-- through the gap. It is not a hiding place and its own comment knew it.
--
-- THE FAR SHORE STONE, which is a bench and a dressed pillar with a view, and
-- is now the seam room into the Crossing. A guaranteed safe square at the
-- doorway of a new region blunts the arrival -- you should come over that moor
-- and see the water with nothing between you and it.
--
-- THE OSIER ISLAND, a gravel island in the beck with withies growing on it. It
-- is a through-room on the beck's line and it is not a roof. The beck already
-- has two proper hideaways off its line (the fall shelter, the mill loft) and
-- both are dead ends you leave the water to reach, which is the right shape.
--
-- What survives is seven, and every one is a thing with something over it:
--   the-carters-rest    the paving's rest-house  (on the line, and correctly so)
--   the-shelter-stone   the climb's halfway house (likewise)
--   the-shepherds-bothy the drove's ONE bothy    (likewise -- and now its only one)
--   the-fall-shelter    dead end off the gill
--   the-mill-loft       dead end above the mill
--   the-oak-hollow      dead end, a hollow oak
--   the-wayside-shelter dead end at the verge
--
-- 7 in 170 is 4.1% -- exactly the wood's rate, which is the number this world
-- has always quietly agreed on for country you travel through.

UPDATE rooms SET is_safe = 0 WHERE id IN (
  'the-first-fold',       -- a wall in a field
  'the-hanging-fold',     -- another wall in a field
  'the-far-shore-stone',  -- a bench, and the door into the Crossing
  'the-osier-island'      -- a gravel bank with withies on it
);
