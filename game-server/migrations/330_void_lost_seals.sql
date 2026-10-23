-- SEALS ON THINGS THAT ARE GONE (2026-10-23). A sealed map or journal carried
-- into death, a sealed stone thrown, and sealed gear worn through all deleted
-- the item's row without voiding its mint, so the public ledger (/mints) kept
-- counting 49 sealed things that no longer exist. The code now voids on all
-- three paths; this crosses off the ones already lost. A seal is only ever on
-- a player_items row (the ground keeps no seals), so a live mint with no row
-- carrying its serial is gone for good.
UPDATE mints
   SET voided_at = CAST(strftime('%s', 'now') AS INTEGER)
 WHERE voided_at IS NULL
   AND superseded_by IS NULL
   AND serial NOT IN (SELECT signed_serial FROM player_items WHERE signed_serial IS NOT NULL);
