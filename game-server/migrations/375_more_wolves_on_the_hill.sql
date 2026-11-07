-- 375: MORE WOLVES ON THE HILL (rome, 2026-11-06). The mountain's limit goes from
-- 8 hill wolves to 12, which leaves room for two full packs and sometimes three.
-- A row only sets the count: each wolf draws its home from the plan (groups.ts),
-- never nearer a gate than ten steps. These rooms are all that far out, on the
-- ground a wolf settles on.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-hill-wolf@the-water-lip', 'hill-wolf', 'the-water-lip');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-hill-wolf@the-north-bank', 'hill-wolf', 'the-north-bank');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-hill-wolf@the-fan-head', 'hill-wolf', 'the-fan-head');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-hill-wolf@the-scoured-flat', 'hill-wolf', 'the-scoured-flat');
