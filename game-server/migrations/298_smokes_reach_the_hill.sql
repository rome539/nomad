-- THE SMOKES REACH THE HILL AND THE SHORE (rome, 2026-10-12: the drop rates had
-- gone stale). Cigarettes were placed before the mountain and the crossing were
-- built, and nobody went back: 334 creatures and seven boxes on the mountain,
-- five boxes on the crossing, and not one cigarette among them. Rates match the
-- road's and the wood's boxes - rare, and the higher the box, the better the tin.

-- the crossing
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('box-noust', 'hand-rolled-smokes', 0.08);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('box-pans', 'crushed-pack', 0.08);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('box-farnoust', 'hand-rolled-smokes', 0.08);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('box-tollshell', 'dry-cigarettes', 0.15);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('box-cave', 'dry-cigarettes', 0.20);
-- the sutlers' row
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('box-sutlers', 'crushed-pack', 0.10);
-- the mountain, foot to top
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('shieling-kist', 'hand-rolled-smokes', 0.08);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('stell-strongbox', 'hand-rolled-smokes', 0.08);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('slabs-locker', 'crushed-pack', 0.06);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('cairn-cache', 'dry-cigarettes', 0.12);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('cleft-cache', 'dry-cigarettes', 0.12);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('ridge-cache', 'dry-cigarettes', 0.15);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES ('box-kept', 'dry-cigarettes', 0.20);

-- The mountain's people carry what people carry. Animals stay at nothing.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-herd', 'hand-rolled-smokes', 0.04);
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-milker', 'hand-rolled-smokes', 0.04);
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-one-who-stayed', 'dry-cigarettes', 0.05);
