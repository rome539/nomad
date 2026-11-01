-- PVP BY CHOICE (rome, 2026-11-01). Fighting other wanderers is something you
-- choose now, at a gate. Everyone starts out of it, the wanderers already in the
-- world included: 0 here is out of it, and anything else is when the choice was
-- made, because once made it holds for a day (zone-data PVP_LOCK_MS) before it
-- can be taken back.
ALTER TABLE players ADD COLUMN pvp_at INTEGER NOT NULL DEFAULT 0;
