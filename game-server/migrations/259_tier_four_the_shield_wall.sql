-- TIER 4: THE SHIELD WALL (2026-08-20). The block dial is printed at all
-- nine steps; what the wall lacks is its specials spread across them, and
-- the traits that never reached a shield at all. Three pieces:

--   nail-studded-targe  the spiked family reaches the shield wall
--   iron-man-catcher    mancatcher at a real block step (the original is 0)
--   riposte-buckler     riposte:2 on the 0.15 step (its kin sit at 0.10/0.28)

-- ============================ NEW ITEMS ============================

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
('nail-studded-targe', 'a nail-studded targe',
 'A round targe driven through with roofing nails, points out — the younger brother of the jack that shares the habit. It stops a blow with the best of them, and the hand behind the blow pays for it.', 'uncommon', 0, 0, 0, 0, 'shield', 0, 1, 1, 2, 0.0, 0.15, 0, 15, 0, 'spiked:1'),
('iron-man-catcher', 'an iron man-catcher',
 'A heavy man-catcher of black iron, sprung like its wooden forebear but meant to hold what a wooden one could not. What it closes on does not leave, and what it holds is held for the rest of you to answer.', 'rare', 0, 0, 0, 0, 'shield', 0, 1, 1, 2, 0.0, 0.12, 0, 16, 0, 'mancatcher'),
('riposte-buckler', 'a riposte buckler',
 'A small buckler hung for the duel, with a turned rim that catches a blade and hands it back. The man behind it does not merely stop your blow — he keeps the change, and it bleeds.', 'uncommon', 0, 0, 0, 0, 'shield', 0, 1, 1, 1, 0.0, 0.15, 0, 15, 0, 'riposte:2');

-- ============================ THE BENCH & THE HATCH ============================

INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('nail-studded-targe', 2, NULL, 0),
  ('iron-man-catcher',   3, NULL, 0),
  ('riposte-buckler',    2, NULL, 0);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('nail-studded-targe', 18),
  ('iron-man-catcher',   30),
  ('riposte-buckler',    24);

-- ============================ THE BOXES ============================

INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-bone',   'nail-studded-targe', 0.10),
  ('box-toll',   'iron-man-catcher',   0.10), -- the toll chamber: the road's own justice
  ('box-sutlers', 'riposte-buckler',   0.08); -- the sutler deals in answered blows
