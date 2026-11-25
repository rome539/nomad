-- WHAT THE CAVE GIVES UP (cave-plan.md step 5, 2026-11-24). The loot draft as
-- reviewed: a trophy off every fighter, the hunter's gear of the upper cave, the
-- diggers' kit, an epic for every slot on the dressed stone, two lamps, two of the
-- four legendaries (the foreman's and the great cougar's wait for their cousins),
-- the cave's meat, and the boxes at the camps and on the stone.
-- Numbers were checked against the item table: inside the slot ceilings, and no
-- rare or epic is matched or beaten by a piece of the same or lower rarity.

-- ---- trophies ------------------------------------------------------------------
INSERT INTO item_templates (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, bleed, barter, traits) VALUES
  ('cougar-pelt', 'a cougar pelt', 'A long tawny pelt with no mark on it anywhere, the tail as long again as the rest and dark at the tip. The fur is short and dense and it has never been out in the rain.', 'rare', 0, '', 0, 1, 1, 1, 0, 12, ''),
  ('mole-hound-skull', 'a mole hound''s skull', 'A long narrow skull with eye-holes that take up half of it, round and as wide as your thumb is long. Whatever sat in them saw by almost nothing at all.', 'uncommon', 0, '', 0, 1, 1, 0, 0, 5, ''),
  ('spider-fang', 'a spider''s fang', 'A curved black fang as long as a finger, hollow down the middle, with a bead of something dried at the point. It came out of the jaw with the root still on it.', 'uncommon', 0, '', 0, 1, 1, 0, 0, 6, ''),
  ('cave-silk', 'a hank of cave silk', 'A hank of grey silk pulled off the spiders'' galleries and wound round two fingers, dusty and strong. It sticks to itself and to nothing else.', 'uncommon', 0, '', 0, 1, 1, 0, 0, 3, ''),
  ('bat-leather', 'a scrap of bat leather', 'A bat''s wing, cut off and dried flat, thin as a leaf and nearly as dark. It takes a great many of them to make anything.', 'common', 0, '', 0, 1, 1, 0, 0, 1, ''),
  ('gulper-jaw', 'a gulper''s jaw-bone', 'The lower jaw of the river-gulper, white and light and wider than your shoulders, lined inside with rows of small teeth that all point the one way: in.', 'rare', 0, '', 0, 1, 1, 2, 0, 14, ''),
  ('brood-hide', 'a fold of brood hide', 'Pale wrinkled hide off the neck of a stone-brood, thick as a thumb and cold to the touch long after it was cut. It folds like heavy cloth and does not tear.', 'rare', 0, '', 0, 1, 1, 1, 0, 10, ''),
  ('tally-tag', 'a digger''s tally tag', 'A tag of soft lead on a loop of cord, stamped with a mark and a number. The holding gave one to every man it sent down, and took it back when he came up.', 'uncommon', 0, '', 0, 1, 1, 0, 0, 5, ''),
  ('lamp-oil-can', 'the lamp-man''s oil can', 'A small tin can with a long spout, dented all over, black with soot and fat. It is still a quarter full. He filled the diggers'' lamps from it for longer than anyone was keeping count.', 'epic', 0, '', 0, 1, 1, 0, 0, 24, ''),
  ('sleepers-tooth', 'the sleeper''s tooth', 'One of the small even teeth out of the stone-sleeper''s mouth, no bigger than a man''s, worn flat on top. It is cold, and it stays cold in a closed hand.', 'epic', 0, '', 0, 1, 1, 0, 0, 32, '');

-- ---- the hunter's gear (upper) -------------------------------------------------
INSERT INTO item_templates (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, bleed, barter, traits) VALUES
  ('cougar-claw-knife', 'a cougar-claw knife', 'A cougar''s dew-claw set in a short horn grip and bound with sinew. It is hooked and needle-sharp and it opens what it touches.', 'uncommon', 2, 'weapon', 0, 2, 1, 0, 2, 9, 'keen'),
  ('hound-leather-boots', 'a pair of hound-leather boots', 'Boots of thin grey hide off the mole hounds, the leather soft and close, with the soles packed thick. Whatever you kick in the dark, your toes will not hear about it.', 'uncommon', 0, 'feet', 1, 1, 1, 1, 0, 8, 'padded'),
  ('bat-leather-hood', 'a bat-leather hood', 'A hood pieced together out of a great many bats'' wings, the seams close and fine. It weighs nothing at all and keeps the drip off.', 'uncommon', 0, 'helm', 1, 1, 1, 0, 0, 8, 'hooded'),
  ('cougar-hide-cloak', 'a cougar-hide cloak', 'A whole cougar''s hide made into a cloak, tawny and unmarked, the tail left on and hanging. The cat lay up in the dark in it for years and nothing knew it was there.', 'rare', 0, 'cloak', 2, 1, 1, 3, 0, 15, 'quiet,wardhide'),
  ('spider-fang-dirk', 'a spider-fang dirk', 'Two spider''s fangs bound back to back in a grip of bone, so it has a point at the end and nothing else. It goes in deep and comes out clean.', 'rare', 3, 'weapon', 0, 2, 1, 0, 1, 15, 'pierce:2,piercing'),
  ('silk-bound-treads', 'a pair of silk-bound treads', 'Soft treads wound round and round in grey cave silk and pinned with a spider''s fang at the heel. They weigh nothing, make no sound, and slide off what tries to hold them.', 'rare', 0, 'feet', 1, 1, 1, 0, 0, 14, 'quiet,slick'),
  ('brood-hide-jack', 'a brood-hide jack', 'A jack of stone-brood hide, two folds thick, heavy and cold. Claws skate off it, and water stands on it in beads.', 'rare', 0, 'armor', 4, 1, 1, 7, 0, 16, 'wardhide,watertight'),
  ('gulper-skin-cape', 'a gulper-skin cape', 'A cape of the river-gulper''s pale skin with the hood cut from the head end. Nothing holds it, and the river runs off it.', 'rare', 0, 'cloak', 2, 1, 1, 3, 0, 15, 'slick,watertight,hooded');

-- ---- the diggers' kit (middle) -------------------------------------------------
INSERT INTO item_templates (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, bleed, stun, barter, traits) VALUES
  ('digging-pick', 'a digging pick', 'A short pick with a blunt, battered head, made for breaking stone and not for anything else. It breaks other things the same way.', 'uncommon', 3, 'weapon', 0, 1, 1, 2, 0, 0.15, 9, ''),
  ('leather-hard-hat', 'a leather hard hat', 'A round hat of boiled leather lined with a pad of felt, the crown dented in a dozen places where the roof came down to meet it.', 'uncommon', 0, 'helm', 2, 1, 1, 1, 0, 0, 9, 'padded'),
  ('clay-stiff-apron', 'a clay-stiff apron', 'A digger''s leather apron, gone as stiff as a board with clay and years. It stands up on its own and turns a blow the way a board does.', 'uncommon', 0, 'armor', 3, 1, 1, 5, 0, 0, 9, ''),
  ('crawlers-wraps', 'a pair of crawler''s wraps', 'Strips of greased cloth wound round the feet and shins, the way the diggers went through the squeezes: slowly, quietly, and on their bellies.', 'uncommon', 0, 'feet', 1, 1, 1, 1, 0, 0, 8, 'quiet'),
  ('stone-breaker', 'a stone-breaker', 'A long-hafted hammer with a square iron head, the one the diggers brought down for the stopping. It takes both hands and most of your back.', 'rare', 5, 'weapon', 0, 1, 1, 4, 0, 0.1, 16, 'two-handed'),
  ('lamp-mans-hook', 'the lamp-man''s hook', 'A short iron trimming-hook, its point worn bright, for reaching into a lamp and pulling the wick up. It reaches into other things.', 'rare', 3, 'weapon', 0, 1, 1, 1, 2, 0, 16, 'reach');

-- ---- left on the dressed stone (bottom) ----------------------------------------
INSERT INTO item_templates (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, bleed, block, barter, traits) VALUES
  ('cold-edged-sword', 'a cold-edged sword', 'A straight sword of a grey metal that is not iron, its edge as keen as the day it was put down on the stone. It is cold in the hand and it does not warm.', 'epic', 5, 'weapon', 0, 1, 1, 2, 2, 0, 19, 'keen'),
  ('stone-scale-coat', 'a stone-scale coat', 'A coat of small grey scales sewn close on a backing of felt, each scale cut from the same pale stone as the floor it lay on. The felt is the warmest thing in the cave.', 'epic', 0, 'armor', 6, 1, 1, 8, 0, 0, 19, 'fleeced'),
  ('stone-browed-cap', 'a stone-browed cap', 'A close cap with a brow of dressed stone set into the felt, ground thin and fitted to a head that was not quite the shape of yours. Nothing on it moves or rings.', 'epic', 0, 'helm', 3, 1, 1, 1, 0, 0, 19, 'quiet'),
  ('cold-stone-treads', 'a pair of cold-stone treads', 'Felted treads with soles of a grey stuff that is half stone, light and dry, that keep the wet out and the cold out both.', 'epic', 0, 'feet', 2, 1, 1, 0, 0, 0, 19, 'fleeced,watertight'),
  ('grey-stone-mantle', 'a grey-stone mantle', 'A long hooded mantle the grey of the dressed stone, woven so close that water stands on it, and so soft that it makes no sound at all.', 'epic', 0, 'cloak', 2, 1, 1, 2, 0, 0, 19, 'hooded,quiet,watertight'),
  ('flagstone-shield', 'a flagstone shield', 'A single flag of the dressed stone, cut thin and set in an iron rim with a strap behind. It is heavy, and nothing goes through it.', 'epic', 0, 'shield', 0, 1, 1, 9, 0, 0.32, 19, 'wall');

-- ---- the two lamps (light.ts LANTERNS) -----------------------------------------
INSERT INTO item_templates (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, bleed, barter, traits) VALUES
  ('belt-lamp', 'a digger''s belt lamp', 'A small squat lamp with a hook to hang it from the belt, so a man can work with both hands. Its well is small, and it drinks the fat quickly.', 'uncommon', 0, '', 0, 1, 1, 1, 0, 0, ''),
  ('lamp-mans-lamp', 'the lamp-man''s lamp', 'A shuttered lamp of black iron with a thick glass, hung on a bail. The flame in it is small and sits very still, and it makes a lump of fat last twice as long as any other lamp. No blow knocks it out.', 'epic', 0, '', 0, 1, 1, 1, 0, 0, '');

-- ---- two of the four legendaries (legendary.ts SIG) ----------------------------
INSERT INTO item_templates (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, bleed, block, barter, traits) VALUES
  ('sleepers-flag', 'the Sleeper''s Flag', 'The flagstone the stone-sleeper lay on, worn into the shape of it, set in a rim and carried as a shield. Held over you it covers the places a blow could end you.', 'legendary', 0, 'shield', 0, 1, 1, 9, 0, 0.3, 30, 'wall,sig-unfound'),
  ('swallowed-boots', 'the Swallowed Boots', 'A digger''s boots that came out of the river-gulper''s gut, whole, the leather bleached and still smelling of it. Whoever wore them went down into the black water and walked back up out of it.', 'legendary', 0, 'feet', 2, 1, 1, 1, 0, 0, 30, 'sig-held-breath');

-- ---- the cave's meat: the water things go on the fire (COOK_RECIPES), the grubbet
-- to the racks (CURE_RECIPES, to dried meat like the rat), the bat is eaten as it is
INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, bleed, barter, traits) VALUES
  ('dead-salamander', 'a dead salamander', 'A pale salamander as long as your forearm, limp and cold and nearly see-through. There is a little meat on it, along the tail.', 'common', 1, 3, 1, 0, '', 0, 1, 1, 0, 0, 0, ''),
  ('roast-salamander', 'a roast salamander', 'Laid on the embers until the white skin crisped and went brown. It tastes of the river and not much else, and there is more of it than there looked.', 'common', 1, 7, 1, 0, '', 0, 1, 1, 0, 0, 0, ''),
  ('dead-bat', 'a dead bat', 'A bat with its wings folded, small and light in the hand, all leather and fur and very little meat.', 'common', 1, 2, 1, 0, '', 0, 1, 1, 0, 0, 0, ''),
  ('crayfish-tail', 'a cave crayfish', 'A pale crayfish, still curled, the shell so thin you can see the meat inside it.', 'common', 1, 2, 1, 0, '', 0, 1, 1, 0, 0, 0, ''),
  ('roast-crayfish', 'a roast crayfish', 'Put in the embers in its shell until the shell went pink and split. The tail meat comes out sweet and white in one piece.', 'common', 1, 6, 1, 0, '', 0, 1, 1, 0, 0, 0, ''),
  ('grubbet-haunch', 'a grubbet haunch', 'The fat back end of a grubbet, skinned. It is pale and greasy and there is a good deal of it.', 'common', 1, 4, 1, 0, '', 0, 1, 1, 0, 0, 0, '');

-- ---- the stone box's key -------------------------------------------------------
INSERT INTO item_templates (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, bleed, barter, traits) VALUES
  ('sleepers-key', 'a cold stone key', 'A key cut out of the dressed stone itself, grey and smooth and very cold, with a single square tooth. It came out of the stone-sleeper.', 'rare', 0, '', 0, 1, 1, 0, 0, 0, '');

-- ---- who drops what ------------------------------------------------------------
UPDATE mob_templates SET loot_item = 'cougar-pelt', loot_chance = 0.35 WHERE id = 'cave-cougar';
UPDATE mob_templates SET loot_item = 'mole-hound-skull', loot_chance = 0.3 WHERE id = 'mole-hound';
UPDATE mob_templates SET loot_item = 'spider-fang', loot_chance = 0.35 WHERE id = 'cave-spider';
UPDATE mob_templates SET loot_item = 'dead-bat', loot_chance = 0.4 WHERE id = 'cave-bat';
UPDATE mob_templates SET loot_item = 'gulper-jaw', loot_chance = 0.5 WHERE id = 'river-gulper';
UPDATE mob_templates SET loot_item = 'brood-hide', loot_chance = 0.4 WHERE id = 'stone-brood';
UPDATE mob_templates SET loot_item = 'tally-tag', loot_chance = 0.35, gear_item = 'digging-pick', gear_drop = 0.15 WHERE id = 'digger';
UPDATE mob_templates SET loot_item = 'lamp-oil-can', loot_chance = 0.6, gear_item = 'lamp-mans-lamp', gear_drop = 0.25 WHERE id = 'the-lamp-man';
UPDATE mob_templates SET loot_item = 'sleepers-tooth', loot_chance = 1 WHERE id = 'stone-sleeper';
UPDATE mob_templates SET loot_item = 'dead-salamander', loot_chance = 0.6 WHERE id = 'pale-salamander';
UPDATE mob_templates SET loot_item = 'crayfish-tail', loot_chance = 0.5 WHERE id = 'cave-crayfish';
UPDATE mob_templates SET loot_item = 'grubbet-haunch', loot_chance = 0.5 WHERE id = 'grubbet';

INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('cave-spider', 'cave-silk', 0.25),
  ('cave-bat', 'bat-leather', 0.2),
  ('river-gulper', 'swallowed-boots', 0.03),
  ('digger', 'leather-hard-hat', 0.1),
  ('digger', 'clay-stiff-apron', 0.1),
  ('digger', 'crawlers-wraps', 0.1),
  ('digger', 'belt-lamp', 0.05),
  ('digger', 'strongbox-key', 0.12),
  ('the-lamp-man', 'lamp-mans-hook', 0.4),
  ('stone-sleeper', 'sleepers-key', 1),
  ('stone-sleeper', 'sleepers-flag', 0.2);

-- ---- the forge's rares (each a cave trophy worth 5+) and the keeper's plain ones
INSERT INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('cougar-hide-cloak', 3, 'cougar-pelt', 1),
  ('spider-fang-dirk', 3, 'spider-fang', 2),
  ('silk-bound-treads', 3, 'spider-fang', 2),
  ('brood-hide-jack', 4, 'brood-hide', 2),
  ('gulper-skin-cape', 3, 'gulper-jaw', 1),
  ('stone-breaker', 4, 'tally-tag', 2);
INSERT INTO fence_stock (item_id, cost) VALUES
  ('cougar-claw-knife', 24),
  ('hound-leather-boots', 22),
  ('bat-leather-hood', 18);

-- ---- the boxes (zone-data STAYS_HOME_BOXES: they keep their rooms) -------------
INSERT INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
  ('box-first-camp', 'the-first-camp', 'a diggers'' strongbox', 'A plain iron-bound box under the sleeping shelf, its lid scratched with tallies. The diggers kept the camp''s things in it and locked it every night.', 'strongbox-key', 900),
  ('box-cold-camp', 'the-cold-camp', 'a diggers'' strongbox', 'An iron-bound box pushed back against the wall of the cold camp, beaded with damp, its lock furred with rust but sound.', 'strongbox-key', 900),
  ('box-deep-camp', 'the-deep-camp', 'a diggers'' strongbox', 'A heavy iron-bound box at the back of the deep camp, the last of the camps, with a lamp hook over it and the soot of years on the lid.', 'strongbox-key', 900),
  ('box-stone', 'the-worn-hollow', 'a box of dressed stone', 'A low box cut out of one block of the pale stone, its lid fitted so close that no blade would go into the join. In the middle of the lid is a single square hole.', 'sleepers-key', 1800);
INSERT INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-first-camp', 'digging-pick', 0.3), ('box-first-camp', 'leather-hard-hat', 0.3), ('box-first-camp', 'crawlers-wraps', 0.3),
  ('box-first-camp', 'belt-lamp', 0.15), ('box-first-camp', 'fat', 0.5), ('box-first-camp', 'tally-tag', 0.3), ('box-first-camp', 'dry-cigarettes', 0.1),
  ('box-cold-camp', 'digging-pick', 0.3), ('box-cold-camp', 'clay-stiff-apron', 0.3), ('box-cold-camp', 'leather-hard-hat', 0.3),
  ('box-cold-camp', 'belt-lamp', 0.15), ('box-cold-camp', 'fat', 0.5), ('box-cold-camp', 'tally-tag', 0.3), ('box-cold-camp', 'dry-cigarettes', 0.1),
  ('box-deep-camp', 'clay-stiff-apron', 0.3), ('box-deep-camp', 'crawlers-wraps', 0.3), ('box-deep-camp', 'stone-breaker', 0.08),
  ('box-deep-camp', 'belt-lamp', 0.2), ('box-deep-camp', 'fat', 0.6), ('box-deep-camp', 'tally-tag', 0.4), ('box-deep-camp', 'dry-cigarettes', 0.1),
  ('box-stone', 'cold-edged-sword', 0.17), ('box-stone', 'stone-scale-coat', 0.17), ('box-stone', 'stone-browed-cap', 0.17),
  ('box-stone', 'cold-stone-treads', 0.17), ('box-stone', 'grey-stone-mantle', 0.17), ('box-stone', 'flagstone-shield', 0.17);
