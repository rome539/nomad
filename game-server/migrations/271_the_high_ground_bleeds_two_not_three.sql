-- THE HIGH GROUND BLEEDS TWO, NOT THREE (2026-08-23).
--
-- Four non-boss mountain predators opened a wound that bled for 3 a tick —
-- lead-wolf, glutton, great-vulture, the-gravid-adder — and at the top of the
-- hill that is not a wound, it is a sentence. The apex of the mountain hurt
-- more through the wound it left than through the blow that left it, and the
-- wound ticks every beat, so one caught exchange became a slow, certain death
-- by a thousand cuts the moment the fight turned away from you.
--
-- The mountain's teeth are the tier's difficulty curve. A bleed should read as
-- a tax on sloppy footwork, not as a second creature standing behind the first.
-- 2 a tick still kills the careless, and it still makes a dressing a decision;
-- it just stops the high ground from feeling like the one place in the world
-- where the losing trade is the only trade.
--
-- The pale drake keeps its 3. A boss is meant to be a sentence.

UPDATE mob_templates SET bleed = 2 WHERE id IN ('lead-wolf', 'glutton', 'great-vulture', 'the-gravid-adder');
