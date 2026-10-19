-- 308 a den where you choose (rome, 2026-10-19).
--
-- Dens go up on open ground of the nomad's own choosing, at least 22 steps
-- from every gate (DEN_MIN_GATE_STEPS, checked in den.ts against the live exit
-- graph), instead of only on the ten holdings. The holdings keep the dens
-- already standing on them and take no new ones; nothing here touches them.
--
-- And a den can have more than the bar now. Each upgrade is a thing built
-- once (DEN_BUILDS in zone-data.ts); these are the flags that say it is there.
ALTER TABLE dens ADD COLUMN hearth INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN hides INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN rattle INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN rack INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN larder INTEGER NOT NULL DEFAULT 0;

-- THE OLD DENS COME DOWN (rome, 2026-10-19). Every den standing on a holding
-- is torn down: the holdings are all nearer the gates than the new rule allows,
-- and the stone houses stay in the world as the rooms they always were. Only
-- the den rows and their keys go. Every shelf stays exactly where it is
-- (player_items keyed to the owner and the room), and is fetched back from the
-- ground ('fetch'), which is how a fallen-in den has always given things back.
DELETE FROM den_keys WHERE room_id IN (SELECT id FROM rooms WHERE is_holding = 1);
DELETE FROM dens WHERE room_id IN (SELECT id FROM rooms WHERE is_holding = 1);
