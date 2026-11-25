-- WHAT LIVES IN THE CAVE UNDER THE WOOD (2026-11-24). Step three of cave-plan.md: the
-- creatures, before their sheets and before their own ways of fighting (step four).
-- The upper cave is the cave cougars' and the mole hounds' ground, with the lamp-man
-- walking it; the river floor has the gulpers in its deep water, the spiders in the
-- silk, the bats in the two roosts and the diggers at their camps and the stopping;
-- the dressed stone has the brood and the stone-sleeper. Grubbets live on what the
-- hunters leave, and the pale salamanders in the pools are what the small hunters eat; a polecat
-- hunts the grubbets, the crayfish keep the shallows and the stone-mites live in the dressed stone's joints.
-- Loot and the rare cousins come with step five, after review.

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('cave-cougar', 'a cave cougar',
  'A long tawny cat, lean through the flanks, with a small head and a tail as long as the rest of it, held low and still. It is down here in the dark, where a cat has no business being, and it is at home. Its eyes take your light and throw it back green.',
  4, 46, 5, 9, 900, 0, '', 0, 1, '', 0, 0, 2);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('mole-hound', 'a mole hound',
  'A long-legged hound, grey and hairless in patches, its ribs showing, with ears spread wide and eyes too big for its head, round and dark, that take the least light there is and shine it back. It holds its head high and turned, and the head turns with every sound you make.',
  3, 30, 3, 6, 720, 0, '', 0, 0, '', 0, 0, 2);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('river-gulper', 'a river-gulper',
  'A fish as long as a man and as pale as a peeled root, lying in the black water with only the line of its back showing. The mouth, when it opens, is wider than the body behind it. It has no eyes worth the name, and it does not need them to know what has come to the edge.',
  5, 72, 6, 10, 1800, 0, '', 0, 1, '', 0, 0, 1);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('cave-spider', 'a cave spider',
  'A spider with a body the size of a dog''s head and legs that would span a cartwheel, grey, and furred with dust. It sits in the silk with its legs drawn in, as still as one more wrapped thing, until it is not.',
  4, 36, 3, 7, 1200, 0, '', 0, 1, '', 0, 0, 1);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('cave-bat', 'a cave bat',
  'A bat the size of your fist with wings that would cover your chest, brown-grey and short-furred, with tall ears and a pushed-up snout. It hangs from the rock wrapped in its own wings among a great many others, and when one drops, the rest come after it.',
  1, 9, 1, 3, 300, 0, '', 0, 0, '', 0, 0, 1);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('digger', 'a digger',
  'A dried man in a leather jerkin gone stiff with clay, a hood pulled forward over a face with little left of it, a short-hafted pick in his fist. His hands are grey with stone dust to the wrist, all cord and knuckle. He is still at the work they sent him down to do, and he looks at your light before he looks at you.',
  3, 34, 4, 7, 1200, 0, '', 0, 1, '', 0, 0.08, 0);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('stone-brood', 'a stone-brood',
  'Pale, low and four-legged, the length of a big dog, with a blunt head held just off the stone and a wrinkled hide hanging in folds at the neck. It has no eyes. Its mouth is full of small even teeth and it breathes through them, slowly, as if it were tasting the cold air.',
  4, 40, 4, 8, 1500, 0, '', 0, 1, '', 0, 0, 2);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('stone-sleeper', 'the stone-sleeper',
  'It lies on the dressed stone as if it were part of it: pale, enormously long, four-legged, a blunt head as broad as a cart''s bed laid flat on the flags. Its hide is wrinkled and loose and the colour of the stone. It has no eyes. The cold air coming up through the joints moves over it, and it breathes with the air, slowly. It is not asleep.',
  7, 150, 6, 11, 2400, 1, '', 0, 2, '', 0, 0.12, 2);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('the-lamp-man', 'the lamp-man',
  'A dried man in a long leather coat stiff with oil and soot, his hood drawn forward, carrying a shuttered lamp, lit and held low, so its light lies on the floor and not on what is left of his face. Spare wicks hang at his belt beside a can of oil. He has been walking these passages a long time, and he walks them as if he still had somewhere to take the light.',
  6, 90, 6, 10, 3600, 0, '', 0, 2, '', 0, 0.1, 0);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('polecat', 'a polecat',
  'A long low animal no bigger than a cat, dark brown going black at the legs, with a pale band across a small flat face like a mask turned inside out. It moves in quick loops through the rock as if the stone were water, and where it has been the air smells sharp and rank.',
  2, 16, 2, 4, 600, 0, '', 0, 0, '', 0, 0, 1);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('cave-crayfish', 'a cave crayfish',
  'A crayfish as long as your hand, white as a peeled almond and nearly see-through, with long feelers that sweep ahead of it and claws held up and open. It has no eyes. It backs under a stone when the water moves, and it does not let go of what it has got hold of.',
  1, 9, 1, 3, 240, 0, '', 0, 1, '', 0, 0, 0);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('stone-mites', 'a swarm of stone-mites',
  'Tiny pale things, each no bigger than a grain of barley, by the thousand. They live in the joints of the dressed stone, where the cold air comes up, and they come out of the joints all together, a grey film that runs over the flags like spilt water and then over whatever is standing on them.',
  2, 14, 1, 2, 300, 0, '', 0, 0, '', 0, 0, 1);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('grubbet', 'a grubbet',
  'A fat pale burrower the size of a rabbit, grey-furred on the back and nearly bare on the belly, with a pink snout like a pig''s that never stops working and two front feet that are all spade. Its eyes are small and milky and it squints at your light. They live packed together in the burrows they dig, and they squeal at everything.',
  1, 12, 2, 3, 120, 0, '', 0, 0, '', 0, 0, 1);

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES ('pale-salamander', 'a pale salamander',
  'A salamander as long as your forearm and as white as a candle, with feathery pink gills behind its head and two small dark specks where eyes would be. It lies on the bottom of the shallow water and walks, slowly, when it walks at all.',
  1, 8, 1, 2, 180, 0, '', 0, 0, '', 0, 0, 0);

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-cougar@the-cats-lie', 'cave-cougar', 'the-cats-lie');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-cougar@the-overhang', 'cave-cougar', 'the-overhang');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-cougar@the-under-ledge', 'cave-cougar', 'the-under-ledge');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-cougar@the-cougars-larder', 'cave-cougar', 'the-cougars-larder');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-cougar@the-kill-hole', 'cave-cougar', 'the-kill-hole');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-cougar@the-calcite-crawl', 'cave-cougar', 'the-calcite-crawl');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-cougar@the-low-arch', 'cave-cougar', 'the-low-arch');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-cougar@the-hollow', 'cave-cougar', 'the-hollow');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-cougar@the-west-gallery', 'cave-cougar', 'the-west-gallery');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-hounds-bed#0', 'mole-hound', 'the-hounds-bed');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-hounds-bed#1', 'mole-hound', 'the-hounds-bed');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-pawed-sand', 'mole-hound', 'the-pawed-sand');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-four-ways', 'mole-hound', 'the-four-ways');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-echo-gallery', 'mole-hound', 'the-echo-gallery');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-sounding-room', 'mole-hound', 'the-sounding-room');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-rattling-way', 'mole-hound', 'the-rattling-way');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-blind-turn', 'mole-hound', 'the-blind-turn');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-sand-floor', 'mole-hound', 'the-sand-floor');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-shale-floor', 'mole-hound', 'the-shale-floor');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-gnawed-floor', 'mole-hound', 'the-gnawed-floor');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-mole-hound@the-sand-bank', 'mole-hound', 'the-sand-bank');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-river-gulper@the-deep-pool', 'river-gulper', 'the-deep-pool');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-river-gulper@the-long-pool', 'river-gulper', 'the-long-pool');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-river-gulper@the-wide-water', 'river-gulper', 'the-wide-water');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-river-gulper@the-black-water', 'river-gulper', 'the-black-water');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-spider@the-silk-hall', 'cave-spider', 'the-silk-hall');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-spider@the-wrapped-things', 'cave-spider', 'the-wrapped-things');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-spider@the-hanging-silk', 'cave-spider', 'the-hanging-silk');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-spider@the-spiders-gallery', 'cave-spider', 'the-spiders-gallery');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-spider@the-egg-sacs', 'cave-spider', 'the-egg-sacs');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-spider@the-roost-edge', 'cave-spider', 'the-roost-edge');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-north-roost#0', 'cave-bat', 'the-north-roost');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-north-roost#1', 'cave-bat', 'the-north-roost');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-north-roost#2', 'cave-bat', 'the-north-roost');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-east-roost#0', 'cave-bat', 'the-east-roost');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-east-roost#1', 'cave-bat', 'the-east-roost');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-east-roost#2', 'cave-bat', 'the-east-roost');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-roost-floor#0', 'cave-bat', 'the-roost-floor');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-roost-floor#1', 'cave-bat', 'the-roost-floor');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-roost-water#0', 'cave-bat', 'the-roost-water');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-roost-water#1', 'cave-bat', 'the-roost-water');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-bat-way#0', 'cave-bat', 'the-bat-way');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-bat-way#1', 'cave-bat', 'the-bat-way');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-bat-chimney#0', 'cave-bat', 'the-bat-chimney');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-bat@the-bat-chimney#1', 'cave-bat', 'the-bat-chimney');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-first-camp#0', 'digger', 'the-first-camp');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-first-camp#1', 'digger', 'the-first-camp');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-cold-camp#0', 'digger', 'the-cold-camp');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-cold-camp#1', 'digger', 'the-cold-camp');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-sleeping-shelf', 'digger', 'the-sleeping-shelf');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-deep-camp#0', 'digger', 'the-deep-camp');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-deep-camp#1', 'digger', 'the-deep-camp');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-deep-camp#2', 'digger', 'the-deep-camp');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-stopping#0', 'digger', 'the-stopping');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-stopping#1', 'digger', 'the-stopping');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-first-stopping', 'digger', 'the-first-stopping');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-digger@the-pick-work', 'digger', 'the-pick-work');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-brood@the-brood-nests#0', 'stone-brood', 'the-brood-nests');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-brood@the-brood-nests#1', 'stone-brood', 'the-brood-nests');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-brood@the-brood-way#0', 'stone-brood', 'the-brood-way');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-brood@the-brood-way#1', 'stone-brood', 'the-brood-way');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-brood@the-sleepers-door', 'stone-brood', 'the-sleepers-door');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-brood@the-groove', 'stone-brood', 'the-groove');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-sleeper@the-worn-hollow', 'stone-sleeper', 'the-worn-hollow');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-the-lamp-man@the-four-ways', 'the-lamp-man', 'the-four-ways');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-polecat@the-rat-run', 'polecat', 'the-rat-run');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-polecat@the-gnaw-hole', 'polecat', 'the-gnaw-hole');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-polecat@the-bone-spill', 'polecat', 'the-bone-spill');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-polecat@the-rattling-way', 'polecat', 'the-rattling-way');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-polecat@the-loose-stones', 'polecat', 'the-loose-stones');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-polecat@the-breakdown', 'polecat', 'the-breakdown');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-river-shingle', 'cave-crayfish', 'the-river-shingle');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-ford', 'cave-crayfish', 'the-ford');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-river-shelf', 'cave-crayfish', 'the-river-shelf');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-narrowing', 'cave-crayfish', 'the-narrowing');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-long-pool', 'cave-crayfish', 'the-long-pool');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-silt-banks', 'cave-crayfish', 'the-silt-banks');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-cold-sand', 'cave-crayfish', 'the-cold-sand');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-rapids', 'cave-crayfish', 'the-rapids');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-river-turn', 'cave-crayfish', 'the-river-turn');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-under-spring', 'cave-crayfish', 'the-under-spring');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-rising-water', 'cave-crayfish', 'the-rising-water');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-cave-crayfish@the-glow-reach', 'cave-crayfish', 'the-glow-reach');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-mites@the-first-flags', 'stone-mites', 'the-first-flags');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-mites@the-cold-road', 'stone-mites', 'the-cold-road');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-mites@the-cross-hall', 'stone-mites', 'the-cross-hall');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-mites@the-long-flags', 'stone-mites', 'the-long-flags');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-mites@the-sunk-flags', 'stone-mites', 'the-sunk-flags');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-mites@the-cold-passage', 'stone-mites', 'the-cold-passage');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-mites@the-hum', 'stone-mites', 'the-hum');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-mites@the-cracked-flags', 'stone-mites', 'the-cracked-flags');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-mites@the-pale-walls', 'stone-mites', 'the-pale-walls');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-stone-mites@the-cold-cell', 'stone-mites', 'the-cold-cell');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-rat-run', 'grubbet', 'the-rat-run');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-rat-shelf', 'grubbet', 'the-rat-shelf');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-gnawed-floor', 'grubbet', 'the-gnawed-floor');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-bone-spill', 'grubbet', 'the-bone-spill');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-gnaw-hole', 'grubbet', 'the-gnaw-hole');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-cougars-larder', 'grubbet', 'the-cougars-larder');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-claw-floor', 'grubbet', 'the-claw-floor');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-kill-hole', 'grubbet', 'the-kill-hole');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-drag-way', 'grubbet', 'the-drag-way');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-hauled-way', 'grubbet', 'the-hauled-way');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-root-hang', 'grubbet', 'the-root-hang');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-taproot', 'grubbet', 'the-taproot');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-first-camp', 'grubbet', 'the-first-camp');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-cold-camp', 'grubbet', 'the-cold-camp');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-sleeping-shelf', 'grubbet', 'the-sleeping-shelf');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-lamp-store', 'grubbet', 'the-lamp-store');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-water-butts', 'grubbet', 'the-water-butts');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-barrow-run', 'grubbet', 'the-barrow-run');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-guano-slope', 'grubbet', 'the-guano-slope');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-guano-banks', 'grubbet', 'the-guano-banks');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-carry-way', 'grubbet', 'the-carry-way');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-spoil-heaps', 'grubbet', 'the-spoil-heaps');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-last-heading', 'grubbet', 'the-last-heading');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grubbet@the-buried-hall', 'grubbet', 'the-buried-hall');

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-salamander-pools#0', 'pale-salamander', 'the-salamander-pools');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-salamander-pools#1', 'pale-salamander', 'the-salamander-pools');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-salamander-pools#2', 'pale-salamander', 'the-salamander-pools');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-pale-pools#0', 'pale-salamander', 'the-pale-pools');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-pale-pools#1', 'pale-salamander', 'the-pale-pools');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-under-pool', 'pale-salamander', 'the-under-pool');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-falls-pool', 'pale-salamander', 'the-falls-pool');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-still-reach', 'pale-salamander', 'the-still-reach');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-seep-hall', 'pale-salamander', 'the-seep-hall');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-weeping-wall', 'pale-salamander', 'the-weeping-wall');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-wet-ledge', 'pale-salamander', 'the-wet-ledge');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-spring-gallery', 'pale-salamander', 'the-spring-gallery');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-cold-sand', 'pale-salamander', 'the-cold-sand');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-pale-salamander@the-silt-banks', 'pale-salamander', 'the-silt-banks');
