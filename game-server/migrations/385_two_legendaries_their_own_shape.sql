-- 385: TWO LEGENDARIES, THEIR OWN SHAPE (2026-11-10). The hedge bill and the
-- Harvest were the same weapon (three caught in the arc, bleed 2, the keen
-- edge). The bill is now the one that opens things up: two in the arc, bleed 3,
-- and its crit wound as before; the Harvest stays the one that clears a room.
-- The Filed Edge was the plainest of the seven and is now the only fast one:
-- two swings at 4, where it had one at 5.

UPDATE item_templates SET sweep = 2, bleed = 3 WHERE id = 'the-hedge-bill';
UPDATE item_templates SET speed = 2, dmg = 4 WHERE id = 'the-filed-edge';
