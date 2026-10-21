-- THE COYOTES (2026-10-21). One pack of six, and the only hunters in the world
-- with no ground of their own.
--
-- Every other hunter keeps within three rooms of home, so the world's prey is
-- eaten unevenly: bare where the hunters live, full where they do not, and
-- nothing ever comes to even it out. The coyotes do. The pack weighs every
-- band it may range (road, wood, dens, crossing, out, mountain) by how full its
-- prey stands and how few other hunters share it, walks to the best of them,
-- hunts it down to RANGE_THINNED, and moves on - never to ground already eaten
-- down. It eats the smaller hunters it shares ground with too (the foxes, the
-- ermine, the snakes; a wildcat two at a time), so a band crowded with them
-- draws it in. On the way it eats what is dead, takes the most wounded animal
-- in a room first, and never kills a kind already scarce in that band. The
-- rules are in ai.rangePack and zone-data (RANGERS).
--
-- STATLINE. A grey wolf's teeth on a lighter body: 22 hp, 2-5. Six of them is
-- the danger - and once four are dead, the two left run (RANGE_BREAK_LOST). They test a lone wanderer the way a fed wolf does, and turn on
-- one who is badly hurt.
--
-- They start in the wood's first clearing, and the first weighing sends them
-- wherever the world is fullest. Ids given (mig 309).

INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('coyote-pelt', 'a coyote pelt',
   'A thin pelt, grey-brown over the back and tawny at the legs, with a black-tipped tail and big ears gone stiff. There is not much to it. It came off something that lived by being quick and being many, and was neither on the day it died.',
   'uncommon', 0, 0, 0, 0, '', 0, 0, 0, 1, 0, 0, 0, 5, 0);

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES (
  'coyote',
  'a coyote',
  'A lean, rangy dog of a thing, grey-brown with tawny legs, big ears and a narrow muzzle, and the look of something that has come a long way and means to go further. It is never alone. Where there is one the others are a room off, and they have already seen you.',
  3, 22, 2, 5, 900, 0,
  'coyote-pelt', 0.35,
  0,
  NULL, 0,
  1, 0
);

INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-coyote-1', 'coyote', 'the-first-clearing'),
  ('spawn-coyote-2', 'coyote', 'the-first-clearing'),
  ('spawn-coyote-3', 'coyote', 'the-first-clearing'),
  ('spawn-coyote-4', 'coyote', 'the-first-clearing'),
  ('spawn-coyote-5', 'coyote', 'the-first-clearing'),
  ('spawn-coyote-6', 'coyote', 'the-first-clearing');
