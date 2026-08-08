-- THE BOUNDS HOUSE (rome, 2026-08-07: "build the box, and lets create new items
-- that will go in it, take a look at existing items and fill in any gaps, we can
-- also create new layout").
--
-- The woodward was the only boss in the game guarding NOTHING. Measured: no
-- cache on any of the ten legs of his patrol, and he is not in mob_keys at all —
-- no reliquary key, no warden's key, not even the 0.3 cigarette roll every other
-- boss carries. The wood's four existing caches all open with a plain strongbox
-- key that a cutpurse drops. So the hardest thing on the surface stood in the
-- middle of a maze with nothing behind it, which is why he reads like he ought
-- to be keeping something.
--
-- =========================================================================
-- THE LAYOUT. The Heart of It (-38,12) is a dead end at the centre of his
-- round, which made the maze's middle a wall. One room EAST of it, and the
-- centre becomes a way through — to the one building on his ground. He walks
-- past its door on every circuit and the room is not safe: it is his.
--
-- East, not north: (-38,11) is already the Crooked Stand, and two rooms on one
-- map cell draw on top of each other. (-37,12) is empty, and the whole column
-- east of the maze's centre is empty behind it if this ever grows.
--
-- The DOOR is open. The BOX is not. You can walk in, read the shelf, and learn
-- exactly what you need — which is the marking iron, and the only place that is
-- is on him.
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, map_x, map_y) VALUES
  ('the-bounds-house', 'door', 'The Bounds House',
   'A single room of stone to the waist and oak above it, roofed in shingles cut on the spot, standing in a clearing that has been kept clear on purpose — the coppice comes to a line thirty feet out and stops. Inside: a plank table, a stool worn to a shine on one side only, and shelves the length of the wall carrying bundles of hazel rods tied in fives, hundreds of them, each bundle labelled in a hand that did not change over the years it took. This is where the wood was counted. Somebody is still counting it.',
   0, 0, 'wood', 0, -37, 12);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-bounds-house', 'west', 'the-heart-of-it', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-heart-of-it', 'east', 'the-bounds-house', NULL);

-- =========================================================================
-- THE KEY. A woodward's marking iron blazed the estate's stamp into every tree
-- that was allowed to come down — the tool that says what is the wood's. It
-- opens the wood's box because of course it does.
INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
  ('marking-iron', 'the marking iron',
   'A short iron on a worn handle, the business end cut into a mark — a crown over three notches — reversed, so it reads true when it is struck into timber. The face is bright from use and the handle is black from a hand. It is the thing that decides which trees are the wood''s and which are yours, and it has been decided with a great many times.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 14, 0, '');

-- Rates shaped like the reliquary key, which is the deep's version of this
-- problem: the kings carry it at 0.6 and a hollow warden carries it at 0.01, so
-- the box is the boss's to guard but not the boss's to monopolise. Same here.
-- He is not a king, so he sits under the kings at 0.3, and the wood keeps a
-- long-odds second road for anyone unwilling to take him.
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-woodward', 'marking-iron', 0.3);
-- The other office of the same estate. The keeper is the only other thing in the
-- wood with the standing to hold one, so he is the likeliest of the long shots.
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-keeper-of-the-holding', 'marking-iron', 0.03);
-- A man who cuts the wood for a living and is not supposed to. If he has an
-- iron it is not his, and that is the point of him having one.
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES ('charcoal-burner', 'marking-iron', 0.02);
-- Irons get lost in a wood that is trying to grow over everything. Sometimes the
-- wood keeps them, and sometimes the wood gets up.
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES ('root-thing', 'marking-iron', 0.01);

-- =========================================================================
-- WHAT GOES IN IT — three new pieces, each filling a hole I can point at, and
-- every one cut to THE WEIGHT LAW (096) so a re-run of that migration is a
-- no-op: body/helm weight = armour - 1, feet and cloaks light, weapons by
-- damage tier plus a point if they stun.
--
-- 1. THERE WAS NO LEGENDARY EDGE WEAPON. Both legendaries in the game — the
--    attainder and houndsbane — are piercing. The class with the most weapons
--    in it by far (31 edged) topped out at rare/epic, and edge is the class
--    that pays full price against armour (bleed is its answer, never the swing).
--    It is also the only legendary in the game that CLEAVES: nothing above rare
--    had sweep > 1.
INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
  ('the-hedge-bill', 'the hedge bill',
   'A billhook grown up: a hooked blade a forearm long on a haft you need both hands for, made for laying a hedge in a day and taking a man''s arm off as an afterthought. The inner curve is polished from a lifetime of pulled cuts and the point has been reground so often it has gone slightly wrong, which is the shape it wants.',
   'legendary', 0, 0, 0, 5, 'weapon', 0, 1, 2, 2, 0, 0, 2, 30, 0, 'two-handed,keen');

-- 2. HELM WAS THE THINNEST SLOT AT THE TOP: two epics and one legendary in the
--    whole game, and the legendary (the marrow crown) is the deep's. The
--    surface had nothing. Armour 2 rather than 3 — it is a hood, not a helm —
--    and it earns its tier in the wood's own two traits.
INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
  ('bounds-hood', 'a bark-tanned hood',
   'Heavy leather gone the colour of oak bark and stiff as board, cut deep enough to throw the whole face into shadow, with a moss-packed lining sewn in against the cold that also, it turns out, packs a cut. It smells of tannin and woodsmoke and it makes no sound at all when you turn your head.',
   'legendary', 0, 0, 0, 0, 'helm', 2, 1, 1, 1, 0, 0, 0, 30, 0, 'quiet,staunched');

-- 3. FEET, same story: two epics, one legendary, all of them from underground.
INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
  ('coppice-treads', 'coppice treads',
   'Boots built for standing in cut-over ground all day: a thick sole against the spikes a coppice leaves behind, uppers of the same bark-tanned leather, and a lining of the same packed moss. Somebody made these to be in the wood in, not to walk to it.',
   'epic', 0, 0, 0, 0, 'feet', 2, 1, 1, 1, 0, 0, 0, 19, 0, 'quiet,staunched');

-- =========================================================================
-- THE BOX. Rates calibrated against the reliquary (top item 0.3, its legendary
-- tail 0.05-0.06) — this is the surface's answer to it, so it reads the same.
INSERT INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
  ('box-bounds', 'the-bounds-house', 'the bounds chest',
   'An oak box banded in iron, under the table rather than hidden, because on this ground nobody was going to open it. The lid carries the same mark the marking iron cuts, struck into the wood so hard it split the grain — this is the estate''s, and the estate said so once and never had to again.',
   'marking-iron', 1800);

-- CIGARETTES ARE THE SURFACE'S MISSING CURRENCY, and this is the real economy
-- fix in here. Every source of dry cigarettes in the game — the forgotten king,
-- the three-hound, the albino rat — is in the fortress or the deep. A wanderer
-- who lives on the surface could not get the hard currency at all except by
-- going down for it. Now the surface has exactly one source, and it is the
-- hardest thing on it.
INSERT INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-bounds', 'dry-cigarettes', 0.30),
  -- Spare tallies off his own shelf: they feed the coat recipe (mig 153), so the
  -- box makes the thing he already anchors easier to finish rather than replacing it.
  ('box-bounds', 'bounds-tally',   0.25),
  ('box-bounds', 'coppice-treads', 0.18),
  -- An existing epic that belongs here: the keeper's wrap is the wood's own
  -- staunched-and-hooded cloak, and the box is where the office kept its kit.
  ('box-bounds', 'keepers-wrap',   0.12),
  ('box-bounds', 'bounds-hood',    0.07),
  ('box-bounds', 'the-hedge-bill', 0.06);
