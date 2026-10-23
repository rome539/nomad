-- 329 the den's second level (rome, 2026-10-22).
--
-- Three upgrades that go up only on top of a first one, and only with the
-- right tool in hand or pack (DEN_BUILDS in zone-data.ts, `require`): a root
-- cellar dug under the larder with a pick, a bolt-hole dug out under a barred
-- door with a pick, and a snare line set past the stakes with a blade. The
-- bolt-hole keeps the room it comes up in; the snares keep when they were
-- last looked at, because they catch while nobody is home.
ALTER TABLE dens ADD COLUMN cellar INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN bolthole TEXT NOT NULL DEFAULT '';
ALTER TABLE dens ADD COLUMN snares INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dens ADD COLUMN snare_at INTEGER NOT NULL DEFAULT 0;
