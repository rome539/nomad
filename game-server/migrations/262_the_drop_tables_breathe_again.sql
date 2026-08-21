-- THE DROP TABLES BREATHE AGAIN (2026-08-20). The roll law is per-row and
-- independent, so every row added to a cache adds expected items per open.
-- The 253-260 additions left four boxes fat (box-lodge +54% expected items
-- per open, box-sutlers +32%, box-ruin +33%, box-bone +22%) and box-lodge
-- had become one of the richest boxes in the world. This trims the new
-- rows' odds and moves three pieces to boxes that were untouched, so no
-- touched box adds more than ~20% expected loot per open. Keys, the 15%
-- dud, refill clocks and the post-loot relocation are untouched — the
-- scarcity was never in the per-open roll, and now the generosity is not
-- either.

-- box-lodge: trim, and send two pieces where the shepherds and the
-- forester's road actually run.
UPDATE cache_loot SET chance = 0.10 WHERE cache_id = 'box-lodge' AND item_id = 'shepherds-mantle';
UPDATE cache_loot SET chance = 0.06 WHERE cache_id = 'box-lodge' AND item_id = 'wool-lined-cap';
UPDATE cache_loot SET chance = 0.06 WHERE cache_id = 'box-lodge' AND item_id = 'pine-brand';
DELETE FROM cache_loot WHERE cache_id = 'box-lodge' AND item_id = 'storm-cloak';
DELETE FROM cache_loot WHERE cache_id = 'box-lodge' AND item_id = 'hill-mantle';
DELETE FROM cache_loot WHERE cache_id = 'box-lodge' AND item_id = 'boar-spear';
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-shelter', 'storm-cloak', 0.10), -- the shelter stone: a storm cloak for the storm road
  ('box-bothy',    'hill-mantle', 0.10), -- the shepherd's bothy: his own mantle
  ('box-bothy',    'boar-spear',  0.10); -- ...and the spear for what comes down off the hill

-- box-sutlers: trim; the cargo coat belongs with the cart, the buckler
-- with the duelists' road.
UPDATE cache_loot SET chance = 0.10 WHERE cache_id = 'box-sutlers' AND item_id = 'carriers-jack';
UPDATE cache_loot SET chance = 0.10 WHERE cache_id = 'box-sutlers' AND item_id = 'stiletto';
UPDATE cache_loot SET chance = 0.08 WHERE cache_id = 'box-sutlers' AND item_id = 'reaping-blade';
DELETE FROM cache_loot WHERE cache_id = 'box-sutlers' AND item_id = 'cargo-coat';
DELETE FROM cache_loot WHERE cache_id = 'box-sutlers' AND item_id = 'riposte-buckler';
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('carts-strongbox', 'cargo-coat',     0.08), -- cargo with the cart
  ('box-tollshell',   'riposte-buckler', 0.08); -- the tollhouse shell: answered blows

-- box-ruin and box-bone: trim to the world's own weight.
UPDATE cache_loot SET chance = 0.12 WHERE cache_id = 'box-ruin' AND item_id = 'short-spear';
UPDATE cache_loot SET chance = 0.08 WHERE cache_id = 'box-ruin' AND item_id = 'riding-mace';
UPDATE cache_loot SET chance = 0.05 WHERE cache_id = 'box-ruin' AND item_id = 'shadow-treads';
UPDATE cache_loot SET chance = 0.05 WHERE cache_id = 'box-ruin' AND item_id = 'grave-glaive';
UPDATE cache_loot SET chance = 0.08 WHERE cache_id = 'box-bone' AND item_id = 'polehammer';
UPDATE cache_loot SET chance = 0.08 WHERE cache_id = 'box-bone' AND item_id = 'greatblade';
UPDATE cache_loot SET chance = 0.08 WHERE cache_id = 'box-bone' AND item_id = 'bristle-hide-jack';
DELETE FROM cache_loot WHERE cache_id = 'box-bone' AND item_id = 'nail-studded-targe';
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-bounds', 'nail-studded-targe', 0.08); -- the bounds chest: the law's own nails

-- box-tide, box-noust, box-solar: trim the tide's haul and the bright
-- rooms back to their old weight.
UPDATE cache_loot SET chance = 0.08 WHERE cache_id = 'box-tide' AND item_id = 'tarred-cuirass';
UPDATE cache_loot SET chance = 0.06 WHERE cache_id = 'box-tide' AND item_id = 'barbed-warplate';
UPDATE cache_loot SET chance = 0.05 WHERE cache_id = 'box-tide' AND item_id = 'mirror-plate';
UPDATE cache_loot SET chance = 0.06 WHERE cache_id = 'box-tide' AND item_id = 'grave-glaive';
UPDATE cache_loot SET chance = 0.05 WHERE cache_id = 'box-tide' AND item_id = 'lash-flail';
UPDATE cache_loot SET chance = 0.10 WHERE cache_id = 'box-noust' AND item_id = 'oilskin-jack';
UPDATE cache_loot SET chance = 0.08 WHERE cache_id = 'box-noust' AND item_id = 'tar-brand';
UPDATE cache_loot SET chance = 0.08 WHERE cache_id = 'box-noust' AND item_id = 'tarred-cuirass';
UPDATE cache_loot SET chance = 0.08 WHERE cache_id = 'box-solar' AND item_id = 'mirror-bright-jack';
UPDATE cache_loot SET chance = 0.08 WHERE cache_id = 'box-solar' AND item_id = 'mirror-targe';
UPDATE cache_loot SET chance = 0.06 WHERE cache_id = 'box-solar' AND item_id = 'bright-spiked-helm';
