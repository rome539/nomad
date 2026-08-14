-- 218 everything that exists can be found (rome, 2026-08-13: is the world
-- supplying enough greens, blues, purples and legendaries).
--
-- IT WAS SUPPLYING THREE OF THE FOUR. The audit, on gear only (slot != ''):
--
--     tier         items   sourced   UNOBTAINABLE
--     white           18        18        0
--     green           47        45        2
--     blue            35        33        2
--     purple          30        27        3
--     legendary       13         4        9
--
-- Greens, blues and purples are healthy — six routes for greens, and purples
-- come off chests, mob gear, the forge and the fence. The GOLD tier was 69%
-- non-functional: nine finished legendaries sitting in item_templates with no
-- chest, no mob, no floor, no forge and no fence between them. Sixteen items in
-- total could not be obtained by any route in the game.
--
-- AND THEY EACH ALREADY TOLD US WHERE THEY BELONG. The Captain's Wall. The
-- Marrow-Crown. The Hulk's Iron. The Last Watch. The Attainder, whose own
-- description calls it "the Forgotten King's last word, made steel". These were
-- written as elite drops and the drop rows were simply never added.
--
-- ---- the nine, sent home ----------------------------------------------------
-- Five go onto the body they are named for. Only two elite gear slots were free
-- (the marrow cantor and the gaunt), so three of these displace an existing
-- piece — and every displaced piece was checked to have another home first:
-- the watchman's boots also drop off the refuge man, the flanged mace is in the
-- reliquary, and the iron-bound shield is in the bone nook, the fence AND the
-- forge. Houndsbane was MEANT for the three-hound and does not go there: the
-- sentinel's mantle is the only thing that hound drops and it exists nowhere
-- else in the world, so taking its slot would stranded one item to un-strand
-- another. It goes to the root vault instead, which is a room away from the
-- animal it was named to kill.
--
-- Rates are deliberately under these mobs' existing gear rates (0.10-0.175),
-- because a legendary is not a sidegrade. The gaunt is the exception at 0.15:
-- it respawns once a DAY, which already makes it rarer than the number says.
UPDATE mob_templates SET gear_item = 'last-watch',         gear_drop = 0.06 WHERE id = 'last-watchman';
UPDATE mob_templates SET gear_item = 'captains-wall',      gear_drop = 0.06 WHERE id = 'warden-captain';
UPDATE mob_templates SET gear_item = 'hulks-iron',         gear_drop = 0.05 WHERE id = 'drowned-hulk';
UPDATE mob_templates SET gear_item = 'marrow-crown',       gear_drop = 0.06 WHERE id = 'marrow-cantor';
UPDATE mob_templates SET gear_item = 'long-hunger-shroud', gear_drop = 0.15 WHERE id = 'the-gaunt';

-- The other four into the deep's key-gated chests, which until now topped out at
-- EPIC — there was not one legendary anywhere below the keep. The Attainder goes
-- in the King's Hoard because that is whose word it was.
INSERT OR IGNORE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('reliquary', 'the-attainder',       0.05),
  ('box-deep',  'houndsbane',          0.05),
  ('box-tide',  'still-water-shroud',  0.06),
  ('box-abyss', 'pale-tread',          0.06);

-- ---- and the other seven, which fix a second problem on the way -------------
-- The band audit found the reward laid out against the wrong risk:
--
--     band       white  green  blue  purple  gold
--     out            5      3     2       -     -
--     road           5      3     1       -     -    170 rooms, ONE blue source
--     wood           1      8     5       4     3
--     crossing      12     10     4       1     1    203 rooms, the hardest band
--     den            5      2     -       -     -    60 rooms, capped at green
--
-- The wood out-rewarded the Crossing four to one on purples while being the
-- easier ground, the road had no purple at all across a hundred and seventy
-- rooms, and the dens could not produce anything above an uncommon. Meanwhile
-- three finished EPICS were sitting unobtainable. They go exactly where the
-- holes are, which costs nothing and fixes both faults with the same rows.
INSERT OR IGNORE INTO cache_loot (cache_id, item_id, chance) VALUES
  -- the Crossing's second purple: quiet boots for the reed maze
  ('box-farnoust', 'shadow-step-boots',  0.07),
  -- the road's first: riveted rings, on the ground armoured men travelled
  ('box-toll',     'chain-lined-mantle', 0.07),
  -- the dens' first thing above green at all
  ('box-lodge',    'bone-barred-visor',  0.07),
  -- and the four below it, spread by where they read as belonging
  ('box-pans',     'shroud-hood',        0.10),  -- rare
  ('carts-strongbox', 'padded-greathelm', 0.10), -- rare
  ('box-bothy',    'riveted-coif',       0.14),  -- uncommon
  ('reeves-floor', 'throwing-shard',     0.14);  -- uncommon

-- ---- and two the first pass missed -----------------------------------------
-- The mason's mallet and the sapper's pick: both uncommon weapons, both named
-- for a man who is standing in the world right now, and neither obtainable by
-- any route. Their own men already carry something (a padded jerkin, a
-- moss-packed cap), and both of those are common kit with plenty of other
-- homes — but a tool named after a trade should come off the tradesman, so
-- these take the slot and the displaced pieces are checked below to survive it.
UPDATE mob_templates SET gear_item = 'masons-mallet', gear_drop = 0.18 WHERE id = 'the-bridge-mason';
UPDATE mob_templates SET gear_item = 'sappers-pick',  gear_drop = 0.15 WHERE id = 'the-sapper';
