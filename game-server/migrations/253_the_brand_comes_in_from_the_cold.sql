-- THE BRAND COMES IN FROM THE COLD (2026-08-20). Two holes from the design-
-- space audit, closed together:
--
--  1. The longbrand — a weapon since 252 — had NO channel at all: not the
--     forge, not the keeper's shelf, no cache, no mob, no floor. The one
--     piece of gear in the world that could not be obtained. Its barter 4
--     was a leftover from its torch days, too: a rare weapon that the keeper
--     credits under a common sword was not a ledger, it was an accident.
--  2. fleeced (rest in the cold) has been rollable on cloak/armor/helm since
--     the lottery learned it, and printed on NOTHING. Cold-rest existed only
--     as luck. Three pieces now wear it, one per slot the pool allows.

-- ============================ THE LONGBRAND ============================

UPDATE item_templates SET barter = 14 WHERE id = 'longbrand';

-- The burner's kist taught the deep how to make one, and the keeper's shelf
-- finally carries it.
INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('longbrand', 3, NULL, 0);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('longbrand', 30);

-- One lies in the charcoal hut's kist, beside the billhook and the hatchet —
-- the hut where the world's fire comes from should keep fire of its own.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-burner', 'longbrand', 0.12);

-- ============================ THE FLEECED SET ============================

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
('shepherds-mantle', 'a shepherd''s mantle',
 'A mantle cut full and lined with the wool of the flock it once walked behind. It turns the wind and it turns a cut well enough, but its real work is the cold: under this, a man can lie down on bare ground and still be there in the morning.', 'uncommon', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0.0, 0.0, 0, 9, 0, 'fleeced'),
('wool-lined-cap', 'a wool-lined cap',
 'A cap with a thick wool lining sewn in, warm down over the ears. It does not look like much; on a cold night it is the difference between sleeping and not.', 'uncommon', 0, 0, 0, 0, 'helm', 1, 1, 1, 1, 0.0, 0.0, 0, 8, 0, 'fleeced'),
('fleece-lined-jack', 'a fleece-lined jack',
 'A padded jack with the fleece left in, thick as a winter coat. It turns a cut and it turns the cold better — a man can lie down in it where the frost would have taken him by morning.', 'rare', 0, 0, 0, 0, 'armor', 3, 1, 1, 2, 0.0, 0.0, 0, 12, 0, 'fleeced');

-- ============================ THE BENCH & THE HATCH ============================

INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('shepherds-mantle',  2, 'wolf-pelt', 2),
  ('wool-lined-cap',    2, 'wolf-pelt', 2),
  ('fleece-lined-jack', 3, 'white-hide', 1);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('shepherds-mantle',  22),
  ('wool-lined-cap',    20),
  ('fleece-lined-jack', 30);

-- The upland boxes keep the wool: the forester's chest and the kist under the
-- shieling bed-shelf are the cold places, and the cold places stock for it.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-lodge',      'shepherds-mantle', 0.15),
  ('box-lodge',      'wool-lined-cap',   0.12),
  ('stell-strongbox', 'fleece-lined-jack', 0.08);
