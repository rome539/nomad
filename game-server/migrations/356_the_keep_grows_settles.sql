-- THE KEEP GROWS, SETTLED (rome, 2026-10-31). Two things mig 355 could not do.
--
-- 1. THE REGION GOES BLANK, like every other room inside the fortress. The
--    builder only writes a region it knows, so the twenty went in as `upper`;
--    the original fortress rooms carry none, and code that compares regions
--    (a fortress torch wanders only among rooms of its own) would have cut the
--    new ground off from the rest. A blank reads as `upper` everywhere else.
UPDATE rooms SET region = '' WHERE id IN (
  'the-five-ways', 'the-watch-passage', 'the-roll-room', 'the-quartermasters-room',
  'the-long-store', 'the-harness-room', 'the-fletchery', 'the-arming-passage',
  'the-pay-table', 'the-sergeants-room',
  'the-side-run', 'the-litter-chamber', 'the-root-hall', 'the-scrape', 'the-old-adit',
  'the-blind-heading', 'the-wet-run', 'the-fallen-props', 'the-hoard-hole', 'the-warren-sump');

-- 2. WHAT LIVES THERE, at the density of the ground around it, each row with
--    its own id (mig 309) and seeded on the next load.
--    The stores: skeletons only. Nothing that eats can feed in the halls (they
--    grow nothing), and the wardens walk fixed rounds that would take them
--    straight back out.
--    The old adit: the warrens' own mix. Its ten rooms join WARRENS_ROOMS
--    (zone-data.ts), so the rats graze where they stand, and the hyena eats the
--    dead as it does in the den.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('keep-skel-1', 'skeleton', 'the-long-store');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('keep-skel-2', 'skeleton', 'the-arming-passage');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('keep-skel-3', 'skeleton', 'the-roll-room');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('keep-skel-4', 'skeleton', 'the-pay-table');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('adit-rat-1', 'rat', 'the-side-run');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('adit-rat-2', 'rat', 'the-scrape');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('adit-rat-3', 'rat', 'the-wet-run');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('adit-fleet-rat', 'fleet-rat', 'the-old-adit');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('adit-brood-rat', 'brood-rat', 'the-litter-chamber');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('adit-hyena', 'grave-hyena', 'the-hoard-hole');
