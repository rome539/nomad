-- 207 stun is a chance, not a weight (rome, 2026-08-11: the long warden might
-- be stunning too much). It is stunning EVERY SINGLE TIME, and so are thirteen
-- others.
--
-- THE BUG. A creature's stun is rolled straight as a probability:
--
--     const stunOdds = tmpl.stun * stunMult;
--     if (tmpl.stun > 0 && !victim.stunned && chance(stunOdds)) { ... }
--
-- and chance(p) is `rand() < p`, with rand() in [0,1). Every mob in the
-- ORIGINAL roster carries a probability and reads correctly:
--
--     three-hound 0.15   old-boar 0.15   the-woodward 0.15
--     twice-dead 0.12    root-thing 0.12  two-hound 0.10
--
-- Every mob added in migs 188-194 carries a WEIGHT — 1, 2, 3, 4 — because that
-- is what I thought the column was: how heavy the blow lands. So chance(2.0) is
-- rand() < 2.0, which is true every time, on every landed blow, for fourteen
-- creatures across the east road, the Crossing and the open ground:
--
--     the-quicksand 4      the-miller 3        the-refuge-man 3
--     the-bridge-mason 3   the-salt-widow 3    the-drowned-ferryman 3
--     the-toll-clerk 2     the-long-warden 2   the-tide-warden 2
--     the-drover 2         the-pilot 2         the-bellfounder 2
--     feral-goat 1         the-sapper 1
--
-- WHAT THAT MEANT IN A FIGHT. A stun costs you your next swing, and the
-- `!victim.stunned` guard stops it chaining — so against any of these you lose
-- EVERY OTHER BEAT, permanently, from the first blow that lands. Your damage is
-- halved and there is nothing you can do about it. Worse: the mitigation is
--
--     stunMult = min(padded ? PADDED_STUN_MULT : 1, 1 - poise)
--
-- a multiplier on the odds — so a padded cap or a heavy build that should cut
-- the stun in half took 2.0 down to 1.0, which is still certainty. Armour and
-- poise were mathematically incapable of helping. The one counter the system
-- has, switched off by an out-of-range number.
--
-- It is also the answer to a fight rome posted earlier today: the refuge man,
-- four separate "lands like a falling stone / the moment to swing slips past
-- you" cycles in one fight. That was not bad luck. That was 100%.
--
-- THE LADDER. The weights were at least ORDERED, so the order survives and only
-- the scale changes — mapped onto the original roster's own range, which tops
-- out at 0.15 and has never gone higher:
--
--     weight 1  ->  0.08   a knock
--     weight 2  ->  0.10   two-hound's line
--     weight 3  ->  0.12   twice-dead's line
--     weight 4  ->  0.15   the game's ceiling, and the quicksand alone holds it
--
-- Nothing new exceeds the original maximum, and the quicksand keeps being the
-- heaviest thing to be hit by in the world — which is what mig 202 kept its
-- stun for ("dragging you down is what a quicksand is"), except that now the
-- number means what that sentence claims instead of meaning "always".

-- ---- weight 4: the ceiling, tied with the three-hound and the old boar ----
UPDATE mob_templates SET stun = 0.15 WHERE id = 'the-quicksand';        -- 4.0 -> always

-- ---- weight 3: the heavy dead ----
UPDATE mob_templates SET stun = 0.12 WHERE id = 'the-miller';           -- 3.0 -> always
UPDATE mob_templates SET stun = 0.12 WHERE id = 'the-refuge-man';       -- 3.0 -> always
UPDATE mob_templates SET stun = 0.12 WHERE id = 'the-bridge-mason';     -- 3.0 -> always
UPDATE mob_templates SET stun = 0.12 WHERE id = 'the-salt-widow';       -- 3.0 -> always
UPDATE mob_templates SET stun = 0.12 WHERE id = 'the-drowned-ferryman'; -- 3.0 -> always (the boss keeps the heavy tier, not certainty)

-- ---- weight 2: the institution and the wardens ----
UPDATE mob_templates SET stun = 0.10 WHERE id = 'the-toll-clerk';       -- 2.0 -> always
UPDATE mob_templates SET stun = 0.10 WHERE id = 'the-long-warden';      -- 2.0 -> always  (the one rome felt)
UPDATE mob_templates SET stun = 0.10 WHERE id = 'the-tide-warden';      -- 2.0 -> always
UPDATE mob_templates SET stun = 0.10 WHERE id = 'the-drover';           -- 2.0 -> always
UPDATE mob_templates SET stun = 0.10 WHERE id = 'the-pilot';            -- 2.0 -> always
UPDATE mob_templates SET stun = 0.10 WHERE id = 'the-bellfounder';      -- 2.0 -> always

-- ---- weight 1: a knock, not a ringing ----
UPDATE mob_templates SET stun = 0.08 WHERE id = 'feral-goat';           -- 1.0 -> always
UPDATE mob_templates SET stun = 0.08 WHERE id = 'the-sapper';           -- 1.0 -> always
