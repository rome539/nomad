-- CROWBERRIES ON THE HILL (2026-11-08). The mountain's berry lay in three rooms
-- whose words never mentioned it (268: the bracken slope, the last pasture, the
-- goat track), and the one room whose words named a berry, the Shiel Backs, named
-- bilberry, which the hill does not have, and had nothing to pick. The keeper
-- ruled: the berry stays where it was, those rooms' words now say it grows there,
-- the Shiel Backs grow crowberry, and the heather carries it too. The room source
-- (regions/*.rooms) says the same, so a rebuild of the rooms keeps it.
UPDATE rooms SET description = REPLACE(description, 'gone to nettle and bilberry', 'gone to nettle and crowberry') WHERE id = 'the-shiel-backs';
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES ('crowberries', 'the-shiel-backs', 1); -- gone to nettle and crowberry
UPDATE rooms SET description = REPLACE(description, 'you can hear things moving that you will not see at all.', 'you can hear things moving that you will not see at all. At its edges, where light gets in under the fronds, crowberry creeps over the ground, black with fruit.') WHERE id = 'the-bracken-slope';
UPDATE rooms SET description = REPLACE(description, 'starts being whatever will hold on.', 'starts being whatever will hold on. Along the foot of the wall, where the grazing never reached, crowberry has come in low and black with fruit.') WHERE id = 'the-last-pasture';
UPDATE rooms SET description = REPLACE(description, 'by their reckoning.', 'by their reckoning. Crowberry grows thick along both its edges, low and creeping, the black berries mostly left alone.') WHERE id = 'the-goat-track';
UPDATE rooms SET description = REPLACE(description, 'there is no way to make it not.', 'there is no way to make it not. Crowberry runs through the heather underneath, low and creeping, black with fruit.') WHERE id = 'the-heather-shelf';
UPDATE rooms SET description = REPLACE(description, 'the heather is beaten into paths going three ways.', 'the heather is beaten into paths going three ways. Crowberry creeps among it, and its black berries are trodden into the paths.') WHERE id = 'the-heather-step';
UPDATE rooms SET description = REPLACE(description, 'when it is fifteen hundred feet higher up.', 'when it is fifteen hundred feet higher up. Crowberry grows in the same mat, its small black berries pressed flat against the rock.') WHERE id = 'the-upper-heather';
UPDATE rooms SET description = REPLACE(description, 'flat-topped islands of heather standing between them.', 'flat-topped islands of heather and black-fruited crowberry standing between them.') WHERE id = 'the-peat-hags';
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES ('crowberries', 'the-heather-shelf', 1); -- crowberry in the heather
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES ('crowberries', 'the-heather-step', 1); -- crowberry in the heather
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES ('crowberries', 'the-upper-heather', 1); -- crowberry in the heather
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES ('crowberries', 'the-peat-hags', 1); -- crowberry in the heather
