-- 107 the dear price (rome, 2026-07-23): the other half of 106 -- gear's
-- sell-value (from combat/cache drops) came down, now the fence's buy-side
-- goes up to match, so "sell your surplus to afford better" actually bites.
-- CORRECTION (verified against live data): every item actually stocked in
-- fence_stock has always had barter=0 -- none of it was ever sellable back,
-- before or after 106. The sell-value items 106 touched are a separate,
-- non-overlapping pool (mob-key/boss drops). So this isn't fixing a buy<sell
-- inversion inside the fence itself -- there wasn't one. It's raising the
-- fence's price relative to what you actually earn selling your OWN drop
-- loot, which is the real sink: uncommon/rare fence gear (epic/legendary
-- stay cache/boss-drop only, common stays free) gets a straight 3x on its
-- current price, e.g. warden-tower-shield 28 -> 84.

UPDATE fence_stock SET cost = cost * 3
WHERE item_id IN (
  SELECT id FROM item_templates WHERE slot != '' AND rarity IN ('uncommon', 'rare')
);
