-- THE DEPTH EDGES, PART ONE: THE BELLS (2026-08-29). The depth audit's
-- shortlist, the two made things it needs item rows for:
--
--   THE CAST CLAPPER is the pour the bellfounder has been waiting two
--   centuries for (mig 194's own text: "there is no pour"). It is made, never
--   found: at the bell-pit, while the founder lives, `unlock the mould` with a
--   lump of bell-metal in the pack. Kill the founder and the pit goes cold and
--   the pour is shut for as long as he is down (1500s), not forever — bias,
--   never a trigger. The clapper rings like the
--   drowned bell, but true and carrying: its note travels a whole band.
--
--   THE UNBOUND WETHER'S BELL is the glassed stone's promised edge finally
--   used: `unlock` a bound wether's bell with a glassed stone and the wire
--   parts — somebody stopped it ringing on purpose, and now it rings again.
--   Both near-orphans from the audit pay each other off in one action.

-- OR REPLACE, like every other migration in this tree. A bare INSERT here made
-- this the one file that could not be run twice: a ship applies its migrations
-- one at a time, and an interrupted ship retried from the top would have died
-- on a UNIQUE constraint at this line with nothing wrong with the world.
INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed,
   sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('cast-clapper', 'a cast clapper',
   'A bell''s tongue, cast in the bell-pit two centuries after the mould was cut, and the founder himself tapped it and heard the note come back true. It rings a long, clean, carrying note — the note a bell was waiting to be hung in. It has been waiting for a bell.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 14, 0, ''),

  ('wether-bell-free', 'a wether''s bell, unbound',
   'A flat iron bell off the neck of the lead sheep, with the wire that stopped it ringing cut clean away. It rings now — flat and plain, the note of a flock finding its way in cloud. There is no flock on this mountain to find, and for the first time in a long while that is not the bell''s fault.',
   'common', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 4, 0, '');
