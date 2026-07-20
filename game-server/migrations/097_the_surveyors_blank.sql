-- 097 THE SURVEYOR'S BLANK (rome, 2026-07-19): a surveyor's map is no longer
-- born knowing every hall — it is a fine blank instrument, and it charts what
-- its CARRIER walks. The ink lives with the COPY (keyed by the same instanced
-- identity the hunter's journal rides), so a dead surveyor's map is loot worth
-- killing for, and a grown world stays unknown until someone walks it.
CREATE TABLE IF NOT EXISTS map_ink (
  map_id  TEXT NOT NULL,
  room_id TEXT NOT NULL,
  PRIMARY KEY (map_id, room_id)
);

-- The paper stops claiming a dead man's omniscience: it is an instrument now.
UPDATE item_templates SET description = 'A surveyor''s blank: fine paper, a steady grid, and ink that takes the shape of wherever its carrier walks. Every hall you cross while it rides your pack is set down true, and stays. A well-walked copy is worth more than most of what you''ll kill for it — and it drops like anything else.'
WHERE id = 'surveyor-map';
