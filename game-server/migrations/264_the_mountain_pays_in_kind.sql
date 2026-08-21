-- THE MOUNTAIN PAYS IN KIND (2026-08-21). Numbered to sit after the unshipped
-- 256-263 drop, whose rulings this defers to where they overlap.
--
-- A distribution audit over all 170
-- gear items and all five channels — floor, vice, shelf, chest, body. The
-- structure held: nothing in the world is unobtainable, and the rarity ladder
-- narrows exactly as it should (a common averages 2.7 ways in, a legendary
-- 1.3; every common is on a floor somewhere, and no legendary is on a floor,
-- at the vice, or on the shelf). Three things were wrong.

-- ===================== I. THE MOUNTAIN'S TROPHIES BOUGHT NOTHING ============
--
-- Twenty-six creatures on the mountain drop twenty-five distinct trophies, and
-- the number of forge recipes that consumed any of them was ZERO.
--
-- Every other band's kills terminate in gear. A finger-bone makes five things,
-- a pale-claw five, a fistful of teeth six; wolf-pelt five, white-hide four;
-- the marrow-shard becomes Smith's Ruin and the drowned-pearl the greatplate.
-- The ladder climbs from common trophies all the way to epic ones — and then
-- stopped dead, because the two legendary scales and the whole upland line had
-- no vice that would take them.
--
-- So the mountain was the largest region in the world (398 rooms), with more
-- floor gear than any other band (43 pieces), and no reason to hunt anything on
-- it. You killed a lion and got barter. That is the hole.
--
-- IT IS NOT FIXED BY GIVING ANIMALS GEAR. Twenty-three of the twenty-six carry
-- nothing, and they should: a lynx has no boots. The hunt already yields the
-- right thing. What was missing is the bench that turns it into a kit — so the
-- mountain gets its own line, MADE and not found, out of what lives there.
--
-- ON THE TWO LEGENDARIES BEING FORGEABLE, which is new: until now no legendary
-- could be made, only found on a body or in a box. These are not an exception
-- to that so much as the same gate wearing different clothes — the material is
-- a legendary trophy off a level-7 apex that beats a full kit in a straight
-- fight. The drake IS the lock. The vice is only where you carry the key.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES

-- common trophy, plentiful: the goats are everywhere and nobody wants them
('horn-plated-cap', 'a horn-plated cap',
 'A felt cap faced with split goat-horn, boiled flat and riveted on in overlapping rows. It is the work of somebody with a long winter, a good knife and one idea, and the idea was sound: horn turns a glancing blow as well as plate and weighs a third of it.', 'uncommon', 0, 0, 0, 0, 'helm', 2, 1, 1, 1, 0.0, 0.0, 0, 9, 0, ''),

-- rare trophy, the common wolf of the tops
('hill-wolf-jerkin', 'a hill-wolf jerkin',
 'A jerkin of hill-wolf hide with the winter coat left on the inside. The wolves of the tops carry more fur than the wood''s ever do — they have to — and a man who takes it off them is warm for as long as he keeps it dry.', 'uncommon', 0, 0, 0, 0, 'armor', 2, 1, 1, 1, 0.0, 0.0, 0, 10, 0, 'fleeced'),

-- rare trophy, the quiet one
('adder-skin-boots', 'adder-skin boots',
 'Boots soled in soft hide and cased in stone-adder skin, scale-side out. The scales are dry and they do not creak, and a foot in them comes down on scree the way the adder itself does — which is to say, without announcing it.', 'rare', 0, 0, 0, 0, 'feet', 2, 1, 1, 0, 0.0, 0.0, 0, 12, 0, 'quiet'),

-- epic trophy, the thing that eats what the cold kills
('glutton-hide-coat', 'a glutton-hide coat',
 'A heavy coat of glutton hide, which frost will not stiffen and teeth do not much like. The animal it came off spends its life dragging frozen meat out from under rock, and its skin was built for the argument; it does the same work on you.', 'rare', 0, 0, 0, 0, 'armor', 3, 1, 1, 2, 0.0, 0.0, 0, 16, 0, 'wardhide'),

-- epic trophy, the mountain's own predator
('lion-pelt-cloak', 'a lion-pelt cloak',
 'The whole pelt of a cave lion, head and all, worn with the skull riding your shoulder. It is warm past any reasonable need and it is not subtle. Things that live under the tops have opinions about the smell of it, and none of them are keen to test whether the animal is still in it.', 'epic', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0.0, 0.0, 0, 20, 0, 'fleeced,hooded'),

-- legendary trophy: the drake of the summit
('drake-scale-shield', 'a drake-scale shield',
 'A shield faced in the overlapping scales of the summit drake, each one the size of a spread hand and harder than the iron behind it. It is enormously heavy and it does not care what hits it. The man who carried it up there did not come down, but the shield did.', 'legendary', 0, 0, 0, 0, 'shield', 0, 1, 1, 2, 0.0, 0.3, 0, 30, 0, 'wall,thorns:1'),

-- legendary trophy: the pale drake, and the cold it lives in
('pale-scale-mantle', 'a pale-scale mantle',
 'A mantle of pale drake-scale, sewn scale over scale onto backing hide until it hangs like a fall of water and weighs almost nothing. The cold does not get through it. Nothing that has tried has got through it. It came off a thing that sleeps in weather that kills men, and it keeps its own counsel about how.', 'legendary', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0.0, 0.0, 0, 30, 0, 'fleeced,wardhide');

-- The upland bench. Iron in the scrap column as always; the trophy is the point.
INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('horn-plated-cap',    1, 'goat-horn',        2),
  ('hill-wolf-jerkin',   2, 'hill-wolf-pelt',   2),
  ('adder-skin-boots',   2, 'stone-adder-skin', 2),
  ('glutton-hide-coat',  3, 'glutton-pelt',     2),
  ('lion-pelt-cloak',    3, 'lion-pelt',        1),
  ('drake-scale-shield', 4, 'summit-scale',     1),
  ('pale-scale-mantle',  4, 'pale-scale',       1);

-- ===================== II. THE NEW GEAR WAS PRICED AT THE FLOOR =============
--
-- Every one of the last three drops landed in the bottom third of its own
-- rarity's shelf band. Measured against what the keeper already charges:
--
--   band       range        median
--   uncommon    7 - 33        24
--   rare       28 - 56        44
--   epic       40 - 120      105
--
-- The grave glaive is the one that is not a tuning question but a missing
-- digit: at 40 an EPIC weapon cost less than the median RARE, and a third of
-- the next-cheapest epic. Each price below is set by the nearest thing the
-- keeper already sells, not by a blanket shift:
--
--   kindling-hatchet  10 -> 24   bone-shiv is dmg2 x speed2 for 24. Identical.
--   knotted-lash       9 -> 18   priced as utility, with the man-catcher (27)
--                                and the spiked buckler (18); tripping is the
--                                weapon-side of the barbs, discounted hard for
--                                a damage stat of one.
--   paired-cleavers   27 -> 33   every other 27 is dmg3 x speed1 with no sweep;
--                                this is the best uncommon weapon in the game,
--                                so it sits with the graveblade and the maul.
--   pine-brand        28 -> 36   above the uncommon ceiling: it is a weapon and
--                                a light at once.
--   longbrand         30 -> 40   worse weapon, better light — the long burn is
--                                what you are paying for.
--   polehammer        34 -> 52   the skull-headed maul is dmg4 x1 for 48 and
--                                the warden maul 52; this one has reach as well.
--   grave-glaive      NOT REPRICED. It was the worst of these — an epic at 40,
--                                under the median rare — but 263 takes it off
--                                the shelf altogether on the rule that epics
--                                are found, not stocked. That is the better
--                                answer and this defers to it. (For the record
--                                the shelf does carry three older epics, so the
--                                rule is a new one, not an existing one.)
--   nail-studded-jack 16 -> 27   armour 2 with a trait, between the hauberk
--                                (21) and the wardhide jack (30).
--   fleece-lined-jack 30 -> 52   the boiled cuirass is armour 3 at 48 with no
--                                trait at all, and this was undercutting it.
--   pedlars-coat      14 -> 30   two more slots, for the price of the best
--                                uncommon cloak. It was the cheapest real
--                                utility in the world by a factor of two.
--   mirror-bright-helm 12 -> 20  parity with the wool-lined cap: same slot,
--                                same armour, a trait each.
--
-- Sell values (item_templates.barter) were checked against the same bands and
-- are all correct already — this is the buy side only.

UPDATE fence_stock SET cost =  24 WHERE item_id = 'kindling-hatchet';
UPDATE fence_stock SET cost =  18 WHERE item_id = 'knotted-lash';
UPDATE fence_stock SET cost =  33 WHERE item_id = 'paired-cleavers';
UPDATE fence_stock SET cost =  36 WHERE item_id = 'pine-brand';
UPDATE fence_stock SET cost =  40 WHERE item_id = 'longbrand';
UPDATE fence_stock SET cost =  52 WHERE item_id = 'polehammer';
UPDATE fence_stock SET cost =  27 WHERE item_id = 'nail-studded-jack';
UPDATE fence_stock SET cost =  52 WHERE item_id = 'fleece-lined-jack';
UPDATE fence_stock SET cost =  30 WHERE item_id = 'pedlars-coat';
UPDATE fence_stock SET cost =  20 WHERE item_id = 'mirror-bright-helm';

-- ===================== III. TWO SMALLER THINGS ==============================
--
-- 253 SAID THE WOOL WENT SOMEWHERE IT DID NOT. Its own header put the fleeced
-- set in "the forester's chest and the kist under the shieling bed-shelf" — but
-- the SQL used the lodge loft and the Stell's strongbox, and the shieling kist
-- got none of it. The shieling is a shepherd's summer hut. A shepherd's mantle
-- belongs in it more than anywhere else in the world.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('shieling-kist', 'shepherds-mantle', 0.2);

-- AND THE ONE EPIC THAT REGREW ON A FLOOR. The reaver glaive sits in the Tower
-- Gap with regrows = 1, so the floor-renewal law hangs a fresh EPIC weapon back
-- up every few hours, forever — the only epic on any floor in the world, and
-- the one thing breaking the ladder the rest of this audit confirmed. It stays
-- exactly where it is and stays findable; it just stops being a tap. Same shape
-- as the nine other placed finds that do not renew.
UPDATE ground_spawns SET regrows = 0
 WHERE item_id = 'reaver-glaive' AND room_id = 'the-tower-gap';
