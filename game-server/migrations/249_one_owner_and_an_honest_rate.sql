-- 249 one owner, and an honest rate (rome, 2026-08-19/20).
--
-- He read the legendary table, said the fortress having more than the wood was
-- off when the wood is bigger, and then asked the right question about the
-- two-minute respawns. Measuring SUPPLY rather than counting items:
--
--     region          rooms  items   legendaries/hr   one every
--     fortress/deep      97      5          ~9.0        7 minutes
--     crossing          203      1           0.29       3.4 hours
--     road              197      1           0.24       4.2 hours
--     out                42      1           0.14       6.9 hours
--     wood              172      3           0.00       NEVER (all three
--     mountain          398      0           0.00        are chest-only)
--     den                60      0           0.00       NEVER
--
-- PART ONE IS NOT BALANCE, IT IS A BUG, AND IT IS THE SAME BUG AS MIG 243.
-- Four legendaries are carried by the same creature TWICE — once as its
-- gear_item and once as a mob_keys roll — so every kill rolls for them twice:
--
--     last-watch          last-watchman    gear 0.06 + key 0.06  ->  0.116
--     captains-wall       warden-captain   gear 0.06 + key 0.06  ->  0.116
--     hulks-iron          drowned-hulk     gear 0.05 + key 0.06  ->  0.107
--     long-hunger-shroud  the-gaunt        gear 0.15 + key 0.06  ->  0.201
--
-- Mig 100 put all nine legendaries into mob_keys. Mig 218 then went looking for
-- homes for the unobtainable ones and set four of them as gear_item without
-- clearing the older row. This morning mig 243 deleted exactly this kind of
-- stray for the Marrow-Crown, on a report from a player who noticed the King
-- dropping a fragment of his own crown while a cantor dropped the whole thing.
-- I fixed the one instance that was reported and did not sweep for the rest.
-- There were four more. They are swept now.
--
-- ONE OWNER EACH, and the owner is the gear_item, because that is where mig 218
-- deliberately put them and it is the slot that reads in the fiction: the
-- watchman's harness is ON the watchman.

DELETE FROM mob_keys WHERE key_item = 'last-watch'         AND template_id = 'last-watchman';
DELETE FROM mob_keys WHERE key_item = 'captains-wall'      AND template_id = 'warden-captain';
DELETE FROM mob_keys WHERE key_item = 'hulks-iron'         AND template_id = 'drowned-hulk';
DELETE FROM mob_keys WHERE key_item = 'long-hunger-shroud' AND template_id = 'the-gaunt';

-- ---- PART TWO: the rate should know what the respawn is ---------------------
--
-- With the double rolls gone the deep is still four fifths of the world's
-- legendary supply, and it comes off two creatures. Measured APPEARANCES per
-- hour, which is the number that actually matters and is not visible anywhere
-- in the tables:
--
--     mob              respawn  bodies  variant  appearances/hr  rate  leg/hr
--     the-drowned           90       9    base           360.00
--     drowned-hulk          90       1    x0.08           28.80  0.05   1.44
--     last-watchman        120       1    base            30.00  0.06   1.80
--     warden-captain       120       0    x0.07            8.40  0.06   0.50
--     marrow-cantor       1200       4    base            12.00  0.06   0.72
--     three-hound          360       1    base            10.00  0.11   1.13
--
-- THE LAST WATCHMAN AND THE DROWNED HULK ARE THE FAUCET. Not because their
-- rates are high — 0.05 and 0.06 are the ordinary elite band, the same numbers
-- the cantor and the captain carry — but because one comes back every two
-- minutes and the other rolls off nine bodies on a NINETY SECOND respawn. The
-- rate was set by looking at the other rates. Nobody looked at the clock.
--
-- SO THE CLOCK IS WHAT MOVES THE NUMBER, and the respawn does NOT move, which
-- was rome's instinct and is right: respawn is PRESENCE, not economy. The
-- watchman is the fortress's watchman, one body on the wall-walk; putting him
-- on a thirty-minute timer would fix the loot by deleting the character, and
-- the drowned are the deep's chum and are supposed to be everywhere.
--
-- Both are brought to the band their neighbours actually occupy, ~0.4-0.5 an
-- hour, which is where the captain and the cantor already sit honestly:
--
--     last-watchman  0.06  -> 0.015    30.00/hr x 0.015 = 0.45
--     drowned-hulk   0.05  -> 0.015    28.80/hr x 0.015 = 0.43
--
-- The captain (0.50), the cantor (0.72), the king (0.30) and the hound (0.40)
-- are already in that band and are NOT touched. Nothing is removed from the
-- fortress and no legendary changes hands — every one of them still drops off
-- exactly the body it is named for.
--
--     fortress/deep   ~9.0/hr  ->  ~2.8/hr
--
-- It stays the densest band in the world by a wide margin, which is what he
-- asked for. The remaining gap closes from the other end, by giving the wood,
-- the crossing and the mountain something to drop.

UPDATE mob_templates SET gear_drop = 0.015 WHERE id = 'last-watchman';
UPDATE mob_templates SET gear_drop = 0.015 WHERE id = 'drowned-hulk';
