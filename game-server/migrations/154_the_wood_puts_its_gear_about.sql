-- THE WOOD PUTS ITS GEAR ABOUT (rome, 2026-08-03: "just 7 new pieces????",
-- then "WHY THE FUCK ITS JUST FOR THE FUCKING FORGE").
--
-- Both fair, and the second is the real one. There are FIVE ways gear reaches a
-- player in this game and mig 153 used exactly one of them. Counted honestly:
--
--   forge recipes ....... 153 added 6.        The dungeon's materials carry 3-5
--                                             recipes EACH (teeth 5, bone 5,
--                                             claw 4, fang 3). Mine carried 1.
--   mob gear drops ...... the wood had 3, two of them bosses. Ten of its
--                         thirteen creatures drop no wearable thing at all.
--   ground spawns ....... 29 in the wood, every one of them food, stone or a
--                         torch. NOT ONE piece of gear lies anywhere in 170
--                         rooms, in a game where gear on floors is load-bearing.
--   caches .............. the wood has ZERO. All eight strongboxes in the world
--                         are in the fortress and the deep. THE HOLDING — nine
--                         rooms of ruined moated manor, the only built thing in
--                         the wood and the entire reason the far side exists —
--                         has nothing in it to open.
--   fence stock ......... every piece the keeper sells is dungeon gear.
--
-- So this migration is mostly not new items. It is the wood's gear finally
-- being PUT SOMEWHERE: twelve more pieces so every slot exists (the wood had no
-- boots and no shields at all), the materials brought up to the dungeon's
-- recipe density, and then all of it scattered across the other four channels.
--
-- =========================================================================
-- 1. THE TWELVE. Every weight is what mig 096's formula computes, checked.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  -- FEET: the wood had none.
  ('hide-wound-boots', 'a pair of hide-wound boots',
   'Wolf-hide cut in strips and wound up the calf over whatever you were already wearing, lashed at the knee. Silent on leaf-mould, which is most of what there is out here.',
   'uncommon', 0, 0, 0, 0, 'feet', 1, 1, 1, 0, 0, 0, 0, 6, 0, 'quiet'),
  ('moss-lined-boots', 'a pair of moss-lined boots',
   'Packed through the sole and up the ankle with grave-moss, which is warm, and dry longer than it has any right to be, and stops a scrape weeping.',
   'uncommon', 0, 0, 0, 0, 'feet', 1, 1, 1, 0, 0, 0, 0, 6, 0, 'staunched'),
  ('white-hide-boots', 'a pair of white-hide boots',
   'Soft white leather, seamed up the back, the pale gone grey at the toe from walking. Somebody spent a once-in-fifty hide on their feet, which tells you what they valued.',
   'rare', 0, 0, 0, 0, 'feet', 2, 1, 1, 1, 0, 0, 0, 9, 0, 'quiet'),

  -- SHIELDS: the wood had none.
  ('tusk-studded-targe', 'a tusk-studded targe',
   'A small round shield of layered hide with boar tusks set through the face, points out, so that catching a blow on it gives something back.',
   'uncommon', 0, 0, 0, 0, 'shield', 0, 1, 1, 1, 0, 0.12, 0, 6, 0, 'thorns:1'),
  ('bog-pearl-targe', 'a bog-pearl targe',
   'Bog-oak, black and hard as iron, faced with a boss of grave-pearls the mire gave up. The wood came out of the same water they did and has not rotted in a hundred years.',
   'rare', 0, 0, 0, 0, 'shield', 0, 1, 1, 1, 0, 0.20, 0, 9, 0, ''),

  -- HELMS
  ('wolfskin-hood', 'a wolfskin hood',
   'The head and shoulders of a grey, hollowed and lined, worn as a hood. Deep enough to keep rain off a flame and dark enough that nothing sees your face in it.',
   'uncommon', 0, 0, 0, 0, 'helm', 1, 1, 1, 0, 0, 0, 0, 6, 0, 'hooded'),
  ('moss-packed-cap', 'a moss-packed cap',
   'A close cap quilted and packed with grave-moss. It smells of wet ground and it is the reason a scalp cut stops running before you have finished swearing about it.',
   'uncommon', 0, 0, 0, 0, 'helm', 1, 1, 1, 0, 0, 0, 0, 6, 0, 'staunched'),

  -- CLOAKS
  ('white-hide-mantle', 'a white-hide mantle',
   'A short mantle of white roe-hide, thick across the shoulders where the beast carried its own weather. It turns a raking blow the way three layers of cloth never will.',
   'rare', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0, 0, 0, 9, 0, 'wardhide'),

  -- BODY
  ('tusk-sewn-brigandine', 'a tusk-sewn brigandine',
   'Plates of split boar-tusk sewn between two layers of hide, overlapping like scales. It creaks when you breathe and it has stopped things that meant it.',
   'rare', 0, 0, 0, 0, 'armor', 3, 1, 1, 2, 0, 0, 0, 9, 0, 'strapped'),

  -- WEAPONS
  ('lopped-stave', 'a lopped stave',
   'A shoulder-thick length of ash cut and trimmed with something sharp, taller than you are. Every coppice in the wood is full of them and any of them will do.',
   'common', 0, 0, 0, 2, 'weapon', 0, 1, 1, 0, 0, 0, 0, 2, 0, 'reach'),
  ('skull-headed-maul', 'a skull-headed maul',
   'A wolf''s braincase packed with clay and lead and driven onto a haft, jaw and all. It is a stupid weapon and it caves things in.',
   'rare', 0, 0, 0, 4, 'weapon', 0, 1, 1, 2, 0.10, 0, 0, 9, 0, ''),
  ('burners-hatchet', 'a burner''s hatchet',
   'A short felling hatchet with a scorched haft, the head blued by years of standing next to a smouldering stack. Meant for cordwood, entirely willing otherwise.',
   'uncommon', 0, 0, 0, 3, 'weapon', 0, 1, 1, 1, 0, 0, 0, 6, 0, 'keen');

-- =========================================================================
-- 2. THE BENCH, brought up to the dungeon's density: 3-5 recipes per material
-- instead of one. Same costing as every existing recipe.

INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('hide-wound-boots',     2, 'wolf-pelt',   2),   -- wolf-pelt: 3 recipes
  ('wolfskin-hood',        2, 'wolf-pelt',   2),
  ('moss-lined-boots',     2, 'grave-moss',  2),   -- grave-moss: 3
  ('moss-packed-cap',      2, 'grave-moss',  2),
  ('tusk-studded-targe',   2, 'boar-tusk',   2),   -- boar-tusk: 3
  ('tusk-sewn-brigandine', 3, 'boar-tusk',   3),
  ('white-hide-boots',     3, 'white-hide',  1),   -- white-hide: 3
  ('white-hide-mantle',    3, 'white-hide',  1),
  ('skull-headed-maul',    3, 'wolf-skull',  2),   -- wolf-skull: 2
  ('bog-pearl-targe',      3, 'grave-pearl', 2),   -- grave-pearl: its FIRST use
  ('lopped-stave',         1, NULL,          0);   -- a stave off any coppice

-- =========================================================================
-- 3. THE HOLDING GETS SOMETHING TO OPEN. Nine rooms of ruined manor with not a
-- single container in them was the biggest miss of the lot. Three boxes, keyed
-- to the strongbox key the keeper already sells, and one out at the burner's
-- hut. The solar is where a house keeps what it does not want found, so it
-- refills slowest and holds the best of it.

INSERT OR REPLACE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
  ('box-solar', 'the-solar', 'a banded chest',
   'A chest under the window, banded and locked, the lid pale where a hundred years of weather came through the roof and rotted the rest of the room around it.',
   'strongbox-key', 2400),
  ('box-chapel', 'the-chapel-shell', 'an almsbox',
   'An iron-bound almsbox still bolted to the wall where the door used to be. Whatever a household gave, it gave here, and nobody has been by to collect.',
   'strongbox-key', 1800),
  ('box-icehouse', 'the-icehouse', 'a sunken locker',
   'A locker set into the ice-pit wall below the waterline, kept cold enough that what was put in it is still recognisably what it was.',
   'strongbox-key', 1800),
  ('box-burner', 'the-charcoal-hut', 'the burner''s kist',
   'A low kist of scorched boards by the sleeping bench, the lid weighted with a stone. A charcoal burner lives out here for weeks at a stretch and keeps his good things where the smoke does not reach.',
   'strongbox-key', 1200);

INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-solar', 'white-hide-mantle', 0.20),
  ('box-solar', 'white-hide-coat', 0.16),
  ('box-solar', 'keepers-wrap', 0.08),
  ('box-solar', 'bog-pearl-targe', 0.18),
  ('box-solar', 'dry-cigarettes', 0.15),
  ('box-solar', 'surveyor-map', 0.12),
  ('box-solar', 'white-hide', 0.20),
  ('box-chapel', 'moss-packed-jerkin', 0.25),
  ('box-chapel', 'moss-packed-cap', 0.25),
  ('box-chapel', 'linen-dressing', 0.30),
  ('box-chapel', 'grave-moss', 0.35),
  ('box-chapel', 'bloodroot-poultice', 0.20),
  ('box-icehouse', 'white-hide-boots', 0.18),
  ('box-icehouse', 'hide-wound-boots', 0.25),
  ('box-icehouse', 'wolfskin-cloak', 0.22),
  ('box-icehouse', 'smoked-haunch', 0.30),
  ('box-icehouse', 'wolf-pelt', 0.25),
  ('box-burner', 'burners-hatchet', 0.30),
  ('box-burner', 'burners-billhook', 0.20),
  ('box-burner', 'scrap-iron', 0.40),
  ('box-burner', 'torch', 0.35),
  ('box-burner', 'dry-cigarettes', 0.12);

-- =========================================================================
-- 4. GEAR ON THE FLOOR. The wood's pockets are all fiction about people who
-- worked out here — a hunter's stand, a poacher's camp, a withy hut, a lime
-- kiln, a timber stack — and every one of them was empty of anything but
-- forage. The good pieces DO NOT REGROW (regrows 0): found once, gone after.
-- The stave regrows, because every coppice in the wood is full of them.

INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('lopped-stave',       'the-timber-stack',  1),
  ('lopped-stave',       'the-old-coppice',   1),
  ('hide-wound-boots',   'the-poachers-camp', 0),
  ('tusk-studded-targe', 'the-deer-fence',    0),
  ('wolfskin-hood',      'the-hunters-stand', 0),
  ('moss-lined-boots',   'the-withy-hut',     0),
  ('burners-hatchet',    'the-lime-kiln',     0),
  ('moss-packed-cap',    'the-spring-head',   0);

-- =========================================================================
-- 5. THINGS THAT CARRY THINGS. Ten of thirteen wood creatures dropped nothing
-- wearable. The two that plausibly carry gear now do: the mire-walker drags
-- down what it drowns, and the follower has been taking from people longer than
-- anyone has been counting. The animals stay animals — a wolf's gear is its
-- pelt, and that is what the bench is for.
UPDATE mob_templates SET gear_item = 'bog-pearl-targe', gear_drop = 0.12 WHERE id = 'the-mire-walker';
UPDATE mob_templates SET gear_item = 'hide-wound-boots', gear_drop = 0.15 WHERE id = 'the-follower';
UPDATE mob_templates SET gear_item = 'skull-headed-maul', gear_drop = 0.20 WHERE id = 'something-ahead';

-- =========================================================================
-- 6. THE KEEPER SELLS THE WOOD'S WORK. Everything on his shelf came out of the
-- fortress or the deep. He deals with whoever comes through the gate, and some
-- of them come from the wood. Priced in the same band as the dungeon gear of
-- their tier.
INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('wolfskin-cloak',   26),
  ('hide-wound-boots', 24),
  ('tusk-goad',        27),
  ('tusk-studded-targe', 27),
  ('white-hide-mantle', 44),
  ('skull-headed-maul', 48);
