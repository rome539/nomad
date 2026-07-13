-- 080: the waystation moves out along the road (rome, 2026-07-13: "fix the
-- gate problem"). It sat TWO doors from the Broken Gate — both touched the
-- causeway — so of 110 rooms exactly one was closer to it than to another
-- gate, and one camper on the causeway watched two banks at once. The other
-- gates sit 5-6 apart; this one was a porch, not a pole.
--
-- It re-hangs EAST of the Hanging Hill — the far southeast of the ring, the
-- one stretch no gate touched (briar-field/black-fen country). The fiction
-- improves with it: gallows at the town approach is where a road's waystation
-- belongs — the toll-house and the gibbet, the road's two institutions, in
-- sight of each other. Gate-to-gate spread becomes 4/6/7 where it was 2/5/6,
-- and a fresh wanderer waking here starts somewhere genuinely new.

DELETE FROM exits WHERE (room_id='the-causeway' AND to_room='the-old-road')
                     OR (room_id='the-old-road' AND to_room='the-causeway');

INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
('the-hanging-hill', 'east', 'the-old-road',     NULL),
('the-old-road',     'west', 'the-hanging-hill', NULL);

-- Same toll-house, new stretch of road: the road away now runs east, and the
-- gibbet on the hill stands behind it.
UPDATE rooms SET description =
 'The road away runs east into a wall of thorn grown higher than a man, and whatever is beyond it does not answer. Here at the last milestone someone keeps a toll-house: cold iron, patient scales, a lamp that stays lit — the dungeon''s writ runs even under open sky. Names are scratched into the milestone by people who meant to come back. On the hill behind, the gibbet keeps its own count.'
WHERE id='the-old-road';
