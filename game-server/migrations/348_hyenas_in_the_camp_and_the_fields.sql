-- HYENAS IN THE NEW GROUND (rome, 2026-10-29): the open ground spread out in
-- three places (mig 347), and two of them have what a grave-hyena lives on - the
-- camp's graves and horse pits, and the holding's waste fields. One each, with
-- an id (mig 309), seeded on the next load.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('grave-hyena-camp', 'grave-hyena', 'the-camp-graves');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('grave-hyena-fields', 'grave-hyena', 'the-old-plough');
