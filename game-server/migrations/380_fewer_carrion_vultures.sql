-- 380: FEWER CARRION VULTURES (rome, 2026-11-10). The mountain carried 29
-- carrion vultures, every one of them alive, against 15 bone-breakers and 19
-- scarp ravens: the most common bird on the mountain by far. They come down to
-- 15, level with the bone-breakers. As in 318, each cut takes the den standing
-- closest (by exits walked) to another vulture's, one at a time, so what is left
-- still covers the whole mountain: first the second bird in the four rooms that
-- held two, then the dens a step or two from another, mostly along the terraces.
-- The Bone Ground, the vulture's roost, stays. The live birds go with their rows
-- (ai.reconcilePopulation trims to the table).

DELETE FROM mob_spawns WHERE id IN (
  'spawn-carrion-vulture@the-second-terrace#49',
  'spawn-carrion-vulture@the-scatter#47',
  'spawn-carrion-vulture@the-gorge-ground#39',
  'spawn-carrion-vulture@the-first-terrace#37',
  'spawn-carrion-vulture@the-white-wall#56',
  'spawn-carrion-vulture@the-updraught#55',
  'spawn-carrion-vulture@the-under-shelf#54',
  'spawn-carrion-vulture@the-third-terrace#53',
  'spawn-carrion-vulture@the-splinter-field#51',
  'spawn-carrion-vulture@the-second-terrace#48',
  'spawn-carrion-vulture@the-scatter#46',
  'spawn-carrion-vulture@the-first-terrace#36',
  'spawn-carrion-vulture@the-catch-slope#33',
  'spawn-carrion-vulture@the-last-terrace#42');
