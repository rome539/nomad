-- 196 no bolthole on the road (rome, 2026-08-11: "you also added so many
-- fucking hiding spots all in the fucking worst places").
--
-- THE RULE I BROKE, stated so it does not get broken again:
--
--     A HIDEAWAY IS SOMEWHERE YOU GO OFF THE ROUTE TO REACH.
--     NEVER A ROOM ON THE ROUTE ITSELF.
--
-- Every safe room in this world before the Crossing obeyed it without anyone
-- writing it down. The wood has seven in a hundred and seventy rooms and every
-- one is a fox earth, a hollow yew, a fern pit -- a pocket you leave the path
-- for. The road's are shelters at the verge. The fortress's are cracks.
--
-- The Crossing shipped with SIXTEEN, the most of any region in the game, in the
-- one region whose entire premise is that being out in the open over water is
-- the cost of getting anywhere. Eight of them sat directly on a crossing route:
-- two on the bridge span (so the bridge could be walked with a guaranteed
-- bolthole at the middle AND the end), one past the deep channel on the ferry,
-- and FIVE in the eyots -- in the reed maze, whose whole threat is that you
-- cannot see and something is alongside you one cut over. A room nothing will
-- follow you into is not a refuge there. It is immunity, and it deletes the
-- reason the reed exists.
--
-- Eight lose it. What is left is six, and each one earns it:
--
--   the-refuge                 THE MECHANIC. The causeway's one dry hole, at
--                              the middle, never floods at any tide. Caught out
--                              with the road going under both ways you run for
--                              the stone box and wait. Take this away and the
--                              sea is just a wall.
--   the-ferry-house            a GATE. Gates are safe by their nature.
--   the-bothy-of-the-crossing  a dead-end spur off the marsh track, with the
--                              rule cut into its lintel. The correct shape: you
--                              leave the way to get to it.
--   the-fisher-huts            behind the storm beach, on settled ground.
--   the-pan-house              likewise, and a dead end.
--   the-shingle-stair          the seat at the end of the world, facing the
--                              mountain. The region's full stop.
--
-- Note where those six are: one on the causeway because the tide demands it,
-- one because it is a gate, and four on land behind the water. NONE of the five
-- ways over has a bolthole on it any more. That is the point.
--
-- 6 in 203 rooms is now the thinnest cover of any surface region in the game
-- (the wood 4.1%, the road 6.5%, the Crossing 3.0%), which is right for the
-- place you are most exposed.

UPDATE rooms SET is_safe = 0 WHERE id IN (
  -- the bridge: a span you could cross with a guaranteed bolthole twice over
  'the-second-pier',
  'the-far-arch',
  -- the ferry: past the deep channel, which is the exact moment it should cost
  'the-boat-house',
  -- the eyots: five, in a maze whose only threat is not being able to see
  'the-first-eyot',
  'the-chapel-eyot',
  'the-cutters-eyot',
  'the-eel-hut',
  'the-hook-hut'
);

-- And two on the far strand that were simply surplus -- settled ground behind
-- the water is the right place for shelter, but five of them in one quarter is
-- a dormitory, not a coast.
UPDATE rooms SET is_safe = 0 WHERE id IN ('the-smoke-house', 'the-passengers-rest');
