-- 106 the thinner purse (rome, 2026-07-23): part of making the fence a real
-- sink -- gear's own offer-value comes DOWN so buying costs more in pieces
-- sold, not just barter tuning. Legendary capped at 30 (was 40); every other
-- gear tier scaled down proportionally from that same 0.75x, keeping the
-- tiers' relative spread intact.
--   uncommon   8 -> 6
--   rare      12 -> 9
--   epic      25 -> 19
--   legendary 40 -> 30

UPDATE item_templates SET barter = 6  WHERE slot != '' AND rarity = 'uncommon'  AND barter = 8;
UPDATE item_templates SET barter = 9  WHERE slot != '' AND rarity = 'rare'      AND barter = 12;
UPDATE item_templates SET barter = 19 WHERE slot != '' AND rarity = 'epic'      AND barter = 25;
UPDATE item_templates SET barter = 30 WHERE slot != '' AND rarity = 'legendary' AND barter = 40;
