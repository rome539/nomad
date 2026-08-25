-- THE HARVEST (2026-08-25). The third legendary sweeper, and the one the
-- reaping archetype was owed: a war-scythe, re-hung to take men the way it took
-- grain. The hedge bill opens flesh and the lash-flail wraps and trips; this is
-- the wide-arc cutter — reach on a long haft, keen on a razor edge, three foes
-- a swing.
--
-- It rests where the harvest ends: the mill. The blade that cut the standing
-- crop now waits in the meal-chest over the stones that would have ground it.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
('the-harvest', 'the Harvest',
 'A scythe re-hung for the reaping of men: a long inside-curved blade set straight along its haft, so a single swing takes a whole row of whatever is standing. The edge is polished bright from a lifetime''s honest reaping, and the point is notched where the harvest stopped being grain.',
 'legendary', 0, 0, 0, 5, 'weapon', 0, 1, 3, 3, 0.0, 0.0, 2, 30, 0, 'two-handed,reach,keen');

-- ============================ THE BOX ============================

-- The meal-chest over the mill loft: the scythe comes home to the grindstone.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-mill', 'the-harvest', 0.05);
