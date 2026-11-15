-- FEWER RATS IN THE DEEP (rome, 2026-11-15). Migration 398 gave the deep ten more rat rows,
-- sixteen in all, and that was too many: the deep keeps ten. The last six of 398's rows
-- go (rat-deep-11 to rat-deep-16); the first four (the bone sift, the silted stair, the
-- charnel chute, the cold hearth) stay with the deep's own six. The world trims any rats
-- over the new count on its next load (reconcilePopulation).
DELETE FROM mob_spawns WHERE id IN ('rat-deep-11', 'rat-deep-12', 'rat-deep-13', 'rat-deep-14', 'rat-deep-15', 'rat-deep-16');
