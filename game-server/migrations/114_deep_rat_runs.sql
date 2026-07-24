-- 114 deep rat runs (rome, 2026-07-24): census + a live room report showed a
-- room with 5 "gaunt and ravenous" pale-crawlers converging on a player at
-- once. Traced it with a BFS over the room graph: pale-crawler hunts rats
-- (PREYS_ON) within LURKER_HUNT_RADIUS (6 rooms) when hungry, but 3 of its
-- 13 dens sit outside or right at that reach -- the-cold-hearth is 7 rooms
-- from the nearest rat (genuinely unreachable), root-vault and
-- kings-oratory sit exactly at the 6-room edge. Not a population bug --
-- a food-desert bug. Two new rat spawns, placed to cover all three:
-- black-threshold (2 from cold-hearth, 1 from kings-oratory, 5 from
-- root-vault) and sunken-gallery (1 from root-vault, backs up the other two).

INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('rat-deep-3', 'rat', 'black-threshold'),
  ('rat-deep-4', 'rat', 'sunken-gallery');
