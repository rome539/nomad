-- THE HUSH AND THE CAPERCAILLIE (2026-11-19). The wood's food web next to the
-- mountain's: the wolves were taking the roe and little else, with no middle
-- hunter between the owl and the wolf and almost no small game on the floor.
-- The capercaillie is the wood's ground bird, food for the wolves, the coyotes
-- and the hush. The hush is the middle hunter: it takes roe as the wolves do, and
-- the wood's birds, and the wolves run it off their ground. Both roam the wood
-- as its other animals do (living-regions.md); the spawn rows set how many. The
-- hush lives in pairs (WOOD_GROUPS), so there are six of it: three pairs.
INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('the-hush', 'the hush',
  'The birds have stopped. They stopped one by one, in a line coming toward you, and the last one to stop was here. It is long and low and the colour of leaf-fall and old bark, a narrow head held level and still, and it does not move while you look at it. It is closer each time you look again.',
  3, 30, 3, 7, 720, 0, '', 0, 0, '', 0, 0, 2);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('capercaillie', 'a capercaillie',
  'A grouse the size of a goose, the cock all dark slate with a bottle-green breast, a hooked pale bill and a bar of red skin over the eye. It sits tight on the wood floor until you are nearly on it, then goes up through the branches with a crash like a door kicked in. The cock fans his tail and clicks, and goes for anything that comes near him, a man included.',
  1, 14, 1, 3, 300, 0, 'hill-fowl', 0.55, 0, '', 0, 0, 0);

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-the-hush@the-wych-elms', 'the-hush', 'the-wych-elms');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-the-hush@the-coppice-stools', 'the-hush', 'the-coppice-stools');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-the-hush@the-ferny-bank', 'the-hush', 'the-ferny-bank');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-the-hush@the-grey-scrub', 'the-hush', 'the-grey-scrub');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-the-hush@the-cut-osiers', 'the-hush', 'the-cut-osiers');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-the-hush@the-hollow-beeches', 'the-hush', 'the-hollow-beeches');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-deep-litter', 'capercaillie', 'the-deep-litter');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-basket-ground', 'capercaillie', 'the-basket-ground');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-boundary-cross', 'capercaillie', 'the-boundary-cross');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-ferny-bank', 'capercaillie', 'the-ferny-bank');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-coppice-stools', 'capercaillie', 'the-coppice-stools');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-lime-stand', 'capercaillie', 'the-lime-stand');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-mast-fall', 'capercaillie', 'the-mast-fall');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-grey-scrub', 'capercaillie', 'the-grey-scrub');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-wolf-run', 'capercaillie', 'the-wolf-run');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-hazel-ride', 'capercaillie', 'the-hazel-ride');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-ivy-wall', 'capercaillie', 'the-ivy-wall');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-capercaillie@the-birch-edge', 'capercaillie', 'the-birch-edge');
