-- Every rung of the armor ladder buys something real (rome's audit, 2026-07-10).
-- The mail-hauberk earned its 7 in code (MAILWARD: edges skate off the rings);
-- these reprice its neighbors so nothing at the fence is a strictly-worse buy:
--   scavenger-coat 6 -> 8   armor 2 with NO weight is the premium comfort pick;
--                           it must not undercut the warded hauberk at 7
--   thick-hide-jack 8 -> 10 its ward now turns bleeds AND leg-rakes, the best
--                           defensive package in the low tier
--   rusted-sallet   4 -> 2  heavier than the leather cap with nothing to show
--                           for it; now it's the cheap steel option instead
--   ironshod-boots  4 -> 2  same cure for the same disease (worn-boots at 3
--                           were lighter AND cheaper)
UPDATE fence_stock SET cost = 8  WHERE item_id = 'scavenger-coat';
UPDATE fence_stock SET cost = 10 WHERE item_id = 'thick-hide-jack';
UPDATE fence_stock SET cost = 2  WHERE item_id = 'rusted-sallet';
UPDATE fence_stock SET cost = 2  WHERE item_id = 'ironshod-boots';
