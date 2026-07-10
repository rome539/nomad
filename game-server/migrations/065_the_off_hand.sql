-- The off hand learns three new answers (rome picked all three, 2026-07-10).
-- The shield hand was a two-way call: block, or a torch. Now it's a kit axis:
--   hooded-lantern   the explorer's light — burns 3x a torch and isn't spent on
--                    lighting (five burns per lantern, wear-metered), but the
--                    shuttered flame is TAME: it never wakes the fire-fear.
--                    Torch stays the aggressive light. Slotless like the torch;
--                    isGear special-cases it so wear shows per-lantern.
--   man-catcher      flee denial — a beast the barbs are on cannot run (the
--                    18%-hp bolt, the cutpurse's dash, fire-panic: all held).
--                    Zero block: the guard traded for the guarantee.
--                    PvP rule (stamped in zone-data): vs players it HOBBLES,
--                    never holds — flee is the victim's only out.
--   parrying-dagger  block 10% and a caught blow answers — opens a bleed on the
--                    attacker (THORNS's cousin: drip instead of burst).
-- Prices against the live fence: dagger 6 sits beside the spiked-buckler 6
-- (higher block + burst vs lower block + armor-ignoring drip); man-catcher 9 is
-- the specialist's tool; lantern 14 is the expedition investment (torches stay
-- scavenge-only — the lantern is the one light coin can buy).

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('hooded-lantern', 'a hooded lantern',
   'A dented tin lantern with a horn pane and a sliding shutter. The flame inside sits low and patient — it frightens nothing, and it outlasts any torch you could carry.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 1, 0, 0, 0, 0, 0),
  ('man-catcher', 'a man-catcher',
   'A pole of black ash ending in a sprung collar of barbs. The wardens used them to bring debtors back breathing. What it closes on does not run.',
   'uncommon', 0, 0, 0, 0, 'shield', 0, 1, 1, 1, 0, 0, 0, 0, 0),
  ('parrying-dagger', 'a parrying dagger',
   'A narrow left-hand blade with a swept guard, made to turn another edge aside and answer down the length of it.',
   'uncommon', 0, 0, 0, 0, 'shield', 0, 1, 1, 0, 0, 0.1, 0, 0, 0);

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('parrying-dagger', 6),
  ('man-catcher', 9),
  ('hooded-lantern', 14);
