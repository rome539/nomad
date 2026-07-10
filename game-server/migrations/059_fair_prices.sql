-- The keeper's ledger audited (rome, 2026-07-10): six items were DOMINATED —
-- strictly worse than a same-or-cheaper alternative on the same shelf — and one
-- blunt weapon got a hidden buff when blunt started ignoring 2 armor. The
-- keeper's spread (buy ~2x sell) was consistent everywhere else and stands.
--
--   mail-hauberk   12 -> 7   a2 plain; thick-hide-jack (8) is a2 + wardhide
--   scavenger-coat  8 -> 6   a2 plain at the jack's own price
--   rusted-sallet   8 -> 4   a1 w1 vs the quilted-coif: a1 + padded at 3
--   ironshod-boots  8 -> 4   a1 w1 vs worn-boots a1 w0 at 3
--   leather-cap     3 -> 2   a1 plain vs the coif's a1 + padded at 3
--   rusted-sword    4 -> 3   dmg 2 plain vs the cudgel's dmg 2 + stun at 3
--   studded-maul    9 -> 11  same dmg as the falchion (9) PLUS stun 0.2 PLUS
--                            blunt's new ignore-2-armor — the buff gets a price
--
-- NOTE: fence_stock is World config, read at DO cold-start — REDEPLOY to land,
-- no reseed needed.

UPDATE fence_stock SET cost = 7  WHERE item_id = 'mail-hauberk';
UPDATE fence_stock SET cost = 6  WHERE item_id = 'scavenger-coat';
UPDATE fence_stock SET cost = 4  WHERE item_id = 'rusted-sallet';
UPDATE fence_stock SET cost = 4  WHERE item_id = 'ironshod-boots';
UPDATE fence_stock SET cost = 2  WHERE item_id = 'leather-cap';
UPDATE fence_stock SET cost = 3  WHERE item_id = 'rusted-sword';
UPDATE fence_stock SET cost = 11 WHERE item_id = 'studded-maul';

-- THE KEYS (same audit): the strongbox-key drops 18 -> 15 — roaming chests made
-- the HUNT part of the price (you used to know where every box sat; now the key
-- is a ticket to a lottery you must first find). The reliquary-key stays 60:
-- the King's Hoard never rolls empty, is dense with rares, and does not roam.
UPDATE fence_stock SET cost = 15 WHERE item_id = 'strongbox-key';

-- THE EX-SAFE BOXES warm a notch. 043 nerfed box-bone/box-crack to shop-junk
-- BECAUSE they sat in zero-risk safe rooms by the bank; the roam put them in
-- risky rooms, so the risk came back but the nerfed reward hadn't. Swap the
-- pure shelf-junk rows for mid-tier uncommons (two trait pieces among them)
-- and nudge the map/smoke odds — still clearly below the deep coffers.
DELETE FROM cache_loot WHERE cache_id = 'box-bone'  AND item_id IN ('leather-cap', 'worn-boots');
DELETE FROM cache_loot WHERE cache_id = 'box-crack' AND item_id IN ('rusted-sword', 'dried-meat');
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-bone',  'thick-hide-jack',    0.25),
('box-bone',  'felt-soled-boots',   0.20),
('box-bone',  'surveyor-map',       0.10),
('box-bone',  'dry-cigarettes',     0.08),
('box-crack', 'studded-maul',       0.25),
('box-crack', 'bloodroot-poultice', 0.30),
('box-crack', 'surveyor-map',       0.10),
('box-crack', 'dry-cigarettes',     0.08);
