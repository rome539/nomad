-- 213 the world arms the new (rome, 2026-08-12: are we supplying new players in
-- the wood, the roads or the crossing with low tier gear to work with — and
-- then, plainly: let the WORLD arm new people).
--
-- Measured across every band before touching anything. Equippable gear a new
-- wanderer can actually reach, by where it comes from:
--
--     band       rooms   weapons on the floor        ARMOUR on the floor   renewable under L4
--     road        161    23 loose rocks, 2 staves    NONE                  footpad x7
--     crossing    200    2 staves, gaff, knife       NONE                  strand thief x3
--     wood        163    6 rocks, 2 staves           5 one-off uncommons   NOTHING
--     out          39    2 rocks, a hammerstone      shoes, shield, mantle cutpurse cap 10%
--     keep          —    5 rocks, 2 picks            3 uncommons           skeleton 10%
--
-- One hundred and sixty-one rooms of road with twenty-three loose rocks on it
-- and not one thing anybody could wear. Two hundred rooms of Crossing — the
-- hardest band in the game — with no armour on the ground at all and exactly
-- three sub-level-4 mobs that drop any. A wood whose entire under-L4
-- population is deer, boar and wolves, none of which can leave a cap.
--
-- THE CAUSE IS STRUCTURAL: gear drops from things that WORE it, and the surface
-- is animals. That is also why the obvious fix is the wrong one — hides are
-- TROPHIES, the barter currency the whole loot economy runs on, and turning a
-- wolf's pelt into a wolf's hood would spend the currency to buy the goods and
-- leave the economy holding neither.
--
-- So the WORLD supplies it, in the places that would plausibly have left it
-- lying: a tinker's camp, a burnt farmstead, a smithy ruin, a net loft, a tar
-- shed, an oar store, a poacher's camp, a squatters' row. Nothing here is
-- looted off a body. It is what people leave behind when they stop being here,
-- and every one of these rooms is named for somebody who stopped.
--
-- COMMON TIER ONLY, and deliberately: every piece below is barter 2, armour 1
-- or damage 1-2 — the floor of the ladder, the difference between naked and
-- not. Nothing uncommon, nothing with a name worth keeping. A wanderer who has
-- walked the road for an hour should be able to stand up in something; they
-- should still want everything the fence has.
--
-- regrows = 1, which is NOT "it comes back". Gear on a regrowing row goes
-- through the dice floor-renewal law (verbs.cmdTake -> applyRegrow): taking it
-- schedules a CHECK on the slow gear cadence and the world ROLLS whether it
-- coughs one back. That law was shipped precisely to stop the floor being an
-- infinite armoury, and it governs every row below. Thirty pieces across 563
-- surface rooms is one per nineteen rooms, on dice.
INSERT OR IGNORE INTO ground_spawns (item_id, room_id, regrows) VALUES
  -- THE ROADS. The band with the worst of it: everything wearable out here came
  -- off a footpad, and there are seven footpads.
  ('worn-boots',            'the-tinkers-camp',      1),  -- a tinker mends and moves on, and leaves the pair that could not be mended
  ('rag-vest',              'the-burnt-farmstead',   1),  -- what was on the line when it went up
  ('rusty-billhook',        'the-smithy-ruin',       1),  -- a smithy leaves iron behind even when it leaves nothing else
  ('splintered-cudgel',     'the-drovers-stance',    1),  -- a drover's stick, split, and not worth carrying on
  ('leather-cap',           'the-tollkeepers-ruin',  1),
  ('battered-buckler',      'the-mustering-yard',    1),  -- men were mustered here and not all of them kept their kit
  ('moth-eaten-mantle',     'the-sheep-fold',        1),  -- a shepherd's cloak, and the moth got the rest
  ('cracked-leather-shoes', 'the-pinfold',           1),
  ('quilted-coif',          'the-road-kiln',         1),
  ('rusted-pick',           'the-drowned-mill',      1),

  -- THE CROSSING. A working shore, and every one of these rooms is a trade
  -- that stopped mid-job.
  ('rag-vest',              'the-fisher-huts',       1),
  ('worn-boots',            'the-net-loft',          1),
  ('lashed-plank-shield',   'the-boat-noust',        1),  -- boat timber, lashed, and it was never a shield until somebody needed one
  ('moth-eaten-mantle',     'the-tar-shed',          1),
  ('quarterstaff',          'the-oar-store',         1),  -- an oar with the blade gone is a staff, and there are a great many oars
  ('cracked-leather-shoes', 'the-cart-shed',         1),
  ('leather-cap',           'the-smoke-house',       1),
  ('sharpened-rib',         'the-eel-hut',           1),
  ('quilted-coif',          'the-salt-store',        1),
  ('battered-buckler',      'the-wreck-ribs',        1),

  -- THE WOOD. Nothing under level 4 in it can drop a thing you can wear, so
  -- every piece here is somebody's abandoned work.
  ('rag-vest',              'the-poachers-camp',     1),
  ('leather-cap',           'the-bounds-house',      1),
  ('worn-boots',            'the-icehouse',          1),
  ('splintered-cudgel',     'the-fish-house',        1),
  ('moth-eaten-mantle',     'the-stable-range',      1),
  ('battered-buckler',      'the-chapel-shell',      1),

  -- THE DENS. People lived on this ground most recently of all, which is why
  -- it has the most ordinary things lying in it.
  ('rag-vest',              'the-squatters-row',     1),
  ('cracked-leather-shoes', 'the-black-hut',         1),
  ('rusty-billhook',        'the-peelers-camp',      1),
  ('quilted-coif',          'the-smithy-yard',       1),
  -- ...and the two slots the dens were still short of, so every band on the
  -- surface can now cover every slot a body has.
  ('moth-eaten-mantle',     'the-reeves-loft',       1),
  ('lashed-plank-shield',   'the-hurdle-yard',       1);
