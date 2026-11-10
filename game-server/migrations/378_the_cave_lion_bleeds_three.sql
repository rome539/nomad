-- THE CAVE LION BLEEDS THREE (2026-11-09).
--
-- rome raised the cave lion's wound from 2 to 3, the one non-boss on the
-- territory to bleed as hard as the drakes. Only the lion: the eyrie-holder
-- and the stone-adder keep the 2 that 272 gave them. Its odds of opening a
-- wound on a hit (BLEED_ODDS, 0.30) are unchanged.

UPDATE mob_templates SET bleed = 3 WHERE id = 'cave-lion';
