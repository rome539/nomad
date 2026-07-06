-- Phase (map) — the dungeon gets deep. The ring was wide but flat: everything
-- two hops from a gate, the "deep" a single room. This adds real vertical depth
-- — a wider upper ring, a drowned lower level below the undercroft, and a
-- descent to the King's throne at the very bottom. Geography only here; the
-- population (deep mobs, the boss/reliquary move, caches) follows once the
-- layout is approved off the map.

-- ============================ ROOMS ============================
INSERT OR REPLACE INTO rooms (id, zone, name, description, is_entry, is_safe) VALUES
-- ---- upper ring, wider: four two-room spurs off the existing wings ----
('larder',        'door', 'The Rotting Larder',    'Hooks hang in rows from a black ceiling, most empty, a few not. Whatever the garrison salted down here went over a long age ago, and the smell has made itself at home.', 0, 0),
('smokehouse',    'door', 'The Smokehouse',        'A low brick room still furred with old soot and grease. Cold now, and quiet, but the walls remember fire and the reek clings like a second skin.', 0, 0),
('chapter-house', 'door', 'The Chapter House',     'A round room where the dungeon''s keepers once sat in council, their stone seats ringing a floor worn smooth. The seats are all taken, in a manner of speaking.', 0, 0),
('scriptorium',   'door', 'The Burned Scriptorium','Slanted desks and the ghosts of shelves, everything charred to a crust. Flakes of burned vellum lift and settle when you move, like slow black snow.', 0, 0),
('debtors-pit',   'door', 'The Debtors'' Pit',     'A sunken square of a room, its floor a full man''s height below the door, so you look down into it. Scratches cover every reachable inch of the walls — counting, always counting.', 0, 0),
('oubliette',     'door', 'The Oubliette',         'A shaft of a cell with a single grate overhead, forgotten on purpose. The floor is a soft, terrible carpet of what the forgotten leave behind.', 0, 0),
('muster',        'door', 'The Muster Yard',       'A drilling floor under a vaulted roof, boot-worn flagstones marking where ranks once stood at dawn. Nothing musters here now but the cold.', 0, 0),
('guardroom',     'door', 'The Guardroom',         'A cramped watch-room with a cold brazier, a broken table, and pegs where kit once hung. Someone scratched a tally of days into the doorframe and then stopped.', 0, 0),

-- ---- the Deep: the Drowned Crypts, below the undercroft ----
('the-descent',   'door', 'The Long Descent',      'The stair drops and keeps dropping, the walls sweating, the air going thick and cold and old. Somewhere far below, water moves.', 0, 0),
('drowned-nave',  'door', 'The Drowned Nave',      'A great flooded hall older than anything above it, its columns rising from black water to a ceiling lost in dark. Your voice comes back from every direction, wrong.', 0, 0),
('black-canal',   'door', 'The Black Canal',       'A worked channel of still, lightless water running off into the dark both ways. Things break the surface and are gone before you can name them.', 0, 0),
('the-weir',      'door', 'The Broken Weir',       'A collapsed sluice where the deep water pours through a gap into deeper dark. The roar of it fills the room and swallows every other sound — including your own steps.', 0, 0),
('pocket-of-air', 'door', 'A Pocket of Air',       'A high shelf of dry stone above the flood, barely a room, reachable only if you know it''s here. The water can''t follow you up, and neither can what swims in it. A place to breathe.', 0, 1),
('sunken-gallery','door', 'The Sunken Gallery',    'A long submerged arcade, its arches half-drowned, portraits rotted to smears in their frames. The faces are gone but they still seem to watch the waterline.', 0, 0),
('root-vault',    'door', 'The Root-Choked Vault', 'A burial vault split open by roots thick as a thigh, come down from a world you can barely believe is still up there. They''ve made the dead part of the tree.', 0, 0),
('deep-ossuary',  'door', 'The Deep Ossuary',      'Bones stacked to the ceiling in patient, ancient masonry, a wall of the dead older than the ossuary above by centuries. The oldest dungeon, under the dungeon.', 0, 0),
('weeping-cells', 'door', 'The Weeping Cells',     'A row of drowned oubliettes, water to the knee, their doors long rusted open. The walls run constantly, as if the stone itself is grieving what it kept.', 0, 0),
('silted-stair',  'door', 'The Silted Stair',      'A grand stair choked with black silt, descending toward a colder dark. The steps are treacherous under the muck, and something has been up and down them recently.', 0, 0),

-- ---- the bottom: the descent to the King's throne ----
('bone-processional','door','The Bone Processional','A long approach walled floor to ceiling in fitted skulls, a road of the dead leading down to something that rules them. They all face the way you''re going.', 0, 0),
('black-threshold', 'door', 'The Black Threshold',  'A vast doorway of black stone, its lintel carved with a warning in no language you know, though your body understands it well enough. Beyond it, cold pours up like a tide.', 0, 0),
('sunken-throne',   'door', 'The Sunken Throne',    'A drowned hall of state, and at its heart a throne of black iron on a dais above the water, where something has waited a very long time to be disturbed.', 0, 0),
('kings-hoard',     'door', 'The King''s Hoard',    'A low, close treasury behind the throne, where the dead King keeps what he took to the grave. What glints in the dark down here was worth a kingdom, once.', 0, 0);

-- ============================ EXITS (bidirectional) ============================
INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
-- upper wider: four spurs onto the ring
('refectory','south','larder',NULL),        ('larder','north','refectory',NULL),
('larder','down','smokehouse',NULL),         ('smokehouse','up','larder',NULL),
('shrine','north','chapter-house',NULL),     ('chapter-house','south','shrine',NULL),
('chapter-house','north','scriptorium',NULL),('scriptorium','south','chapter-house',NULL),
('cells','east','debtors-pit',NULL),         ('debtors-pit','west','cells',NULL),
('debtors-pit','down','oubliette',NULL),     ('oubliette','up','debtors-pit',NULL),
('warden-post','north','muster',NULL),       ('muster','south','warden-post',NULL),
('muster','east','guardroom',NULL),          ('guardroom','west','muster',NULL),

-- the spine of the deep: a straight descent, undercroft down to the King
('undercroft','down','the-descent',NULL),    ('the-descent','up','undercroft',NULL),
('the-descent','down','drowned-nave',NULL),  ('drowned-nave','up','the-descent',NULL),
('drowned-nave','down','silted-stair',NULL), ('silted-stair','up','drowned-nave',NULL),

-- the Black Canal runs EAST off the descent, the Pocket of Air at its far end
('the-descent','east','black-canal',NULL),   ('black-canal','west','the-descent',NULL),
('black-canal','east','the-weir',NULL),      ('the-weir','west','black-canal',NULL),
('the-weir','east','pocket-of-air',NULL),    ('pocket-of-air','west','the-weir',NULL),

-- the Drowned Nave's wings: gallery east, ossuary west, each a two-room arm
('drowned-nave','east','sunken-gallery',NULL), ('sunken-gallery','west','drowned-nave',NULL),
('sunken-gallery','east','root-vault',NULL),   ('root-vault','west','sunken-gallery',NULL),
('drowned-nave','west','deep-ossuary',NULL),   ('deep-ossuary','east','drowned-nave',NULL),
('deep-ossuary','west','weeping-cells',NULL),  ('weeping-cells','east','deep-ossuary',NULL),

-- the descent to the throne, at the very bottom
('silted-stair','down','bone-processional',NULL),   ('bone-processional','up','silted-stair',NULL),
('bone-processional','down','black-threshold',NULL), ('black-threshold','up','bone-processional',NULL),
('black-threshold','down','sunken-throne',NULL),     ('sunken-throne','up','black-threshold',NULL),
('sunken-throne','down','kings-hoard',NULL),         ('kings-hoard','up','sunken-throne',NULL);

-- Move a top-level crawl space: A Crack in the Wall leaves the Gallery for the
-- far side of the map, tucked off the Hound Kennels — a breather beside the
-- beasts, and it spreads the two upper hideaways apart.
DELETE FROM exits WHERE (room_id='gallery' AND to_room='hollow-crack') OR (room_id='hollow-crack' AND to_room='gallery');
INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
('kennels','west','hollow-crack',NULL), ('hollow-crack','east','kennels',NULL);
