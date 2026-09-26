-- THE DEEP STOPS BEING A STAIR (rome, 2026-09-26: the deep was one straight
-- shot to the boss; give it more ground, and give the king rooms of his own).
--
-- The fastest way to the Forgotten King was six rooms, every one of them the
-- `down` of the last: descent, nave, silted stair, processional, threshold,
-- throne. Everything else in the deep hung off that line as a side-trip you
-- could skip. And the throne room was a crossroads — oratory, court, reliquary
-- and death cell all opened straight onto the dais, so the king sat in the
-- middle of the traffic instead of at the end of it.
--
-- This is the first half of the fix: the cuts. Migration 291 (generated from
-- regions/the-deep-2.rooms) lays the new ground, and 292 stitches the two
-- seams the pipeline cannot lay without mis-drawing the map, then stocks it.
--
-- THE CUTS
--   the Nave no longer drops to the Silted Stair — the first floor has to be
--     crossed now, west through the Weeping Cells to the charnel chute or east
--     down the roots of the Root-Choked Vault.
--   the Silted Stair no longer drops to the Processional — it goes down into
--     the Bone Choir instead (292), and the Choir is what opens on the court.
--   the throne loses every door but the hoard's. The court, the oratory, the
--     reliquary and the death cell become a ring around the king's rooms that
--     never opens onto them; the only way in is the Black Threshold's stair.
--
-- The throne and the hoard move on the paper to the squares under the new
-- stair, because their old squares are where the stair and the Waiting Hall
-- now stand. They keep their ids — the king, the treasury door, the reliquary
-- cache and every look-line keyed on them carry over untouched.

DELETE FROM exits WHERE room_id = 'drowned-nave'      AND dir = 'down';
DELETE FROM exits WHERE room_id = 'silted-stair'      AND dir = 'up';
DELETE FROM exits WHERE room_id = 'silted-stair'      AND dir = 'down';
DELETE FROM exits WHERE room_id = 'bone-processional' AND dir = 'up';
DELETE FROM exits WHERE room_id = 'black-threshold'   AND dir = 'down';
DELETE FROM exits WHERE room_id = 'kings-oratory'     AND dir = 'down';
DELETE FROM exits WHERE room_id = 'drowned-court'     AND dir = 'down';
DELETE FROM exits WHERE room_id = 'bone-reliquary'    AND dir = 'south';
DELETE FROM exits WHERE room_id = 'the-death-cell'    AND dir = 'north';
DELETE FROM exits WHERE room_id = 'sunken-throne'     AND dir IN ('up', 'west', 'east', 'north', 'south');

UPDATE rooms SET map_x = 6, map_y = 55 WHERE id = 'sunken-throne';
UPDATE rooms SET map_x = 7, map_y = 56 WHERE id = 'kings-hoard';
