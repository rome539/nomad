-- 189 what the east road locks (rome, 2026-08-10). The east shipped with 102
-- rooms and nothing locked in any of them — the only region in the world with
-- no chest tier at all. This is the tier, and the key that opens it.
--
-- THE PATTERN EVERY OTHER REGION ALREADY FOLLOWS: a band has its OWN key, and
-- that key comes off that band's own things. The deep has the warden's key off
-- wardens; the wood has the marking iron off the woodward at 0.30 with a
-- trickle off the burner and the root-thing; the fortress has the strongbox key
-- off its cutpurses. Nobody carries a key from somewhere else and finds it
-- useful here, which is the whole reason a region's loot feels like ITS loot.
--
-- So the east road gets THE CLERK'S KEYS, and they come off the clerk. He has
-- been standing at the verge with his hand out for two centuries with a ring on
-- his belt he has never once put down, and everything the road ever locked, he
-- locked. Kill the institution, open the institution.

-- ---- the key ---------------------------------------------------------------
INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('clerks-key', 'a ring of road-keys',
   'Nine keys on a split iron ring, each one filed differently and none of them labelled, worn to a shine at the bow where a thumb went through them looking for the right one. Whoever carried this opened things all day long, as a job, and knew every one of them by feel.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 22, 0, '');

-- The clerk is the road's own authority and carries them at the woodward's
-- rate. The warden walks the same beat and was trusted with less. The wayman
-- and the drove master have simply taken one off somebody, a long time ago,
-- which is why their rate is a trickle and not a source.
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('the-toll-clerk',   'clerks-key', 0.30),
  ('the-long-warden',  'clerks-key', 0.12),
  ('wayman',           'clerks-key', 0.02),
  ('the-drove-master', 'clerks-key', 0.02);

-- ---- what the road locked --------------------------------------------------
-- Six, one for each of the road's four grounds plus the two that the paving's
-- own institution owned. Refills are slow where the thing is a HOARD (the toll
-- chamber, the ruin) and quick where it is a working store somebody restocked
-- (the bothy, the mill, the shelter) — the same split the rest of the world uses.
INSERT INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
  ('box-toll', 'the-toll-stone', 'the toll chamber',
   'The slot in the top of the stone goes down into a chamber in the base of it, and the door to that chamber is on the far side, iron, flush, and locked. Everything anybody ever dropped through the slot is still in there. It was emptied on a schedule by a man with a ring of keys, and the schedule stopped.',
   'clerks-key', 3600),

  ('box-ruin', 'the-tollkeepers-ruin', 'a cavity under the hearth-stone',
   'The hearth-slab of the ruined toll-house sits proud of the floor at one corner, and under it there is a lined cavity with an iron lid — a place to put the day''s take where a fire would be standing on it all night. Whoever built it did not tell the people who eventually knocked the walls down.',
   'clerks-key', 1800),

  ('box-bothy', 'the-shepherds-bothy', 'the shelf-box',
   'A box the length of the shelf it stands on, banded, with a hasp and a small good lock — the sort of thing a man leaves a summer''s supplies in when he is going down the hill for a fortnight and means to come back up. Nobody came back up.',
   'strongbox-key', 1200),

  ('box-mill', 'the-mill-loft', 'a meal-chest',
   'A great four-square chest under the hoist beam, lidded, lined with tin against the rats, still dry inside from the smell of it. The lock is a mill lock: heavy, because what a mill holds is other people''s grain and a miller who loses it does not stay a miller.',
   'strongbox-key', 1500),

  ('box-shelter', 'the-shelter-stone', 'a cached tin',
   'Wedged into the dry angle at the back of the slab where the bracken stops, a flat tin box with a wire closure, painted once. Everybody who used this shelter knew it was here and everybody put something back. The last person to open it did not.',
   'strongbox-key', 2400),

  ('box-relay', 'the-weighbridge', 'the beam pit',
   'The slot beside the iron plate goes down to where the weighing beam ran, and the pit is under water and has a locked grille over it. The mechanism is down there. So is everything that has gone down that slot since, which on a road with a toll on it is not nothing.',
   'clerks-key', 2400);

-- ---- and what is in them ---------------------------------------------------
-- The paving's three are the INSTITUTION'S, and an institution's boxes hold
-- money-shaped things and the tools of collecting. The other three are working
-- stores and hold what a man actually needs on a hill.
INSERT INTO cache_loot (cache_id, item_id, chance) VALUES
  -- the toll chamber: the richest thing on the east road, and it should be
  ('box-toll', 'toll-token', 0.55),
  ('box-toll', 'dry-cigarettes', 0.22),
  ('box-toll', 'iron', 0.3),
  ('box-toll', 'scrap-iron', 0.35),
  ('box-toll', 'hobnailed-boots', 0.12),
  ('box-toll', 'leather-cap', 0.1),

  ('box-ruin', 'toll-token', 0.3),
  ('box-ruin', 'scrap-iron', 0.4),
  ('box-ruin', 'hardtack', 0.4),
  ('box-ruin', 'linen-strips', 0.3),
  ('box-ruin', 'crushed-pack', 0.08),

  ('box-relay', 'scrap-iron', 0.5),
  ('box-relay', 'iron', 0.25),
  ('box-relay', 'toll-token', 0.25),
  ('box-relay', 'linen-strips', 0.25),
  ('box-relay', 'dry-cigarettes', 0.08),

  -- the bothy: one man, one summer, one dog
  ('box-bothy', 'hardtack', 0.55),
  ('box-bothy', 'linen-strips', 0.35),
  ('box-bothy', 'torch', 0.3),
  ('box-bothy', 'goat-horn', 0.2),
  ('box-bothy', 'worn-boots', 0.12),
  ('box-bothy', 'hand-rolled-smokes', 0.06),

  -- the mill: grain, tin, and a miller's own tools
  ('box-mill', 'hardtack', 0.5),
  ('box-mill', 'scrap-iron', 0.35),
  ('box-mill', 'linen-strips', 0.3),
  ('box-mill', 'iron', 0.2),
  ('box-mill', 'gaff-hook', 0.1),
  ('box-mill', 'hand-rolled-smokes', 0.06),

  -- the shelter stone: everybody put something back
  ('box-shelter', 'hardtack', 0.5),
  ('box-shelter', 'torch', 0.45),
  ('box-shelter', 'linen-strips', 0.35),
  ('box-shelter', 'otter-pelt', 0.12),
  ('box-shelter', 'crushed-pack', 0.1);

-- ---- the cairn keeps its own -----------------------------------------------
-- The raven's lore says there is always something in the hollow of the top
-- stone and nobody up here has put it there. A regrowing floor is the honest
-- way to say that with machinery the world already has: small, bright, and
-- worth the climb only if you were coming this way anyway.
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('raven-feather', 'the-boundary-cairn', 1),
  ('toll-token', 'the-boundary-cairn', 1);

-- ---- AND THE BECK HOLDS A DIFFERENT FISH -----------------------------------
-- The east shipped with three fishing waters and no fish of its own, so a cast
-- into a millpond handed you a CAVE FISH and the miss line told you "the fen
-- lies flat under its own scum". Both are true of the fen and neither is true
-- of running water with a dam on it. The beck gets its own catch.
--
-- Sits between the cave fish (11) and the pale eel (16): better eating than
-- anything the fortress's waters give up, worth less in trade than either,
-- because a trout is a MEAL and the deep's things are curiosities somebody
-- will pay for. The east road feeds you well and pays you badly, which is the
-- whole economy of walking it.
INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('river-trout', 'a brown trout',
   'Heavy in the hand, olive down the back and buttery underneath, with red spots ringed in pale blue that go out within the hour of it dying. It came out of moving water and everything about the shape of it says so. There is more good eating on this than on anything the fortress has ever put in front of you.',
   'common', 1, 14, 1, 0, '', 0, 1, 1, 1, 0, 0, 0, 2, 0, '');
