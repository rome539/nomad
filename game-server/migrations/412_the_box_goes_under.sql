-- THE BOX GOES UNDER THE STONE (cave-plan.md, the Ring of Nine; 2026-11-25).
-- The box of dressed stone stood in the Worn Hollow beside the sleeper, opened with
-- the key that comes out of it. It belongs below, in the Box Chamber of the
-- under-stone, as what you find for reading the ring: the room's own words already
-- describe it standing there, and until now that box was only words.
-- AND IT HAS NO LOCK. Behind a puzzle only the cave can teach you, a boss's key as
-- well asked for the same thing twice; the ring is the lock. It opens to the hand,
-- as the secret doors' prize boxes do (key_item ''), keeps its id, its refill and
-- what it holds, and its words and the room's lose the keyhole.
UPDATE caches
   SET room_id = 'the-box-chamber',
       key_item = '',
       description = 'A long box of the dressed stone, standing exactly in the middle of the floor, its lid a single slab fitted so close it might be one stone with a line drawn on it. There is no lock on it: nothing holds the slab down but its weight.'
 WHERE id = 'box-stone';
UPDATE rooms
   SET description = 'A square chamber with nothing in it but a box: a long box of the same flat dressed stone as the floors above, its lid a single slab with no lock on it and no keyhole, held shut by nothing but its weight. The box stands on the floor exactly in the middle of the room. Everything else down here was put by hand. This was put first.'
 WHERE id = 'the-box-chamber';
