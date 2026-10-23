-- THE OLD GREY BLEEDS IN WHOLE NUMBERS (rome, 2026-10-23: "Your wound bleeds
-- — 0.3"). Mig 323 wrote its bleed as 0.3, as if it were the odds of a bleed;
-- the column is the damage a wound does each tick, and every bleed in the game
-- is an integer. 3, the dire wolf's: it is the biggest wolf in the world.
UPDATE mob_templates SET bleed = 3 WHERE id = 'the-old-grey';
