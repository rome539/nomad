-- 112 no free lunch (rome, 2026-07-23): 111 gave every gear item a real
-- sell value, which broke 5 fence_stock rows even (buy == sell exactly):
-- leather-cap/cracked-leather-shoes/moth-eaten-mantle (2=2), rusted-sallet/
-- ironshod-boots (6=6) -- buy one, sell it right back, no cost. Bumped up
-- by 1 each, matching the smallest margin already standing elsewhere in
-- their own tier (e.g. rusted-sword: sell 2, buy 3).

UPDATE fence_stock SET cost = 3 WHERE item_id IN ('leather-cap', 'cracked-leather-shoes', 'moth-eaten-mantle');
UPDATE fence_stock SET cost = 7 WHERE item_id IN ('rusted-sallet', 'ironshod-boots');
