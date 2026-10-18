-- 304: THE PALE BITE SOFTER (rome, 2026-10-18).
--
-- The deep's two pale things hit too hard for where they wait: two off the
-- bottom of each and three off the top, a little under three a blow on average.
-- ...and the barrow-wights with them (rome, same day). The rest of the deep
-- keeps its damage.
--   pale crawler  6-12 -> 4-9
--   pale stalker  7-11 -> 5-8
--   barrow-wight (twice-dead)  5-9 -> 3-7
--   thrice-dead                4-7 -> 2-5
UPDATE mob_templates SET dmg_min = 4, dmg_max = 9 WHERE id = 'pale-crawler';
UPDATE mob_templates SET dmg_min = 5, dmg_max = 8 WHERE id = 'pale-stalker';
UPDATE mob_templates SET dmg_min = 3, dmg_max = 7 WHERE id = 'twice-dead';
UPDATE mob_templates SET dmg_min = 2, dmg_max = 5 WHERE id = 'thrice-dead';
