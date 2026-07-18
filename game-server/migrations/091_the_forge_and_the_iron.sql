-- 091: the forge and the iron (rome, roadmap "Forge & smelt economy"). Scrap
-- becomes the SMALL unit; a new IRON bar is the accumulated stock the bench eats.
-- Salvage still gives scrap; 'smelt' turns 5 scrap into 1 iron; forge recipes are
-- repriced IN IRON (the forge_recipes.scrap column now holds an iron cost). Repair
-- stays on scrap (small mends). The junk end is trimmed, and forge-EXCLUSIVE gear
-- is added so gathering iron is worth it.
--
-- Code side: IRON_ID + SMELT_SCRAP_PER_IRON + NO_SALVAGE in zone-data; cmdSmelt +
-- iron-charging forgeCore in gate.ts; the rusted-pick salvage faucet is closed.
-- Data-only migration (item templates + recipe reprice): a REDEPLOY, not a reseed.

-- The new accumulated stock. Fungible, so it free-stacks into one pack slot.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, barter) VALUES
  ('iron', 'a bar of forge iron', 'Scrap melted down and cast into a bar — the bench''s real stock. Five handfuls of scrap make one, and the good recipes are cut in iron, not handfuls.', 'uncommon', 10);

-- Forge-EXCLUSIVE gear: comes ONLY off the bench (in no drop table), so iron has
-- a point. Both eat a trophy besides the iron — the pile feeds the forge.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, dmg, slot, bleed, weight, barter) VALUES
  ('smiths-cleaver', 'a smith''s cleaver', 'Not a soldier''s blade — a butcher''s, beaten heavy and honed to a wicked edge. It opens what it touches and asks nothing of your footwork.', 'uncommon', 4, 'weapon', 1, 0, 8);
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, slot, armor, weight, barter) VALUES
  ('riveted-warplate', 'a riveted warplate', 'Plate hammered from smelted scrap and riveted over a padded backing — the bench''s best answer to a blow. Heavy on the shoulders; heavier on whatever meets it.', 'rare', 'armor', 4, 1, 12);

-- Reprice EVERY recipe from handfuls-of-scrap into IRON tiers (the column now
-- means iron): cheap 1, mid 2, dear 3, the wardens' best 4.
UPDATE forge_recipes SET scrap = CASE
  WHEN scrap <= 3 THEN 1
  WHEN scrap <= 7 THEN 2
  WHEN scrap <= 10 THEN 3
  ELSE 4 END;

-- Trim the junk end — starter commons that ALSO drop in the world, so the slate
-- reads as a real craft menu, not a pile of duplicates. rusted-sword and
-- padded-jerkin stay as the never-bare-handed floor.
DELETE FROM forge_recipes WHERE item_id IN
  ('sharpened-rib','splintered-cudgel','rag-vest','leather-cap','worn-boots',
   'tattered-cloak','battered-buckler','bone-shiv','chipped-falchion',
   'rust-eaten-cleaver','graveblade','scavenger-coat');

-- The forge-exclusive recipes (in iron + a trophy).
INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('smiths-cleaver',   2, 'pale-claw',   2),
  ('riveted-warplate', 3, 'finger-bone', 4);
