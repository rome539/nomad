-- THE POST IS NOT A DOOR (rome, 2026-08-04: "I SAID CUT The Roadwarden's Post
-- NOT THE FUCKING OTHER GATE").
--
-- He named the room the first time and he named it again. Mig 173 cut the First
-- Milestone instead, on my reading of the walk-lengths — I said what the trade
-- was, he reaffirmed, and that is the end of the argument. This puts it where he
-- asked: the road's one door is THE FIRST MILESTONE, and the Roadwarden's Post is
-- ordinary road.
UPDATE rooms SET is_entry = 1 WHERE id = 'the-first-milestone';
UPDATE rooms SET is_entry = 0 WHERE id = 'the-roadwarden-post';

-- WHAT THIS DOES TO THE WORLD, recorded because it is large and it is deliberate:
--
--   the road's worst walk to a bank .... 11 -> 21 rooms (The Drover's Stance)
--   rooms that get further from a bank .. 60
--
-- The road's one door now stands four rooms out from the fortress, and everything
-- west of the ford banks by walking back. The far road, the Mustering Yard and the
-- whole approach to the den ground become a long carry past the throat — which is
-- a harder world out there, not a broken one: the wood still holds three doors of
-- its own within ten rooms of anywhere in it, and the den ground's own worst walk
-- is unchanged at 14 because the wood's gates are what serve it.
--
-- The Post keeps everything except the bank: the carrier still walks his route
-- through it, the room and its prose are untouched, and being un-gated makes it
-- ordinary road — weather, dark, and creatures that may now wander over it. The
-- keeper-telling is keyed to the REGION, so the road's story is still told, at
-- the Milestone.
