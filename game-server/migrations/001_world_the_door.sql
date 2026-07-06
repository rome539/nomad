-- Zone 1: the Door. Eight rooms, three mob types, one boss, one legendary.
-- "Five rooms and a rat," give or take.

-- Rooms -----------------------------------------------------------------
INSERT OR REPLACE INTO rooms (id, zone, name, description, is_entry) VALUES
('gate', 'door', 'The Broken Gate',
 'Iron gates hang off their hinges, rusted open a hundred years ago. Cold air drifts up from below, carrying the smell of wet stone. Everyone comes back here, eventually.', 1),
('stair', 'door', 'The Sunken Stair',
 'Steps worn to shallow bowls descend into the earth. Someone chalked tallies on the wall — hundreds of marks, then nothing.', 0),
('hall', 'door', 'The Long Hall',
 'A vaulted hall running out of sight in the gloom. Doorways gape west and east. To the north stands a door of black iron, older than the rest of this place, and shut.', 0),
('armory', 'door', 'The Stripped Armory',
 'Racks that once held spears hold dust. Whatever armed itself here left in a hurry, and left the bones.', 0),
('barracks', 'door', 'The Cold Barracks',
 'Rows of stone bunks, each one a grave-shelf. Some of the sleepers still keep their posts.', 0),
('cistern', 'door', 'The Dry Cistern',
 'A round chamber ringed by a channel that carried water when this place breathed. Now it carries echoes.', 0),
('shrine', 'door', 'The Nameless Shrine',
 'A small altar to nobody in particular, swept clean by no hand you can see. Things left here tend to still be here — the shrine keeps them.', 0),
('undercroft', 'door', 'The Undercroft',
 'Beneath everything, a chamber of black pillars. A throne of piled stone faces the door, and the dark on it is thicker than dark should be.', 0);

-- Exits -----------------------------------------------------------------
INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
('gate',       'north', 'stair',      NULL),
('stair',      'south', 'gate',       NULL),
('stair',      'down',  'hall',       NULL),
('hall',       'up',    'stair',      NULL),
('hall',       'west',  'armory',     NULL),
('hall',       'east',  'cistern',    NULL),
('hall',       'north', 'undercroft', 'tarnished-key'),
('armory',     'east',  'hall',       NULL),
('armory',     'north', 'barracks',   NULL),
('barracks',   'south', 'armory',     NULL),
('cistern',    'west',  'hall',       NULL),
('cistern',    'north', 'shrine',     NULL),
('shrine',     'south', 'cistern',    NULL),
('undercroft', 'south', 'hall',       NULL);

-- Items -----------------------------------------------------------------
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('tarnished-key',  'a tarnished key',
 'Black silver, warm to the touch. The teeth are worn as if it has opened one door ten thousand times.', 'uncommon'),
('rat-tail',       'a rat tail',
 'Proof of one small victory. The dungeon does not judge.', 'common'),
('bone-charm',     'a bone charm',
 'A knuckle on a leather cord, carved with a spiral. Whoever wore it kept their post a long time.', 'common'),
('warden-lantern', 'a hollow lantern',
 'It gives no light, but the shadows near it stand a little further back.', 'rare'),
('door-signet',    'the Signet of the Door',
 'The Door''s own seal, struck in black iron. The dungeon remembers every hand that has carried it.', 'legendary');

INSERT OR REPLACE INTO ground_spawns (item_id, room_id) VALUES
('tarnished-key', 'shrine');

-- Mobs ------------------------------------------------------------------
INSERT OR REPLACE INTO mob_templates
(id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance) VALUES
('rat', 'a scabby rat',
 'Big as a boot and mean as two. Its eyes catch light that isn''t there.',
 1, 8, 1, 2, 30, 0, 'rat-tail', 0.3),
('skeleton', 'a rattling skeleton',
 'It stands guard the way a habit stands: nothing behind it but repetition. The sword is still sharp.',
 2, 20, 2, 4, 60, 0, 'bone-charm', 0.25),
('warden', 'a hollow warden',
 'Armor with an absence inside, still walking its rounds. Where a face should be, the visor shows only the room behind it.',
 3, 35, 3, 6, 120, 0, 'warden-lantern', 1.0),
('forgotten-king', 'the Forgotten King',
 'What is left when a name wears out: a crown, a posture, a patience. It has been waiting longer than the stones. It does not mind that you came.',
 5, 120, 5, 9, 600, 1, 'door-signet', 1.0);

INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
('rat-1',  'rat',            'gate'),
('rat-2',  'rat',            'stair'),
('rat-3',  'rat',            'cistern'),
('skel-1', 'skeleton',       'armory'),
('skel-2', 'skeleton',       'barracks'),
('ward-1', 'warden',         'barracks'),
('king',   'forgotten-king', 'undercroft');
