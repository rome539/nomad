-- 085: the longer wall — a three-hound buff (rome, 2026-07-16).
-- The sentinel at the throat of the deep is a real wall to the under-geared, but
-- a well-armored player (armor ~8 turns ~44% of its 7-12 bite) grinds it down
-- comfortably, especially after an ambush freebie. Raw damage is the wrong lever
-- there — armor just eats a bigger number. So the buff leans on FIGHT LENGTH and
-- the ARMOR-IGNORING bleed:
--   • max_hp 68 -> 76: a longer grind = more bleed ticks and more bites landing,
--     and it shrinks the % an ambush's free first blow is worth.
--   • (bleed DMG stays 3; the bleed ODDS rise 0.25 -> 0.30 in zone-data.ts
--     BLEED_ODDS — the wound that walks past armor opens more often.)
--   • dmg 7-12 UNTOUCHED: raising it mostly punishes the ungeared, not the tank
--     it's meant to challenge.
UPDATE mob_templates SET max_hp = 76 WHERE id = 'three-hound';

-- Stat migration: apply + REDEPLOY (templates cache at world init). No reseed —
-- the tougher hound rides on the next spawn/refill.
