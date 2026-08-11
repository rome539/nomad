-- 199 the fire on the shore (rome, 2026-08-11: the new fish drops should be
-- cookable).
--
-- Six raw catches were in the world and the only thing you could do with any of
-- them was swallow it cold. The one station that touches raw food is the
-- smokehouse, which lies deep under the fortress -- a world away from the beck
-- and a mile of water away from the Crossing, which is where five of the six
-- come from. A shore full of fish, salt pans, fisher huts, a hearth in every
-- bothy, and no way to put a fish on a fire.
--
-- THE FIRE IS THE RACKS' OPPOSITE. Deliberately, on every axis:
--
--                  the racks (cure)          the fire (cook)
--   where          one deep room, or a gate  anywhere a flame burns
--   how long       3 min / 10 min, waiting   at once
--   what you get   KEEPING, modest heal      HEAL, and it still spoils
--   the risk       it hangs where it can     an open fire in a dark world,
--                  be lifted                 and everything there sees it
--
-- So the smokehouse law shipped in 119 stands untouched and now has a matching
-- half: what you buy at the racks is KEEPING, not power. What you buy at a fire
-- is power, not keeping. Neither table reaches the other's answer -- nothing
-- cooked is in FOOD_KEEPS, and nothing cured will go on a fire (it has already
-- been through one; that is what curing IS, and the verb says so).
--
-- FLAT +5, NOT A MULTIPLIER, and this is the whole balance of it. A fire helps
-- a poor catch most:
--
--     a crab's claw       2 -> 7     the whole reason for this migration
--     a gull's egg        6 -> 11
--     a blind cave-fish  11 -> 16
--     a brown trout      14 -> 19
--     a pale eel         16 -> 21
--     a marrow-lamprey   20 -> 25
--
-- Multiply instead and the delicacy runs away from everything else while the
-- shore-crab stays a joke. The bottom of the ladder is what needed the fire.
-- Nothing raw is touched: not one existing stat moves, not one drop table.
--
-- WHAT IT COSTS. Three things, and none of them is a cooldown:
--   1. BARTER. Every cooked form is worth 0 at the hatch where the raw catch
--      was worth 1-4. A crab's claw is a curiosity a keeper will buy; a crab's
--      claw you have eaten out of the shell is dinner. Sell it or eat it.
--   2. KEEPING. Cooked food ages on the ordinary clock and spoils like any
--      fresh thing. It is a meal for tonight, and the racks are for the week.
--   3. THE FLAME. Out in the world cooking wants a torch burning ON THE STONE
--      -- the same groundTorch every player already knows, which lights the
--      room for EVERYONE in it, breaks fire-fearing things off, and stops a
--      lurker springing. That cuts both ways: a fire in a dark region is the
--      most visible thing a wanderer can do, and the cooking carries. Behind a
--      gate the brazier does it free, which is the safe, dull version, and the
--      one that is worth nothing out there because the meal will not keep.
--
-- AND THE FIRE SAVES A FISH ON THE TURN. Cooking mints a fresh row, so a catch
-- carried too far comes off the flame with its clock reset -- a real use for
-- the verb beyond the heal. It will not launder ROT, though: a spoiled catch is
-- refused outright, because a fire that un-rots food means food never spoils.
--
-- LURE. Every cooked form carries MORE lure than its raw one (a roasted thing
-- reeks further than a cold one). Dropped on the floor it draws scavengers the
-- same as bait -- which is what a fire on a shore has always attracted.

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('roast-crab', 'a roasted crab claw',
   'Put in the embers whole and left until the shell went from grey to a hard orange and split down its own seam. The meat inside came out in one piece, white and stranded, and it is worth the twenty minutes and the burnt fingers. Everybody who ever lived on a shore worked this out on their own.',
   'common', 1, 7, 1, 0, '', 0, 1, 1, 0, 0, 0, 0, 0, 0, ''),

  ('roast-egg', 'a roasted gull''s egg',
   'Buried in the hot ash on its side and turned twice, so the shell is grey with it and hot enough to want a sleeve. The white has gone firm and faintly smoky. It is the simplest hot food there is and it is a great deal more than a raw egg is.',
   'common', 1, 11, 1, 0, '', 0, 1, 1, 0, 0, 0, 0, 0, 0, ''),

  ('grilled-cave-fish', 'a charred cave-fish',
   'Something that has never seen light, laid on a stone at the edge of a flame until the skin went black and lifted. It has no eyes and it is still the best thing to come out of that water, and the fire has made it food rather than a fact about the dark.',
   'common', 1, 16, 2, 0, '', 0, 1, 1, 0, 0, 0, 0, 0, 0, ''),

  ('grilled-trout', 'a grilled trout',
   'Split down the belly, opened flat, and laid skin-down on the hot stone until the flesh went from glass to white and came away from the bone in two clean sides. The spots are gone. The smell of it went further up the beck than you would have chosen.',
   'common', 1, 19, 2, 0, '', 0, 1, 1, 1, 0, 0, 0, 0, 0, ''),

  ('grilled-eel', 'a length of grilled eel',
   'Cut into lengths and turned over the flame until the fat rendered and went into the fire and came back as smoke. The skin has crisped and cracked. An eel is half fat and it is the fat that makes this worth doing, and worth smelling from the next room.',
   'uncommon', 1, 21, 2, 0, '', 0, 1, 1, 0, 0, 0, 0, 0, 0, ''),

  ('roast-lamprey', 'a roasted lamprey',
   'It kept its shape on the fire, which is the unsettling part, and the ring of teeth has gone white and clean. Kings died of eating too many of these. You are not going to have that problem, and there is not a better mouthful anywhere under this sky.',
   'rare', 1, 25, 3, 0, '', 0, 1, 1, 0, 0, 0, 0, 0, 0, '');
