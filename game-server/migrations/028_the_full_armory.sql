-- Two fixes in one. First: no trophy should be dead weight. The rat-tail (and
-- the bone-charm, the warden's lantern, even the King's own signet) had no
-- value to the keeper, so they piled up as junk. Now he'll take them all — the
-- tail for a pittance, the signet for a small fortune. Second: fill the holes
-- in the gear ladder — the missing boots, the uncommon cloak, the epic shield,
-- and a few weapons — so every slot climbs cleanly from rags to the best.
--
-- Pure data: dmg/armor/stun/block/weight and barter are all read generically.

-- ---- no more dead trophies: the keeper deals in all of them ----
-- Rat-tails flood in by the stack, so they're the lowest coin there is: a tenth
-- of a point each, ten to buy the cheapest thing on the counter. (SQLite keeps
-- the fraction as REAL even in this NUMERIC column; the trade math rounds to a
-- clean tenth so the counter never sticks a hair short.)
UPDATE item_templates SET barter = 0.1 WHERE id = 'rat-tail';
UPDATE item_templates SET barter = 2  WHERE id = 'bone-charm';
UPDATE item_templates SET barter = 4  WHERE id = 'warden-lantern';
UPDATE item_templates SET barter = 40 WHERE id = 'door-signet'; -- the King's mark; a fortune, or a thing to keep

-- ============================ NEW GEAR ============================
-- cols: (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed)
INSERT OR REPLACE INTO item_templates
(id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed) VALUES

-- weapons: a common sweep (the crowd-clearer's first tool) and an uncommon
-- blunt (the missing rung between the cudgel and the warden's maul).
('rusty-billhook', 'a rusty billhook',  'A long farm blade for cutting hedge, hooked and pitted. It was never meant for men, which is exactly why it clears a doorway of them.',              'common',   2, 'weapon', 0, 1, 2, 0, 0.00, 0, 0),
('studded-maul',   'a studded maul',    'A fence-post of a weapon, its head driven full of old nails. Graceless and slow, but what it catches, it rattles.',                                'uncommon', 3, 'weapon', 0, 1, 1, 1, 0.20, 0, 0),

-- cloak: the uncommon step — heavier weave, more cover, but it drags a little.
('hide-cloak',     'a hide cloak',      'A cloak of layered hide, greased against the wet. It turns more than rags do, at the price of hanging heavy off your shoulders.',                  'uncommon', 0, 'cloak',  2, 1, 1, 1, 0.00, 0, 0),

-- feet: the missing rare and the light epic (armor without the mobility cost).
('plated-greaves', 'a pair of plated greaves', 'Shin-and-foot plates of scavenged iron, strapped over what boots you had. They turn a low blow and land like hammers — and you feel every step.', 'rare', 0, 'feet', 2, 1, 1, 1, 0.00, 0, 0),
('warden-sabatons','a pair of warden''s sabatons','Articulated foot-armor of the old wardens, so well-jointed they weigh almost nothing. Plate that forgot it was heavy.',                        'epic',     0, 'feet',   2, 1, 1, 0, 0.00, 0, 0),

-- shield: the epic wall — the most a shield ever turns, and the heaviest.
('gravestone-shield','a gravestone shield','A slab of a shield cut from an actual headstone, the name worn to nothing. Nothing gets past it, and nothing about carrying it is quick.',        'epic',     0, 'shield', 0, 1, 1, 2, 0.00, 0.45, 0),

-- body: the epic LIGHT harness — plate-grade soak with a duelist''s footwork.
('chitin-harness', 'a chitin harness',  'A harness plated in the shed carapace of something vast and pale from the deep. Hard as iron, light as horn, and faintly, always, damp.',            'epic',     0, 'armor',  4, 1, 1, 0, 0.00, 0, 0);

-- ---- the keeper stocks the common/uncommon/rare tiers (never epics) ----
INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
('rusty-billhook', 4),
('studded-maul',   9),
('hide-cloak',     7),
('plated-greaves', 22);

-- ---- the bench can forge them too (rare wants a trophy besides the scrap) ----
INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
('rusty-billhook', 3, NULL, 0),
('studded-maul',   6, NULL, 0),
('hide-cloak',     5, NULL, 0),
('plated-greaves', 10, 'finger-bone', 3);

-- ---- the epics are FOUND ONLY, in the deep caches and the King''s reliquary ----
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-bone',  'plated-greaves',   0.40),
('box-crack', 'plated-greaves',   0.40),
('box-deep',  'plated-greaves',   0.35),
('box-deep',  'chitin-harness',   0.30),
('reliquary', 'warden-sabatons',  0.40),
('reliquary', 'gravestone-shield',0.40),
('reliquary', 'chitin-harness',   0.35);
