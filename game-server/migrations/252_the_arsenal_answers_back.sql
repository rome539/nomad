-- THE ARSENAL ANSWERS BACK (2026-08-20): burning, tripping, wicked,
-- watertight, pocketed, glinting, spiked — the approved combat-and-gear set.
--
-- The trait MACHINERY ships in code (zone.ts/pvp.ts/ai.ts/light.ts/events.ts);
-- this migration is the content that wears it: the longbrand becomes a weapon,
-- five new pieces enter the world, and five standing pieces learn a new trick.

-- ============================ ITEM CHANGES ============================

-- The longbrand is a WEAPON now: wield it, 'light brand', and the flame lives
-- in the weapon hand (open flame, fire-fear forced to flee — ai.dreadsFire) for
-- BRAND_BURN_MS, then it burns down to the fist and is gone (tickLights).
UPDATE item_templates
   SET slot = 'weapon', dmg = 3, speed = 1, weight = 1, traits = 'burning'
 WHERE id = 'longbrand';

-- watertight: the oilskin keeps the flood out of the pack.
UPDATE item_templates SET traits = 'slick,watertight' WHERE id = 'oilskin-cape';

-- tripping: the chain takes the legs.
UPDATE item_templates SET traits = 'reach,tripping' WHERE id = 'bearwards-chain';

-- wicked: a crit opens the wound wide, no roll between the luck and the blood.
UPDATE item_templates SET traits = 'wicked' WHERE id = 'graveblade';
UPDATE item_templates SET traits = 'wicked' WHERE id = 'headsman-sword';
UPDATE item_templates SET traits = 'two-handed,keen,wicked' WHERE id = 'the-hedge-bill';

-- ============================ NEW ITEMS ============================

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
('kindling-hatchet', 'a kindling hatchet',
 'A short-hafted hatchet meant for splitting kindling and lopping brush. The head is light enough to double-tap, and the edge is kept for the woodpile, not the armoury — though it has met meat before and will again. Fast in the hand, lighter than any sword.', 'uncommon', 0, 0, 0, 2, 'weapon', 0, 2, 1, 1, 0.0, 0.0, 0, 8, 0, ''),
('knotted-lash', 'a knotted lash',
 'A length of braided cord, knotted along its working end and weighted with a stray bolt. It will not kill a man outright, but it reaches him at length and it takes his legs out from under him — and what it cannot kill, it can hold still long enough for the rest of you to.', 'uncommon', 0, 0, 0, 1, 'weapon', 0, 1, 1, 0, 0.0, 0.0, 0, 10, 0, 'reach,tripping'),
('pedlars-coat', 'a pedlar''s coat',
 'A travelling coat cut for a man who lives out of his own pockets: deep ones outside, deeper ones in the lining, and every seam double-stitched by somebody who expected to be robbed and preferred to make the thief work. It carries two more of the world than your shoulders alone would.', 'uncommon', 0, 0, 0, 0, 'cloak', 1, 1, 1, 1, 0.0, 0.0, 0, 14, 0, 'pocketed'),
('mirror-bright-helm', 'a mirror-bright helm',
 'A kettle helm polished until it throws the light back like water. The smith who finished it spent more time on the shine than on the steel, and it shows: whatever waits in the dark sees itself coming a stride before it sees you, and there is no dropping out of nothing onto a man wearing a looking-glass.', 'uncommon', 0, 0, 0, 0, 'helm', 1, 1, 1, 1, 0.0, 0.0, 0, 12, 0, 'glinting'),
('nail-studded-jack', 'a nail-studded jack',
 'A padded jack driven through with roofing nails, points out, in rows a finger apart. It is not the heaviest armour in the world and it does not pretend to be — but whatever leans into it pays for the privilege, and a wrestler''s instinct dies at the first embrace.', 'uncommon', 0, 0, 0, 0, 'armor', 2, 1, 1, 2, 0.0, 0.0, 0, 16, 0, 'spiked:1');

-- ============================ THE BENCH & THE HATCH ============================

-- The keeper's vice can make them, and his shelf carries them.
INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('kindling-hatchet', 2, NULL, 0),
  ('knotted-lash',      1, NULL, 0),
  ('pedlars-coat',      2, NULL, 0),
  ('mirror-bright-helm', 2, NULL, 0),
  ('nail-studded-jack', 3, NULL, 0);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('kindling-hatchet', 10),
  ('knotted-lash',      9),
  ('pedlars-coat',     14),
  ('mirror-bright-helm', 12),
  ('nail-studded-jack', 16);

-- One lies where the wood is cut: the charcoal hut keeps a hatchet by the pile.
-- regrows = 1, so it rides the FLOOR-RENEWAL LAW like every other piece of
-- floor gear: a bare spot re-checks itself every 30-60 minutes and hangs one
-- back on a one-in-five roll — a mean of about three and three quarter hours,
-- and no clock to stand and farm. Named explicitly because the column defaults
-- to 0, which would have made this a single hatchet for the life of the world.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('kindling-hatchet', 'the-charcoal-hut', 1);
