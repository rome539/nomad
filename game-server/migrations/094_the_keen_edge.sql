-- 094: the keen edge (rome). When 090 made every edge bleed, most blades landed
-- in the bleed-1 bucket, flattening the difference between a fine blade and a
-- rusty one. The split: a honed, purpose-made blade opens a deeper wound (bleed 2)
-- than a degraded or improvised edge (bleed 1). Pierce stays 1 (a narrow
-- puncture); crude/rusty short edges stay 1; the heavy choppers and fine blades
-- already sit at 2; crawlers-hooks keeps its 3. Data-only: a REDEPLOY.
--
-- Only two keen blades were wrongly flattened to 1 by 090 — the fine guardsman's
-- blade and the honed forge cleaver. Everything else is already split correctly.
UPDATE item_templates SET bleed = 2 WHERE id IN ('kings-guard-blade', 'smiths-cleaver');
