-- THE NEW MILE IS WALKED (the population half of mig 158's ten rooms).
--
-- Same standard as the drove got: the road runs 0.23 spawns to the room, so ten
-- rooms earn two or three, placed on what the prose already says rather than
-- scattered. The heath and the wind row are the two that ask for something.
--
--   the open heath   — "You can see a very long way. So can everything else."
--                      Nothing to put your back to, in either direction. A dog
--                      that has been living off this heath is the obvious thing
--                      and the room was written for it.
--   the wind row     — the hedge's noise "covers everything else", which is a
--                      description of an ambush whether or not I meant it that
--                      way when I wrote it. A footpad uses what a road gives.
--   the smithy ruin  — nobody waits in a pocket; what a pocket holds is what
--                      got left. Scrap iron, in a smithy, forever.

INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-mile-1', 'masterless-dog', 'the-open-heath'),
  ('spawn-mile-2', 'footpad',        'the-wind-row');

-- What lies about. The smithy is the only place on either road that regrows
-- scrap, which is the forge's small unit — a wayside smith's floor is exactly
-- where beaten scale and cut-offs would still be underfoot two centuries on.
-- The hollow elm has ash in the bottom of it and people plainly shelter there,
-- so it keeps a torch the way the road's other shelters do.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('scrap-iron', 'the-smithy-ruin',      1),
  ('torch',      'the-hollow-elm',       1),
  ('loose-rock', 'the-culvert',          1),
  ('sloes',      'the-wind-row',         1),
  ('watercress', 'the-culvert',          0);

-- THE CARRIER NOW WALKS IT (PATROLS, zone-data.ts — code, not data). His route
-- ran the-long-straight -> the-weed-paving, which was the exact seam this
-- stretch was threaded into, so without the update his legs stopped being
-- adjacent there and the whole patrol would have quietly fallen back to
-- wandering. All eight new spine rooms are in his round now, out and back: 64
-- stops where it was 49. He was already the longest walk in the game by a wide
-- margin and he is now a third longer again, which is the point of him — a road
-- patroller you meet every few minutes is not going anywhere.
