-- 394 dressings and torches where there were none (rome, 2026-11-13).
--
-- An audit of what the ground gives up found the wood, the crossing and the
-- road with nothing on the floor to pack a wound with, across 849 rooms: the
-- hatch was the only place to get a dressing there. And the wood had three
-- torches for 332 rooms, where the road has eight for 249.
--
-- Each one lies where the room's own words put it. Bog-moss goes where the
-- text has standing water, mire or sedge; it is rooted and comes back where it
-- grew. Linen goes into the huts and shelters; it and the torches turn up
-- somewhere else in the same country each time, like every left thing.

INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES
-- the wood: the mires and the carr
('bog-moss', 'the-spring-mire', 1),
('bog-moss', 'the-mire-edge', 1),
('bog-moss', 'the-far-mire', 1),
('bog-moss', 'the-alder-carr', 1),
('bog-moss', 'the-osier-carr', 1),
-- the wood: light, in the places somebody once kept a fire or a roof
('torch', 'the-poachers-camp', 1),
('torch', 'the-bounds-house', 1),
('torch', 'the-lime-kiln', 1),
('torch', 'the-fish-house', 1),
('torch', 'the-icehouse', 1),
-- the crossing: the peat island, the sedge, the old willow beds, and a hut
('bog-moss', 'the-black-eyot', 1),
('bog-moss', 'the-marsh-end', 1),
('bog-moss', 'the-sallow-rows', 1),
('linen-strips', 'the-hook-hut', 1),
-- the road: its shelters and its one old camp
('linen-strips', 'the-carters-rest', 1),
('linen-strips', 'the-herds-hut', 1),
('linen-strips', 'the-tinkers-camp', 1),
('linen-strips', 'the-winding-house', 1);
