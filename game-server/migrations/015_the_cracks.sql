-- Two hideaways: cracks too tight for anything that hunts the ring to follow.
-- A place to catch your breath — fold in, and the dungeon can't reach you until
-- you step back out. Marked is_safe; the engine bars every creature (even the
-- King) from entering. They hang off the ring at opposite quarters (behind the
-- gallery in the NW, behind the ossuary wall in the SE), each a single squeeze
-- back the way you came.

ALTER TABLE rooms ADD COLUMN is_safe INTEGER NOT NULL DEFAULT 0;

INSERT OR REPLACE INTO rooms (id, zone, name, description, is_entry, is_safe) VALUES
('hollow-crack', 'door', 'A Crack in the Wall',
 'A fissure behind a fallen slab, wide enough to slip into sideways and no wider. The stone is dry and close and dead quiet — nothing that walks the ring can fold itself small enough to come in after you. For a moment there is only your own heartbeat. Breathe.', 0, 1),
('bone-nook', 'door', 'A Gap in the Bones',
 'Where the ossuary''s wall of dead has slumped, a person-sized hollow opens into cool dark behind the stacked bones. You pull a femur across the gap like a latch. Whatever hunts out there will not crawl in here. Rest.', 0, 1);

INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
('gallery',      'west', 'hollow-crack', NULL),
('hollow-crack', 'east', 'gallery',      NULL),
('ossuary',      'east', 'bone-nook',    NULL),
('bone-nook',    'west', 'ossuary',      NULL);
