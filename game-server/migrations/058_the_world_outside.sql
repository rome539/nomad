-- The world grows to 100: the Door gets an OUTSIDE. Three blocks, each a job:
--   THE GROUNDS (13) — the fortress's ruined outside; a ring connecting all four
--     gates externally. The gates stop being doors into nothing: you can stand
--     in the open and look at the Door. Risk to the last step — extraction still
--     means reaching a gate. The old-road dead-end is where the world grows next.
--   THE WARRENS (12) — den country behind the walls: where the broods, packs,
--     and the albino rat actually LIVE. Three mouths inside (well / sewer /
--     oubliette) and one burrow out to the orchard. NO route to the deep — the
--     hound stays the only door down.
--   THE OVERWORKS (7) — the sky road: muster up to the wall-tops, east along
--     the battlements, down into weeper-hall — with a scramble down the breach
--     midway. Fast, exposed, wind.
-- Together: four parallel routes between the west and east gates (floor, sky,
-- dirt, and around the outside). Two new hideaways (6 total), two new dark
-- rooms (7 total, in zone-data). Population: existing species get homes, ~20
-- new spawns. (rome approved the paper map 2026-07-10.)
--
-- NOTE: rooms/exits/spawns are World config — REDEPLOY + /admin/reseed to land.

-- ================================ ROOMS ================================

INSERT OR REPLACE INTO rooms (id, zone, name, description, is_entry, is_safe) VALUES
-- ---- the grounds (13) ----
('the-causeway', 'door', 'The Causeway',
 'The old approach road, its paving heaved and split by a hundred years of roots. Behind you the Door rises out of the earth like a jaw. The sky overhead is wide and grey and pays you no mind at all.', 0, 0),
('the-old-road', 'door', 'The Old Road',
 'The road away. It runs west into a wall of thorn grown higher than a man, and whatever is beyond it does not answer. Names are scratched into the milestone by people who meant to come back.', 0, 0),
('the-burned-village', 'door', 'The Burned Village',
 'Hovels burned down to their sills, a well-sweep fallen across the lane. Whoever served the fortress lived here, and whatever emptied the fortress did not spare them. Charred beams shift when the wind leans on them.', 0, 0),
('the-gatefall', 'door', 'The Gatefall',
 'A slope of tumbled stone under the west wall where a tower let go of itself. The rubble is riddled with warm little hollows, and the squeak and scurry in them never quite stops.', 0, 0),
('the-dry-moat', 'door', 'The Dry Moat',
 'The ditch that guarded the north wall, dry a lifetime now. Down here the world is two banks of dead grass and a ribbon of sky, and nothing on the lip can be seen until it is looking down at you. Old bones poke from the silt.', 0, 0),
('the-wall-breach', 'door', 'The Wall-Breach',
 'The curtain wall failed here, all at once by the look of it — a wave of stone frozen mid-fall. The gap frames the fortress''s dark inward parts, and the rubble makes a bad, climbable stair up toward the battlements.', 0, 0),
('the-thorn-court', 'door', 'The Thorn-Court',
 'A yard on the eastern face swallowed whole by briar. Paths run through it low and narrow, cut by things that go on four legs. Above, carved in the arch''s keystone, the weeping face stares out over the waste.', 0, 0),
('the-mass-grave', 'door', 'The Mass-Grave',
 'A long pit, filled and refilled and never quite closed. The ground here is soft in a way ground should not be, and the smell brings things on four legs from a long way off. Nobody dug graves one at a time in the end.', 0, 0),
('the-briar-field', 'door', 'The Briar-Field',
 'Waist-high thorn from wall to fen, hissing against itself in the wind. Going is slow and loud, and the field always seems to be moving somewhere just out of sight.', 0, 0),
('the-hanging-hill', 'door', 'The Hanging Hill',
 'A bare knoll with a gibbet still standing against the sky, its chain creaking. From up here the whole of the grounds lies open — the walls, the gates, the thorn, and everything that moves between them.', 0, 0),
('the-black-fen', 'door', 'The Black Fen',
 'The wet ground where the sewer gives up what the fortress swallows. Black water stands in sheets between tussocks, and pale lichen fattens on the stones. Things with too many legs stitch the surface.', 0, 0),
('the-drowned-orchard', 'door', 'The Drowned Orchard',
 'Fruit trees dead in standing water, planted in rows by hands that expected to harvest them. Red-veined weeds have the run of it now. At the roots of the oldest tree, a fox-scrape breathes cold air up out of the earth.', 0, 0),
('the-sally-ditch', 'door', 'The Sally-Ditch',
 'The defenders'' bolt-hole ditch, running half-flooded along the south wall to the collapsed sally port. Whoever cut it meant to slip out unseen. Some of them may even have managed it.', 0, 0),
-- ---- the warrens (12) ----
('the-root-gnawed-run', 'door', 'The Root-Gnawed Run',
 'A crawl behind the well-shaft, its ceiling a mat of roots gnawed pale. The earth is packed smooth by generations of small bodies going somewhere in a hurry.', 0, 0),
('the-rat-warren', 'door', 'The Rat-Warren',
 'A widening in the earth floored with the bones of small things, all of them cracked for the marrow. Runs branch off in every direction, most too small for you. The air is warm and lived-in and wrong.', 0, 0),
('the-crawl-of-teeth', 'door', 'The Crawl of Teeth',
 'A squeeze so narrow the walls take skin. Every surface is scored with tooth-marks — some small, and some that make you stop crawling for a moment.', 0, 0),
('the-gnaw-hollow', 'door', 'The Gnaw-Hollow',
 'A low chamber where the runs meet, littered with droppings and gnawed leather. Daylight leaks down a slanted burrow from somewhere above — a fox-scrape out under the roots of the world.', 0, 0),
('a-dry-burrow', 'door', 'A Dry Burrow',
 'An old fox-earth, dry and dark and exactly big enough to fold yourself into. Whatever dug it is long gone. Nothing follows you in here; nothing knows to look.', 0, 1),
('the-dripping-gallery', 'door', 'The Dripping Gallery',
 'A gallery of wet stone where the well''s water sweats through the earth. Pale lichen grows in reaching sheets, and every drip lands with a tick like a slow clock.', 0, 0),
('the-bone-midden', 'door', 'The Bone-Midden',
 'A heap of refuse a den makes over years — bones, hide, dung, and the sweet reek of spoil. The smell carries far in the runs, and things come to it.', 0, 0),
('the-hyena-den', 'door', 'The Hyena Den',
 'The dug heart of the pack: a chamber of trampled earth, meal-bones, and hair. It smells of them the way a house smells of its family. Coming here uninvited says something, and the pack hears it.', 0, 0),
('the-undermine', 'door', 'The Undermine',
 'A gallery cut by miners, not animals — pit-props, tool-marks, a seam followed and abandoned. Half the ceiling has already been down once; the props that hold the rest creak when the earth shifts its weight.', 0, 0),
('the-earth-throat', 'door', 'The Earth-Throat',
 'The mine ends at a throat of raw stone dropping into dark that gives no bottom to a thrown pebble. Cold air rises out of it, steady, like breath. Nothing built this. It goes down. Not yet.', 0, 0),
('the-sewer-slip', 'door', 'The Sewer-Slip',
 'A filth-slicked ledge above the sewer''s black run-off. Things lost or stolen in the fortress above wash up on it sooner or later, snagged in the muck like the sewer is keeping a collection.', 0, 0),
('the-buried-chapel', 'door', 'The Buried Chapel',
 'A chapel the earth swallowed whole and did not chew: pews under a stone sky, an altar with soil to its knees. Old carvings crowd every surface — prayers, then names, then only marks.', 0, 0),
-- ---- the overworks (7) ----
('the-wall-walk', 'door', 'The Wall-Walk',
 'The battlement walk atop the west wall, open to a sky that has forgotten the place. The wind never stops up here; it just changes its mind. Below on one side lies the yard, on the other, the waste.', 0, 0),
('the-watch-turret', 'door', 'The Watch Turret',
 'A hollow turret at the wall''s shoulder, its roof half gone. Arrow-slits look down over the muster yard and out across the grounds both — whoever stood here saw everything and, at the end, it did not help.', 0, 0),
('the-bell-cote', 'door', 'The Bell-Cote',
 'A cracked bell in a stone cote at the top of a climb too tight for anything with claws. The bell has one note left in it and holds it. Between the bell and the sky there is just room for you.', 0, 1),
('the-broken-battlement', 'door', 'The Broken Battlement',
 'The walk runs on gap-toothed here, crenels snapped like teeth, the drop yawning through every gap. Below, the wall-breach spills its frozen wave of rubble — a bad stair down the outside of the world.', 0, 0),
('the-leaning-spire', 'door', 'The Leaning Spire',
 'A watch-spire gone drunk on its foundations, leaning far enough out over the chapel wing that the floor is a slope. Everything loose in it has migrated to the low wall. You walk on the join of floor and stone.', 0, 0),
('the-rotted-scaffold', 'door', 'The Rotted Scaffold',
 'Masons'' scaffolding from some repair a century abandoned, grey and soft with rot. The boards give warnings underfoot — long creaks, little sighs. It has held this long. That is all that can be said for it.', 0, 0),
('the-weepers-crown', 'door', 'The Weeper''s Crown',
 'The top of the eastern arch, behind the carved face''s crown. From here the face''s tears are rain-channels, cut deep by clever dead hands. The thorn-court lies below, and the whole grey waste beyond it.', 0, 0);

-- ================================ EXITS ================================

INSERT OR REPLACE INTO exits (room_id, dir, to_room) VALUES
-- ---- grounds: the ring and its spurs ----
('gate', 'west', 'the-causeway'),           ('the-causeway', 'east', 'gate'),
('the-causeway', 'north', 'the-gatefall'),  ('the-gatefall', 'south', 'the-causeway'),
('the-causeway', 'west', 'the-old-road'),   ('the-old-road', 'east', 'the-causeway'),
('the-causeway', 'south', 'the-burned-village'), ('the-burned-village', 'north', 'the-causeway'),
('the-burned-village', 'south', 'the-drowned-orchard'), ('the-drowned-orchard', 'north', 'the-burned-village'),
('the-gatefall', 'east', 'the-dry-moat'),   ('the-dry-moat', 'west', 'the-gatefall'),
('the-dry-moat', 'east', 'the-wall-breach'),('the-wall-breach', 'west', 'the-dry-moat'),
('the-wall-breach', 'south', 'the-thorn-court'), ('the-thorn-court', 'north', 'the-wall-breach'),
('the-thorn-court', 'west', 'weeper-arch'), ('weeper-arch', 'east', 'the-thorn-court'),
('the-thorn-court', 'east', 'the-mass-grave'), ('the-mass-grave', 'west', 'the-thorn-court'),
('the-thorn-court', 'south', 'the-briar-field'), ('the-briar-field', 'north', 'the-thorn-court'),
('the-thorn-court', 'up', 'the-weepers-crown'), ('the-weepers-crown', 'down', 'the-thorn-court'),
('the-briar-field', 'east', 'the-hanging-hill'), ('the-hanging-hill', 'west', 'the-briar-field'),
('the-briar-field', 'south', 'the-black-fen'), ('the-black-fen', 'north', 'the-briar-field'),
('the-black-fen', 'west', 'the-drowned-orchard'), ('the-drowned-orchard', 'east', 'the-black-fen'),
('the-black-fen', 'up', 'sewer'),           ('sewer', 'down', 'the-black-fen'),
('the-drowned-orchard', 'south', 'the-sally-ditch'), ('the-sally-ditch', 'north', 'the-drowned-orchard'),
('the-sally-ditch', 'east', 'sally-port'),  ('sally-port', 'west', 'the-sally-ditch'),
-- the fox-scrape: the warrens breathe out under the orchard
('the-drowned-orchard', 'down', 'the-gnaw-hollow'), ('the-gnaw-hollow', 'up', 'the-drowned-orchard'),
-- ---- warrens: three mouths in, dead-ends, no way down ----
('well', 'west', 'the-root-gnawed-run'),    ('the-root-gnawed-run', 'east', 'well'),
('the-root-gnawed-run', 'north', 'the-rat-warren'), ('the-rat-warren', 'south', 'the-root-gnawed-run'),
('the-root-gnawed-run', 'south', 'the-dripping-gallery'), ('the-dripping-gallery', 'north', 'the-root-gnawed-run'),
('the-rat-warren', 'west', 'the-crawl-of-teeth'), ('the-crawl-of-teeth', 'east', 'the-rat-warren'),
('the-crawl-of-teeth', 'south', 'the-gnaw-hollow'), ('the-gnaw-hollow', 'north', 'the-crawl-of-teeth'),
('the-gnaw-hollow', 'west', 'a-dry-burrow'), ('a-dry-burrow', 'east', 'the-gnaw-hollow'),
('the-dripping-gallery', 'south', 'the-bone-midden'), ('the-bone-midden', 'north', 'the-dripping-gallery'),
('the-bone-midden', 'south', 'the-hyena-den'), ('the-hyena-den', 'north', 'the-bone-midden'),
('the-bone-midden', 'west', 'the-sewer-slip'), ('the-sewer-slip', 'east', 'the-bone-midden'),
('the-dripping-gallery', 'west', 'the-undermine'), ('the-undermine', 'east', 'the-dripping-gallery'),
('the-undermine', 'down', 'the-earth-throat'), ('the-earth-throat', 'up', 'the-undermine'),
('sewer', 'east', 'the-sewer-slip'),        ('the-sewer-slip', 'west', 'sewer'),
('the-sewer-slip', 'north', 'the-buried-chapel'), ('the-buried-chapel', 'south', 'the-sewer-slip'),
('the-buried-chapel', 'up', 'oubliette'),   ('oubliette', 'down', 'the-buried-chapel'),
-- ---- overworks: the sky road ----
('muster', 'up', 'the-wall-walk'),          ('the-wall-walk', 'down', 'muster'),
('the-wall-walk', 'north', 'the-watch-turret'), ('the-watch-turret', 'south', 'the-wall-walk'),
('the-watch-turret', 'up', 'the-bell-cote'),('the-bell-cote', 'down', 'the-watch-turret'),
('the-wall-walk', 'east', 'the-broken-battlement'), ('the-broken-battlement', 'west', 'the-wall-walk'),
('the-broken-battlement', 'down', 'the-wall-breach'), ('the-wall-breach', 'up', 'the-broken-battlement'),
('the-broken-battlement', 'east', 'the-leaning-spire'), ('the-leaning-spire', 'west', 'the-broken-battlement'),
('the-leaning-spire', 'east', 'the-rotted-scaffold'), ('the-rotted-scaffold', 'west', 'the-leaning-spire'),
('the-rotted-scaffold', 'south', 'the-weepers-crown'), ('the-weepers-crown', 'north', 'the-rotted-scaffold');

-- ================================ CREATURES ================================
-- Existing species get homes; the seed room becomes each one's territory anchor.

INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
-- the grounds: hyena country, rats in the rubble, a cutpurse in the ashes
('grave-hyena-g1', 'grave-hyena', 'the-mass-grave'),
('grave-hyena-g2', 'grave-hyena', 'the-mass-grave'),
('grave-hyena-g3', 'grave-hyena', 'the-briar-field'),
('dire-hyena-g1',  'dire-hyena',  'the-hanging-hill'),
('rat-g1',  'rat', 'the-gatefall'),
('rat-g2',  'rat', 'the-gatefall'),
('rat-g3',  'rat', 'the-dry-moat'),
('fleet-rat-g1', 'fleet-rat', 'the-briar-field'),
('fleet-rat-g2', 'fleet-rat', 'the-burned-village'),
('cutpurse-g1',  'cutpurse',  'the-burned-village'),
-- the warrens: the dens themselves
('rat-w1', 'rat', 'the-rat-warren'),
('rat-w2', 'rat', 'the-rat-warren'),
('rat-w3', 'rat', 'the-root-gnawed-run'),
('rat-w4', 'rat', 'the-gnaw-hollow'),
('brood-rat-w1',  'brood-rat',  'the-rat-warren'),
('grave-hyena-w1','grave-hyena','the-hyena-den'),
('grave-hyena-w2','grave-hyena','the-hyena-den'),
('albino-rat-w1', 'albino-rat', 'the-crawl-of-teeth'),
-- the overworks: fast and light up in the wind
('fleet-rat-o1', 'fleet-rat', 'the-wall-walk'),
('fleet-rat-o2', 'fleet-rat', 'the-leaning-spire'),
('cutpurse-o1',  'cutpurse',  'the-broken-battlement');

-- ================================ FORAGE ================================

INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
('torch',        'the-causeway',       1),
('bloodwort',    'the-drowned-orchard',1),
('bloodwort',    'the-black-fen',      1),
('cave-lichen',  'the-black-fen',      1),
('cave-lichen',  'the-dripping-gallery',1),
('offal',        'the-mass-grave',     1),
('offal',        'the-bone-midden',    1),
('knucklebone',  'the-hanging-hill',   1),
('linen-strips', 'the-burned-village', 1),
('loose-rock',   'the-gatefall',       1),
('loose-rock',   'the-wall-breach',    1),
('rusted-pick',  'the-undermine',      1);
