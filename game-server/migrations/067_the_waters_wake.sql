-- Fishing grows up (rome: "can you make it better?", 2026-07-11). The waters
-- split by depth in code (FISHING_SURFACE fen/orchard vs FISHING_DEEP flood
-- rooms), rain doubles the surface bite, a miss can snag scrap off the bottom
-- — and the deep flood hides one new prize:
--   marrow-lamprey  the deep's delicacy — the best food in the game, rare
--                   (8% of deep catches), never rises to surface water.
--                   heal 20 beats the eel's 16; barter 4 makes a dedicated
--                   deep angler's haul worth carrying to the keeper.
INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('marrow-lamprey', 'a marrow-lamprey',
   'An arm-long lamprey the color of old bone, all mouth and muscle. It fed on something down there, and it fed well — the flesh is rich past reason.',
   'rare', 1, 20, 2, 0, '', 0, 1, 1, 0, 0, 0, 0, 4, 0);
