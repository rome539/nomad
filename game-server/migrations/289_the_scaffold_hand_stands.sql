-- THE SCAFFOLD HAND COMES DOWN OFF THE ROPE (2026-09-14)
--
-- He shipped hanging upside down in a harness under the arch, and that could
-- never be drawn or placed. Every creature in this game is positioned by its
-- FEET, on the standing line the room's picture gives it; there is no ceiling
-- in the renderer to hang anything from. A hanging sprite is stood on its own
-- head in the middle of the floor with its rope running up into open sky and
-- stopping.
--
-- The creature survives the change intact, because the horror was never the
-- inversion - it is that the work did not stop. A scaffold hand worked with his
-- arms over his head all day; that is the only posture the trade has. So he
-- keeps it, standing under the broken arch, dressing a soffit that went into
-- the channel with the span.
--
-- Prose changed with it in the same pass (detail.ts look text, STILL_SOUNDS,
-- the two ambient lines). Nothing else about him moves: same id, same stats,
-- same room, same loot, same HOLLOW and GRAVE_FLESH membership.
UPDATE mob_templates
   SET description = 'Standing under the broken arch with both arms up over his head, dressing the underside of a span that is not there any more. The scaffold came down two centuries ago. He did not come down with it, and he has not put his arms down since.'
 WHERE id = 'the-scaffold-hand';
