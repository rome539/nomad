-- 220 the body catches up (rome, 2026-08-14: we need more gear, not just
-- legends — and keep in mind the world is still expanding, the mountain region
-- is still coming).
--
-- THE THINNESS WAS NEVER THE GOLD TIER. Counted by slot and tier, gear reads:
--
--     slot        white   green    blue  purple    gold   TOTAL
--     weapon          8      18      12      11       4      53
--     armor           2       5       7       6       3      23
--     helm            2       7       4       2       3      18
--     cloak           2       4       4       4       2      16
--     feet            2       6       4       3       2      17
--     shield          2       7       3       4       1      17
--
-- Fifty-three weapons against sixteen to twenty-three pieces per body slot. A
-- player holds ONE weapon and wears FIVE things, and the game offers three times
-- the choice in the hand as on any single part of the body. Above green there is
-- effectively one obvious piece per slot: two epic helms exist in the entire
-- world, three epic boots, three rare shields. Once a geared player has those,
-- the tier is finished and there is nothing left to want.
--
-- TEN PIECES, AND DELIBERATELY NOT SIXTEEN. The first draft filled every thin
-- cell. rome's note killed that: the MOUNTAIN REGION is still to come and a band
-- that arrives into a saturated grid has nowhere to put its own kit — it would
-- either duplicate what exists or force the ladder upward to make room. So this
-- fills the tiers a player LIVES in day to day (green and blue), takes exactly
-- one purple, and leaves the purple ceiling in feet, shield, cloak and armour
-- untouched for the high ground to claim. No new weapons at all: fifty-three is
-- already too many relative to everything else, and adding more would widen the
-- gap this migration exists to close.
--
--     road      drover's frock, harness leathers, tail-board targe
--     crossing  cork-lined jack, reed-thatch cape, oilskin cape, limpet cap
--     wood      coppice hurdle, antler-braced cap
--     out       sapper's treads
--
-- Body slots go 91 -> 101. Stats sit on each slot's existing ladder exactly —
-- nothing here raises a ceiling, which is the other half of leaving the mountain
-- room to be the best ground in the game if it wants to be.
INSERT OR IGNORE INTO item_templates
  (id, name, description, rarity, dmg, stun, bleed, weight, speed, sweep, armor, block, slot, barter, traits) VALUES

  -- THE ROAD: carts, harness, tolls and stock driven between folds.
  ('drovers-frock', 'a drover''s frock',
   'A long smock of heavy linen, waxed so many times it has gone stiff enough to stand up on its own, and cut full so it goes over everything else you own. The hem is black to the knee from road-water and the shoulders have faded to almost nothing. A man who slept beside his stock every night of his working life owned this, and it is the only garment out here that was made for weather rather than for war.',
   'uncommon', 0, 0, 0, 1, 1, 1, 2, 0, 'armor', 6, 'staunched'),
  ('harness-leathers', 'a set of harness leathers',
   'Draught harness, cut down and rebuckled to go over a man instead of round a horse: a broad breast-strap, two shoulder pieces, and the pad that sat against the collar. Somebody did the work carefully and somebody else has been wearing it ever since. It still smells of horse, faintly, under everything that has happened to it since there were horses.',
   'uncommon', 0, 0, 0, 1, 1, 1, 2, 0, 'cloak', 6, 'strapped'),
  ('tail-board-targe', 'a tail-board targe',
   'The tail-board off a carrier''s cart — oak, iron-cornered at all four corners, with the owner''s mark burned into the middle of it and a rope-hole drilled through each end. Two of those holes have a strap through them now. It is exactly as heavy as a piece of a cart, and it stops exactly as much as a piece of a cart stops, which turns out to be a great deal.',
   'rare', 0, 0, 0, 2, 1, 1, 0, 0.25, 'shield', 9, 'wall'),

  -- THE CROSSING: nets, tar, reed, shell, and the sea getting into everything.
  ('cork-lined-jack', 'a cork-lined jack',
   'A fisherman''s jack with the lining opened and packed through with net-floats — flat discs of cork, overlapped like scales, quilted in place with tarred twine. It was done so a man who went over the side came back up. It turns out that a wall of cork does something else as well, which is that a blow lands on it and stops meaning very much.',
   'uncommon', 0, 0, 0, 1, 1, 1, 2, 0, 'armor', 6, 'padded'),
  ('reed-thatch-cape', 'a reed-thatch cape',
   'A shoulder cape of reed, bundled and stitched in overlapping courses exactly the way a roof is, with a hood deep enough to lose your face in. The rain runs off it and away and never once gets to you. Every fowler on this water had one and every one of them looked, from any distance at all, like a small piece of the reed bed that had decided to move.',
   'uncommon', 0, 0, 0, 1, 1, 1, 2, 0, 'cloak', 6, 'hooded'),
  ('oilskin-cape', 'an oilskin cape',
   'Canvas soaked through with linseed and hung to cure until it went the colour of strong tea and stopped being cloth at all. It is stiff, it cracks when you move, and nothing whatsoever gets through it. Cold hands close on it and find no purchase — the oil is still in there after all this time, and it always will be.',
   'rare', 0, 0, 0, 1, 1, 1, 2, 0, 'cloak', 9, 'slick'),
  ('limpet-scaled-cap', 'a limpet-scaled cap',
   'A leather cap with limpet shells laid over it in courses and sewn through the crown of each one, points overlapping downward like scales. Somebody sat on this shore and did that, shell by shell, for what must have been weeks. An edge that comes down on it skates off sideways and takes three shells with it, and there are a very great many shells.',
   'rare', 0, 0, 0, 1, 1, 1, 2, 0, 'helm', 9, 'mailward'),

  -- THE WOOD: coppice, thorn, and what the deer leave behind.
  ('coppice-hurdle', 'a coppice hurdle',
   'A woven hurdle off a sheep-fold, cut down to the size of a man and rebound at the edges — hazel rods, split and worked green, laid over and under until the whole thing has a give to it that solid wood never has. Blackthorn has been woven through the face of it, in, and the thorns are two inches long and still on.',
   'rare', 0, 0, 0, 2, 1, 1, 0, 0.2, 'shield', 9, 'wall,thorns:1'),
  ('antler-braced-cap', 'an antler-braced cap',
   'A cap of boiled hide with a frame of red-deer antler set over it — the beam split lengthwise and pinned into a cage across the crown, tine-stumps left standing where they fell. Bone that grew to be fought with, doing the same job for somebody else. It is lighter than steel of the same strength and it does not go cold in your hands the way steel does, and both of those things matter over a long night.',
   'epic', 0, 0, 0, 2, 1, 1, 3, 0, 'helm', 19, 'padded'),

  -- THE RING, where the siege sat and men worked underground.
  ('sappers-treads', 'a pair of sapper''s treads',
   'Low boots with the nails left out on purpose and the soles built up instead in layers of felt and hide. A gallery is four feet high and full of listening: the whole art of undermining a wall is doing it without the men above hearing you start, so the sappers went shod like this, and the ones who did it right got to come back up.',
   'rare', 0, 0, 0, 1, 1, 1, 2, 0, 'feet', 9, 'quiet');

-- ---- where they are -------------------------------------------------------
-- All ten into CHESTS rather than onto mobs. 218 and 219 both had to displace
-- an existing drop to hang something new on a body, and each of those needed a
-- check that the displaced piece survived elsewhere; chests simply take another
-- row. It also spreads them: every band above the gate gets new kit, which was
-- half the point.
INSERT OR IGNORE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-mill',        'drovers-frock',     0.20),
  ('carts-strongbox', 'harness-leathers',  0.20),
  ('box-shelter',     'tail-board-targe',  0.15),
  ('box-noust',       'cork-lined-jack',   0.20),
  ('box-farnoust',    'reed-thatch-cape',  0.20),
  ('box-pans',        'oilskin-cape',      0.15),
  ('box-tollshell',   'limpet-scaled-cap', 0.15),
  ('box-burner',      'coppice-hurdle',    0.15),
  ('box-icehouse',    'antler-braced-cap', 0.08),
  ('box-sutlers',     'sappers-treads',    0.15);

-- ---- and a slot that does not exist ----------------------------------------
-- The bearward's chain shipped in 215 with slot 'hand'. There is no such slot:
-- the engine knows weapon, shield, helm, armor, cloak and feet, and nothing
-- else. cmdEquip only refuses an EMPTY slot, so the chain would have equipped
-- perfectly happily into a phantom — not the weapon hand (so no damage), not in
-- ARMOR_SLOTS (so no armour), and not in SLOT_RANK (so it sorts last in the
-- bench) — while its weight 4 still counted against the load law in full. A
-- four-point burden that did nothing at all. Nobody has picked one up yet.
UPDATE item_templates SET slot = 'weapon' WHERE id = 'bearwards-chain';
