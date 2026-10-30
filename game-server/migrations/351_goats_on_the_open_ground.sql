-- GOATS ON THE OPEN GROUND (rome, 2026-10-30). The hyenas no longer eat the
-- pits' floor, and round the fortress there was nothing to hunt but rats. Feral
-- goats, gone wild off the camp and the holding, on seven of the open ground's
-- eighteen grazing rooms, one to a room, so they eat where they stand. Seven is
-- the mountain's density of goat-sized grazers (0.09 a room) over the open
-- ground's 82 rooms. The hyenas hunt them (PREYS_ON / PACK_PREY, zone-data.ts).
-- Each row has its own id (mig 309), seeded on the next load.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('open-goat-1', 'feral-goat', 'the-briar-field');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('open-goat-2', 'feral-goat', 'the-hanging-hill');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('open-goat-3', 'feral-goat', 'the-drowned-orchard');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('open-goat-4', 'feral-goat', 'the-green');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('open-goat-5', 'feral-goat', 'the-horse-lines');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('open-goat-6', 'feral-goat', 'the-tithe-barn');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('open-goat-7', 'feral-goat', 'the-gibbet-field');
