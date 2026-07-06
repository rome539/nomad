-- The bloodlines. The variant creatures (dire hyena, fleet-rat, brood-mother)
-- stop being fixtures with their own permanent dens and become RARE BLOOD in
-- the ordinary stock: every spawn point belongs to the normal version, and
-- when the dungeon refills it, once in a while what walks in is the mean
-- cousin instead. A variant is an event now, not furniture.
--
-- The roll happens in zone.ts (applyArrivals / first-light seeding); this is
-- just the bloodline table and the eviction of the old fixed dens.

CREATE TABLE IF NOT EXISTS mob_variants (
  base_id    TEXT NOT NULL,  -- the ordinary version whose spawn points these ride
  variant_id TEXT NOT NULL,  -- what rarely arrives instead
  chance     REAL NOT NULL,
  PRIMARY KEY (base_id, variant_id)
);

INSERT OR REPLACE INTO mob_variants (base_id, variant_id, chance) VALUES
('grave-hyena', 'dire-hyena', 0.10),
('rat',         'fleet-rat',  0.10),
('rat',         'brood-rat',  0.05);

-- The variants lose their own dens. Any already alive stay until they die —
-- and then the ordinary bloodline refills the ground they held.
DELETE FROM mob_spawns WHERE id IN ('dire-1', 'dire-2', 'fleet-1', 'fleet-2', 'brood-1', 'brood-2');
