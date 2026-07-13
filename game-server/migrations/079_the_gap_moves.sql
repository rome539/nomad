-- 079: the two upper hideaways sat four doors apart on ONE corridor (rome,
-- 2026-07-13: "theyre directly east and west from each other") — hollow-crack
-- west off the kennels, bone-nook east off the ossuary, the catacomb between.
-- One hallway does not need two sanctuaries. A Gap in the Bones moves to the
-- warrens: east off the Bone-Midden, one door from the hyena den — the same
-- room it always was (a hollow behind stacked bones; the midden IS stacked
-- bones), now serving the worst-served stretch of the map (the warrens' far
-- arm runs 7 doors from any safety). A Crack in the Wall stays on the kennels
-- and keeps the halls covered.

DELETE FROM exits WHERE (room_id='ossuary' AND to_room='bone-nook')
                     OR (room_id='bone-nook' AND to_room='ossuary');

INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
('the-bone-midden', 'east', 'bone-nook',       NULL),
('bone-nook',       'west', 'the-bone-midden', NULL);

-- Same hollow, new wall of dead: the prose re-anchors from the ossuary to the
-- midden. The femur latch stays.
UPDATE rooms SET description =
 'Where the midden''s bone-heap has slumped against the wall, a person-sized hollow opens into cool dark behind the stacked bones. You pull a femur across the gap like a latch. Whatever hunts out there will not crawl in here. Rest.'
WHERE id='bone-nook';
