-- THE TERRITORY BLEEDS TWO AS WELL (2026-08-23).
--
-- 271 dropped the cloud-line and high-ground bleed-3 predators to 2 and missed
-- three that stand on the territory itself — the cave lion, the eyrie-holder
-- and the stone-adder — because they were authored in the later territory
-- migrations (235/246), not in the cloud-line and high-ground files the first
-- pass read. Same ruling, same number: a non-boss wound is a tax, not a
-- sentence. The two drakes keep their 3.

UPDATE mob_templates SET bleed = 2 WHERE id IN ('cave-lion', 'eyrie-holder', 'stone-adder');
