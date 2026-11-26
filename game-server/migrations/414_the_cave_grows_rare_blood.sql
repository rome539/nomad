-- 414 the cave grows rare blood (2026-11-26). Every line in the cave under the
-- wood but its two masters, the lamp-man and the stone-sleeper, now has a cousin
-- born to it now and then, as the wood, the crossing and the mountain have. Like
-- every rare blood since mig 212 it gets NO mob_spawns row: rollBloodline puts it
-- in its line's place when the line is born, at the odds below.
--
-- THE STEP IS MIG 212'S RULE: the harder the base, the gentler the jump, so the
-- small things take a real step and the big ones a slight one, and nothing here
-- comes near the 84hp where bosses start:
--
--     line              ->  cousin                step
--     pale salamander   8   ->  the old white       12  2-3    x1.50
--     cave bat          9   ->  the grizzled bat    14  2-4    x1.56
--     cave crayfish     9   ->  the blue crayfish   13  2-4    x1.44
--     grubbet          12   ->  the bloated grubbet 18  2-4    x1.50
--     stone-mites      14   ->  the red mites       20  1-3    x1.43
--     polecat          16   ->  the black polecat   22  3-5    x1.38
--     mole hound       30   ->  the lead hound      38  4-7    x1.27
--     digger           34   ->  the overman         42  5-8    x1.24
--     cave spider      36   ->  a giant cave spider 48  5-9    x1.33, at 5%, drawn from the
--                                spider's own sheet, bigger
--     stone-brood      40   ->  the old brood       48  5-9    x1.20
--     cave cougar      46   ->  the white cougar    54  6-10   x1.17
--     river-gulper     72   ->  the great gulper    80  6-11   x1.11
--
-- ARMOUR DOES NOT MOVE (mig 282): each keeps its line's. WHAT THEY ARE WORTH is
-- mig 212's first road: the line's own trophy at 1.6 times the rate, capped at
-- 0.85, so the rare one is always worth more. The mites and the polecat leave
-- nothing, as their lines leave nothing. Born at 8%, as most rare bloods are.
--
-- THE BAT-MOTHER is the bat's second rare blood, and not a fighter: she is the
-- cave's brood-mother, as the brood rat is the dungeon's (mig 018). Born at 5%,
-- as the brood rat is, and only in the north roost or the east roost, never two
-- to a roost (BROOD_NESTS). She hangs there for good, and while she lives and is
-- left alone she keeps births coming, cave bats, up to six of hers alive at once.
-- She is a little bigger than the grizzled bat and bites no harder than a bat.

INSERT OR REPLACE INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed) VALUES
  ('the-old-white', 'the old white',
   'A pale salamander twice the length of the others, as long as your arm, and older than any of them. Its gills have gone from pink to a feathery grey, and its white has yellowed like old wax. It lies on the bottom of the pool and does not move for a long time, and the others keep away from it.',
   2, 12, 2, 3, 180, 0, 'dead-salamander', 0.85, 0, '', 0, 0, 0),
  ('the-grizzled-bat', 'the grizzled bat',
   'A cave bat the size of a crow, with wings that would span your arms and fur gone grizzled at the shoulders. It hangs a little apart from the rest of the roost, and at dusk it is the first to drop, and the others come after it.',
   2, 14, 2, 4, 300, 0, 'dead-bat', 0.64, 0, '', 0, 0, 1),
  ('the-bat-mother', 'the bat-mother',
   'A cave bat grown fat, twice the weight of the others, hung in the thick of the roost with her wings wrapped round the round bulk of her like a cloak. She does not drop at dusk with the others. She does not leave the roost at all.',
   2, 16, 1, 3, 300, 0, 'dead-bat', 0.64, 0, '', 0, 0, 0),
  ('the-blue-crayfish', 'the blue crayfish',
   'A cave crayfish with a shell of a dull deep blue where the others are white, and claws twice the size of theirs, held up and open. It has no eyes. It does not back under a stone when the water moves.',
   2, 13, 2, 4, 240, 0, 'crayfish-tail', 0.8, 1, '', 0, 0, 0),
  ('the-bloated-grubbet', 'the bloated grubbet',
   'A grubbet swollen to twice the weight of the others, its belly dragging on the ground and the grey fur stretched thin over its back. The pink snout works without stopping. It squeals lower than they do, and the colony gives way to it.',
   2, 18, 2, 4, 120, 0, 'grubbet-haunch', 0.8, 0, '', 0, 0, 1),
  ('red-mites', 'a swarm of red mites',
   'Mites like the stone-mites, but the rust-red of old iron and more of them, so thick that the film they make as they come up out of the joints is a stain spreading across the flags. Where they have been, the stone is clean.',
   3, 20, 1, 3, 300, 0, '', 0, 0, '', 0, 0, 1),
  ('the-black-polecat', 'the black polecat',
   'A polecat black from nose to tail, with no pale mask on its face at all, a little longer and heavier than the brown ones. It loops through the rock like the others but slower, and stops more often to look at you.',
   3, 22, 3, 5, 600, 0, '', 0, 0, '', 0, 0, 1),
  ('the-lead-hound', 'the lead hound',
   'A mole hound bigger than the rest of its pack, heavier in the chest, its grey hide scarred across the shoulders and one ear torn. The great dark eyes are the same. The others look to it before they move, and when it lifts its head, they lift theirs.',
   4, 38, 4, 7, 720, 0, 'mole-hound-skull', 0.48, 0, '', 0, 0, 2),
  ('the-overman', 'the overman',
   'A dried man taller than the diggers, in a long leather coat gone hard with clay, a tally board hung at his belt, with a heavier pick than theirs in his fist. He was set over the others when they were men, and he still walks behind them, and they still keep to their work when he is near.',
   4, 42, 5, 8, 1200, 0, 'tally-tag', 0.56, 1, 'digging-pick', 0.15, 0.08, 0),
  ('giant-cave-spider', 'a giant cave spider',
   'A cave spider grown far past the size of any other, with a body as big as a man''s chest and legs that would span a cart, grey, and furred with the dust of years. It sits in the silk with its legs drawn in, and the silk sags under it.',
   5, 48, 5, 9, 1200, 0, 'spider-fang', 0.56, 1, '', 0, 0, 1),
  ('the-old-brood', 'the old brood',
   'A stone-brood longer than the others, as long as a pony, its wrinkled hide gone the grey of the dressed stone itself, so that lying still on the flags it is hard to see where it ends. It has no eyes. Its mouth is full of small even teeth and it breathes through them, slowly.',
   5, 48, 5, 9, 1500, 0, 'brood-hide', 0.64, 1, '', 0, 0, 2),
  ('the-white-cougar', 'the white cougar',
   'A cave cougar as pale as the salamanders in the pools, long and lean, with a tail held low and still. It makes no sound at all, not even on loose grit. Its eyes take your light and throw it back, not green, but white.',
   5, 54, 6, 10, 900, 0, 'cougar-pelt', 0.56, 1, '', 0, 0, 2),
  ('the-great-gulper', 'the great gulper',
   'A river-gulper longer than a man lying down twice over, pale as a root and slow, and the mouth, when it opens, is as wide as a door. It lies in the deepest of the black water with only the line of its back showing, and it does not hurry for anything.',
   6, 80, 6, 11, 1800, 0, 'gulper-jaw', 0.8, 1, '', 0, 0, 1);

INSERT OR REPLACE INTO mob_variants (base_id, variant_id, chance) VALUES
  ('pale-salamander', 'the-old-white',       0.08),
  ('cave-bat',        'the-grizzled-bat',    0.08),
  ('cave-bat',        'the-bat-mother',      0.05),
  ('cave-crayfish',   'the-blue-crayfish',   0.08),
  ('grubbet',         'the-bloated-grubbet', 0.08),
  ('stone-mites',     'red-mites',           0.08),
  ('polecat',         'the-black-polecat',   0.08),
  ('mole-hound',      'the-lead-hound',      0.08),
  ('digger',          'the-overman',         0.08),
  ('cave-spider',     'giant-cave-spider',   0.05),
  ('stone-brood',     'the-old-brood',       0.08),
  ('cave-cougar',     'the-white-cougar',    0.08),
  ('river-gulper',    'the-great-gulper',    0.08);
