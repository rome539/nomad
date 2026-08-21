-- THE BENCH REMEMBERS ITS MATERIALS (2026-08-20). The blanket rule
-- "every piece gets forge AND fence" put bare-scrap recipes on a bench
-- whose identity is the trophy economy (~35 of the original 43 recipes
-- were material-gated), and put epics on a shelf that has never carried
-- one. This walks it back:
--
--   forge keeps the material-driven recipes (and the three bare essentials:
--   the longbrand, the short spear, the two brands the burner's country
--   taught the bench) — 13 of the 31 new rows.
--   fence loses the two epics and the six pair "finds", which belong in
--   the world's boxes, not on a shelf — 8 of the 33 new rows.
--
-- Every piece keeps >= 2 channels; the pairs and the cap pick up a second
-- cache home below.

DELETE FROM forge_recipes WHERE item_id IN
  ('oilskin-jack','carriers-jack','mirror-bright-jack','nail-studded-cap',
   'mirror-targe','boar-spear','stiletto','reaping-blade','riding-mace',
   'cargo-coat','storm-cloak','bright-spiked-helm','shadow-treads',
   'hill-mantle','nail-studded-targe','iron-man-catcher','riposte-buckler',
   'tarred-cuirass');

DELETE FROM fence_stock WHERE item_id IN
  ('grave-glaive','cargo-plate',            -- epics: the shelf never carried one
   'cargo-coat','storm-cloak',              -- the pairs are finds, not stock
   'bright-spiked-helm','shadow-treads',
   'hill-mantle','bristle-hide-jack');

-- The finds take their second homes in the world instead of on the shelf.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-bone',      'nail-studded-cap',  0.06), -- bone-nook: the jack's younger brother
  ('box-bothy',      'storm-cloak',       0.06), -- the bothy: the storm road's cloak
  ('box-chapel',    'bright-spiked-helm', 0.06), -- the almsbox: a bright, spiked donation
  ('box-icehouse',  'shadow-treads',     0.05), -- the icehouse: quiet work in the cold
  ('stell-strongbox','hill-mantle',      0.05), -- the shieling kist: the high-country cloak
  ('box-bothy',      'bristle-hide-jack', 0.06), -- the bothy: the boar's answer
  ('box-tollshell', 'cargo-coat',        0.05); -- the tollhouse shell: dry goods for the road
