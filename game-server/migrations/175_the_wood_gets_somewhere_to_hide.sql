-- THE WOOD GETS SOMEWHERE TO HIDE (rome, 2026-08-06: "are their any hiding
-- spaces for the woods? ... just add more to the woods").
--
-- WHAT WAS WRONG, measured across the world:
--
--   region      rooms  hideaways   worst walk to one   average
--     fortress    110      6              8              3.8
--     the wood    170      1             15              6.2
--     the road     68      1             18              9.1
--     the dens     60      1             12              6.5
--
-- The fortress's six are spread over its own sub-bands — the overworks, the
-- halls, the warrens, the deep — so no ONE of them is richly served; the point
-- is that you are never more than eight rooms from cover and usually four. The
-- wood has 170 rooms and exactly one hole to get into: the Charcoal Hut. (The
-- Withy Hut is flagged safe too, but it is a GATE — that is a bank, not a place
-- to lose something that is following you.)
--
-- And the wood is the region that most needs them. It is the one you get lost
-- in, it has a boss who walks it, a rut that fills it with things that hunt, a
-- quiet that makes every step audible, and wolves now contesting it with
-- hyenas. There was nowhere in all of it to put your back against something.
--
-- FIVE, CHOSEN FOR PROSE FIRST AND PLACEMENT SECOND. Every one of these already
-- reads as cover in its own description — not one word of room text changes, and
-- nothing is built. What changes is that the wood's own animals will not follow
-- you in, the way they will not follow you into a crack in the fortress wall:
--
--   THE HOLLOW YEW    "hollow enough to stand inside with room to turn round.
--                      The inside is dry and dark and smells of nothing at all."
--   THE FERN PIT      "Ferns four feet high covering the whole floor of the
--                      depression, unbroken" — you lie down and you are gone.
--   THE UNDER-ROOTS   a ceiling woven of root "you could not put a knife
--                      through". A roof is a roof.
--   THE FOX EARTHS    "dug through and through, holes at every angle." Something
--                      already worked out that this is the safe ground.
--   THE HOLLY HEDGE   laid and woven by hand, grown to twice its height. The one
--                      made thing among them, and holly is what a hedge is laid
--                      FROM because nothing gets through it.
--
-- WHAT IT COSTS THE WOOD, and it is the honest number: cover goes from a worst
-- walk of 15 rooms to 9, and an average of 6.2 to 4.1 — against the fortress's
-- 8 and 3.8. Near parity, not better. Five rooms out of 170 stop being huntable
-- ground, which is 3% of the maze, and every one of them is a dead end or a
-- thicket rather than a junction, so nothing about how the wood is crossed
-- changes. The Woodward is unaffected: a boss goes where it likes.
UPDATE rooms SET is_safe = 1 WHERE id IN (
  'the-hollow-yew',
  'the-fern-pit',
  'the-under-roots',
  'the-fox-earths',
  'the-holly-hedge'
);

-- NOT DONE, deliberately:
--
--   THE ROAD KEEPS ITS ONE. Its worst walk is 18, the longest in the world — but
--   a road is a line with gates on it and a wayside shelter halfway, and being
--   caught in the open on it is the thing the road is FOR. The maze is the case
--   that actually read wrong.
--
--   THE DEN GROUND KEEPS ITS ONE. Its hideaways are now something players make:
--   a barred den is a bolthole somebody carried iron out here to build, and that
--   number climbs on its own as people settle.
