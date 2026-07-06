-- Phase E — the fence. A keeper at every gate deals in kind: everything he
-- stocks has a COST in trade, and everything he'll take has a BARTER value.
-- Trophies are the slow honest grind — a pile of bones buys a blade. A few
-- things are worth far more than they look, and the game never says which;
-- that's for the wanderers to find out. (The repo is public; data-miners earn
-- their secrets the data-miner's way.)

-- What the keeper will take, and what it's worth to him. Anything at 0 he
-- waves away.
ALTER TABLE item_templates ADD COLUMN barter INTEGER NOT NULL DEFAULT 0;

UPDATE item_templates SET barter = 1  WHERE id IN ('rat-sinew', 'finger-bone', 'pale-claw', 'scrap-iron');
UPDATE item_templates SET barter = 2  WHERE id IN ('hyena-fang', 'fistful-teeth');
UPDATE item_templates SET barter = 10 WHERE id = 'grave-pearl';

-- A rare find. The keeper has his weaknesses.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('dry-cigarettes', 'a tin of dry cigarettes', 'A dented tin with a tight lid. Inside, a dozen cigarettes kept bone-dry through everything. Someone went to a great deal of trouble for these.', 'rare');
UPDATE item_templates SET barter = 20 WHERE id = 'dry-cigarettes';

-- ---- what the keeper stocks (no epics — the deep keeps those) ----
CREATE TABLE IF NOT EXISTS fence_stock (
  item_id TEXT PRIMARY KEY,
  cost    INTEGER NOT NULL   -- in trade value
);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
-- sundries
('bloodroot-poultice',  4),
('scrap-iron',          2),
('strongbox-key',      18),
('reliquary-key',      60),
-- common kit: a bad day made whole, cheap
('rusted-sword',        4),
('splintered-cudgel',   3),
('leather-cap',         3),
('rag-vest',            3),
('worn-boots',          3),
('tattered-cloak',      3),
('battered-buckler',    4),
-- uncommon kit: the real trade
('bone-shiv',           8),
('chipped-falchion',    9),
('rust-eaten-cleaver',  9),
('graveblade',         11),
('scavenger-coat',      8),
('mail-hauberk',       12),
('rusted-sallet',       8),
('ironshod-boots',      8),
('iron-bound-shield',  11),
-- rare kit: priced for a long grind, or a short story
('fleshing-knife',     24),
('warden-maul',        26),
('boiled-cuirass',     24),
('warden-greathelm',   22),
('warden-tower-shield',28),
('hyena-mantle',       18);

-- ---- where the tins turn up: caches mostly, the odd pocket ----
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('reliquary', 'dry-cigarettes', 0.50),
('box-deep',  'dry-cigarettes', 0.15),
('box-bone',  'dry-cigarettes', 0.10),
('box-crack', 'dry-cigarettes', 0.10);

-- mob_keys is really "rare pocket finds off the dead" — the tins ride it too.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
('forgotten-king', 'dry-cigarettes', 0.60),
('cutpurse',       'dry-cigarettes', 0.07),
('warden',         'dry-cigarettes', 0.05),
('the-drowned',    'dry-cigarettes', 0.04);
