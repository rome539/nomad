-- THE REGIONS + THE SPAWN SPLIT (2026-08-01)
--
-- Two columns the surface expansion needs before a single new room can be
-- written.
--
-- 1. `region` — until now a room's band was DERIVED: a gate if is_entry, the
--    deep if its id was in DEEP_ROOMS (a hardcoded set in zone-data.ts), else
--    "upper". That worked for one dungeon. It cannot name a wood, a road, or a
--    mountain, and growing it by hardcoding another id-set per region would put
--    every new room's identity in TypeScript instead of in the room. So the
--    room now carries its own band, and the old derivation stays as the
--    fallback for every room that leaves this blank — which is all 110 of them.
--    Nothing about the existing world changes.
--
-- 2. `is_spawn` — "you wake here" split off from "this is a gate". They have
--    been the same flag since the start (four gates ring the Door, you wake at
--    a random one). With roads leading out to regions of their own, we want
--    gatehouses OUT THERE — a place to bank and vault a long walk from the
--    Door — WITHOUT every one of them becoming a place fresh wanderers pop
--    into. A gate is a service. A spawn is a doorway into the world. Backfilled
--    so that today's four gates are also today's four spawns: identical
--    behaviour until we deliberately place a gate that isn't one.

ALTER TABLE rooms ADD COLUMN region TEXT NOT NULL DEFAULT '';
ALTER TABLE rooms ADD COLUMN is_spawn INTEGER NOT NULL DEFAULT 0;

-- Every gate that exists today keeps waking players, exactly as before.
UPDATE rooms SET is_spawn = 1 WHERE is_entry = 1;
