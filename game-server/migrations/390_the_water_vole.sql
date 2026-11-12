-- THE WATER VOLE (rome, 2026-11-12). The crossing had almost no small prey on dry
-- land: the rats keep the Salt hamlet, so a fen viper anywhere else had nothing to eat,
-- and the hounds and the bitterns little more. The vole lives in the reed beds and the
-- marsh creeks, where the vipers, bitterns and hounds live, and breeds fast enough to
-- carry them. It roams as the crossing's other animals do (living-regions.md).
INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('water-vole', 'a water vole',
  'A round brown body the size of a fist, a blunt face with the ears lost in the fur, and a tail that is mostly an afterthought. It sits up on the creek bank with a reed stem in both hands, eating it from the bottom like somebody working through a stick of rock, and at the first wrong sound it is a plop in the water and a line of bubbles going away under the bank.',
  1, 8, 1, 2, 120, 0, '', 0, 0, '', 0, 0, 0);

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-cut-reed', 'water-vole', 'the-cut-reed');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-reed-fork', 'water-vole', 'the-reed-fork');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-stake-line', 'water-vole', 'the-stake-line');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-old-boat', 'water-vole', 'the-old-boat');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-otter-run', 'water-vole', 'the-otter-run');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-crooked-creek', 'water-vole', 'the-crooked-creek');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-cord-grass', 'water-vole', 'the-cord-grass');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-drained-creek', 'water-vole', 'the-drained-creek');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-sea-purslane', 'water-vole', 'the-sea-purslane');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-hurdle-eyot', 'water-vole', 'the-hurdle-eyot');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-wide-creek', 'water-vole', 'the-wide-creek');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-water-vole@the-gutway', 'water-vole', 'the-gutway');
