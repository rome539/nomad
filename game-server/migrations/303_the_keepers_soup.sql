-- 303: THE KEEPER'S SOUP (rome, 2026-10-17).
--
-- The keeper keeps a pot on at the back of the gatehouse and sells it by the
-- bowl. It is bought and eaten at the hatch - the code takes it at delivery
-- (gate.ts, SOUP_ITEM), so it never goes into the pack - and for a while after,
-- the cold cannot steal your rest. Always on the shelf (a staple).
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('keepers-soup', 'a bowl of the keeper''s soup',
 'Whatever went in the pot at the back of the gatehouse today, hot enough to hurt. Drunk at the hatch, it puts a warmth in you that the cold takes a long while to find its way past.',
 'common');

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
('keepers-soup', 2);
