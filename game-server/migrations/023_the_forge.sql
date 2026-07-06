-- Phase D — salvage & forge. The gate bench grows a vice and a brazier: break
-- unwanted steel down into SCRAP IRON, spend scrap to REPAIR worn gear, and
-- FORGE new gear from recipes — the non-combat road up the ladder. The forge
-- tops out below the epics (those are found, never made), and the rare recipes
-- want a trophy alongside the scrap, so the beasts still gate the good steel.
--
-- Behaviour lives in zone.ts (salvage yield and repair cost scale by rarity);
-- this is the material and the recipe book.

-- ---- the material ----
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('scrap-iron', 'a handful of scrap iron', 'Bent nails, split rivets, the good inch of a bad blade. Worthless apart; the bench vice makes it worth something.', 'common');

-- ---- the recipe book: what the bench knows how to make ----
CREATE TABLE IF NOT EXISTS forge_recipes (
  item_id      TEXT PRIMARY KEY,          -- what comes off the anvil
  scrap        INTEGER NOT NULL,          -- handfuls of scrap iron consumed
  material     TEXT,                      -- extra ingredient (a trophy), or NULL
  material_qty INTEGER NOT NULL DEFAULT 0
);

INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
-- Commons: cheap, scrap only — nobody should be bare-handed for long.
('sharpened-rib',     2, NULL, 0),
('rusted-sword',      3, NULL, 0),
('splintered-cudgel', 3, NULL, 0),
('rag-vest',          3, NULL, 0),
('padded-jerkin',     3, NULL, 0),
('leather-cap',       2, NULL, 0),
('worn-boots',        2, NULL, 0),
('tattered-cloak',    2, NULL, 0),
('battered-buckler',  3, NULL, 0),
-- Uncommons: scrap only, but the pile has to be real.
('throwing-shard',    2, NULL, 0),
('bone-shiv',         5, NULL, 0),
('chipped-falchion',  6, NULL, 0),
('rust-eaten-cleaver',6, NULL, 0),
('graveblade',        7, NULL, 0),
('scavenger-coat',    5, NULL, 0),
('mail-hauberk',      8, NULL, 0),
('rusted-sallet',     5, NULL, 0),
('ironshod-boots',    5, NULL, 0),
('iron-bound-shield', 7, NULL, 0),
-- Rares: scrap AND a trophy — the beast still stands between you and the best
-- the bench can do. (Epics are never forged. They are found, or nothing.)
('fleshing-knife',      8, 'pale-claw',     2),
('notched-greatsword', 10, 'finger-bone',   3),
('headtaker-axe',      10, 'hyena-fang',    2),
('warden-maul',        10, 'fistful-teeth', 3),
('boiled-cuirass',      9, 'hyena-fang',    2),
('warden-plate',       12, 'finger-bone',   4),
('warden-greathelm',    9, 'fistful-teeth', 3),
('warden-tower-shield',11, 'finger-bone',   3),
('hyena-mantle',        6, 'hyena-fang',    3);
