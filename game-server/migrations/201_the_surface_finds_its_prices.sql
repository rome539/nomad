-- 201 the surface finds its prices (rome, 2026-08-11: the east road and the
-- Crossing pay like the deep and fight like the shallows).
--
-- THE MIGRATIONS 187-191 GAVE THE SURFACE THE DEEP'S PURSE. Every one of these
-- trophies barters above the fight that drops it -- a level-1 otter worth more
-- than the deep's hardest common, a level-3 seal worth a tin of cigarettes, a
-- non-boss pilot worth the white-hide's lottery tier. The ROADMAP's ruling is
-- the deepest law in the file: difficulty and reward climb TOGETHER, and the
-- walk home is what makes "push on or bank it" a decision. A surface that pays
-- like the deep pulls nobody inward; it just mints the fence.
--
-- THE LADDER THIS OBEYS (the numbers the rest of the world already lives by):
--
--   lvl1 trivial     hempen-cord 4, rat 0.1        -> 2-4
--                    (the cord is the L1 benchmark; mig 204 hands the crow
--                     itself the raven feather and leaves the cord on the
--                     gibbet-field floor, where a length of rope belongs)
--   lvl2 easy        cutpurse 2, masterless-dog 3  -> 3-6
--   lvl3-4 mid       wolf-pelt 7, boar-tusk 5,      -> 5-10
--                    the-drowned grave-pearl 10
--   lvl4-5 hard      hound-fang 8, wolf-skull 14   -> 8-14
--   rares/lottery    pale-pelt 12, white-hide 24   -> 12-24
--   the region boss  = the region's ceiling        -> 18 (ferryman's fare)
--
-- EVERYTHING BELOW IS A PURE TROPHY -- slot '', no stats, fence-fodder. Its
-- only job is to be worth what the fight is worth. Gear drops (the mason's
-- mallet, the oyster knife) and the scaffold-hand's iron are LEFT ALONE: they
-- carry their own stats and follow the weapon/material ladders, not this one.
--
-- ONE MORE THING. The toll-token also sits in the east road's own caches
-- (box-toll, box-ruin, box-relay) and the boundary-cairn floor. Lowering the
-- token lowers every one of those in the same breath -- which is right: the
-- caches were paying the same inflated rate the clerk was.

-- ---- THE EAST ROAD: lvl1s to the lvl1 rate, the clerk to the mid rate ----
UPDATE item_templates SET barter = 4  WHERE id = 'otter-pelt';       -- 9  -> 4   otter, lvl1 18hp (gibbet-crow is 4)
UPDATE item_templates SET barter = 4  WHERE id = 'heron-plume';      -- 7  -> 4   grey-heron, lvl1 16hp
UPDATE item_templates SET barter = 5  WHERE id = 'adder-skin';       -- 8  -> 5   gill-adder, lvl2 14hp (boar-tusk is 5)
UPDATE item_templates SET barter = 5  WHERE id = 'raven-feather';    -- 8  -> 5   scarp-raven, lvl2 20hp
UPDATE item_templates SET barter = 8  WHERE id = 'toll-token';       -- 16 -> 8   the-toll-clerk, lvl3 34hp (the region's institution, not a lottery)

-- ---- THE CROSSING: the weak pay weak, the mid pay mid ----
UPDATE item_templates SET barter = 5  WHERE id = 'bitterns-feather'; -- 9  -> 5   bittern, lvl2 22hp
UPDATE item_templates SET barter = 6  WHERE id = 'viper-fang';       -- 11 -> 6   fen-viper, lvl3 18hp (the squishiest thing on the shore)
UPDATE item_templates SET barter = 10 WHERE id = 'seal-pelt';        -- 20 -> 10  grey-seal, lvl3 40hp (a colony mob, not a cigarette tin)
UPDATE item_templates SET barter = 9  WHERE id = 'tide-tally';       -- 12 -> 9   the-tide-warden, lvl4 46hp (hound-fang's tier)
UPDATE item_templates SET barter = 9  WHERE id = 'conger-jaw';       -- 11 -> 9   conger, lvl4 46hp
UPDATE item_templates SET barter = 10 WHERE id = 'salt-block';       -- 14 -> 10  the-salt-widow, lvl5 52hp
UPDATE item_templates SET barter = 12 WHERE id = 'drowned-bell';     -- 17 -> 12  the-refuge-man, lvl5 58hp
UPDATE item_templates SET barter = 14 WHERE id = 'pilots-mark';      -- 22 -> 14  the-pilot, lvl5 56hp (a rare blood -- pays above the regular line, under the boss)

-- ---- THE CEILING HOLDS ----
-- ferrymans-fare stays 18. The drowned ferryman is the boss of the hardest of
-- the five ways and the region's single most expensive kill. Every one of the
-- trophies above now sits under it, which is what a ceiling is for.
