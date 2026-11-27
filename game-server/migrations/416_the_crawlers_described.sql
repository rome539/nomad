-- 416 the crawler's description (2026-11-27). The pale crawler is drawn pale and
-- low on four legs, and its description called it boneless, which is a slug, not
-- the animal in the picture. The words now say what the picture shows; the rest of
-- the line is as it was. Its book (MOB_LORE) changes with it, in the code.

UPDATE mob_templates SET description = 'Blind, pale, and low on four legs, the colour of things kept from the light. You will not see it in the dark of the deep — only feel it, once, before it is on you.'
WHERE id = 'pale-crawler';
