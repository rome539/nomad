-- 214 every shore has a locked box (rome, 2026-08-12: what about our chests —
-- are we giving out commons and higher tiers at lower chance, and make sure it
-- is area aware).
--
-- THE TIERING IS RIGHT. Audited all twenty: a road strongbox is three to five
-- COMMONS plus a rare tail at 6-12%, the wood's are commons and uncommons with
-- one rare, and the keep's key-gated coffers are rare and epic (the reliquary is
-- ten epics). Commons are likely, the good thing is a low roll, and it steps up
-- with depth. Nothing to fix there.
--
-- THE AREA AWARENESS IS NOT. Two holes, and the second is the bad one:
--
--   chests per band    keep 7   road 7   wood 5   den 1   crossing 0   out 0
--
--   * THE CROSSING HAS NO CHEST AT ALL. Two hundred rooms — the largest band in
--     the game and the hardest — and not one locked thing on it.
--   * THE KEY DOES NOT LIVE WHERE THE LOCKS DO. strongbox-key opens eleven of
--     the twenty chests, and it drops from exactly three creatures: the
--     cutpurse, the cutthroat and the dire hyena. Every one of them lives in
--     the keep or the grounds. So the road, the wood and the dens are all
--     furnished with boxes whose key cannot be found in those bands at all —
--     you fetch it from the fortress ring or you do not open anything.
--
-- Both are fixed the same way: each band keeps its own key on the kind of
-- creature that would have one, at the rate the fortress already uses (the
-- cutpurse's 3%), and the Crossing gets boxes of its own.

-- ---- the key lives where the locks are ------------------------------------
-- A thief has keys. That is the whole reason the cutpurse has always had them,
-- and every band has its own version of that man: the road's footpad, the
-- shore's beachcomber and the wrecker who is better at it, the wood's charcoal
-- burner (the one man out there with a camp, a fire and a lockable box of his
-- own). Rates match the fortress's, and the rare bloods carry them a little
-- more often, exactly as the cutthroat does over the cutpurse.
INSERT OR IGNORE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('footpad',         'strongbox-key', 0.03),
  ('wayman',          'strongbox-key', 0.04),
  ('strand-thief',    'strongbox-key', 0.04),
  ('the-wrecker',     'strongbox-key', 0.05),
  ('charcoal-burner', 'strongbox-key', 0.03);

-- ---- and the Crossing gets something to open ------------------------------
-- Four, for two hundred rooms, which is the road's own density (seven across a
-- hundred and sixty). Every one is a working building that stopped mid-trade,
-- and the pools are the shore's OWN kit — nothing here is fortress plate.
INSERT OR IGNORE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
  ('box-noust', 'the-boat-house', 'a tar-black locker',
   'A boat-builder''s locker against the back wall, the lid tarred over so many times it has gone soft. The hasp is iron and the iron is the only part of it the salt has not beaten.',
   'strongbox-key', 900),
  ('box-pans', 'the-pan-house', 'a salt-crusted chest',
   'A chest by the cold flue, grown a white crust an inch thick along every seam. Whatever is inside has been packed in salt for two hundred years, which is either the best or the worst thing that could have happened to it.',
   'strongbox-key', 900),
  ('box-tollshell', 'the-tollhouse-shell', 'a toll-house strongbox',
   'The box the crossing''s takings went into, bolted through the floor of a building that no longer has a floor. It is still bolted to what is left. The clerks had a key and the clerks are all on the other side of the water.',
   'clerks-key', 1200),
  ('box-farnoust', 'the-far-noust', 'a boat-builder''s chest',
   'A long low chest under the upturned hull, made to hold the tools of a trade and made by somebody who had them. The joinery is better than the building it is in.',
   'strongbox-key', 900);

-- The open ground and the dens were thin too: one chest between fifty-nine den
-- rooms, and none at all on the thirty-nine of the ring.
INSERT OR IGNORE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
  ('box-sutlers', 'the-suttlers-row', 'a sutler''s chest',
   'The camp-follower''s stock chest, iron-cornered against exactly the sort of people it was parked among. It outlasted the army it was feeding.',
   'strongbox-key', 900),
  ('box-lodge', 'the-lodge-loft', 'a forester''s chest',
   'Up under the roof where the damp does not reach, a plain chest with a plain lock, holding whatever a man kept when he kept this ground.',
   'strongbox-key', 900);

-- ---- what is in them ------------------------------------------------------
-- The road's shape, held to exactly: commons likely, one uncommon band in the
-- middle, one rare at a low roll. Nothing epic on the surface.
INSERT OR IGNORE INTO cache_loot (cache_id, item_id, chance) VALUES
  -- the tar-black locker: a boatyard, so boots, timber and the tools of it
  ('box-noust', 'worn-boots',            0.40),
  ('box-noust', 'rag-vest',              0.35),
  ('box-noust', 'lashed-plank-shield',   0.30),
  ('box-noust', 'gaff-hook',             0.20),
  ('box-noust', 'felt-soled-boots',      0.15),
  ('box-noust', 'eel-hide-treads',       0.08),

  -- the salt-crusted chest: salt keeps things, and salt is worth keeping
  ('box-pans', 'quilted-coif',           0.40),
  ('box-pans', 'moth-eaten-mantle',      0.35),
  ('box-pans', 'salt-block',             0.25),
  ('box-pans', 'hide-cloak',             0.18),
  ('box-pans', 'cutters-jerkin',         0.12),
  ('box-pans', 'kelp-woven-mail',        0.07),

  -- the toll-house strongbox: a clerk's key opens a clerk's takings, so this
  -- one is richer, the same way the road's clerk-keyed boxes are
  ('box-tollshell', 'leather-cap',       0.35),
  ('box-tollshell', 'padded-jerkin',     0.30),
  ('box-tollshell', 'tide-tally',        0.25),
  ('box-tollshell', 'oyster-knife',      0.20),
  ('box-tollshell', 'fowlers-hood',      0.15),
  ('box-tollshell', 'eel-skin-cloak',    0.10),

  -- the boat-builder's chest: a trade's tools, and one thing off the bottom
  ('box-farnoust', 'cracked-leather-shoes', 0.40),
  ('box-farnoust', 'battered-buckler',   0.35),
  ('box-farnoust', 'quarterstaff',       0.30),
  ('box-farnoust', 'moss-lined-boots',   0.18),
  ('box-farnoust', 'tusk-goad',          0.12),
  ('box-farnoust', 'drowned-bell',       0.06),

  -- the sutler's chest: an army's leavings, on the ring where new wanderers walk
  ('box-sutlers', 'rag-vest',            0.40),
  ('box-sutlers', 'leather-cap',         0.35),
  ('box-sutlers', 'worn-boots',          0.30),
  ('box-sutlers', 'bone-shiv',           0.20),
  ('box-sutlers', 'scavenger-coat',      0.12),
  ('box-sutlers', 'surveyor-map',        0.06),

  -- the forester's chest: what a man kept, on the ground he kept
  ('box-lodge', 'splintered-cudgel',     0.40),
  ('box-lodge', 'worn-boots',            0.35),
  ('box-lodge', 'moth-eaten-mantle',     0.30),
  ('box-lodge', 'hide-wound-boots',      0.18),
  ('box-lodge', 'wolfskin-hood',         0.12),
  ('box-lodge', 'surveyor-map',          0.06);
