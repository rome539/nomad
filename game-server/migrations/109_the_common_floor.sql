-- 109 the common floor (rome, 2026-07-23): mob_templates.gear_item's own
-- gear_drop (does the mob's worn gear survive the fall?) sat backwards --
-- the three common-tier mobs (cutpurse, grave-hyena, skeleton) rolled
-- 3-4%, LOWER than most of uncommon (avg ~12%) and epic (avg ~17.75%),
-- and near the very bottom of rare (1.5-22.5%). You were more likely to
-- loot a boss's epic weapon off its corpse than a skeleton's rusted sword.
-- Flat 10% for all three -- lands mid-uncommon, off the floor, without
-- leapfrogging the tiers above it.

UPDATE mob_templates SET gear_drop = 0.10 WHERE id IN ('cutpurse', 'grave-hyena', 'skeleton') AND gear_item IS NOT NULL AND gear_item != '';
