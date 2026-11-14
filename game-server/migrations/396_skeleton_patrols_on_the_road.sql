-- THE ROAD'S PATROLS (2026-11-13). Two patrols of the dead march the roads out of
-- the open ground: a bone-knight captain and two rattling skeletons each, one
-- mustering in the Drowned Orchard for the west road and one at the Waystation for
-- the east. The round and the keeping-together live in zone-data SQUADS and
-- squads.ts; these rows only put them there. Every row carries its id.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-bone-knight@the-drowned-orchard', 'bone-knight', 'the-drowned-orchard');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-skeleton@the-drowned-orchard#1', 'skeleton', 'the-drowned-orchard');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-skeleton@the-drowned-orchard#2', 'skeleton', 'the-drowned-orchard');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-bone-knight@the-old-road', 'bone-knight', 'the-old-road');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-skeleton@the-old-road#1', 'skeleton', 'the-old-road');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-skeleton@the-old-road#2', 'skeleton', 'the-old-road');
