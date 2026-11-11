-- 384: A RARE COSTS A REAL TROPHY (2026-11-10). Seventeen rare recipes asked
-- for two or three of the cheapest trophies in the world (finger bones, teeth,
-- claws, fangs, worth 1 or 2 each) or for none at all, so a forged rare cost a
-- fifth of what the same piece fetched anywhere else. Each now asks for a
-- trophy worth the having, from the ground the piece belongs to. The fortress
-- has only two such that are commonly come by, the grave pearl and the pale
-- pelt, so its pieces share them. The cheap trophies keep their uncommon uses.

UPDATE forge_recipes SET material = 'grave-pearl', material_qty = 2 WHERE item_id IN ('warden-plate', 'warden-tower-shield', 'two-headed-maul');
UPDATE forge_recipes SET material = 'grave-pearl', material_qty = 1 WHERE item_id IN ('warden-maul', 'warden-greathelm', 'plated-greaves');
UPDATE forge_recipes SET material = 'pale-pelt', material_qty = 2 WHERE item_id = 'riveted-warplate';
UPDATE forge_recipes SET material = 'pale-pelt', material_qty = 1 WHERE item_id IN ('notched-greatsword', 'greatblade', 'fleshing-knife');
UPDATE forge_recipes SET material = 'hyena-fang', material_qty = 6 WHERE item_id = 'hyena-mantle';
UPDATE forge_recipes SET material = 'boar-tusk', material_qty = 2 WHERE item_id IN ('headtaker-axe', 'boiled-cuirass');
UPDATE forge_recipes SET material = 'toll-token', material_qty = 1 WHERE item_id = 'polehammer';
UPDATE forge_recipes SET material = 'wolf-skull', material_qty = 1 WHERE item_id = 'longbrand';
UPDATE forge_recipes SET material = 'wolf-pelt', material_qty = 2 WHERE item_id = 'pine-brand';
UPDATE forge_recipes SET material = 'seal-pelt', material_qty = 2 WHERE item_id = 'tar-brand';
