-- Zone 1 grows from eight rooms into a ring: FOUR gates on the edges of the
-- surface — one of them a sewer you climb UP out of — draining inward through
-- an outer ring of chambers to the Long Hall, and below it the King. You drop
-- in at any gate and extract at any gate; death spits you out a random one.
--
-- 25 rooms: 4 gates (is_entry) + 21 within. The old eight keep their ids so no
-- living wanderer wakes in a room that no longer exists. Exits and mob spawns
-- are rebuilt whole (the graph changed shape), so this migration is the truth
-- of the map from here on.

-- Rooms -----------------------------------------------------------------
-- Gates (is_entry = 1): the four ways the surface breaks into the Door.
INSERT OR REPLACE INTO rooms (id, zone, name, description, is_entry) VALUES
('gate', 'door', 'The Broken Gate',
 'Iron gates hang off their hinges, rusted open a hundred years ago. Cold air drifts up from below, carrying the smell of wet stone. One of four ways the surface still breaks into the Door.', 1),
('weeper-arch', 'door', 'The Weeper''s Arch',
 'A low arch on the dungeon''s eastern face, its keystone carved with a face worn smooth by rain into something that seems to grieve. Water beads and runs from it even in the dry. The dark descends beyond.', 1),
('sally-port', 'door', 'The Collapsed Sally Port',
 'A soldiers'' door on the south wall, half-choked with the rubble of the tower that once covered it. You pick your way in over fallen ashlar. Beyond, steps drop into the crypt-dark.', 1),
('sewer', 'door', 'The Sewer Mouth',
 'Not a gate at all — a broken drain in the marsh where the dungeon voids its old water. You wade in stinking dark and find the grate torn open above you: the only way IN from here is UP, out of the sewer and into the works.', 1),

-- The approaches — one just inside each gate.
('stair', 'door', 'The Sunken Stair',
 'Steps worn to shallow bowls descend into the earth. Someone chalked tallies on the wall — hundreds of marks, then nothing.', 0),
('weeper-hall', 'door', 'The Weeping Passage',
 'A slick corridor where the arch''s water follows you in, tracing the walls in slow silver threads. Every sound comes back doubled and wet.', 0),
('crypt-steps', 'door', 'The Crypt Steps',
 'Narrow stairs cut for a funeral, not a fight. The treads are worn in the center where the dead were carried down and the living walked back up alone.', 0),
('scullery', 'door', 'The Drowned Scullery',
 'A kitchen sunk to the shins in old water, where the sewer surfaces into the works. Copper pots float, green and holed. A doorway east climbs toward drier stone.', 0),

-- The inner ring, circling the hall.
('barracks', 'door', 'The Cold Barracks',
 'Rows of stone bunks, each one a grave-shelf. Some of the sleepers still keep their posts.', 0),
('cells', 'door', 'The Debtors'' Cells',
 'A row of iron cages let into the wall, doors long sprung. What was owed here was paid in years, then in bones, and the bones are still in the straw.', 0),
('cistern', 'door', 'The Dry Cistern',
 'A round chamber ringed by a channel that carried water when this place breathed. Now it carries echoes.', 0),
('ossuary', 'door', 'The Ossuary',
 'The walls are made of the dead, tibia and skull stacked in careful courses to the vaulted ceiling. It is the neatest room in the Door, and the most crowded.', 0),
('catacomb', 'door', 'The Threadbare Catacomb',
 'Burial niches run three deep into the dark on either hand, their shrouds gone to lace and dust. A cold draft threads down from the south, from the crypt steps.', 0),
('kennels', 'door', 'The Hound Kennels',
 'Chains bolted to the wall at a dog''s height, and gnawed bone heaped where the bowls were. Whatever the wardens kept down here, it was hungry and it was loyal.', 0),
('armory', 'door', 'The Stripped Armory',
 'Racks that once held spears hold dust. Whatever armed itself here left in a hurry, and left the bones.', 0),
('gallery', 'door', 'The Portrait Gallery',
 'A long room hung with the flaked ruins of paintings — faces of wardens and kings scoured to pale smears, still watching from their frames the way habit watches.', 0),

-- The pockets hanging off the ring.
('shrine', 'door', 'The Nameless Shrine',
 'A small altar to nobody in particular, swept clean by no hand you can see. Things left here tend to still be here — the shrine keeps them.', 0),
('library', 'door', 'The Sodden Library',
 'Shelves warped into waves, books fused to grey brick by a century of damp. One page somewhere still turns when the air moves, as if read.', 0),
('warden-post', 'door', 'The Warden''s Post',
 'A guardroom over the ring, a slot window facing the round. A stool, a peg, a helmet gone to rust on the peg — the post a warden kept until keeping it was all that was left of him.', 0),
('chapel', 'door', 'The Broken Chapel',
 'Pews smashed to kindling face an altar someone took an axe to. Whatever was worshipped here, its own faithful unmade it, and did not stay to explain.', 0),
('well', 'door', 'The Whispering Well',
 'A black shaft in the floor of a small round room, ringed by a lip of worn stone. Drop a word in and it answers, later, in a voice you almost know.', 0),
('forge', 'door', 'The Cold Forge',
 'A low vault of dead furnaces and a great anvil split clean down the middle. The last thing hammered here cooled a hundred years ago and no one drew it from the fire.', 0),
('refectory', 'door', 'The Silent Refectory',
 'Long tables set for a meal that was never eaten — trenchers still laid, benches still drawn out, everything under a soft grey pelt of dust. Something was served here. Nothing sat down.', 0),

-- The core.
('hall', 'door', 'The Long Hall',
 'A vaulted hall at the heart of the Door, ways out on every side into the ring of chambers. Set into the floor is a hatch of black iron, older than the rest of this place, and shut — the way down.', 0),
('undercroft', 'door', 'The Undercroft',
 'Beneath everything, a chamber of black pillars. A throne of piled stone faces the hatch above, and the dark on it is thicker than dark should be.', 0);

-- Exits -----------------------------------------------------------------
-- The map changed shape; rebuild the whole graph.
DELETE FROM exits;
INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
-- gates <-> approaches (the sewer alone climbs UP to enter)
('gate',        'down',  'stair',       NULL),
('stair',       'up',    'gate',        NULL),
('weeper-arch', 'down',  'weeper-hall', NULL),
('weeper-hall', 'up',    'weeper-arch', NULL),
('sally-port',  'down',  'crypt-steps', NULL),
('crypt-steps', 'up',    'sally-port',  NULL),
('sewer',       'up',    'scullery',    NULL),
('scullery',    'down',  'sewer',       NULL),
-- approaches <-> inner ring
('stair',       'down',  'barracks',    NULL),
('barracks',    'up',    'stair',       NULL),
('weeper-hall', 'west',  'cistern',     NULL),
('cistern',     'east',  'weeper-hall', NULL),
('crypt-steps', 'north', 'catacomb',    NULL),
('catacomb',    'south', 'crypt-steps', NULL),
('scullery',    'east',  'armory',      NULL),
('armory',      'west',  'scullery',    NULL),
-- the inner ring, walked as a cycle
('barracks',    'east',  'cells',       NULL),
('cells',       'west',  'barracks',    NULL),
('cells',       'south', 'cistern',     NULL),
('cistern',     'north', 'cells',       NULL),
('cistern',     'south', 'ossuary',     NULL),
('ossuary',     'north', 'cistern',     NULL),
('ossuary',     'west',  'catacomb',    NULL),
('catacomb',    'east',  'ossuary',     NULL),
('catacomb',    'west',  'kennels',     NULL),
('kennels',     'east',  'catacomb',    NULL),
('kennels',     'north', 'armory',      NULL),
('armory',      'south', 'kennels',     NULL),
('armory',      'north', 'gallery',     NULL),
('gallery',     'south', 'armory',      NULL),
('gallery',     'east',  'barracks',    NULL),
('barracks',    'west',  'gallery',     NULL),
-- ring -> hall (the four spokes)
('barracks',    'south', 'hall',        NULL),
('hall',        'north', 'barracks',    NULL),
('cistern',     'west',  'hall',        NULL),
('hall',        'east',  'cistern',     NULL),
('catacomb',    'north', 'hall',        NULL),
('hall',        'south', 'catacomb',    NULL),
('armory',      'east',  'hall',        NULL),
('hall',        'west',  'armory',      NULL),
-- the black hatch to the King
('hall',        'down',  'undercroft',  'tarnished-key'),
('undercroft',  'up',    'hall',        NULL),
-- the pockets
('gallery',     'north', 'shrine',      NULL),
('shrine',      'south', 'gallery',     NULL),
('cells',       'north', 'library',     NULL),
('library',     'south', 'cells',       NULL),
('barracks',    'north', 'warden-post', NULL),
('warden-post', 'south', 'barracks',    NULL),
('ossuary',     'south', 'chapel',      NULL),
('chapel',      'north', 'ossuary',     NULL),
('cistern',     'down',  'well',        NULL),
('well',        'up',    'cistern',     NULL),
('armory',      'down',  'forge',       NULL),
('forge',       'up',    'armory',      NULL),
('kennels',     'south', 'refectory',   NULL),
('refectory',   'north', 'kennels',     NULL);

-- Items on the ground ---------------------------------------------------
-- The people's artillery regrows at every gate, so no gate is ever unarmed.
-- (The stair keeps its rocks too — the old muscle memory.) Kit stays where it
-- was; the refectory, a dining hall, grows a little food.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
('loose-rock', 'gate',        1),
('loose-rock', 'weeper-arch', 1),
('loose-rock', 'sally-port',  1),
('loose-rock', 'sewer',       1),
('loose-rock', 'stair',       1),
('dried-meat', 'refectory',   0);

-- Creatures -------------------------------------------------------------
-- A bigger map wants more to fight; rebuild the roster to fill the ring.
-- Rats haunt the approaches and low rooms; skeletons hold the martial
-- quarters; two wardens beat the ring; the King keeps his center.
DELETE FROM mob_spawns;
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
('rat-1',  'rat',            'stair'),
('rat-2',  'rat',            'weeper-hall'),
('rat-3',  'rat',            'crypt-steps'),
('rat-4',  'rat',            'scullery'),
('rat-5',  'rat',            'cistern'),
('rat-6',  'rat',            'kennels'),
('skel-1', 'skeleton',       'armory'),
('skel-2', 'skeleton',       'barracks'),
('skel-3', 'skeleton',       'cells'),
('skel-4', 'skeleton',       'library'),
('ward-1', 'warden',         'warden-post'),
('ward-2', 'warden',         'ossuary'),
('king',   'forgotten-king', 'undercroft');
