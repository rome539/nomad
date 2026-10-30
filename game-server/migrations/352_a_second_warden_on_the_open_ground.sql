-- A SECOND WARDEN ON THE OPEN GROUND (rome, 2026-10-30). The surface warden
-- (mig 117) walks the east grounds; the west side, the village, the churchyard,
-- the pits' edge and the holding, had nobody on it. One more, set in the
-- churchyard, whose round is its own (PATROLS_BY_HOME, zone-data.ts). With an id
-- (mig 309), seeded on the next load.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('ward-6', 'warden-surface', 'the-churchyard');
