-- TIER 3: THE PAIRS (2026-08-20). The armor-family matrix is complete
-- (256); what it lacks now is depth — the trait PAIRS that make a piece
-- feel like a find instead of a cell. Five pairings that respect the
-- validity matrix, each with channels.

--   cargo-coat        watertight + pocketed  (the river-trader's coat)
--   bristle-hide-jack wardhide + spiked      (the brute suit)
--   storm-cloak       fleeced + watertight   (cold AND wet)
--   bright-spiked-helm glinting + spiked     (the bright crown)
--   shadow-treads     quiet + slick          (the stalking boots)
--   hill-mantle       fleeced + hooded       (the high-country cloak)

-- ============================ NEW ITEMS ============================

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
('cargo-coat', 'a cargo coat',
 'A long coat of oiled canvas with pockets cut into the lining like a ship''s holds — deep ones, sealed ones, dry ones. A man can ford a river in it and come up the far bank with his whole life still on him, and still room for two more of the world than his shoulders alone would carry.', 'rare', 0, 0, 0, 0, 'cloak', 2, 1, 1, 2, 0.0, 0.0, 0, 16, 0, 'watertight,pocketed'),
('bristle-hide-jack', 'a bristle-hide jack',
 'A jack of hide boiled until it will not cut, then driven through with the tusks and bristles of the boar that supplied it, points out. A blade skates off the boiled hide; whatever leans in close pays for the leaning.', 'rare', 0, 0, 0, 0, 'armor', 3, 1, 1, 2, 0.0, 0.0, 0, 17, 0, 'wardhide,spiked:1'),
('storm-cloak', 'a storm cloak',
 'A cloak of oiled wool, lined thick against the weather and sealed against the wet at every seam. A man can sleep under it in a cold rain and wake up dry and whole — the two weathers that kill on the road, answered by the one garment.', 'rare', 0, 0, 0, 0, 'cloak', 2, 1, 1, 2, 0.0, 0.0, 0, 15, 0, 'fleeced,watertight'),
('bright-spiked-helm', 'a bright-spiked helm',
 'A helm of polished steel crowned with a ring of short spikes, each one ground to a point and each one throwing the light. Whatever comes out of the dark sees itself coming; whatever comes down on it pays for the coming.', 'rare', 0, 0, 0, 0, 'helm', 1, 1, 1, 2, 0.0, 0.0, 0, 16, 0, 'glinting,spiked:1'),
('shadow-treads', 'shadow treads',
 'Soft-soled boots of felt and greased eel-skin, cut for a man who needs the ground not to know he is on it. They make no sound on stone or mud, and a hand that reaches for the wearer slides off like off a fish.', 'rare', 0, 0, 0, 0, 'feet', 2, 1, 1, 1, 0.0, 0.0, 0, 14, 0, 'quiet,slick'),
('hill-mantle', 'a hill mantle',
 'A mantle of wool cut with a hood deep enough to light a flame under, lined thick against the high-country cold. The shepherd''s answer to a world that is dark, and wet, and cold, often at once.', 'rare', 0, 0, 0, 0, 'cloak', 2, 1, 1, 2, 0.0, 0.0, 0, 15, 0, 'hooded,fleeced');

-- ============================ THE BENCH & THE HATCH ============================

INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('cargo-coat',         3, NULL, 0),
  ('bristle-hide-jack',  3, 'boar-tusk', 2),
  ('storm-cloak',        3, 'wolf-pelt', 2),
  ('bright-spiked-helm', 3, NULL, 0),
  ('shadow-treads',      3, NULL, 0),
  ('hill-mantle',        3, 'wolf-pelt', 2);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('cargo-coat',         26),
  ('bristle-hide-jack',  30),
  ('storm-cloak',        26),
  ('bright-spiked-helm', 28),
  ('shadow-treads',      26),
  ('hill-mantle',        26);

-- ============================ THE BOXES ============================

INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-sutlers', 'cargo-coat',         0.08), -- the sutler deals in dry, roomy goods
  ('box-bone',    'bristle-hide-jack',  0.10), -- bone-nook: the boar's answer
  ('box-lodge',   'storm-cloak',        0.10), -- the forester's chest: the cold wet road
  ('box-solar',   'bright-spiked-helm', 0.08), -- the solar keeps what throws the light
  ('box-ruin',    'shadow-treads',      0.08), -- quiet work for the toll road
  ('box-lodge',   'hill-mantle',        0.10); -- the upland box keeps the high-country cloak
