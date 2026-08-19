-- 229 what lives in the middle (rome, 2026-08-19). Mig 228 is 76 rooms of the
-- mountain's second tier. This is what is on them.
--
-- THE RULING HOLDS: the mountain is NOT FOR PEOPLE, so this is animals again,
-- and the tier's own idea carries into the roster. The foot was defined by where
-- we stopped; the middle is not defined by us at all. Nothing in this file has
-- ever seen a person or has any opinion about one.
--
-- WHAT MAKES IT HARDER THAN THE FOOT IS NOT BIGGER NUMBERS. Altitude is the
-- difficulty curve and the curve is DENSITY: 0.6 here against the foot's 0.4,
-- 48 spawns over 79 rooms. The stat ladder has almost no headroom left in this
-- game (the hardest thing in the world takes 15-17 rounds to kill and puts a
-- medium build down in 10), so a tier that got "worse" by inflating hp and
-- damage would break the whole table. It gets worse by being busier, by having
-- less cover on the north side and too much on the south, and by containing the
-- first thing on this mountain that hunts something as big as a deer.
--
-- MOSTLY REUSE, WHICH IS THE POINT. Nine of the thirteen lines standing on this
-- tier already exist — the ptarmigan, the hare, the hind and the stag, the goat
-- and the billy, the raven, the eagle, the fox, the wildcat and the adder. They
-- are mountain animals living one tier up, which is what mountain animals do,
-- and reusing them means this tier's web is continuous with the foot's rather
-- than a separate invention stacked on top of it. FOUR new lines, and each one
-- earns its place by doing something no existing line does:
--
--     lynx      52hp 5-9 a1   the first thing that can take a HIND
--     ermine    18hp 3-5 a0   kills far above its weight, and works the snow
--     eagle owl 40hp 5-8 a0   the night shift, where the eagle is the day one
--     snow hare      (variant) rare blood off the hare, at the top of its range
--
-- THE STAG IS STILL UNTOUCHABLE, and I want that on the record as a decision
-- rather than an oversight for the second time. A lynx takes hinds and it takes
-- calves; it does not take a mature stag, which at 48hp/4-8 outweighs it in
-- every sense that matters. The animal that can have him lives higher than this.
--
-- THE WEB, and the statline law this table has always kept — the predator
-- genuinely outstats the prey ALONE, or it needs the pack:
--
--     ptarmigan 10hp 1-2 · hare 12hp 1-2 · ermine 18hp 3-5
--     hind 30hp 2-4 · goat 26hp 2-5
--     fox 22 · wildcat 28 · owl 40 · eagle 34 · lynx 52
--
--     lynx   -> hind, goat, hare, ptarmigan     52/5-9 against 30/2-4: clean
--     owl    -> hare, ptarmigan, ERMINE         40/5-8 against 18/3-5: clean,
--               and an owl taking a stoat off the snow at night is exactly what
--               an owl that size is for
--     ermine -> hare, ptarmigan                 18/3-5 against 12/1-2: clean.
--               A real ermine kills things much bigger than this and the table
--               does not let me say so, which is the right kind of constraint.
--
-- THE LOCHAN HAS NOTHING IN IT, deliberately. Mig 228's prose says nothing rises
-- in it — too cold, too deep, too poor — and a fish spawn here would quietly
-- make a liar of the room. An absence that the ground states out loud is worth
-- more than one more line on the table.

-- ---- what they leave -------------------------------------------------------

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed,
   sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('lynx-pelt', 'a lynx pelt',
   'Smoke-grey and spotted, thick as a folded blanket through the shoulder, with the black ear-tufts still on it and a tail far too short for the size of the animal. The feet are the surprising part: broader than your palm, and furred underneath. It walked on snow without going through it.',
   'epic', 0, 0, 0, 0, '', 0, 1, 1, 2, 0, 0, 0, 9, 0, ''),

  ('ermine-skin', 'an ermine skin',
   'A hand''s length of winter-white fur and no more, with the black tip of the tail left on because that is the part anybody ever wanted. Kings had these sewn in rows. It took a great many, and each one was this small, and each one killed things three times its size for a living.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 5, 0, ''),

  ('owl-feather', 'an owl''s feather',
   'Barred brown and grey, and the leading edge of it is combed into a soft fringe rather than cut clean like every other feather you have handled. That fringe is why nothing ever hears the bird. Run a thumb along it and it makes no sound doing that either.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 5, 0, ''),

  ('winter-pelt', 'a winter pelt',
   'A hare''s coat taken in the white, so completely white that against anything but snow it is the most visible thing for a mile. It turns by the calendar and not by the weather, which in a bad year is the whole of what goes wrong for the animal wearing it.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 5, 0, '');

-- ---- who lives here --------------------------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('ermine', 'an ermine',
   'A stoat gone white for the season, a hand long and boneless-looking, pouring itself between the stones with its black tail-tip flicking behind it. It stops, stands straight up on its hind legs to look at you properly, and is not remotely afraid. Everything about it is a decision it has already made.',
   2, 18, 3, 5, 300, 0, 'ermine-skin', 0.4, 0, NULL, 0, 1, 0),

  ('eagle-owl', 'an eagle owl',
   'It is sitting on the rock at head height and you did not see it until it turned its face, which is flat and wide and the colour of the lichen behind it. The eyes are orange and enormous. When it opens its wings the span crosses the whole gully and it makes no sound at all doing it, which is worse than if it did.',
   4, 40, 5, 8, 660, 0, 'owl-feather', 0.4, 0, NULL, 0, 2, 0),

  ('snow-hare', 'a snow hare',
   'The same animal as the ones below and gone completely white, ears and all but the black tips, sitting in a scoop of its own making at the edge of the old snow. On the drift it is invisible. Two strides off the drift it is the most obvious thing on the mountain, and it knows which of those it is standing on.',
   2, 16, 1, 3, 420, 0, 'winter-pelt', 0.5, 0, NULL, 0, 0, 0),

  -- THE LYNX. The tier's headline and the first real predator on this mountain:
  -- broad-footed, silent, and built to take something several times its own
  -- weight off the ground before it knows it is being taken.
  ('lynx', 'a lynx',
   'Grey and spotted and long in the leg, with a face framed in a ruff and two absurd black tufts standing off its ears, and it has been watching you for some while from the rock above the path. It does not gather itself or crouch or do any of the things that would warn you. It simply stops being on the rock.',
   5, 52, 5, 9, 900, 0, 'lynx-pelt', 0.35, 1, NULL, 0, 2, 0);

-- Rare blood off the hare at the top of its range, the same way the white roe
-- comes up out of the roe and the old billy out of the goats.
INSERT INTO mob_variants (base_id, variant_id, chance) VALUES ('mountain-hare', 'snow-hare', 0.15);

-- ---- where they stand ------------------------------------------------------
-- 48 spawns over 79 rooms. The grazers are where anything grows, the cold-side
-- hunters are on the snow, the warm-side ones are in the cover on the sun flank,
-- and the lynx has the three places on this tier you cannot see into.

INSERT INTO mob_spawns (room_id, template_id) VALUES
  -- the plateau and the shoulder: ptarmigan country, and hares above the heather
  ('the-bare-plateau', 'ptarmigan'),
  ('the-blown-ground', 'ptarmigan'),
  ('the-flat-top', 'ptarmigan'),
  ('the-stone-stripes', 'ptarmigan'),
  ('the-wind-scour', 'ptarmigan'),
  ('the-snow-edge', 'ptarmigan'),
  ('the-wind-lane', 'mountain-hare'),
  ('the-frost-shatter', 'mountain-hare'),
  ('the-corrie-floor', 'mountain-hare'),
  ('the-black-scree', 'mountain-hare'),
  ('the-old-drift', 'mountain-hare'),
  ('the-late-field', 'mountain-hare'),
  ('the-heather-shelf', 'mountain-hare'),
  ('the-gravel-shelf', 'mountain-hare'),

  -- the sun flank: the deer ground
  ('the-deer-lawn-high', 'red-hind'),
  ('the-wallow', 'red-hind'),
  ('the-dry-corrie', 'red-hind'),
  ('the-thin-turf', 'red-hind'),
  ('the-terrace', 'red-hind'),

  -- the ledges and the crags: goats
  ('the-lower-band', 'feral-goat'),
  ('the-second-band', 'feral-goat'),
  ('the-third-band', 'feral-goat'),
  ('the-ledge-walk', 'feral-goat'),
  ('the-corrie-lip', 'feral-goat'),
  ('the-shoulder-drop', 'feral-goat'),

  -- the air
  ('the-back-wall', 'scarp-raven'),
  ('the-slab-nose', 'scarp-raven'),
  ('the-shattered-crown', 'scarp-raven'),
  ('the-airy-step', 'scarp-raven'),
  ('the-band-end', 'hill-eagle'),
  ('the-rake', 'hill-eagle'),

  -- the snow, where the small white hunters work
  ('the-snow-bed', 'ermine'),
  ('the-moat', 'ermine'),
  ('the-cold-shadow', 'ermine'),
  ('the-grey-ice', 'ermine'),
  ('the-firn', 'eagle-owl'),
  ('the-north-corrie', 'eagle-owl'),

  -- the sun flank's own hunters, in the cover
  ('the-broken-ground-high', 'wildcat'),
  ('the-sun-gully', 'wildcat'),
  ('the-hidden-burn', 'hill-fox'),
  ('the-dry-gorge', 'hill-fox'),
  ('the-hot-scree', 'hill-fox'),

  -- and the things on the warm rock
  ('the-warm-slabs', 'gill-adder'),
  ('the-basking-stone', 'gill-adder'),

  -- the lynx: the corrie's blind side, the broken ground, and the ledge above
  -- the walk. Every one of them a place you are looked at from before you look.
  -- ...and one apiece on the two ways up added with tier four (the slant, the
  -- wedge), so a new route is not a quiet route.
  ('the-slant', 'feral-goat'),
  ('the-wedge', 'wildcat'),

  ('the-corrie-mouth', 'lynx'),
  ('the-chimney-foot', 'lynx'),
  ('the-pothole', 'lynx');
