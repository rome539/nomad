-- 235 what lives on the territory (rome, 2026-08-19). Mig 234 is 80 rooms of the
-- mountain's fifth and last tier below the summit. This is what is on them.
--
-- THE RULING HOLDS TO THE END: the mountain is NOT FOR PEOPLE. Five files, no
-- institution, nobody's leavings, nothing still at its post. What is different
-- here is that the ground belongs to something, and every line below is arranged
-- around that fact without one of them being it.
--
-- THE ECONOMY, one step further than tier four. The high ground lived on what
-- FELL. This tier lives on what is CARRIED — kills brought up from four tiers
-- down and opened on the same terraces year after year, and then worked through
-- by everything on the ridge in an order nothing argues about. So the roster is
-- the carrion roster again, at strength, plus three lines that only make sense
-- on ground that has an owner.
--
-- THE KILL TERRACES ARE CARRION_ROOMS (zone-data), which is the same mechanism
-- mig 233 shipped for the bone fan and the reason this tier can carry 51
-- scavengers without a single one of them starving at the cap. Without it the
-- whole design is a description.
--
-- THREE NEW LINES, and all three are behaviours this mountain has not had:
--
--     a stone adder   22hp 4-7 a0  ROOTED. It is part of the ground. The only
--                                  cold-blooded thing above the snow line in
--                                  this world, alive because the rock is warm,
--                                  and the rock being warm is the tier's loudest
--                                  piece of evidence.
--     a brooding vulture 46hp 5-8 a1  ROOTED and AGGRESSIVE. It is on the nest,
--                                  it is not getting off the nest, and it will
--                                  have you rather than leave it. The first
--                                  thing on this mountain that attacks because
--                                  you are simply there.
--     an eyrie holder  62hp 6-10 a1  AGGRESSIVE, and it holds the ledges the way
--                                  the watchman holds his turret. The tier's
--                                  apex and still 14hp short of the baited bear,
--                                  because the ceiling is the ceiling.
--
-- DENSITY 1.2 — 96 spawns over 80 rooms, exactly on the region's curve, and
-- WHERE they are is the whole point:
--
--     the terraces and the eyrie  41 spawns over 22 rooms   (1.9)
--     the rest of the tier        55 spawns over 46 rooms   (1.2)
--     the three sanctuaries        0 spawns over  3 rooms   (0.0)
--     THE THRESHOLD                0 spawns over  9 rooms   (0.0)
--
-- THAT ZERO IS THE DESIGN. Nine rooms of swept, warm, silent ground on the
-- busiest tier of the region, with nothing standing in any of them, when the
-- terraces two hundred paces west are the most crowded ground in the world.
-- Every animal up here has decided the same thing about that ground and none of
-- them is going to explain it. A player who has walked four tiers of a mountain
-- reading density as danger arrives at the emptiest ground on it and has to work
-- out what emptiness means here, and the answer is not in this migration.
--
-- WHAT IS STILL NOT HERE. No line in this file accounts for the warm rock, the
-- run stone, the drag marks that go off the edge, the nest built to a size no
-- bird on this roster could use, or the swept floor. Third migration running
-- that this is said on purpose (see 233): the evidence is the point, and the
-- thing itself ships alone, with code, into the room past the summit gate.

-- ---- what they leave -------------------------------------------------------

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed,
   sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('adder-skin', 'a shed skin',
   'The whole skin of a snake come off in one piece and inside out, dry as paper, perfect down to the scales over the eyes, and long enough that you would rather not have known. It was left on warm rock at a height where nothing cold-blooded can survive a night, which is a fact about the rock and not about the snake.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 6, 0, ''),

  ('brood-quill', 'a brood quill',
   'A wing feather off a bird that has been sitting a nest for weeks: worn to a stub down one side where it has been dragged across the same stick a thousand times, and filthy at the base in a way that will not come out. Whatever else it was doing, it did not leave.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 4, 0, ''),

  ('eyrie-talon', 'an eyrie talon',
   'One claw off a foot that has four, curved through more than a half-circle and longer than your middle finger, black and horn-hard and worn flat along the inside edge where it has closed on rock. It closed on other things too. The wear on it is from the landing, not the killing.',
   'epic', 0, 0, 0, 0, '', 0, 1, 1, 1, 0, 0, 0, 10, 0, ''),

  ('glassed-stone', 'a glassed stone',
   'A fist of rock with one face gone to black glass — smooth, conchoidal, sharp enough to open a hand carelessly closed on it. The other five faces are ordinary mountain granite. Whatever did this to the one face did it in an instant and did not touch the rest.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 1, 0, 0, 0, 8, 0, '');

-- ---- who lives here --------------------------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  -- ROOTED. It is not hunting you and it is not going anywhere. It is where you
  -- have put your foot.
  ('stone-adder', 'a stone adder',
   'Thick, short, and the exact grey-brown of the warm flags it is lying on, with the black zigzag down its back reading as a crack in the rock until it moves. It does not rear or hiss or do any of the things that would give you time. It is a piece of the ground with an opinion, and it has already been trodden on once today.',
   3, 22, 4, 7, 600, 0, 'adder-skin', 0.35, 0, NULL, 0, 3, 0),

  -- ROOTED and AGGRESSIVE. The nest is the whole animal.
  ('brooding-vulture', 'a brooding vulture',
   'Sitting low and spread over the middle of the nest with its wings half open across it and its bald head laid flat along its back, watching you come. It does not go up. It is not going to go up. As you come inside the distance it has decided on it opens its wings all the way, which puts six feet of bird between you and whatever is under it, and comes at you off the nest.',
   4, 46, 5, 8, 1200, 0, 'brood-quill', 0.45, 1, NULL, 0, 2, 0),

  -- AGGRESSIVE, and it holds the ledges the way the watchman holds his turret.
  ('eyrie-holder', 'an eyrie holder',
   'It comes off the shelf above without a sound and lands on the ledge in front of you with its wings still out, and standing it is nearly your height and half again your width. The head goes down and forward. Everything about this is a thing it has done before and never once had to think about, and the ledge you are on is the only ground it has ever cared about.',
   5, 62, 6, 10, 2400, 0, 'eyrie-talon', 0.4, 1, NULL, 0, 3, 0.1);

-- ---- what the ground gives up ----------------------------------------------
-- Not a drop — a thing lying on the rock, because the black glass is the tier's
-- other loud piece of evidence and the rock should have some of it on it.
-- regrows = 1 is the dice floor-renewal law (mig 213), not a timer.
INSERT OR IGNORE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('glassed-stone', 'the-black-glass', 1),
  ('glassed-stone', 'the-run-stone',   1),
  ('glassed-stone', 'the-scald',       1);

-- ---- where they stand ------------------------------------------------------
-- 92 spawns. The three sanctuaries carry nothing (the vent, the lee side, the
-- last shelter) and the nine rooms of the threshold carry nothing either, which
-- is the tier's one idea stated in the table rather than in the prose.

INSERT INTO mob_spawns (room_id, template_id) VALUES
  -- THE RAMP AND THE GLAZED ROCK: thin, because there is nothing here to eat.
  ('the-ramp-head', 'scarp-raven'),
  ('the-glazed-slab', 'stone-adder'),
  ('the-warm-flags', 'stone-adder'),
  ('the-black-glass', 'snow-fox'),
  ('the-run-stone', 'stone-adder'),
  ('the-heat-shimmer', 'carrion-vulture'),
  ('the-scald', 'stone-adder'),

  -- THE ADDER GROUND: the densest concentration of one line in the game, and it
  -- is a line that does not move, does not chase, and does not care.
  ('the-basking-flags', 'stone-adder'),
  ('the-basking-flags', 'stone-adder'),
  ('the-crack-line', 'stone-adder'),
  ('the-adder-shelf', 'stone-adder'),
  ('the-adder-shelf', 'stone-adder'),
  ('the-sun-trap', 'stone-adder'),
  ('the-warm-scree', 'stone-adder'),
  ('the-warm-scree', 'glutton'),
  ('the-thin-crack', 'stone-adder'),
  ('the-under-warmth', 'stone-adder'),
  ('the-under-warmth', 'snow-fox'),
  ('the-dry-heat', 'bone-breaker'),
  ('the-dry-heat', 'stone-adder'),

  -- THE KILL TERRACES: 2.7 to the room. Everything that eats on this mountain
  -- is here at some hour and most of them are here now.
  ('the-first-terrace', 'carrion-vulture'),
  ('the-first-terrace', 'carrion-vulture'),
  ('the-second-terrace', 'carrion-vulture'),
  ('the-second-terrace', 'carrion-vulture'),
  ('the-third-terrace', 'carrion-vulture'),
  ('the-third-terrace', 'bone-breaker'),
  ('the-last-terrace', 'carrion-vulture'),
  ('the-last-terrace', 'glutton'),
  ('the-drag-mark', 'carrion-vulture'),
  ('the-drag-mark', 'hill-wolf'),
  ('the-scatter', 'carrion-vulture'),
  ('the-scatter', 'carrion-vulture'),
  ('the-scatter', 'mountain-chough'),
  ('the-gorge-ground', 'carrion-vulture'),
  ('the-gorge-ground', 'carrion-vulture'),
  ('the-gorge-ground', 'scarp-raven'),
  ('the-picked-ground', 'scarp-raven'),
  ('the-picked-ground', 'mountain-chough'),
  ('the-tallow-stone', 'glutton'),
  ('the-tallow-stone', 'snow-fox'),
  ('the-grease-flat', 'bone-breaker'),
  ('the-grease-flat', 'scarp-raven'),
  ('the-crack-heap', 'bone-breaker'),
  ('the-crack-heap', 'snow-fox'),
  ('the-white-heap', 'mountain-chough'),
  ('the-white-heap', 'scarp-raven'),

  -- THE EYRIE: the holders, the brooders, and the wake that lives off them.
  ('the-eyrie-foot', 'carrion-vulture'),
  ('the-eyrie-foot', 'bone-breaker'),
  ('the-eyrie-ledge', 'brooding-vulture'),
  ('the-eyrie-ledge', 'eyrie-holder'),
  ('the-nest-shelf', 'brooding-vulture'),
  ('the-nest-shelf', 'brooding-vulture'),
  ('the-nest-shelf', 'eyrie-holder'),
  ('the-eyrie-head', 'brooding-vulture'),
  ('the-guano-face', 'scarp-raven'),
  ('the-guano-face', 'mountain-chough'),
  ('the-white-wall', 'carrion-vulture'),
  ('the-updraught', 'carrion-vulture'),
  ('the-lookout', 'carrion-vulture'),
  ('the-high-perch', 'eyrie-holder'),
  ('the-wind-post', 'carrion-vulture'),

  -- THE RIDGE TOWERS: ordinary cold rock, and the ordinary hunters on it.
  ('the-first-step', 'ptarmigan'),
  ('the-shoulder-stone', 'hill-wolf'),
  ('the-tower-foot', 'lynx'),
  ('the-black-tower', 'scarp-raven'),
  ('the-tower-gap', 'hill-wolf'),
  ('the-north-lip', 'ermine'),
  ('the-cold-side', 'ptarmigan'),
  ('the-shadow-step', 'lynx'),
  ('the-high-notch', 'hill-eagle'),
  ('the-crown-edge', 'scarp-raven'),
  ('the-last-crest', 'eagle-owl'),

  -- THE SOUTH APPROACH: the long easy way, and it is easy for everything else
  -- as well.
  ('the-red-tail', 'ptarmigan'),
  ('the-low-traverse', 'mountain-hare'),
  ('the-south-shelf', 'mountain-hare'),
  ('the-warm-gutter', 'snow-fox'),
  ('the-lower-flags', 'glutton'),
  ('the-south-step', 'mountain-chough'),
  ('the-step-up', 'hill-wolf'),
  ('the-south-gully', 'bone-breaker'),
  ('the-terrace-foot', 'carrion-vulture'),
  ('the-terrace-foot', 'snow-fox'),
  ('the-under-terrace', 'glutton'),
  ('the-under-terrace', 'scarp-raven'),

  -- THE NORTH SHOULDER: the cold side, and thin with it.
  ('the-north-step', 'ptarmigan'),
  ('the-cold-shoulder', 'ermine'),
  ('the-shoulder-end', 'hill-eagle'),
  ('the-north-crest', 'ptarmigan'),
  ('the-crest-walk', 'scarp-raven'),
  ('the-crest-gap', 'ermine'),

  -- THE LOW LINE: warm, still, and full of things sleeping off the terraces.
  ('the-under-step', 'snow-fox'),
  ('the-shelf-walk', 'bone-breaker'),
  ('the-warm-under', 'glutton'),
  ('the-warm-under', 'stone-adder'),
  ('the-heat-under', 'stone-adder'),
  ('the-lower-warm', 'stone-adder');
