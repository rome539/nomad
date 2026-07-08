-- A second hideaway for the deep (rome, 2026-07-08). The Pocket of Air sits up
-- in the Drowned Reach; everything below it — the Sunless Deep and the whole
-- King's Demesne — is a no-breath run with nowhere to fold in. One more, hung
-- off the Worm Cloister mid-descent: deep enough to matter, still shy of the
-- Demesne so the bottom of the world keeps its dread. Same law as the others
-- (is_safe; the engine bars every creature): a place to catch your breath,
-- not a place to keep things.
--
-- No reseed needed: rooms/exits are static world data, re-read on deploy.

INSERT OR REPLACE INTO rooms (id, zone, name, description, is_entry, is_safe) VALUES
('worm-bore', 'door', 'A Worm-Bore',
 'Something bored this tunnel long before the cloister had a name, and whatever it was, it was narrower than what hunts here now. You fold in shoulder-first and the stone closes around you like a held breath. The dark outside goes on scraping and dragging past the mouth — and past it. Nothing with a skull can follow. Rest, while the deep forgets you.', 0, 1);

INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
('worm-cloister', 'west', 'worm-bore',     NULL),
('worm-bore',     'east', 'worm-cloister', NULL);
