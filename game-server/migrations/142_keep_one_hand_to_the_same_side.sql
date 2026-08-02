-- KEEP ONE HAND TO THE SAME SIDE (rome, 2026-08-02: "the lying maze is too
-- brutal") — the wood gets a way out you can LEARN.
--
-- The brutality was never the lying. It was that there was no rule underneath
-- it. Measured on the real graph: from inside a core, following WEST cycles
-- forever and escapes NONE of the eight. Every core, every starting room, an
-- infinite loop. So the only way out was luck — about 23 expected steps of it —
-- and no amount of playing well shortened that by a single step. That is not a
-- maze, it is a dice roll you cannot influence.
--
-- The oldest real answer to a maze is the wall-follow: keep one hand to the same
-- side and you come out. The wood gets that, and NOTHING else changes. The cores
-- still lie about direction. Turning round still never retraces. Every room
-- still carries all four compass points. You can still be thoroughly, properly
-- lost. What you cannot be any more is trapped.
--
-- MEASURED, NOT ASSUMED. Following west across the whole wood is a functional
-- graph — one exit out of every room — so it drains into a fixed number of
-- closed loops. There are NINE, and they cross between cores (west out of core E
-- lands in core D), which is why this is nine doors and not one per core. One
-- room on each loop has its west exit turned onto the honest band, so every core
-- room in the game reaches daylight by keeping west, in at most 12 steps.
--
-- Two earlier passes of this were wrong and the checker caught both: the first
-- converted the head of the PATH rather than a member of the CYCLE (14 rooms
-- still trapped), the second treated the loops as per-core when they are not.
-- The verification is: walk west from all 82 core rooms and require every one to
-- leave. It does now.
--
-- Expected cost of being lost drops from ~23 steps to at most 12, and to nearly
-- nothing for a player who has worked the rule out. The clerk of the woodmote
-- already reads a perambulation that six men attempted and none finished — and
-- notes that two came out where they went in. Those two kept a hand on the same
-- side.

UPDATE exits SET to_room = 'the-hornbeam-row' WHERE room_id = 'the-ant-hills' AND dir = 'west';
UPDATE exits SET to_room = 'the-mire-edge' WHERE room_id = 'the-eel-ditch' AND dir = 'west';
UPDATE exits SET to_room = 'the-charcoal-flat' WHERE room_id = 'the-bottom-of-it' AND dir = 'west';
UPDATE exits SET to_room = 'the-boar-ground' WHERE room_id = 'the-broken-ground' AND dir = 'west';
UPDATE exits SET to_room = 'the-alder-carr' WHERE room_id = 'the-black-alders' AND dir = 'west';
UPDATE exits SET to_room = 'the-broken-avenue' WHERE room_id = 'the-black-loam' AND dir = 'west';
UPDATE exits SET to_room = 'the-mire-edge' WHERE room_id = 'the-black-pool' AND dir = 'west';
UPDATE exits SET to_room = 'the-ash-stand' WHERE room_id = 'the-listening-stand' AND dir = 'west';
UPDATE exits SET to_room = 'the-crow-roost' WHERE room_id = 'the-birdless-acre' AND dir = 'west';
