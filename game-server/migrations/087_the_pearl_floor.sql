-- 087: the pearl floor — the silver relic-case reweighted (rome, 2026-07-17).
-- rome opened the deep's relic-case and got one finger-bone (barter 1). Not
-- bad luck — the pool's math: the junk bone was the MOST LIKELY item (0.5),
-- and the "key always yields something" fallback grants the richest CHANCE,
-- which in this one box was that same bone. ~32% of openings paid exactly one
-- 1-barter bone; with the 15% dud on top, near half of all openings read as
-- nothing — in a box that now sits behind the 35-barter warden's key (086).
-- Reweight so the box's identity leads and the junk garnishes:
--   finger-bone   0.50 -> 0.30  (garnish, not floor)
--   grave-pearl   0.40 -> 0.50  (the case's identity — and now the FALLBACK:
--                                worst case is a 10-barter pearl, not a bone)
--   captains-seal 0.20 -> 0.30
--   sword-breaker / war-pike / marrow-shard untouched (the gear and the epic
--   stay rare finds, not the baseline).
-- "Only a bone" drops ~32% -> ~7%; expected haul ~2 items. A real cash-box.
UPDATE cache_loot SET chance = 0.30 WHERE cache_id = 'box-relic' AND item_id = 'finger-bone';
UPDATE cache_loot SET chance = 0.50 WHERE cache_id = 'box-relic' AND item_id = 'grave-pearl';
UPDATE cache_loot SET chance = 0.30 WHERE cache_id = 'box-relic' AND item_id = 'captains-seal';

-- Apply + REDEPLOY (cache loot caches at world init). No reseed.
