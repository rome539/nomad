-- 205 the new mobs join the ladder (rome, 2026-08-11: every mob added in migs
-- 187-194 is stronger than the roster that was already here).
--
-- HE IS RIGHT AT EVERY LEVEL. Non-boss templates, original roster vs the new:
--
--     lvl   old top dmg   new top dmg   old bleed   new bleed   old hp   new hp
--      1        2.3          4.4           0.25        0.80       14       15
--      2        3.8          6.0           0.20        2.00       20       20
--      3        6.1          7.8           1.00        1.78       34       32
--      4        7.8          9.7           1.50        1.10       50       46
--      5        6.7         11.4           1.00        0.40       74       56
--
-- Harder at every level, and at level 5 hitting 1.7x as hard on a quarter less
-- health. Against the ORIGINAL CEILINGS the individual breaks are worse than
-- the averages:
--
--   fen-viper       bleed 5 at LEVEL 3. The highest bleed anywhere in the
--                   original game is 3, on a level 4. This is an 18hp snake.
--   gill-adder      bleed 4 at LEVEL 2. Nothing original below level 4 has
--                   bleed above 1.
--   wrack-crab      armor 2 AND bleed 2 at LEVEL 1. No original level 1 has
--                   any armor at all.
--   every new L5    over the old level-5 damage ceiling of 9 -- the mason and
--                   the reed-walker at 12, three more at 11.
--   the-fowler      6-11 with bleed 3: second-hardest-hitting level 4 in the
--                   game, and the blow that started this (22 in one stroke:
--                   max roll 11, doubled by a 5% crit, through no armor).
--
-- THE CAUSE, stated plainly so it does not happen a third time. I tuned each
-- new region against ITSELF -- the pilot the hardest thing on the water, the
-- fowler nastier than the bittern -- and never once opened the original
-- templates to see what a level 3 was supposed to be. Every new roster came out
-- internally consistent and externally a tier high. It is the same error as the
-- trophies in mig 201, on the other axis: difficulty and reward did climb
-- together exactly as the ROADMAP demands. Both climbed a tier above the world.
--
-- THE LADDER EVERYTHING BELOW IS CUT TO (dmg_max / bleed / armor):
--
--      lvl 1     3 / 1 / 1
--      lvl 2     5 / 2 / 1
--      lvl 3     7 / 2 / 2
--      lvl 4    10 / 2 / 2
--      lvl 5    11 / 2 / 3
--
-- Read against the original roster's own maxima (3/1/0, 5/1/0, 9/2/2, 12/3/2,
-- 9/3/3) with two deliberate departures, both noted where they happen:
--
--   BLEED 3 IS THE PACK'S. The original game gives bleed 3 to the three-hound,
--   the dire-wolf, the old boar and the pale-stalker -- things with a mouth
--   full of teeth that hunt in company. Nothing new gets it. Every new mob
--   carrying 3 or more comes to 2, and that is the single biggest change in
--   this file, because an armor-ignoring 3 is what mig 202 already identified
--   as the number that tips a fight from "win, bloody" to "loses".
--
--   THE LEVEL-5 CEILING IS 11, NOT THE OLD 9. The original roster has exactly
--   THREE level 5s and all three are tanks (2-9 damage on 74-115hp). Capping
--   the new ones at 9 would make a level 5 weaker than a level 4, which is the
--   sample being thin, not a law. 11 keeps the ladder monotone. The new L5s
--   are glass by comparison -- 52-62hp -- and they keep that trade: they hit
--   harder than the old wardens and they die a great deal faster.

-- ---- LEVEL 1: the original ceiling is 1-3, and nothing here respected it ----
UPDATE mob_templates SET dmg_min = 1, dmg_max = 3, bleed = 1, armor = 0 WHERE id = 'gibbet-crow';   -- 2-5/b1
UPDATE mob_templates SET dmg_min = 1, dmg_max = 3, bleed = 1, armor = 1 WHERE id = 'wrack-crab';    -- 2-5/b2/a2 -- the shell keeps ONE armor (it is a crab; the old L1 ceiling of 0 is the one place the letter of the law reads wrong)
UPDATE mob_templates SET dmg_min = 1, dmg_max = 3, bleed = 0, armor = 0 WHERE id = 'grey-heron';    -- 2-4
UPDATE mob_templates SET dmg_min = 1, dmg_max = 3, bleed = 1, armor = 0 WHERE id = 'otter';         -- 2-4/b1
UPDATE mob_templates SET dmg_min = 1, dmg_max = 3, bleed = 0, armor = 0 WHERE id = 'oystercatcher'; -- 2-4 -- it is an alarm bird and should barely be a fight

-- ---- LEVEL 2 ----
UPDATE mob_templates SET dmg_min = 2, dmg_max = 5, bleed = 1, armor = 0 WHERE id = 'bittern';     -- 4-7/b2
UPDATE mob_templates SET dmg_min = 2, dmg_max = 5, bleed = 0, armor = 0 WHERE id = 'feral-goat';  -- 3-6/a1 -- a goat is not armored
UPDATE mob_templates SET dmg_min = 2, dmg_max = 5, bleed = 1, armor = 0 WHERE id = 'ford-eel';    -- 3-6/b3
UPDATE mob_templates SET dmg_min = 2, dmg_max = 5, bleed = 1, armor = 0 WHERE id = 'scarp-raven'; -- 3-5/b1
-- THE ADDER KEEPS ITS VENOM AND PAYS FOR IT IN BITE. Bleed 4 at level 2 was
-- indefensible, but a snake whose wound does not matter is not a snake -- so it
-- takes the WEAKEST bite of its level and keeps a real bleed. This shape (low
-- damage, the wound is the threat) is the one thing the new roster got right.
UPDATE mob_templates SET dmg_min = 1, dmg_max = 4, bleed = 2, armor = 0 WHERE id = 'gill-adder';  -- 3-6/b4

-- ---- LEVEL 3 ----
UPDATE mob_templates SET dmg_min = 2, dmg_max = 5, bleed = 2, armor = 0 WHERE id = 'fen-viper';       -- 4-8/b5 -- the same snake shape, one level up
UPDATE mob_templates SET dmg_min = 3, dmg_max = 7, bleed = 2, armor = 2 WHERE id = 'grey-seal';       -- 4-8/b3
UPDATE mob_templates SET dmg_min = 3, dmg_max = 6, bleed = 1, armor = 0 WHERE id = 'great-gull';      -- 4-8/b2
UPDATE mob_templates SET dmg_min = 4, dmg_max = 7, bleed = 2, armor = 1 WHERE id = 'marsh-hound';     -- 4-8
UPDATE mob_templates SET dmg_min = 3, dmg_max = 7, bleed = 2, armor = 1 WHERE id = 'strand-thief';    -- 4-8
UPDATE mob_templates SET dmg_min = 4, dmg_max = 7, bleed = 0, armor = 2 WHERE id = 'the-bellfounder'; -- 4-8
UPDATE mob_templates SET dmg_min = 4, dmg_max = 7, bleed = 0, armor = 1 WHERE id = 'the-sapper';      -- 4-8
UPDATE mob_templates SET dmg_min = 3, dmg_max = 7, bleed = 2, armor = 0 WHERE id = 'drove-dog';       -- 4-7
UPDATE mob_templates SET dmg_min = 3, dmg_max = 7, bleed = 0, armor = 1 WHERE id = 'the-toll-clerk';  -- 4-7

-- ---- LEVEL 4: the tier mig 202 half-audited. It fixed the conger and the
-- reed-walker and never looked at the fowler, which was worse than either.
UPDATE mob_templates SET dmg_min = 6, dmg_max = 10, bleed = 2, armor = 1 WHERE id = 'the-fowler';        -- 6-11/b3 -- the 22
UPDATE mob_templates SET dmg_min = 5, dmg_max = 10, bleed = 2, armor = 2 WHERE id = 'the-eel-cutter';    -- unchanged but stated, so the tier reads as one block
UPDATE mob_templates SET dmg_min = 5, dmg_max = 10, bleed = 0, armor = 2 WHERE id = 'the-miller';        -- 6-10
UPDATE mob_templates SET dmg_min = 5, dmg_max = 10, bleed = 0, armor = 2 WHERE id = 'the-quicksand';     -- a3 -> a2, the tier's real armor ceiling (mig 202 took it 6 -> 3; the original L4 ceiling is 2)
UPDATE mob_templates SET dmg_min = 5, dmg_max = 10, bleed = 2, armor = 1 WHERE id = 'the-scaffold-hand'; -- unchanged, stated
UPDATE mob_templates SET dmg_min = 5, dmg_max = 9,  bleed = 0, armor = 2 WHERE id = 'the-long-warden';   -- a3 -> a2
-- conger stays exactly as mig 202 set it (6-10 / b2 / a2): it is already the
-- tier's measured line and nothing here moves it.

-- ---- LEVEL 5 ----
UPDATE mob_templates SET dmg_min = 6, dmg_max = 11, bleed = 0, armor = 3 WHERE id = 'the-bridge-mason'; -- 7-12
UPDATE mob_templates SET dmg_min = 6, dmg_max = 11, bleed = 2, armor = 1 WHERE id = 'the-reed-walker';  -- 6-12
UPDATE mob_templates SET dmg_min = 6, dmg_max = 11, bleed = 0, armor = 2 WHERE id = 'the-pilot';        -- unchanged, stated
UPDATE mob_templates SET dmg_min = 6, dmg_max = 11, bleed = 0, armor = 3 WHERE id = 'the-refuge-man';   -- unchanged, stated
UPDATE mob_templates SET dmg_min = 6, dmg_max = 11, bleed = 0, armor = 2 WHERE id = 'the-salt-widow';   -- unchanged, stated

-- THE BOSS IS UNTOUCHED. The drowned ferryman (L6, 8-14, 84hp) is the region's
-- ceiling and must beat everything below it -- which, with the five above cut
-- to 11, it now does by a clear margin instead of by one point.
