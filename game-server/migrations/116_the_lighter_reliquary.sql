-- 116 the lighter reliquary (rome, 2026-07-24): reliquary averaged 3.83
-- items per open, ~1.5x the next-richest cache (box-deep, 2.52) -- a real
-- outlier, not a lucky roll (a 4-item pull, same as rome just got, was
-- almost exactly its expected value). Scaled every GEAR chance down
-- proportionally to land the whole cache at ~2.5, matching box-deep.
-- dry-cigarettes left untouched at 0.30 -- deliberately matched to the
-- boss kill-drop rate in 104, not part of this item-count problem.

UPDATE cache_loot SET chance = 0.28 WHERE cache_id = 'reliquary' AND item_id = 'warden-tower-shield';
UPDATE cache_loot SET chance = 0.25 WHERE cache_id = 'reliquary' AND item_id IN ('deadplate-harness', 'flanged-mace', 'gravestone-shield', 'warden-sabatons');
UPDATE cache_loot SET chance = 0.22 WHERE cache_id = 'reliquary' AND item_id IN ('chitin-harness', 'reaver-glaive', 'widow-maker');
UPDATE cache_loot SET chance = 0.16 WHERE cache_id = 'reliquary' AND item_id = 'drowned-divers-shroud';
UPDATE cache_loot SET chance = 0.06 WHERE cache_id = 'reliquary' AND item_id = 'halberd';
UPDATE cache_loot SET chance = 0.05 WHERE cache_id = 'reliquary' AND item_id = 'crown-guard-pavise';
