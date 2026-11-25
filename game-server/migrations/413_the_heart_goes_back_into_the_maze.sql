-- THE HEART GOES BACK INTO THE MAZE (2026-11-25).
-- Mig 407 (the wood's new ways west, built with the cave) ran the Old Growth's
-- north way from the Mounting Block along the Cut Line and through a new door
-- into the Bounds House, which stands one room east of the Heart of It. That
-- door put the woodward nine steps from the Gate Arch; through the maze he had
-- been forty-two. The door was never needed: the old growth has four separate
-- ways in without it, and the cave keeps all six. The Cut Line and the Tally
-- Posts stay, a ride off the Mounting Block that ends at the coppice line.
DELETE FROM exits WHERE room_id = 'the-bounds-house' AND dir = 'east' AND to_room = 'the-cut-line';
DELETE FROM exits WHERE room_id = 'the-cut-line' AND dir = 'west' AND to_room = 'the-bounds-house';
