-- 327 what else a den can have (rome, 2026-10-22).
--
-- Six more things built once inside a den (DEN_BUILDS in zone-data.ts), each a
-- flag like the five from mig 308: a smoke rack over the hearth, a water butt,
-- a whetstone, a stretching frame, stakes in the ground outside, and a slit in
-- the wall. The water butt also keeps how much it holds and when that was last
-- counted, because the rain fills it while nobody is home.
ALTER TABLE dens ADD COLUMN smoke INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN butt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN whet INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN frame INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN stakes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN slit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN butt_water INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN butt_at INTEGER NOT NULL DEFAULT 0;
