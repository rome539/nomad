-- 092: the smith's answers (rome). The forge's real identity — gear the dungeon
-- won't drop, so iron is worth gathering. Builds on 091 (the scrap/iron economy).
--
-- 1) Completes the forge WEAPON TRIAD (all forge-only): a smith can arm for any
--    target the weapon triangle names — edge (smith's cleaver, 091), BLUNT (a
--    forged war-maul, bone-shatter), PIERCE (a forged war-spike, armor-pen).
-- 2) Two MASTERWORKS — top-end iron sinks gated on a BOSS trophy: the smith's
--    ruin (the only weapon that both bleeds AND stuns) and a smith's greatplate
--    (armor 5, best body armor in the deep).
-- 3) Trims the last plain drop-duplicates off the slate.
--
-- Code side: forged-warspike joins the PIERCE map (zone-data). All these ids are
-- in NO drop table — the bench is the only way to them. Data-only: a REDEPLOY.

-- The two new triad weapons (forge-only).
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, dmg, slot, stun, weight, barter) VALUES
  ('forged-warmaul', 'a forged war-maul', 'A head of cast iron on a banded haft, made for one purpose: to cave in what a blade skates off. Slow, heavy, and the only smithing that answers bone.', 'uncommon', 4, 'weapon', 0.20, 2, 8);
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, dmg, slot, bleed, weight, barter) VALUES
  ('forged-warspike', 'a forged war-spike', 'A four-sided spike on a short shaft, ground to punch straight through plate and scale. It opens a narrow wound that keeps weeping — the answer to anything that hides behind armor.', 'uncommon', 4, 'weapon', 1, 1, 8);

-- The masterworks (forge-only, boss-trophy gated).
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, dmg, slot, bleed, stun, weight, barter) VALUES
  ('smiths-ruin', 'the smith''s ruin', 'A greatblade forged with a spiked back and a weighted pommel — it opens flesh on the draw and rings skulls on the return. No corpse in the deep was ever buried wearing its like; it is only ever made.', 'epic', 5, 'weapon', 2, 0.10, 1, 25);
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, slot, armor, weight, barter) VALUES
  ('smiths-greatplate', 'a smith''s greatplate', 'Full plate hammered from bar iron and fitted to the shoulders, proof against near anything that swings. It is a weight you feel every step — and so is whatever it turns.', 'epic', 'armor', 5, 2, 25);

-- The recipes (iron + a trophy; the masterworks eat an epic BOSS trophy).
INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('forged-warmaul',    2, 'fistful-teeth', 2),
  ('forged-warspike',   3, 'pale-claw',     2),
  ('smiths-ruin',       5, 'marrow-shard',  1),
  ('smiths-greatplate', 5, 'drowned-pearl', 1);

-- Trim the last plain drop-duplicates — gear that ALSO falls in the world, so the
-- forge stops reading as a second loot table. The trophy-gated armory stays (that
-- feels like smithing); these four don't.
DELETE FROM forge_recipes WHERE item_id IN
  ('rusty-billhook','throwing-shard','ironshod-boots','rusted-sallet');
