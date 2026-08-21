-- PHASE D: THE FAMILIES STOP BEING ONLY CHILDREN (2026-08-20). The last
-- four open armor-family cells close — watertight, pocketed and glinting
-- body armor, a spiked helm — and glinting reaches the shield wall. With
-- this, every valid trait x slot cell in the armor family is printed: the
-- 34-cell matrix reads 34/34. Every piece ships with >= 2 channels.

-- ============================ NEW ITEMS ============================

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
('oilskin-jack', 'an oilskin jack',
 'A canvas jack oiled and waxed along every seam until the water runs off it like it off a bird''s back. It turns a cut and it turns the wet better — what rides in the pack beneath it comes through the flood and the sea dry.', 'uncommon', 0, 0, 0, 0, 'armor', 2, 1, 1, 1, 0.0, 0.0, 0, 12, 0, 'watertight'),
('carriers-jack', 'a carrier''s jack',
 'A padded jack cut for a man who carries his whole life on his back: deep pockets in, deeper pockets out, every seam double-stitched against the road. It turns a cut as well as any quilted thing, and it carries two more of the world than your shoulders alone would.', 'uncommon', 0, 0, 0, 0, 'armor', 2, 1, 1, 1, 0.0, 0.0, 0, 14, 0, 'pocketed'),
('mirror-bright-jack', 'a mirror-bright jack',
 'A jack sewn through with small polished plates, each one set to throw the light back like a still pool. It is not the heaviest armour in the world, but whatever waits in the dark sees itself coming a stride before it sees the man wearing it — and there is no dropping out of nothing onto a looking-glass.', 'rare', 0, 0, 0, 0, 'armor', 3, 1, 1, 2, 0.0, 0.0, 0, 18, 0, 'glinting'),
('nail-studded-cap', 'a nail-studded cap',
 'A cap driven through with roofing nails, points out, the younger brother of the jack that shares its habit. It does not pretend to be a great helm — but whatever comes down on it pays for the privilege.', 'uncommon', 0, 0, 0, 0, 'helm', 1, 1, 1, 1, 0.0, 0.0, 0, 13, 0, 'spiked:1'),
('mirror-targe', 'a mirror targe',
 'A round targe polished until it throws the light back like water. The shine is the point: what comes out of the dark at the man behind it sees itself first, and a lurking thing that lives by not being seen finds it has nothing to hide behind.', 'uncommon', 0, 0, 0, 0, 'shield', 0, 1, 1, 2, 0.0, 0.15, 0, 15, 0, 'glinting');

-- ============================ THE BENCH & THE HATCH ============================

INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('oilskin-jack',      2, NULL, 0),
  ('carriers-jack',     2, NULL, 0),
  ('mirror-bright-jack', 3, NULL, 0),
  ('nail-studded-cap',  2, NULL, 0),
  ('mirror-targe',      2, NULL, 0);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('oilskin-jack',       20),
  ('carriers-jack',      22),
  ('mirror-bright-jack', 30),
  ('nail-studded-cap',   16),
  ('mirror-targe',       18);

-- ============================ THE BOXES ============================

-- The boat-house keeps the wet out; the sutler's chest keeps a pedlar's
-- stock; the solar keeps what throws the light back.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-noust',   'oilskin-jack',       0.15),
  ('box-sutlers', 'carriers-jack',      0.12),
  ('box-solar',   'mirror-bright-jack', 0.10),
  ('box-solar',   'mirror-targe',       0.12);
