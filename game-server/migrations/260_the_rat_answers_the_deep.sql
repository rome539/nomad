-- THE RAT ANSWERS THE DEEP (2026-08-20). Two things at once: the rat
-- mantle — the first QUIET cloak below epic, sewn from the deep's own
-- vermin — and the armor family's depth rungs: the new traits climb the
-- armor ladder past rare, where until now nothing wore them.

--   rat-mantle       uncommon, quiet      (quiet cloaks were epic+ only)
--   tarred-cuirass   rare, watertight     (watertight's first rare armor)
--   winter-cuirass   rare, fleeced        (fleeced's first rare armor)
--   cargo-plate      epic, pocketed       (pocketed's first epic)
--   barbed-warplate  epic, spiked:2       (spiked's first epic, and the
--                                          first spiked:2 anywhere)
--   mirror-plate     legendary, glinting  (the second armor-5 piece in the
--                                          game, and glinting's first)

-- ============================ NEW ITEMS ============================

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
('rat-mantle', 'a rat mantle',
 'A mantle of rat pelts — hundreds of them, stitched together with rat-sinew into something the vermin themselves would not look twice at. It turns a blade about as well as any old hide, but its real work is the quiet: what wears it moves like what it is made of, and the dark does not hear it coming.', 'uncommon', 0, 0, 0, 0, 'cloak', 1, 1, 1, 1, 0.0, 0.0, 0, 8, 0, 'quiet'),
('tarred-cuirass', 'a tarred cuirass',
 'A cuirass of boiled leather and plate, tarred black at every joint until the water runs off it like off a boat''s keel. It turns a blow, and it turns the wet better — what rides beneath it comes through the flood and the sea dry.', 'rare', 0, 0, 0, 0, 'armor', 4, 1, 1, 3, 0.0, 0.0, 0, 14, 0, 'watertight'),
('winter-cuirass', 'a winter cuirass',
 'A cuirass lined thick with fleece, cut for the high passes where the cold kills faster than the steel. It turns a blade and it turns the frost better — a man can lie down in it in the snow and still be there in the morning.', 'rare', 0, 0, 0, 0, 'armor', 4, 1, 1, 3, 0.0, 0.0, 0, 14, 0, 'fleeced'),
('cargo-plate', 'a cargo plate',
 'A plate harness hung with a carrier''s pockets, deep ones stitched into the lining and lashed outside the plate. It turns a blow like armour should, and it carries two more of the world than your shoulders alone would.', 'epic', 0, 0, 0, 0, 'armor', 4, 1, 1, 3, 0.0, 0.0, 0, 21, 0, 'pocketed'),
('barbed-warplate', 'a barbed warplate',
 'Warplate driven through with barbs, points out, in rows a hand apart. It is the heaviest answer the jack family ever gave — whatever lands a blow on it pays for it twice over.', 'epic', 0, 0, 0, 0, 'armor', 4, 1, 1, 3, 0.0, 0.0, 0, 22, 0, 'spiked:2'),
('mirror-plate', 'a mirror plate',
 'A great plate polished until it throws the light back like a still pool, worked by a smith who spent more time on the shine than on the steel. Whatever waits in the dark sees itself coming a stride before it sees the man wearing it — and there is no dropping out of nothing onto a looking-glass.', 'legendary', 0, 0, 0, 0, 'armor', 5, 1, 1, 4, 0.0, 0.0, 0, 30, 0, 'glinting');

-- ============================ THE BENCH & THE HATCH ============================

-- The rat mantle is sewn from the vermin's own sinew — the ratcatcher's
-- economy, not the smith's. The two rares the bench can make; the epic and
-- the legendary come from the deep boxes, the way the deep already works.
INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('rat-mantle',      2, 'rat-sinew', 3),
  ('tarred-cuirass',  3, NULL, 0),
  ('winter-cuirass',  3, 'white-hide', 1);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('rat-mantle',      12),
  ('tarred-cuirass',  34),
  ('winter-cuirass',  34),
  ('cargo-plate',     44);

-- ============================ THE BOXES ============================

INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-crack',        'rat-mantle',      0.15), -- a bricked-up niche in the rat country
  ('box-tide',         'tarred-cuirass',  0.10), -- the tide box keeps the tarred thing
  ('box-lodge',        'winter-cuirass',  0.06), -- the forester's chest: the cold passes
  ('stell-strongbox',  'winter-cuirass',  0.06), -- ...and the kist under the shieling
  ('box-deep',         'cargo-plate',     0.08), -- the root-vault: what the road carried
  ('box-deep',         'barbed-warplate', 0.10), -- the deep keeps the barbed thing
  ('box-tide',         'barbed-warplate', 0.08), -- ...and the tide keeps a spare
  ('box-abyss',        'mirror-plate',    0.06), -- a mirror in the abyss, of all places
  ('box-tide',         'mirror-plate',    0.06); -- ...and one the tide held onto
