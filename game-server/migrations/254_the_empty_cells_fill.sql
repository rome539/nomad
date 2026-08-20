-- THE EMPTY CELLS FILL (2026-08-20). Six weapons, each the first rung of an
-- archetype the grid said was missing, each on a rarity rung its class is
-- short of, each with its channels — no piece ships without a way to be had.
--
--   short-spear    pierce COMMON (the class had one common) + speed-2 reach
--   polehammer     reach+blunt (the rush-breaker no one had)
--   paired-cleavers speed-2 sweep (speed-2 weapons existed; none swept)
--   grave-glaive   wicked+reach (the crit-fisher with range)
--   pine-brand     the burning line's second rung — a brand for the upland
--   lash-flail     tripping x two-handed, the second blunt legendary
--
-- The forge keeps the commons and the working weapons; the epics and the
-- legendary come from keyed boxes and a mob, the way the deep already works.

-- ============================ NEW ITEMS ============================

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
('short-spear', 'a short spear',
 'A spear cut down to fighting length, meant for close stone and quick work. It is fast off the shoulder and it reaches where a sword cannot, and a rush that would bowl a man over meets the point first.', 'common', 0, 0, 0, 1, 'weapon', 0, 2, 1, 2, 0.0, 0.0, 0, 3, 0, 'reach,pierce:1,piercing'),
('polehammer', 'a polehammer',
 'A maul on a long haft — the smith''s answer to anything that comes at speed. It caves what it lands on and it stops a charge the way a wall does, at arm''s length plus a stride.', 'rare', 0, 0, 0, 4, 'weapon', 0, 1, 1, 3, 0.15, 0.0, 0, 14, 0, 'reach'),
('paired-cleavers', 'a pair of cleavers',
 'Two butcher''s cleavers, balanced as a pair and hung from one belt. One is never enough and two are never still — the first opens a way, and the second opens whatever came through it.', 'uncommon', 0, 0, 0, 3, 'weapon', 0, 2, 2, 2, 0.0, 0.0, 1, 11, 0, ''),
('grave-glaive', 'a grave glaive',
 'A hooked blade on a long shaft, dug up where it had no business being dug. The hook is ground to open what a straight edge would close, and when the luck is with the hand the wound it leaves stays open.', 'epic', 0, 0, 0, 4, 'weapon', 0, 1, 1, 2, 0.0, 0.0, 2, 22, 0, 'reach,wicked'),
('pine-brand', 'a pitch-pine brand',
 'A length of pitch-pine, bound with tow and kept for the moment it is needed. Lit, it burns long and bright, and what lives in the dark wants no part of a man holding fire.', 'rare', 0, 0, 0, 2, 'weapon', 0, 2, 1, 1, 0.0, 0.0, 0, 12, 0, 'burning'),
('lash-flail', 'a lash-flail',
 'A long-hafted flail of chain and bar, too heavy for one hand and too mean for fair ground. What it does not break it wraps, and what it wraps does not get up again in a hurry — the chainman''s own answer to a world that would not leave him be.', 'legendary', 0, 0, 0, 5, 'weapon', 0, 1, 2, 3, 0.2, 0.0, 0, 30, 0, 'two-handed,tripping');

-- ============================ THE BENCH & THE HATCH ============================

INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('short-spear',     1, NULL, 0),
  ('polehammer',      3, 'fistful-teeth', 2),
  ('paired-cleavers', 3, 'pale-claw', 2),
  ('pine-brand',      3, NULL, 0);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('short-spear',      5),
  ('polehammer',      34),
  ('paired-cleavers', 27),
  ('pine-brand',      28),
  ('grave-glaive',    40);

-- ============================ THE FLOOR ============================

-- A rack of them stands in the guardroom, same law as the charcoal hut's
-- hatchet: the floor re-hangs one every so often, no clock to stand and farm.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('short-spear', 'guardroom', 1);

-- ============================ THE BOXES ============================

INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-ruin',  'short-spear',     0.20), -- the tollkeeper's ruin keeps one
  ('box-bone',  'polehammer',      0.10), -- bone-nook: something to stop a charge with
  ('box-pans',  'paired-cleavers', 0.12), -- a salt-crusted kitchen chest
  ('box-abyss', 'grave-glaive',    0.08), -- wardens-key, the deep keeps the deep
  ('box-tide',  'grave-glaive',    0.08), -- ...and the tide keeps the tide
  ('box-tide',  'lash-flail',      0.06), -- chain and bar, down where the water holds things
  ('box-lodge', 'pine-brand',      0.12); -- the upland box keeps fire of its own

-- ============================ THE MOB ============================

-- The chainman carried nothing. He carries his answer now — a flail of chain
-- and bar, and it falls where he falls.
UPDATE mob_templates SET gear_item = 'lash-flail', gear_drop = 0.25
 WHERE id = 'the-chainman';
