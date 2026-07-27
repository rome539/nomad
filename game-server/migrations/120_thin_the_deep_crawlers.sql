-- 120 thin the deep crawlers (rome, 2026-07-27): 13 pale-crawlers in the deep,
-- which is the FULL designed population -- and only visible now because 114
-- fixed their food deserts, so they stop starving to death and every den
-- actually stays occupied. The count was always 13; before, ~10 lived.
--
-- Cut the two most crowded dens rather than two arbitrary ones. Measured as
-- other dens inside a den's 3-room TERRITORY_RADIUS (they wander their bubble,
-- so overlapping bubbles are what stacks 5 of them into one room):
--   silted-stair       6 neighbours  <- cut
--   blackreach         5 neighbours  <- cut
--   bone-processional  5
--   worm-cloister      4 / carrion-gallery 4 / deep-ossuary 4
--   chapel 0, the-eel-run 0          <- the spread; deliberately kept
--
-- Both rooms stay on the map, so this costs nobody their route to the rat-runs
-- that 114 opened up -- it removes two DENS from the middle of the knot, not
-- two rooms. 11 crawlers left, still the deep's most common thing by far.

DELETE FROM mob_spawns WHERE id IN ('crawler-3', 'crawler-6');
