-- 186 pockets, not pelts (rome, 2026-08-10): cigarettes come off things with
-- HANDS from here on. A rat does not carry a tin. A hyena has nowhere to put
-- one. The hard currency of this world is a thing PEOPLE kept, and it should
-- only ever be found where a person kept it -- in a coat, in a pack, on a body
-- that had pockets. That is the whole rule, and it is worth more than the
-- numbers under it: a player who works out that smokes come off men and not
-- off animals has learned something true about what smokes ARE.
--
-- Seven animals lose them. The volume does not leave the world -- it moves to
-- the dead who could plausibly have been carrying it, and it stays in the same
-- ground it came from, so no region gets richer or poorer for this.

-- ---- OFF THE ANIMALS ------------------------------------------------------
-- The albino rat is the big one: 30%, the deep's own source, tied with the
-- three kings. It keeps everything that made it worth hunting (pale pelt at
-- 85%, the hide hood) -- it simply stops being a tobacconist.
DELETE FROM mob_keys
 WHERE key_item IN ('dry-cigarettes', 'crushed-pack', 'hand-rolled-smokes')
   AND template_id IN (
     'albino-rat',      -- 0.30  the deep's volume
     'three-hound',     -- 0.10  the sentinel's jaws
     'two-hound',       -- 0.01
     'fleet-rat',       -- 0.005
     'brood-rat',       -- 0.005
     'dire-hyena',      -- 0.005
     'pale-stalker'     -- 0.005
   );

-- ---- ONTO THE DEAD WHO HAD COATS ------------------------------------------
-- What came off the animals was ~0.58 tins per full clear of the world, and
-- ~0.44 of that was the albino rat alone -- all of it in the deep and the
-- fortress. So it goes back to the deep and the fortress, spread across four
-- bodies that nothing has ever found smokes on, at rates weighted by how many
-- of each actually stand in the world (spawn census, not vibes):
--
--   a rattling skeleton      4.6 alive  x 0.03  = 0.138
--   a barrow-wight           9.0 alive  x 0.02  = 0.180
--   a marrow-cantor          4.0 alive  x 0.02  = 0.080
--   the mire-walker         11.0 alive  x 0.015 = 0.165
--                                       total  ~ 0.563
--
-- against 0.584 removed. The world's supply is flat; where you go to get it
-- has changed. Rare packs rather than the tin, because these are men who died
-- with what was in their pocket, not men who kept a tin dry on purpose.
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('skeleton',        'crushed-pack',       0.030),  -- the fortress's own dead, in what is left of a coat
  ('twice-dead',      'crushed-pack',       0.020),  -- a barrow-wight: buried with his hands full
  ('marrow-cantor',   'hand-rolled-smokes', 0.020),  -- somebody rolled these down in the dark
  ('the-mire-walker', 'hand-rolled-smokes', 0.015);  -- gone soft in the wet, and still lighting

-- ---- AND THE KEEPER COMES DOWN A LITTLE ------------------------------------
-- He was the single best rate in the game at 50% -- a boss on a 30-minute
-- respawn standing on a known floor, which is one tin an hour to anyone who
-- can take him, more than every other source put together. 0.35 leaves him
-- plainly the best man in the world to kill for smokes (the three kings sit at
-- 0.30) without making him a tap you can stand under. He is still the one
-- person in this world who would actually have kept a tin.
UPDATE mob_templates SET loot_chance = 0.35 WHERE id = 'the-keeper-of-the-holding';

-- The men who already carried them are otherwise untouched: the three
-- kings (0.30), the carrier (0.12), the chainman (0.10), the wayman (0.10),
-- and the 0.5% baseline on cutpurses, cutthroats, bone-knights, wardens, the
-- watchman, the captain, the drowned, the hulk and the cairn-wight.
