-- THE SECRET DOORS (2026-08-25). Three new doors, three new kinds of key:
-- what you KNOW (the riddle door on the mountain's head wall), when it IS (the
-- moon door on the glade), where the WATER is (the tide door on the sea cave).
-- One door per region, and none of them in the warrens: three locks that are
-- three different questions should not all be asked in the same corridor.
-- Each obeys the deep door's law: a window, never a wall; the way back is
-- always unkeyed, so a door shutting never seals anyone inside; and none of
-- them sits on a route that was already open. Each has its own room and its
-- own box — the door is the lock, the box is the reward.

INSERT OR REPLACE INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, is_holding, map_x, map_y) VALUES
-- THE RIDDLE DOOR IS IN THE MOUNTAIN, at the foot of the corrie's head wall.
-- The Back Wall's own description is seven hundred feet of black rock and the
-- flat sentence "There is no way up this" — which is true, and is not the same
-- claim as there being no way THROUGH. A door that asks you a question belongs
-- against the one wall in the world the game has already told you to give up on.
-- It goes DOWN rather than east: the wall is what you cannot climb, and the way
-- in is cut back under its foot. East of the wall is the Hanging Step, which is
-- outside on the face, so a horizontal door there would be a lie about the map.
('the-kept-room', 'door', 'The Kept Room',
 'A room cut back into the mountain under the foot of the wall, square and low and drier than anything for a mile, with the black rock going up outside it forever. Whoever cut this finished it — the corners are true and the floor is level and there is no rubble anywhere, which means they carried it out. Nothing has been in here since. The air has gone still rather than stale, the way air does when it is being kept rather than forgotten, and a box stands against the back wall under an even grey fall of dust.',
 0, 0, 'mountain', 0, 0, 82, 8),
('the-moon-glade', 'door', 'The Moon Glade',
 'A round glade the trees lean away from, as if the moon asked them to. The grass is silver at night and ordinary by day, and nothing here has ever been eaten. The glade keeps itself for the nights the door stands open.',
 0, 0, 'wood', 0, 0, -38, 9),
('the-sea-cave', 'door', 'The Sea Cave',
 'A cave the tide keeps — black stone, wet walls, a floor of sand the water rakes flat twice a day. The sea owns this place and lends it out at low water, for as long as the water is gone. Daylight reaches the first dozen feet of it and then gives up; the cave goes on west into the hill, and gets narrower doing it.',
 0, 0, 'crossing', 0, 0, 52, 9),
('the-sand-crawl', 'door', 'The Sand Crawl',
 'The roof comes down to meet the sand and you go the rest of the way bent double, one shoulder on wet rock. The sand here is ridged in long even bars, the shape running water leaves, and it is the same shape all the way through — which tells you the sea comes this far, every tide, without hurrying. Weed hangs from the roof in black ropes, dry at the tips and wet everywhere else. That line is the high-water mark and it is above your head.',
 0, 0, 'crossing', 0, 0, 51, 9),
('the-drowned-chamber', 'door', 'The Drowned Chamber',
 'The crawl opens out and the roof lifts away into a dark the light does not find the top of. The floor is flat sand, raked and re-raked, printed with nothing at all — no track, no crab, no bird. Around the walls at chest height runs a band of white where the salt has come out of the stone, and the whole room is inside it, which means the whole room goes under, every tide, without exception.',
 0, 0, 'crossing', 0, 0, 50, 9),
('the-weed-gallery', 'door', 'The Weed Gallery',
 'A long gallery running back parallel to the shore, and every foot of its roof is bearded with weed — black, flat-bladed, hanging down to head height and heavy with water it has not finished giving up. Walking it means putting your face through it, over and over. It grows on the roof because the roof is where the light was, once, before the hill closed over this.',
 0, 0, 'crossing', 0, 0, 51, 8),
('the-shingle-bank', 'door', 'The Shingle Bank',
 'The sand gives out and becomes shingle — a steep bank of it heaped against the far wall, every stone round and matched and sorted by size the way only water sorts things. It shifts and rolls under you and announces every step to the whole cave. Things have come to rest in a bank like this and been buried by the next tide, and the one after that.',
 0, 0, 'crossing', 0, 0, 50, 8),
('the-blowhole', 'door', 'The Blowhole',
 'A shaft goes up out of the roof here, too narrow to climb and open at the far end — you can tell because there is a coin of grey daylight up there, very small and very far, and the air moves. When the sea works below, this hole breathes: a long suck and a longer sigh, and spray comes down it in a fine cold rain. It is the cave telling you what the water is doing without your having to go and look.',
 0, 0, 'crossing', 0, 0, 49, 8),
('the-fallen-roof', 'door', 'The Fallen Roof',
 'A slab came off the roof here, a long time ago, and it lies where it landed with the sand drifted up one side of it. You go over it or you go round it, and either way you are climbing on something that used to be the ceiling — which is a thought worth having and then not having again. Beyond it the cave narrows and keeps going.',
 0, 0, 'crossing', 0, 0, 49, 9),
-- NOT "the-black-pool": that id is a wood room since mig 132 (open water in the
-- trees, with a mire-walker spawned on it). An INSERT OR REPLACE here would have
-- quietly rewritten it into a sea cave, moved it across the map and cut its road
-- to the sedge flat.
('the-salt-pool', 'door', 'The Salt Pool',
 'The back of the cave, and the sea never entirely leaves it: a pool lies across the whole floor, black and perfectly still, and it does not drain because there is nowhere lower for it to go. It is deeper than it looks — everything in water like this is. The far wall comes down into it and does not come up again, and whatever the sea has been putting in here it has been putting in for a very long time.',
 0, 0, 'crossing', 0, 0, 48, 9);

INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
('the-back-wall', 'down', 'the-kept-room', 'riddle-door'),
('the-kept-room', 'up', 'the-back-wall', NULL),
('the-birdless-acre', 'north', 'the-moon-glade', 'moon-door'),
('the-moon-glade', 'south', 'the-birdless-acre', NULL),
('the-deep-mark', 'south', 'the-sea-cave', 'tide-door'),
('the-sea-cave', 'north', 'the-deep-mark', NULL),
-- ...and the cave itself, going back into the hill. Nothing in here is keyed:
-- the tide door is the only lock, and the way out is open from every room of it
-- (the deep door's law — a window, never a wall). What holds you in is the
-- water, not the iron.
-- Eight rooms, and it is a LOOP with one dead end rather than a corridor: the
-- crawl and the gallery are two ways into the same dark, and they meet again at
-- the fallen roof. A cave you can go round is a cave; a cave you can only go
-- along is a hallway. The black pool is the one dead end, and it is where the
-- chest is, so the deepest thing in here is also the thing you cannot pass
-- through on your way to anything else.
('the-sea-cave', 'west', 'the-sand-crawl', NULL),
('the-sand-crawl', 'east', 'the-sea-cave', NULL),
('the-sand-crawl', 'west', 'the-drowned-chamber', NULL),
('the-drowned-chamber', 'east', 'the-sand-crawl', NULL),
('the-sand-crawl', 'north', 'the-weed-gallery', NULL),
('the-weed-gallery', 'south', 'the-sand-crawl', NULL),
('the-weed-gallery', 'west', 'the-shingle-bank', NULL),
('the-shingle-bank', 'east', 'the-weed-gallery', NULL),
('the-shingle-bank', 'west', 'the-blowhole', NULL),
('the-blowhole', 'east', 'the-shingle-bank', NULL),
('the-blowhole', 'south', 'the-fallen-roof', NULL),
('the-fallen-roof', 'north', 'the-blowhole', NULL),
('the-drowned-chamber', 'west', 'the-fallen-roof', NULL),
('the-fallen-roof', 'east', 'the-drowned-chamber', NULL),
('the-fallen-roof', 'west', 'the-salt-pool', NULL),
('the-salt-pool', 'east', 'the-fallen-roof', NULL);

INSERT OR REPLACE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
('box-kept', 'the-kept-room', 'a sealed strongbox',
 'An iron box with a wax seal gone brittle and a hasp that has never once been forced. It has been waiting for someone to be clever enough to reach it.',
 '', 86400),
('box-glade', 'the-moon-glade', 'a silvered casket',
 'A small casket gone silver with age, set in the middle of the glade like a thing left on purpose. The moon has been keeping it for whoever the door lets in.',
 '', 86400),
-- The chest sits at the BACK of the cave, not in its mouth: the door buys you
-- the cave, and the cave still has to be walked — in the dark, with the water
-- coming back on its own clock.
('box-cave', 'the-salt-pool', 'a salt-crusted chest',
 'A chest crusted white with salt, wedged at the back of the cave where the highest water never quite reaches. The tide has been guarding it on its own schedule, which is nobody''s schedule.',
 '', 86400);
