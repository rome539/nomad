-- NOTHING OUTHITS THE DROWNED GOD (rome, 2026-08-02: "i was mainly talking
-- about the dmg", then "charcoal burner is fine at 4-8 but change the rest").
--
-- Six of the eleven hardest-hitting things in the game were written this
-- morning, and two of them hit harder than any boss the fortress has. The
-- fortress ladder is the reference and it was never consulted:
--
--   three-hound    lv4  7-12     the sentinel, ONE in the world
--   drowned-god    lv6  6-10     the hardest BOSS the fortress has
--   forgotten-king lv5   5-9
--   marrow-king    lv6   5-9
--   dire-hyena     lv4   5-8     the mean-cousin tier
--   drowned-hulk   lv4   4-7
--
-- THE WOODWARD AND THE KEEPER STAY THE HARDEST THINGS ON THE SURFACE. They do
-- it the way a boss is supposed to — the woodward has 145 HP and armour 3, more
-- of both than anything else alive. What they stop doing is out-punching the
-- drowned god on top of it.
--
-- THE TWO VARIANTS COME OFF BOSS DAMAGE ENTIRELY. The old boar is a 1-in-10 roll
-- on a common wood mob and "something ahead" is 1-in-20 on the follower; both
-- were hitting for drowned-god numbers. A variant is the mean cousin of an
-- ordinary thing, not a boss wearing its skin — the old boar lands on the dire
-- hyena's line, which is the tier the whole variant system already uses, and
-- something ahead keeps a step above it for being rarer and later.
--
-- THE CHARCOAL BURNER KEEPS 4-8 (rome's call). It is a lv4 that hits like the
-- pale-crawler and has no armour worth the name; it was never the problem.
-- THE WOLVES ARE NOT IN THIS FILE, same as mig 146.

UPDATE mob_templates SET dmg_min = 6, dmg_max = 10 WHERE id = 'the-woodward';               -- was 7-11
UPDATE mob_templates SET dmg_min = 5, dmg_max = 9  WHERE id = 'the-keeper-of-the-holding';  -- was 6-11
UPDATE mob_templates SET dmg_min = 5, dmg_max = 8  WHERE id = 'old-boar';                   -- was 6-10
UPDATE mob_templates SET dmg_min = 5, dmg_max = 9  WHERE id = 'something-ahead';            -- was 6-10
