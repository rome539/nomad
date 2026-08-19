-- 242 what the mountain keeps (rome, 2026-08-19).
--
-- He asked what about chests, and the answer was that the mountain had none —
-- the only band in the world without a locked layer:
--
--     road 7 · fortress 7 · wood 5 · crossing 4 · den 2 · out 1 · MOUNTAIN 0
--
-- A cache is the tier above floor loot: it wants a key, it refills on its own
-- clock, and it is a reason to carry something up and a reason to come back.
--
-- THE TENSION, and it is real: a chest is a MADE THING somebody built and
-- locked, and this region's whole ruling is that nobody built anything up there.
-- His answer was both halves — boxes at the foot where people actually live, and
-- something that is not furniture higher up. So:
--
--   THE FOOT (3). Two of the four doors are lived in by somebody who came up
--   with the summer people and stayed, and a person living alone on a hillside
--   owns a box. These are ordinary strongboxes and they sit where the ruling
--   already allows people.
--
--   ABOVE IT (3). Not furniture: a CACHE, which is what a person carrying too
--   much up a mountain actually does — you leave what you cannot carry, under a
--   cairn or wedged in a cleft, and you come back for it. Nobody came back for
--   any of these. They are still locked because the kind of man who caches his
--   kit at four thousand feet is the kind who locks it, and the key went down
--   the hill inside something.
--
-- WHICH IS HOW YOU OPEN THEM, and it needs no new mechanic — only the precedent
-- the world already set with the dire-hyena, which drops a strongbox key at 0.04
-- because it ate somebody who was carrying one. Two mountain lines get the same:
-- the GLUTTON, which takes carcasses off whatever killed them, and the CARRION
-- VULTURE, which is standing on the results. Or you bring a key up from the
-- road. Or you do it the way the world has always allowed and put a rock through
-- the latch — which is why this migration also puts loose rock on the ground at
-- the foot, in a region made entirely of the stuff, where until now there was
-- not one throwable stone to pick up.
--
-- LOOT POOLS follow the same curve as mig 241: what is in the foot's boxes is
-- what a shieling-dweller owns, and what is in the high caches is what somebody
-- carried up and could not carry further. The territory's is the best of it.

INSERT OR IGNORE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
  ('shieling-kist', 'the-shieling', 'a kist under the bed-shelf',
   'A low box of dark wood with a hasp on it, pushed under the stone shelf that runs along the back wall, out of the smoke. It is the only thing in this hut that was made somewhere else and carried up, which tells you what is in it matters to whoever sleeps here.',
   'strongbox-key', 1200),

  ('stell-strongbox', 'the-stell', 'a strongbox under the turf',
   'A squat iron box set into the wall of the ring where the stones were pulled out for it and packed back round, with only the lid showing and the lid gone the same colour as the turf. You would walk past it. Somebody did not want it found by anybody who was not looking.',
   'strongbox-key', 1200),

  ('slabs-locker', 'the-slabs', 'a locker in the joint',
   'Wedged into the crack under the roofed slab, at the dry end, where the water has never reached: a long box banded in iron with the banding gone to rust everywhere the wet gets and bright everywhere it does not. It has been opened a great many times by somebody who knew exactly how far to lift the lid.',
   'strongbox-key', 1200),

  ('cairn-cache', 'the-cairn-line', 'a cache under the cairn',
   'The bottom courses of the cairn are packed with turf rather than laid dry, and behind the turf there is a box. Somebody built a marker over their own kit, which is either very clever or the act of a person who had already decided they were coming back this way. The turf has not been disturbed in a long time.',
   'strongbox-key', 1800),

  ('cleft-cache', 'the-chimney-foot', 'a box wedged in the cleft',
   'Arm-deep in the crack, past where the daylight goes, there is a corner of something square. It is jammed and it is meant to be: whoever put it there hammered a wedge in behind it. Getting it out is a job. Getting it open is another one.',
   'strongbox-key', 1800),

  ('ridge-cache', 'the-shoulder-stone', 'a cache under the stone',
   'Under the lip of the boulder, on the dry side, out of the weather and out of the wind and out of sight of the air: a box with a strap round it that has perished and let go. Whoever left this was going up light and meant to be back before dark. The stone above it holds the last drinkable water on this mountain, so he had a reason to pick it.',
   'strongbox-key', 2400);

-- ---- what is in them -------------------------------------------------------
-- Same curve as the floor gear: what people owned at the bottom, what they
-- carried at the top, and the best single thing on the ridge.

INSERT OR IGNORE INTO cache_loot (cache_id, item_id, chance) VALUES
  -- the foot: a hill-dweller's box. Warm things, cured things, a spare blade.
  ('shieling-kist', 'hide-cloak', 0.30),
  ('shieling-kist', 'moss-lined-boots', 0.25),
  ('shieling-kist', 'hardtack', 0.40),
  ('shieling-kist', 'linen-dressing', 0.35),
  ('stell-strongbox', 'drovers-frock', 0.28),
  ('stell-strongbox', 'burners-hatchet', 0.25),
  ('stell-strongbox', 'hardtack', 0.40),
  ('stell-strongbox', 'strongbox-key', 0.10),
  ('slabs-locker', 'thick-hide-jack', 0.28),
  ('slabs-locker', 'hobnailed-boots', 0.25),
  ('slabs-locker', 'pitted-spear', 0.22),
  ('slabs-locker', 'linen-dressing', 0.35),

  -- above the doors: what somebody carried up and could not carry further.
  ('cairn-cache', 'wolfskin-cloak', 0.28),
  ('cairn-cache', 'mail-hauberk', 0.24),
  ('cairn-cache', 'chipped-falchion', 0.24),
  ('cairn-cache', 'hardtack', 0.30),
  ('cleft-cache', 'boiled-cuirass', 0.22),
  ('cleft-cache', 'white-hide-boots', 0.20),
  ('cleft-cache', 'headtaker-axe', 0.20),
  ('cleft-cache', 'linen-dressing', 0.30),
  ('ridge-cache', 'white-hide-mantle', 0.22),
  ('ridge-cache', 'riveted-cuirass', 0.20),
  ('ridge-cache', 'graveblade', 0.20),
  ('ridge-cache', 'hardtack', 0.30);

-- ---- and the key, off the two things that eat the people who carried them ---
-- The dire-hyena's rule (0.04), stated for the mountain: the glutton takes
-- carcasses off whatever made them, and the vulture is standing on the results.
INSERT OR IGNORE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('glutton', 'strongbox-key', 0.05),
  ('carrion-vulture', 'strongbox-key', 0.03);

-- ---- something to hit a latch with -----------------------------------------
-- A rock through the hasp has always been the answer for anybody without a key
-- (zone.ts, cmdOpen), and the mountain — a region made entirely of rock — had
-- not one loose stone on the floor to pick up. Four, at the foot, where the
-- ground is doing nothing but shedding them.
INSERT OR IGNORE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('loose-rock', 'the-stone-river',    1),
  ('loose-rock', 'the-fan',            1),
  ('loose-rock', 'the-shifting-ground',1),
  ('loose-rock', 'the-sorted-ground',  1);
