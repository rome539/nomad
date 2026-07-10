-- The three-headed hound's armor (3) outlasted the blunt-ignores-armor change:
-- a rock (blunt, ignores BLUNT_ARMOR_IGNORE=2) still met effective armor 1 and
-- floored every crushing blow to 1-3, so the sentinel read as a stone wall to
-- anyone without pierce or a heavy blade. Down to 2: blunt now bites clean
-- through (ignores 2 -> effective 0), pierce still the cleanest answer, and the
-- hound stays the toughest-skinned thing on the surface ring alongside the
-- warden-captain. (rome, 2026-07-09.)
--
-- Shipped with the sentinel-never-flees-its-post fix (a wounded hound was
-- abandoning the descent it bars — see zone.ts wantsFlee, now excludes SENTINELS).
--
-- NOTE: mob_templates is World config, read at DO cold-start — no reseed (armor
-- is read from the template each hit, so it updates the live hound at once), but
-- REDEPLOY the worker so the warm Durable Object reloads the World.

UPDATE mob_templates SET armor = 2 WHERE id = 'three-hound';
