-- 064: the gate moves out to the open ground (rome, 2026-07-10).
-- Extraction means getting OUT of the structure: the Old Road becomes the
-- waystation gate — the grounds' bank anchor and the far extract — and the
-- sewer stops counting as "out": still a way in, a thief's door, but no
-- keeper, no bench, no seal. Side effect, intended: gate-status repelled
-- creatures; the demoted sewer opens as a corridor, and the fen leaks into
-- the west wing through the hole in the wall.
UPDATE rooms SET
  is_entry = 1,
  name = 'The Waystation',
  description = 'The road away runs west into a wall of thorn grown higher than a man, and whatever is beyond it does not answer. Here at the last milestone someone keeps a toll-house: cold iron, patient scales, a lamp that stays lit — the dungeon''s writ runs even under open sky. Names are scratched into the milestone by people who meant to come back.'
WHERE id = 'the-old-road';

UPDATE rooms SET
  is_entry = 0,
  description = 'Not a door at all — a broken drain in the marsh where the dungeon voids its old water. The grate above hangs torn open: a way in for the quiet and the desperate, and nothing more. No iron here will hold your goods or seal your claims. Things from the fen pass through, and the walls pretend not to know.'
WHERE id = 'sewer';

-- Every gate threshold keeps a torch; the waystation joins them.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES ('torch', 'the-old-road', 1);
