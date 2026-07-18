-- 090: the edge and the point (rome, 2026-07-17). The weapon triangle made honest.
--
-- EDGED weapons all BLEED now — an edge opens flesh. That wound is worthless on the
-- bloodless HOLLOW (the engine already voids bleed on bone), so blades become the
-- SURFACE answer and fall off in the bone-deep, exactly as they should.
--
-- PIERCE weapons (picks, spears, the harpoon) get a puncture BLEED, punch armor
-- (the armor-pen itself lives in the PIERCE code map, extended alongside this), and
-- ride a MIDDLE weight — heavier than a blade, lighter than a mace.
--
-- BLUNT is unchanged here: it already carries stun + weight, and it is the only
-- thing that shatters bone; its balance is its weight and its lost opener-swing.
--
-- Pure stat data, no schema change: this is a REDEPLOY, not a reseed. Live weapons
-- pick the new numbers up when the world reloads.

-- Edged blades that were bland (bleed 0): give them their edge.
UPDATE item_templates SET bleed = 1 WHERE id IN
  ('rusted-sword','rust-eaten-cleaver','rusty-billhook','chipped-falchion','kings-guard-blade','reaver-glaive','sword-breaker','throwing-shard');
UPDATE item_templates SET bleed = 2 WHERE id IN
  ('headtaker-axe','graveblade','notched-greatsword','headsman-sword');

-- Piercing weapons: a puncture bleeds too, and they carry a middle weight (planted
-- more than a blade). Picks were already weightless; spear joins them at 1. (war-pike
-- and the harpoon are already weight 1.)
UPDATE item_templates SET bleed = 1 WHERE id IN
  ('rusted-pick','horsemans-pick','crow-beak-pick','pitted-spear','war-pike','abyssal-harpoon');
UPDATE item_templates SET weight = 1 WHERE id IN
  ('rusted-pick','horsemans-pick','crow-beak-pick','pitted-spear');
