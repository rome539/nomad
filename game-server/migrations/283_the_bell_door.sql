-- THE BELL DOOR (2026-08-28, resited 2026-08-29). The fourth secret door, and
-- the only one whose key is the WORLD'S SCHEDULE: it opens with the fortress
-- bell and holds through the quiet after, and the bell rings only while the last
-- watchman lives to ring it from the turret. The door keeps no state of its own
-- (the bell is the state, like the moon door's moon) — and it obeys the deep
-- door's law: a window, never a wall; the way down is unkeyed, so the door
-- shutting never seals anybody in.
--
-- IT WAS FIRST HUNG OVER THE BELL-COTE and could not stay there, for two
-- reasons the world had already written down:
--
--   THE COTE HAS NOTHING OVER IT. Its own last line is that between the bell
--   and the sky there is just room for you. It is the top of a climb too tight
--   for anything with claws, it is the one safe room in the fortress with open
--   air above it, and a long armoury on its roof deletes all of that.
--
--   THE FORTRESS ALREADY HAS AN ARMOURY, and it tells the opposite story: the
--   Stripped Armory, where racks that once held spears hold dust, and whatever
--   armed itself there left in a hurry and left the bones. Two rooms cannot
--   both be where the garrison armed, and the arms cannot both have been
--   carried off in a hurry and never issued at all.
--
-- SO THE DOOR GOES ON THE STRIPPED ARMORY, and the contradiction becomes the
-- explanation. The racks down there are bare because the garrison took
-- everything they could REACH. There was one door they could not, because it
-- only opens on the bell — and by the time it rang they had already gone. The
-- bones on that floor are the ones who stayed and waited for it.
--
-- It is `up`, which in this world is the (-1,-1) diagonal (the armoury's own
-- `down` to the forge is (+1,+1), and the turret's climb to the cote is
-- (-1,-1)). The bell is a long way above this room now rather than under its
-- floor, and comes down through the stone — which is how the keep has always
-- heard it.

INSERT OR REPLACE INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
('the-issue-room', 'door', 'The Issue Room',
 'A low store above the armoury, and the only room in this fortress that was never emptied. Arms stand racked along both walls under two centuries of dust — halberds and maces and shields, the edges still true, every one of them issued to nobody. There is a scatter of bone by the door where somebody sat down with their back to it and waited for the bell to let them in. The dust lifts a finger''s width when the note comes down through the stone, and settles again, and has done that twice a day for a very long time.',
 0, 0, '', 0, 0, -1, 31);

INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
('armory', 'up', 'the-issue-room', 'bell-door'),
('the-issue-room', 'down', 'armory', NULL);

-- AND THE ROOM UNDER IT HAS TO POINT AT IT. Each of the other three doors is
-- set up by its anchor's own text before the door line ever prints — the head
-- wall says there is no way up this and the door goes down; the deep mark is a
-- tide gauge whose cutter ran out of post before he ran out of water; the
-- birdless acre says everything about it is right except that. The Stripped
-- Armory pointed nowhere: racks, dust, bones, and no ceiling.
--
-- The added line NAMES NOTHING. It does not say door, bell, hatch or hour — the
-- door prints its own line and states its own law without help. What this does
-- is make the bones mean something and give you a reason to look up, and it
-- rhymes with the issue room above, where somebody sat down with their back to
-- the door and waited. Down here are the ones who did the same thing standing.
UPDATE rooms SET description =
 'Racks that once held spears hold dust. Whatever armed itself here left in a hurry, and left the bones. The bones are not where men fall in a fight — they are together, at the back, under the one patch of ceiling the dust has been shaken off, and every one of them is lying face up.'
 WHERE id = 'armory';

INSERT OR REPLACE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
('box-armory', 'the-issue-room', 'the issue chest',
 'An iron chest stencilled with a warden''s mark, the lid still shut on whatever the last issue never gave out. It has been waiting since the bell first rang for no one.',
 '', 86400);

-- THE PAY-OFF HAS TO MATCH THE PRICE, and it did not. Measured against the
-- other three doors, this one is open a sixtieth as often:
--
--     riddle   answer it and it opens — effectively always
--     tide     open at low water, minus the digging — most of the day
--     moon     a full-moon night, 2h in every 24h            ~8%
--     bell     01:00 and 13:00 UTC, 90s of ringing + 10 min  ~1.6%
--
-- Twenty-three minutes a day, and only while the watchman lives. It should be
-- the best box in the world, and it was third. So: the two cheap lines are cut
-- (the watchman's boots at six barter, the plain warden's tower shield at nine
-- — and the shield's lineage survives in a better form below), and three
-- garrison names go in, against ONE for each of the other doors.
--
-- THE LAST WATCH IS THE TOP LINE and it is the whole feature in one object: it
-- is the last watchman's own harness, and the last watchman is the man whose
-- being alive is what makes this door open at all. So the room poses the trade
-- outright — kill him for the harness now and the bell never rings again, or
-- leave him standing and the door keeps paying, this harness included. The
-- item's own text says it cannot be stripped from a man who won't lie down,
-- which is exactly why the one in a store is the spare that was never issued.
--
-- THE CAPTAIN'S WALL is the warden-captain's tower shield — the named version
-- of the plain one this pool used to carry. THE SMITH'S GREATPLATE is armour
-- five, hammered from bar iron, and had NO source anywhere in the world; the
-- forge is two floors under this room. The bone-barred visor gives the pool the
-- helm a store ought to issue.
--
-- The chitin harness is CUT — shed carapace from the deep, the one line in
-- fourteen that was not warden or watch kit, and it already had three homes.
DELETE FROM cache_loot WHERE cache_id = 'box-armory';
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-armory', 'flanged-mace', 0.30),
('box-armory', 'poleaxe', 0.25),
('box-armory', 'gravestone-shield', 0.22),
('box-armory', 'polehammer', 0.20),
('box-armory', 'warden-sabatons', 0.18),
('box-armory', 'bone-barred-visor', 0.16),
('box-armory', 'deadplate-harness', 0.15),
('box-armory', 'reaver-glaive', 0.14),
('box-armory', 'kings-guard-blade', 0.12),
('box-armory', 'halberd', 0.10),
('box-armory', 'crown-guard-pavise', 0.09),
('box-armory', 'smiths-greatplate', 0.08),
('box-armory', 'captains-wall', 0.06),
('box-armory', 'the-tenor-bell', 0.05),
('box-armory', 'last-watch', 0.04);
