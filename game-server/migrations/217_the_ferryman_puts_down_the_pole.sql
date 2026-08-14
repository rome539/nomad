-- 217 the ferryman puts down the pole (rome, 2026-08-13: give the ferryman some
-- good gear to drop).
--
-- HE WAS UNDERPAID FOR WHAT HE COSTS. Measured against the other five bosses he
-- is the smallest body in the game and the most dangerous thing in it: 84hp,
-- the least of any boss, against 8-14 damage and armour 4, both the highest
-- numbers on the whole roster. He is also a DROWNER, so a fifth of his blows
-- take hold, he hits a quarter harder while he has you, and every beat he holds
-- you there is a chance he simply drowns you for a share of your maximum that no
-- armour touches. And for all that he dropped an armour-1 rare cloak, while the
-- two bosses on his own 50/25 drop shape — the drowned god and the marrow king —
-- both leave an EPIC.
--
-- WHAT HE LEAVES NOW: a quant. The pole a ferryman pushes with, and in his case
-- the only thing besides the rope he ever had in his hands. It is the first
-- LEGENDARY BLUNT WEAPON in the game, and that gap was real — all three
-- legendary weapons are stun 0 (the Attainder pierces, Houndsbane is a spear,
-- the hedge bill is an edge), so the entire blunt line topped out at an epic
-- mace while the other three classes each had a legendary to climb toward.
--
--     the-attainder    dmg5  stun0     pierce:3, piercing
--     houndsbane       dmg5  stun0     reach, two-handed, piercing
--     the-hedge-bill   dmg5  stun0     two-handed, keen
--     flanged-mace     dmg5  stun.18   (epic — the old blunt ceiling)
--  -> the-long-crossing dmg5 stun.2    reach, two-handed, weighted
--
-- Weighted is the point of it: BLUNT_ARMOR_IGNORE is a flat 2 for every blunt
-- weapon, and weighted adds a third. A sixteen-foot pole swung by both hands is
-- the answer to a thing in plate, and it keeps you at the length of it while you
-- do it — which, against the drowners it came from, is the whole argument.
INSERT OR IGNORE INTO item_templates
  (id, name, description, rarity, dmg, stun, bleed, weight, speed, sweep, armor, slot, barter, traits) VALUES
  ('the-long-crossing', 'the Long Crossing',
   'Sixteen feet of ash with an iron shoe on the wet end, worn to a taper by a lifetime of finding the bottom in the dark. The grip is the part that tells you: two bands of it polished to glass and black with hand-grease, exactly a shoulder''s width apart, and nothing worn between them or beyond them, because his hands never went anywhere else. It is far too long for a room and far too heavy for one arm and it does not care about either. Whatever this crossing was, it was never finished.',
   'legendary', 5, 0.2, 0, 4, 1, 1, 0, 'weapon', 30, 'reach,two-handed,weighted');

-- The drop rate sits with the epics his neighbours leave (the coral crown and
-- the marrow scepter, both 25%) rather than under them, because this is a
-- legendary and he is the hardest fight in the world — but not ABOVE them, so
-- the fight stays the price rather than the formality.
UPDATE mob_templates SET gear_item = 'the-long-crossing', gear_drop = 0.22
  WHERE id = 'the-drowned-ferryman';

-- ---- and the cloak goes one rung down, where it belongs ---------------------
-- The eel-skin cloak was his and it is a good piece: slick, which halves how
-- often a drowned grip takes hold and helps you tear out of one. Losing it off
-- the boss would have cost the shore its best answer to the shore, so it moves
-- to the PILOT — the same trade one rank up, the other drowned boatman on that
-- water, and a rare item off a 8%-rare blood rather than off the boss is exactly
-- the right rung for it. Nothing is stranded by the shuffle: the cloak is also
-- in the tide vault (12%) and the toll-house strongbox (10%), and the boots the
-- pilot used to leave are in the bone nook (20%) and the tar-black locker (15%).
UPDATE mob_templates SET gear_item = 'eel-skin-cloak', gear_drop = 0.2
  WHERE id = 'the-pilot';
