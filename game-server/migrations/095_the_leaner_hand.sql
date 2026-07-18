-- 095 THE LEANER HAND
-- Non-epic gear fell off the dead too freely — a 60% pale-hide-hood, a 45%
-- sentinels-mantle, a 35% watchman's boots turned mid-tier mobs into gear
-- vending machines and drowned the loot economy in filler. Halve every non-epic
-- gear drop; leave the epics (the three boss drops + the flanged-mace) as the
-- aspirational pull. Trophies (loot_item) are untouched — mig 081 owns those.
-- NOTE: not idempotent — run exactly once per environment (re-running re-halves).
UPDATE mob_templates
SET gear_drop = ROUND(gear_drop * 0.5, 3)
WHERE gear_drop > 0
  AND gear_item IN (SELECT id FROM item_templates WHERE rarity <> 'epic');
