-- THE BOAR HIT SOFTER (rome, 2026-11-17). A boar goes for you on sight and is a hard
-- fight, and with the wood living its sounders keep close together, so its damage comes
-- down about a quarter: the wild boar from 4-8 to 3-6, the old boar from 7-11 to 5-9.
-- Hit points, armour, stun and bleed stay as they were: still hard to kill, less hurt taken.
UPDATE mob_templates SET dmg_min = 3, dmg_max = 6 WHERE id = 'wild-boar';
UPDATE mob_templates SET dmg_min = 5, dmg_max = 9 WHERE id = 'old-boar';
