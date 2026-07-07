-- The deep's gateway moves down into The Undercroft: the heart-door and the
-- hound now guard it TOGETHER, at one threshold, instead of sitting two rooms
-- apart with an empty vestibule between.
--
-- Geography now: The Vaulted Hall drops FREELY through its hatch into The
-- Undercroft (the antechamber). There the three-headed hound holds the stone
-- throne (the room's own prose: "a throne of piled stone faces the hatch
-- above"), and the stair DOWN out of the Undercroft into the deep is the
-- heart-door. So the gateway is one place: sneak past the sleeping hound ONCE
-- (it wakes, and everyone after has to fight it), and press a still-cold heart
-- to the sealed stair to descend.
--
-- 1) Heart-door: relocate the lock from the hall's hatch (hall->undercroft) to
--    the stair out of the undercroft (undercroft->the-descent).
UPDATE exits SET key_item = NULL     WHERE room_id = 'hall'       AND dir = 'down' AND to_room = 'undercroft';
UPDATE exits SET key_item = 'deep-heart' WHERE room_id = 'undercroft' AND dir = 'down' AND to_room = 'the-descent';

-- 2) The hound onto the throne in the Undercroft, right where you drop in.
UPDATE mob_spawns SET room_id = 'undercroft' WHERE id = 'hound-1';
