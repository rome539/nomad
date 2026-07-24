-- 115 thinner stalkers (rome, 2026-07-24): pale-stalker isn't a placed spawn
-- point -- it's an 8% variant roll off pale-crawler at spawn/respawn time
-- (mob_variants). There's no fixed count to cut directly; the lever is the
-- roll odds. Halved: 0.08 -> 0.04. Expected population drops from ~1 in 13
-- crawler-slots to under 1 -- the 2 currently alive thin out as they die
-- and get replaced, no live-state edit needed.

UPDATE mob_variants SET chance = 0.04 WHERE base_id = 'pale-crawler' AND variant_id = 'pale-stalker';
