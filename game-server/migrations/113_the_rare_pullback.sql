-- 113 the rare pullback (rome, 2026-07-23): 107's flat 3x on uncommon/rare
-- fence gear, stacked on top of 104's cut cig drops and 106's lower sell
-- values, compounded harder at the top than any one of them looked like
-- alone. Uncommon reads fine left alone; rare and the new epics (108) were
-- the actual overreach. Rare pulled back from 3x to 2x its pre-107 price.
-- The three new epics (never priced against anything, just picked) cut
-- roughly a third, landing near the same ~5x-sell ratio rare lands at now.

UPDATE fence_stock SET cost = 44 WHERE item_id IN ('warden-greathelm', 'plated-greaves');
UPDATE fence_stock SET cost = 48 WHERE item_id IN ('fleshing-knife', 'boiled-cuirass');
UPDATE fence_stock SET cost = 52 WHERE item_id = 'warden-maul';
UPDATE fence_stock SET cost = 56 WHERE item_id = 'warden-tower-shield';

UPDATE fence_stock SET cost = 100 WHERE item_id = 'lashed-warcoat';
UPDATE fence_stock SET cost = 110 WHERE item_id = 'hookbill-cleaver';
UPDATE fence_stock SET cost = 120 WHERE item_id = 'barbed-round-shield';
