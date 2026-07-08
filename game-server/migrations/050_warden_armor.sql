-- The hollow warden's armor (3) was too high for its tier — the same as the
-- three-headed hound (a sentinel mini-boss) and only one under the level-5
-- warden-captain, on a level-3 surface-ring mob. Flat armor subtraction meant a
-- low-base weapon (a bone-shiv, base 2) hard-floored to 1 damage a swing — and
-- with HOLLOW now bleed-immune, a bleeder has nothing else to give. Down to 2:
-- still armored (heavy blades and pierce still the right answer), but starter
-- gear chips 2-5 instead of a grinding 1. (rome, 2026-07-08.)
--
-- Rounds-to-kill the warden (35hp), hollow so bleed counts for nothing:
--   bone-shiv worn 13->10, rusted-sword 14->10, graveblade 8->7, pick 8->7.
--   The pick and heavy blades stay the clear answer; the shiv stops being misery.
--
-- NOTE: mob_templates is World config, read at DO cold-start — no reseed (armor
-- is read from the template each hit, so it updates every warden at once), but
-- REDEPLOY the worker so the warm Durable Object reloads the World.

UPDATE mob_templates SET armor = 2 WHERE id = 'warden';
