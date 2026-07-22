-- 102 the stacked hafts (rome, 2026-07-22): three hybrid weapons, each
-- stacking TWO structural classes that no weapon in the game combines yet
-- (verified against the live table — every reach weapon has stun=0/sweep=1,
-- every blunt weapon has sweep=1, every cleave weapon has stun=0). Same
-- category as a legendary's trait-combo the lottery can't produce, just not
-- quite legendary-tier — priced a notch below their single-class cache-mates,
-- not at parity with them.
--
--   poleaxe        reach + blunt   (epic)  — box-relic, 0.08
--   halberd        reach + cleave  (epic)  — reliquary, 0.10
--   two-headed-maul  blunt + cleave (rare)  — box-crack, 0.15 + forge-craftable

INSERT OR REPLACE INTO item_templates (id, name, description, rarity, dmg, slot, stun, weight, traits) VALUES
  ('poleaxe', 'a poleaxe', 'A hammer-head socketed onto a long haft, built to keep its wielder out of the exchange entirely — the point arrives first, and the weight behind it rings whatever''s left standing.', 'epic', 4, 'weapon', 0.12, 3, 'reach,two-handed');
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, dmg, slot, sweep, weight, traits) VALUES
  ('halberd', 'a halberd', 'A broad cleaving blade set on a shaft long enough to hold a doorway from outside the fight — whatever crowds through it meets the point first, and the edge catches more than one.', 'epic', 4, 'weapon', 2, 2, 'reach,two-handed');
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, dmg, slot, stun, sweep, weight) VALUES
  ('two-headed-maul', 'a two-headed maul', 'Twin iron heads on one haft, swung in a flat arc — built to answer a crowd the way a single-headed maul answers one skull.', 'rare', 4, 'weapon', 0.12, 2, 3);

INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-relic', 'poleaxe',         0.08),
  ('reliquary', 'halberd',         0.10),
  ('box-crack', 'two-headed-maul', 0.15);

-- Priced clearly above warden-maul's own recipe (scrap 3 / fistful-teeth 3) —
-- a combo weapon shouldn't cost the same as either single-class parent it's
-- effectively forging together (blunt from warden-maul, cleave from headtaker-axe).
INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('two-headed-maul', 6, 'fistful-teeth', 6);
