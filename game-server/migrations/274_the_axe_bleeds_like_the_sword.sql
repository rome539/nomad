-- THE AXE BLEEDS LIKE THE SWORD (2026-08-25).
--
-- The edge-weapon audit found two things wrong:
--
--   1. NOT EVERY SHARP THING WAS AN EDGE. The axe family was split down the
--      middle: headtaker-axe bled, but the woodward's axe, the poleaxe, the
--      halberd and both hatchets carried no bleed at all. A halberd has a
--      blade; a hatchet chops. They answer to the edge now.
--
--   2. THE HIGH EDGES BLED THE MINIMUM. Ten weapons at dmg 4-6 carried bleed 1,
--      and the per-hit odds (0.3 x dmg / bleed, capped at 1) sat them at 100%:
--      a certainty, not a chance, and a papercut on a greatblade. A blade that
--      hits for 5 should not wound for 1.
--
-- The rule going forward: bleed scales with the blade, and no edge with real
-- weight behind it bleeds the minimum.
--   dmg 2-3  ->  bleed 1   (a cheap edge)
--   dmg 4-5  ->  bleed 2   (a real edge)
--   dmg 6    ->  bleed 3   (the pinnacle edges)
-- With no dmg >= 4 edge left at bleed 1, no edge rolls a certain wound: the
-- worst odds are the dmg-3 blades at 0.9, and the formula's cap at 1 is never
-- reached.

UPDATE item_templates SET bleed = 3 WHERE id IN ('hookbill-cleaver', 'poleaxe', 'abyssal-harpoon', 'headsman-sword');
UPDATE item_templates SET bleed = 2 WHERE id IN ('houndsbane', 'greatblade', 'war-pike', 'the-attainder', 'woodwards-axe', 'forged-warspike', 'halberd', 'reaping-blade', 'reaver-glaive', 'sappers-pick');
UPDATE item_templates SET bleed = 1 WHERE id IN ('burners-hatchet', 'kindling-hatchet');
