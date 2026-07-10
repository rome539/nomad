-- The pale crawler's bleed 3 -> 2 (rome, 2026-07-10): with a resident crawler
-- haunting the chapel wing and surfaced ones walking the shallows, a 3-a-tick
-- armor-ignoring wound was too rich for where players actually meet it. Still
-- the deep's worst biter by odds (BLEED_ODDS .225); the wound just runs
-- shallower. No reseed — stats read live from the template on redeploy.
UPDATE mob_templates SET bleed = 2 WHERE id = 'pale-crawler';
