-- Phase 2 (map) — the deep stops being a kiddie pool. 021 gave the dungeon its
-- vertical spine (undercroft → drowned crypts → the King's throne), but the deep
-- itself was thin: a straight drop with two short wings. This widens it into a
-- real layered descent in three tiers, each worse than the last:
--   • DROWNED REACH ×4  — the flooded level widens: a loop off the Black Canal,
--     down to a bottomless cistern, back up to the weir.
--   • SUNLESS DEEP ×9   — below the water, a dry lightless country hung off the
--     Silted Stair as two nested loops. Optional (NOT the throne path), so its
--     bottom — the Sunless Well — holds the best and scarcest of what fell here,
--     as far from safe banking as the map gets. The long walk back is the price.
--   • KING'S DEMESNE ×5 — the throne stops being the end of a corridor and
--     becomes the heart of a domain: two antechambers descend into it, three
--     chambers flank it. The King sits in the middle of his dead court now.
-- Geography ONLY here, exactly like 021. The population (deeper dwellers that
-- worsen with depth, the scarce bottom-loot caches) follows in a later migration
-- once the layout is walked and approved off the map.

-- ============================ ROOMS ============================
INSERT OR REPLACE INTO rooms (id, zone, name, description, is_entry, is_safe) VALUES

-- ---- Tier 1: the Drowned Reach, a loop off the Black Canal ----
('drowned-barracks','door','The Drowned Barracks','Rows of stone bunks stand in water to the shin, the garrison that slept here long since given over to the flood. Something has pulled the rotted bedding into a heap in the far corner, and the heap is bigger than a man.',0,0),
('leech-pools',     'door','The Leeching Pools','The floor steps down into a chain of still black basins, each brimming and spilling into the next. The water is warmer than the stone has any right to make it, and where you break its skin it goes on moving for a long while after.',0,0),
('tide-vault',      'door','The Tide-Vault','A strongroom the flood took, its iron door burst outward on its hinges by the weight of the water that stood behind it. Whatever was kept safe in here is silted over now — the safety, in the end, ran the other way.',0,0),
('the-cistern',     'door','The Cistern','A vast round well of a room, its curved walls climbing out of sight above and dropping into water deeper than you want to measure below. Your smallest sound goes up the walls and comes back changed, and the black surface under you is never quite still.',0,0),

-- ---- Tier 2: the Sunless Deep, two nested loops below the water ----
('blackreach',        'door','The Blackreach','Past the silt the stair gives out onto a country of dry stone with no water, no light, and no far wall your eye can find. This is under the drowned dungeon the way the drowned dungeon is under the world — and nothing born down here has ever had the least use for eyes.',0,0),
('the-lightless-march','door','The Lightless March','A long straight gallery running off into a dark so complete it seems to have weight, so that stepping into it feels like wading into deep water. Your hand dragging the wall is the only proof you are moving at all.',0,0),
('worm-cloister',     'door','The Worm Cloister','A ring of open cells around a sunken court, every stone face bored clean through with holes the width of your arm, their edges smoothed by the slow passage of something long and patient. The holes run back further than your voice will follow.',0,0),
('the-undertow',      'door','The Undertow','The floor cants and the dark seems to pull, a steady low drag toward the deeper black as if the whole deep were quietly breathing in. Loose things — grit, bone-chips, whatever nerve you brought — go with it.',0,0),
('the-sump',          'door','The Sump','The low point of the sunless country, where everything the deep loosens eventually gathers. The floor is soft ancient sediment that takes your weight with a sigh and is in no hurry to give it back.',0,0),
('carrion-gallery',   'door','The Carrion Gallery','A wide chamber whose floor is a slow midden of what the deep has killed and let fall — bones of things you can name, and more you cannot. It has been fed a very long time down here, and it is patient about the next.',0,0),
('the-marrow-road',   'door','The Marrow Road','A raised causeway of packed bone crosses a chamber of standing dark, the road ground pale and fine by ages of feet. Whatever wore it smooth has not stopped using it.',0,0),
('the-gasping-dark',  'door','The Gasping Dark','The air here has gone bad — thick, close, breathed-over — and every lungful is work. Something vast breathes in this room besides you, slow and wet and just out of time with your own, and you would give a great deal to know where it stands.',0,0),
('sunless-well',      'door','The Sunless Well','The very floor of the deep: a domed vault where the oldest and best of everything that ever fell has settled out, past the reach of all but the drowned and the reckless. What glints in the silt down here cost every life that came for it, and it will cost you the whole long climb back to keep.',0,0),

-- ---- Tier 3: the King's Demesne, wrapping the throne ----
('drowned-court',   'door','The Drowned Court','A flanking hall where the King''s court once waited on his pleasure, and waits on it still — rows of kneeling figures gone to salt and silt, every bowed face fixed on a throne they were never dismissed from. The water laps at their shoulders and not one of them stirs.',0,0),
('kings-oratory',   'door','The King''s Oratory','A private chapel to no god with a name you know, where the dead King kept his own counsel with the dark. The altar is turned inward, toward the throne room, as though whatever was worshipped here was only ever sitting next door.',0,0),
('bone-reliquary',  'door','The Bone Reliquary','A treasury not of coin but of relics — finger-bones cased in tarnished silver, a crowned skull, teeth set and polished like gems. The King kept his dead close about him, and the dead have kept their edges.',0,0),
('the-death-cell',  'door','The Death Cell','A bare stone room a stride from the throne, old iron rings set deep into the floor and the floor sloping gently to a drain. This is where the King saw to those who displeased him, personally. The rings have held something recently.',0,0),
('the-cold-hearth', 'door','The Cold Hearth','A great fireplace of black stone fills one wall of this flanking chamber, dead a thousand years, its throat packed with the ash of old fires and the bones of something that once crawled up into the last of the warmth to die. Nothing warm was ever coming back out of it.',0,0);

-- ============================ EXITS (bidirectional) ============================
INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES

-- Tier 1: Drowned Reach — off the Black Canal, down to the Cistern, back up to the Weir
('black-canal','south','drowned-barracks',NULL), ('drowned-barracks','north','black-canal',NULL),
('drowned-barracks','down','leech-pools',NULL),  ('leech-pools','up','drowned-barracks',NULL),
('leech-pools','east','tide-vault',NULL),        ('tide-vault','west','leech-pools',NULL),
('leech-pools','down','the-cistern',NULL),       ('the-cistern','up','leech-pools',NULL),
('the-cistern','north','the-weir',NULL),         ('the-weir','south','the-cistern',NULL),

-- Tier 2: Sunless Deep — hung off the Silted Stair (west), two nested loops
('silted-stair','west','blackreach',NULL),       ('blackreach','east','silted-stair',NULL),
-- outer loop: blackreach splits (march arm / undertow arm), rejoins at the Sump
('blackreach','west','the-lightless-march',NULL),('the-lightless-march','east','blackreach',NULL),
('the-lightless-march','west','worm-cloister',NULL),('worm-cloister','east','the-lightless-march',NULL),
('worm-cloister','down','the-sump',NULL),        ('the-sump','up','worm-cloister',NULL),
('blackreach','down','the-undertow',NULL),       ('the-undertow','up','blackreach',NULL),
('the-undertow','south','the-sump',NULL),        ('the-sump','north','the-undertow',NULL),
-- inner loop: the Sump splits (carrion arm / marrow arm), rejoins at the Gasping Dark
('the-sump','west','carrion-gallery',NULL),      ('carrion-gallery','east','the-sump',NULL),
('carrion-gallery','down','the-gasping-dark',NULL),('the-gasping-dark','up','carrion-gallery',NULL),
('the-sump','down','the-marrow-road',NULL),      ('the-marrow-road','up','the-sump',NULL),
('the-marrow-road','down','the-gasping-dark',NULL),('the-gasping-dark','north','the-marrow-road',NULL),
-- the bottom: a dead-end vault below the Gasping Dark, the deepest room in the world
('the-gasping-dark','down','sunless-well',NULL),  ('sunless-well','up','the-gasping-dark',NULL),

-- Tier 3: King's Demesne — two antechambers descend into the throne, three flank it
('black-threshold','east','drowned-court',NULL),  ('drowned-court','west','black-threshold',NULL),
('black-threshold','west','kings-oratory',NULL),  ('kings-oratory','east','black-threshold',NULL),
('drowned-court','down','sunken-throne',NULL),    ('sunken-throne','east','drowned-court',NULL),
('kings-oratory','down','sunken-throne',NULL),    ('sunken-throne','west','kings-oratory',NULL),
('drowned-court','east','the-cold-hearth',NULL),  ('the-cold-hearth','west','drowned-court',NULL),
('sunken-throne','north','bone-reliquary',NULL),  ('bone-reliquary','south','sunken-throne',NULL),
('sunken-throne','south','the-death-cell',NULL),  ('the-death-cell','north','sunken-throne',NULL);
