-- A cheap FOOTHOLD against the wardens that a broke new player can just PICK UP
-- off the floor. Every weapon a beginner can afford (the cudgel, the rusted
-- sword) is pierce 0, and flat armor subtraction floors those to 1 damage a
-- swing against warden plate (armor 2). This rusted labour-pick, left in the
-- picked-over Stripped Armory, is dmg 1 but pierce 2 (pierce lives in code,
-- zone-data.ts PIERCE). Because only the FIRST swing of a beat carries a body
-- roll, that opener lands full through the plate (~4-5) instead of chewed down
-- to ~2-3; follow-up swings are edge-only and floor to 1 either way. So it's not
-- a warden-killer — it's a foothold. It doesn't have to match the warden; people
-- still have to fight smart (open with the pick, bleed elsewhere, pick your
-- ground, run when it's bad).
--
-- Deliberately humble, so it doesn't obsolete the bought pick: it's a common at
-- dmg 1 (bad against everything UNarmored), it lives in a single room, it regrows
-- slowly, and floor-seeded gear rolls in ALREADY WORN (rollGearCondition
-- scavenged). The horseman's-pick (8) stays the reliable upgrade you buy once you
-- have trade. A tool, not treasure — the one gear item on the floor, junk on
-- purpose. (rome, 2026-07-08.)
--
-- NOTE: item_templates + ground_spawns are World config, read at DO cold-start.
-- No reseed for the item, but the ground spawn only lands on a freshly-seeded
-- world, so this wants a REDEPLOY + /admin/reseed (or it seeds on the next cold
-- world). pierce is added in zone-data.ts and ships with the worker code.

-- cols: (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed)
INSERT OR REPLACE INTO item_templates
(id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed) VALUES
('rusted-pick', 'a rusted pick', 'A labourer''s pick gone to orange rust, left where it fell when the good steel walked out of the armory. The head is ugly and the haft is split at the grip — but the point is narrow, and narrow is the one thing plate was never made to stop.',
 'common', 1, 'weapon', 0, 1, 1, 0, 0.00, 0, 0);

-- It lies in the Stripped Armory and regrows: a tool the room keeps, not loot.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
('rusted-pick', 'armory', 1);
