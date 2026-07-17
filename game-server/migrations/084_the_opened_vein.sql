-- 084: the opened vein — a cutthroat buff (rome, 2026-07-16).
-- The cutthroat is described as a knife-killer — "the calm of someone who has
-- done this often… does not mind cutting you open on the way" — but it dealt
-- ZERO bleed and sat at the lowest hp of the level-3 people (22, under the
-- bone-knight's 32). Its stats never matched its own menace. Two nudges:
--   • bleed 0 -> 2: the thin knife finally opens a vein it kept promising. Gated
--     to a per-hit chance in zone-data.ts BLEED_ODDS (cutthroat 0.30) — not every
--     cut, so it reads as a threat, not a certainty. (A migration alone would
--     bleed EVERY hit without that map entry.)
--   • max_hp 22 -> 26: a little more staying power for "a killer," still shy of
--     the bone-knight's 32. Damage stays 3-5 — the bleed is the new teeth.
UPDATE mob_templates SET bleed = 2, max_hp = 26 WHERE id = 'cutthroat';

-- Stat migration: apply + REDEPLOY (the world caches templates at init). No
-- reseed — the buff rides on the next cutthroat that spawns/refills.
