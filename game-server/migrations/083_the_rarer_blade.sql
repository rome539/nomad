-- 083: the rarer blade — two weapon-drop tweaks (rome, 2026-07-16).
-- thrice-dead is a RARE VARIANT, and its signature notched-greatsword (a RARE
-- weapon) was dropping at a common-mob rate (3.6%) — too stingy for a rare
-- blade off a rare source. Up to 10%: the "rare item, rare source" band. The
-- common twice-dead keeps its occasional 3% of the same blade (untouched).
UPDATE mob_templates SET gear_drop = 0.10 WHERE id = 'thrice-dead';    -- notched-greatsword (rare), was 0.036

-- The flanged-mace (EPIC) off the warden-captain sat at the full
-- epic-off-elite tenth — a touch generous for a mid-elite you meet fairly
-- often. Ease it to 6%.
UPDATE mob_templates SET gear_drop = 0.06 WHERE id = 'warden-captain';  -- flanged-mace (epic), was 0.10

-- Rates are cached in the world at init (world.ts) — stat migration:
-- apply + REDEPLOY (re-inits the DO, reads fresh rates). No reseed.
