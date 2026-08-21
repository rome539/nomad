-- TIER 2, FIRST DROP (2026-08-20): six more archetypes off the grid, each
-- a cell nothing printed before, each on a rung its family was missing,
-- each with channels. Still no epics from the forge — the deep boxes and
-- the mobs keep those, the way the deep already works.

--   boar-spear    pierce + sweep (pierce weapons never swept)
--   greatblade    the two-handed edge's first rung below epic
--   stiletto      the speed-3 line's second member (widow-maker was alone)
--   tar-brand     the burning line's third rung — the wet country's brand
--   reaping-blade a one-handed sweep-2 edge between billhook and glaive
--   riding-mace   the first FAST blunt (speed-2 weapons were never blunt)

-- ============================ NEW ITEMS ============================

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
('boar-spear', 'a boar spear',
 'A hunting spear with a broad, winged head, cut for the moment the boar turns instead of running. The blade is wide enough to catch whatever stands beside what it kills — the arc is wide, and what it does not pin it opens.', 'uncommon', 0, 0, 0, 3, 'weapon', 0, 1, 2, 2, 0.0, 0.0, 0, 9, 0, 'pierce:1,piercing'),
('greatblade', 'a greatblade',
 'A great two-handed sword, plain of guard and honest of steel. It is too long for a doorway and too heavy for a wrist, and it asks both hands of the man who means to use it — what it lands on stays landed on.', 'rare', 0, 0, 0, 5, 'weapon', 0, 1, 1, 3, 0.0, 0.0, 1, 12, 0, 'two-handed'),
('stiletto', 'a stiletto',
 'A long, thin knife ground to a needle, made to be in and out before the eye finds it. It cuts no armour and it makes no sound, but it is the fastest thing a hand can hold.', 'uncommon', 0, 0, 0, 2, 'weapon', 0, 3, 1, 1, 0.0, 0.0, 1, 12, 0, ''),
('tar-brand', 'a tar brand',
 'A brand of pine soaked in ship''s tar, kept against the nights the water gives its dead back. Lit, it burns long and it burns black, and what lives in the dark wants no part of a man holding fire.', 'rare', 0, 0, 0, 4, 'weapon', 0, 1, 1, 1, 0.0, 0.0, 0, 18, 0, 'burning'),
('reaping-blade', 'a reaping blade',
 'A curved blade on a short haft, meant to take a whole swathe at a stride. It was made for standing grain and it has learned standing men — the arc is wide, and everything in it pays.', 'rare', 0, 0, 0, 4, 'weapon', 0, 1, 2, 2, 0.0, 0.0, 1, 13, 0, ''),
('riding-mace', 'a riding mace',
 'A short mace hung for close work, fast off the belt and heavy at the end. It is not a weapon for speeches — it comes up quick and it puts a man down ringing.', 'uncommon', 0, 0, 0, 2, 'weapon', 0, 2, 1, 2, 0.1, 0.0, 0, 9, 0, '');

-- ============================ THE BENCH & THE HATCH ============================

INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('boar-spear',     2, NULL, 0),
  ('greatblade',     3, 'finger-bone', 2),
  ('stiletto',       2, NULL, 0),
  ('tar-brand',      3, NULL, 0),
  ('reaping-blade',  3, NULL, 0),
  ('riding-mace',    2, NULL, 0);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('boar-spear',     24),
  ('greatblade',     34),
  ('stiletto',       24),
  ('tar-brand',      32),
  ('reaping-blade',  33),
  ('riding-mace',    21);

-- ============================ THE BOXES ============================

INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-lodge',   'boar-spear',     0.15), -- the forester's chest: upland hunting gear
  ('box-bone',    'greatblade',     0.12), -- bone-nook: something too long for a doorway
  ('box-sutlers', 'stiletto',       0.12), -- the sutler deals in quiet, fast work
  ('box-noust',   'tar-brand',      0.12), -- the tar-black locker keeps fire of its own
  ('box-sutlers', 'reaping-blade',  0.10), -- a blade for hire, between honest jobs
  ('box-ruin',    'riding-mace',    0.15); -- the tollkeeper's ruin: close work for the road
