-- THE GATE MOVES OFF THE WALL (rome, 2026-11-03): the Weeper's Arch stops being
-- a gate, and the Village Smithy in the burned village becomes one.
--
-- The fortress had three doors standing within four squares of each other on
-- its east face: the Broken Gate, the Weeper's Arch beside it and the Sally
-- Port under them. The smithy is the one roof in the village with its hearth
-- still in the wall, so the fire somebody keeps there is the gatehouse's.
-- It still counts as one of the fortress's doors (an entry room with no region
-- of its own reads as "gate"), so its keeper tells the garrison's story.
--
-- The arch keeps its stair down into the halls and its picture; it is only no
-- longer a bank, a gatehouse or a place to wake.
UPDATE rooms SET is_entry = 0 WHERE id = 'weeper-arch';
UPDATE rooms SET is_entry = 1 WHERE id = 'the-village-smithy';

-- Anyone who left the world at the arch, inside its gatehouse or outside it,
-- comes back one step over at the Broken Gate, inside its gatehouse if that is
-- where they were. Carvings set down in there go with them.
UPDATE players SET room_id = 'gate' WHERE room_id = 'weeper-arch';
UPDATE carvings SET room_id = 'gate' WHERE room_id = 'weeper-arch' AND inside = 'gatehouse';

-- And the arch says what it was (rome, 2026-11-03): a gate once, given up. Its
-- picture still shows the keeper's hatch and the lamp, so the words keep both.
UPDATE rooms SET description = 'A low arch on the dungeon''s eastern face, its keystone carved with a face worn smooth by rain into something that seems to grieve. Water beads and runs from it even in the dry. The dark descends beyond. This was a gate once, with a keeper behind it: the hatch in the wall beside the arch is boarded over now and nobody answers it, though the lamp on its bracket is still lit.'
  WHERE id = 'weeper-arch';
