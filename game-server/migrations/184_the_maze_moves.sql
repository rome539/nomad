-- THE MAZE MOVES (rome, 2026-08-09: the woodward should not be near any gate,
-- and the fix is to move his rooms rather than to re-den him).
--
-- =========================================================================
-- THE PROBLEM, STATED HONESTLY, BECAUSE IT IS MINE.
--
-- The woodward walks a six-room round through the wood's centre core, and that
-- core sat 6, 6, 6, 7, 7 and 8 rooms from the nearest gate. The wood is 172
-- rooms and runs 16 deep from its own doors — 49 rooms were further in than
-- anything the boss ever set foot on. He was in the front half.
--
-- He was not placed there. He was placed at 14. Then the road grew three
-- gatehouses onto the wood's edge — the Timber Stack, the Withy Hut, the Gate
-- Arch — and every one of them shortened the walk to him. Nobody moved the
-- woodward. The gates moved to him, and nothing re-measured after they did.
--
-- The fix is not a new den for him and it is not taking a gate away. It is what
-- rome said: move his ROOMS. All seven of them, together, still cut the same
-- way, still walked by the same round — re-hung on the far side of the world.
--
-- =========================================================================
-- WHERE THEY GO. The Grey Scrub, at the end of the heath: the westmost room in
-- the wood, 16 from the nearest way in, 10 from the nearest gate, and a dead end
-- with three free faces. The maze now hangs off its west side, so it is a
-- cul-de-sac behind a cul-de-sac. You go in the one door, and you come back out
-- of the one door, and that is the whole arrangement.
--
--   room               was   becomes
--   the Close Dark       7  ->  11
--   the Same Tree        7  ->  12
--   the Turned Ground    6  ->  13
--   the Listening Stand  7  ->  14
--   the Hollow Beeches   7  ->  15
--   the Heart of It      8  ->  15
--   the Bounds House     9  ->  16
--
-- The core becomes the deepest thing in the wood, past the keeper's holding at
-- 13. And measured the way a maze should be measured — a walker who does not
-- know it, never doubling back except at dead ends, 4,000 runs from random
-- gates — the median walk to find the Heart of It goes 762 rooms to 1,086, and
-- the share who never find it at all inside 3,000 rooms goes 9% to 33%.
--
-- Checked: all 410 rooms still reachable from the gates. Nothing is stranded.

-- ---- THE THREE SHALLOW DOORS ARE CUT. This is the whole of the change: the
-- core used to be entered from the shallow band by three parallel east-west
-- doors, which is why it was shallow. Each of those band rooms keeps every other
-- exit it has; they lose a wall, not their place in the wood.
DELETE FROM exits WHERE room_id = 'the-close-dark'     AND to_room = 'the-turning';
DELETE FROM exits WHERE room_id = 'the-turning'        AND to_room = 'the-close-dark';
DELETE FROM exits WHERE room_id = 'the-turned-ground'  AND to_room = 'the-close-ground';
DELETE FROM exits WHERE room_id = 'the-close-ground'   AND to_room = 'the-turned-ground';
DELETE FROM exits WHERE room_id = 'the-hollow-beeches' AND to_room = 'the-swallowing';
DELETE FROM exits WHERE room_id = 'the-swallowing'     AND to_room = 'the-hollow-beeches';
-- ---- AND THE STAIR. The Close Dark had a way down into the sunken wood, which
-- is 6 from a gate — leaving it would have made the entire move worth one room.
DELETE FROM exits WHERE room_id = 'the-close-dark'  AND to_room = 'the-sunken-wood';
DELETE FROM exits WHERE room_id = 'the-sunken-wood' AND to_room = 'the-close-dark';

-- ---- THE ONE DOOR. West off the Grey Scrub, which had nothing to its west.
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES
  ('the-grey-scrub', 'west', 'the-close-dark', NULL),
  ('the-close-dark', 'east', 'the-grey-scrub', NULL);

-- =========================================================================
-- AND THE CHART FOLLOWS THEM. A rigid translation — every room shifted by the
-- same (-10, -20) — so the seven keep their exact arrangement relative to each
-- other and the maze draws precisely as it always has, just somewhere else. The
-- cells they land on were empty; nothing is overdrawn.
UPDATE rooms SET map_x = map_x - 10, map_y = map_y - 20
  WHERE id IN ('the-close-dark', 'the-same-tree', 'the-turned-ground',
               'the-listening-stand', 'the-heart-of-it', 'the-hollow-beeches',
               'the-bounds-house');

-- =========================================================================
-- TWO ROOMS HAVE TO STOP SAYING WHAT THEY SAID.
--
-- The Turning was named for being the threshold — "the last place in this wood
-- where going back the way you came works" — and it is not a threshold any
-- more, it is an ordinary room with a wall on its west side. What it keeps is
-- the memory of being one, which is better than what it had: the wood used to
-- open here and now it does not, and the room is still standing where it did.
UPDATE rooms SET description =
  'The trees stand closer together west of here, and the ground begins to lift and fold in a way that means nothing in particular. There is no marker and no gate. There is a way through the trunks that the eye keeps taking for an opening, and it goes four paces and closes, and after the fourth or fifth time of walking into it you stop trying. Something used to be reached from here.'
  WHERE id = 'the-turning';

-- The Grey Scrub was the end of the wood — the place where it gives out. It is
-- now the door to the thickest wood there is, and the description has to carry
-- that, because a room that reads as an ending with an exit off it reads as a
-- bug. The joke of the place is that the wood does not give out at all; it
-- starts again, on the far side, all at once.
UPDATE rooms SET description =
  'Everything here is the same grey-green and the same height and none of it is a tree. The wood has given out and not been replaced by anything with a shape. And then, west, without any of the thinning or scrub or margin that ought to come first, it simply begins again — full-grown, close-standing, dark at head height, in a line as straight as a wall.'
  WHERE id = 'the-grey-scrub';
