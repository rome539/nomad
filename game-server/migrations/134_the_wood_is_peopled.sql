-- THE WOOD IS PEOPLED (rome, 2026-08-02) — the maze's roster.
--
-- 170 rooms of empty trees. A lying core with nothing in it is a confusing
-- walk, not a frightening one: the maze only works if being lost is dangerous.
--
-- THE LAW OF THIS ROSTER IS DEPTH. The fortress's danger is arranged by tier
-- (upper/deep), the road's by distance from the gate, the mountain's will be by
-- altitude. The wood's is by HOW LOST YOU ARE:
--
--   the honest band   — animals. A wood with deer and boar in it. You can be
--                       hurt here, but nothing in it is hunting you on purpose.
--   the lying cores   — the follower, and men who never left. The things that
--                       only find you once you have stopped knowing the way.
--   the sunken wood   — root-things. Slow, armored, and between you and the
--                       climb out.
--   core G, below     — the same, worse, in the dark.
--   the far side      — quiet, deliberately. It is the reward for being lost.
--   the holding       — one keeper. The only built thing in the wood has
--                       something in it.
--
-- 115 bodies over 170 rooms (0.68), against the ROADMAP's 0.70 target.

-- ---- what the wood is worth ------------------------------------------------

INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('deer-haunch', 'a deer haunch',
   'Heavy, dark-fleshed and still warm through. More meat than one person can eat before it turns, which is a problem you will have to solve somewhere with a fire.',
   'common', 1, 11, 2, 0, '', 0, 0, 0, 1, 0, 0, 0, 0, 0),
  ('wolf-pelt', 'a wolf pelt',
   'Grey through the back and pale at the throat, thick enough to turn weather, and taken off something that was in no way willing.',
   'uncommon', 0, 0, 0, 0, '', 0, 0, 0, 1, 0, 0, 0, 7, 0),
  ('boar-tusk', 'a boar tusk',
   'A curved yellow tusk the length of your hand, worn to a chisel edge on the one above it. It was a working tool and it worked.',
   'uncommon', 0, 0, 0, 0, '', 0, 0, 0, 0, 0, 0, 0, 5, 0),
  ('burners-billhook', 'a burner''s billhook',
   'A hooked blade on a short haft, ground down by decades of sharpening until the spine is thin. Made for cutting cordwood, and it has been used for other things since.',
   'uncommon', 0, 0, 0, 5, 'weapon', 0, 1, 1, 3, 0, 0, 0, 4, 0);

-- ---- the honest band: a wood with animals in it -----------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('roe-deer', 'a roe deer',
   'Small, red-brown, and already looking at you — it heard you a long time before you arrived and has been deciding since. It will not fight. Everything it has is in the first two seconds after it moves.',
   1, 16, 1, 2, 300, 0, 'deer-haunch', 0.75, 0, NULL, 0, 0, 0),

  ('wild-boar', 'a wild boar',
   'Waist-high at the shoulder and built entirely for going forward. It stops rooting, stands, and turns to face you square-on, which is not a threat display — it is what this animal does immediately before it commits.',
   3, 48, 4, 7, 900, 0, 'boar-tusk', 0.4, 1, NULL, 0, 0.25, 1),

  ('grey-wolf', 'a grey wolf',
   'Lean, long-legged, and carrying itself with the flat economy of something that has not eaten recently and expects to. It watches your hands, not your face.',
   3, 34, 3, 6, 600, 0, 'wolf-pelt', 0.35, 0, NULL, 0, 0.35, 0);

-- ---- the lying cores: what finds you once you are lost ----------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('the-follower', 'something following',
   'You have been aware of it for some time without having seen it. It is roughly your height and it moves when you move, which is why you never caught it at it, and it has closed the distance every time you stopped paying attention.',
   4, 40, 5, 8, 720, 0, 'grave-moss', 0.3, 0, NULL, 0, 0.3, 0),

  ('charcoal-burner', 'the charcoal burner',
   'A man in a coat stiff with soot, working a stack that has not been lit in a lifetime — laying wood on it, turning the turf over it, checking the draw. He does not stop when you speak. He stops when you get close.',
   4, 58, 4, 8, 1200, 0, 'scrap-iron', 0.4, 1, 'burners-billhook', 0.35, 0, 0);

-- ---- the sunken wood and below: slow, armored, in the way -------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('root-thing', 'a root-thing',
   'A knot of root and wet earth the size of a man, moving the way roots move — too slowly to watch, and further along than it was. What it is built around is not visible and does not need to be.',
   4, 70, 4, 7, 900, 0, 'grave-moss', 0.45, 3, NULL, 0, 0, 1),

  ('the-mire-walker', 'the mire-walker',
   'It stands in water up to the knee and has been standing there. When it comes for you it does not lift its feet clear, it drags them through, and the water goes on moving after it has stopped.',
   4, 52, 5, 8, 840, 0, 'grave-pearl', 0.25, 1, NULL, 0, 0.3, 0);

-- ---- the holding: the only built thing in the wood has something in it ------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('the-keeper-of-the-holding', 'the keeper of the holding',
   'It is dressed for a household that has not existed for centuries — a coat with the facings still on it, boots, a ring of keys at the belt that it has never once put down. It is standing in the middle of the hall floor because that is where it stands, and it turns to you with the unhurried attention of somebody whose job you are interrupting.',
   6, 130, 6, 11, 1800, 1, 'dry-cigarettes', 0.5, 3, 'graveblade', 0.4, 0.4, 1);

-- ---- placement: 115 bodies, generated by an even deterministic spread over
-- each depth band (no RNG, so the same world always places them the same way).
-- 73 of the 170 rooms hold nothing at all — the wood has to breathe.

INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-w1', 'roe-deer', 'the-alder-carr'),
  ('spawn-w2', 'roe-deer', 'the-badger-ground'),
  ('spawn-w3', 'roe-deer', 'the-boundary-oak'),
  ('spawn-w4', 'roe-deer', 'the-bramble-margin'),
  ('spawn-w5', 'roe-deer', 'the-charcoal-hut'),
  ('spawn-w6', 'roe-deer', 'the-close-ground'),
  ('spawn-w7', 'roe-deer', 'the-deer-path'),
  ('spawn-w8', 'roe-deer', 'the-eaves'),
  ('spawn-w9', 'roe-deer', 'the-fallen-wall'),
  ('spawn-w10', 'roe-deer', 'the-first-clearing'),
  ('spawn-w11', 'roe-deer', 'the-fox-earths'),
  ('spawn-w12', 'roe-deer', 'the-holly-brake'),
  ('spawn-w13', 'roe-deer', 'the-last-oaks'),
  ('spawn-w14', 'roe-deer', 'the-lime-kiln'),
  ('spawn-w15', 'roe-deer', 'the-north-ride'),
  ('spawn-w16', 'roe-deer', 'the-old-coppice'),
  ('spawn-w17', 'roe-deer', 'the-outer-scrub'),
  ('spawn-w18', 'roe-deer', 'the-south-ride'),
  ('spawn-w19', 'roe-deer', 'the-spring-head'),
  ('spawn-w20', 'roe-deer', 'the-swallowing'),
  ('spawn-w21', 'roe-deer', 'the-timber-stack'),
  ('spawn-w22', 'roe-deer', 'the-willow-margin'),
  ('spawn-w23', 'roe-deer', 'the-ash-heap'),
  ('spawn-w24', 'roe-deer', 'the-broken-avenue'),
  ('spawn-w25', 'roe-deer', 'the-far-birches'),
  ('spawn-w26', 'roe-deer', 'the-hollow-yew'),
  ('spawn-w27', 'roe-deer', 'the-long-glade'),
  ('spawn-w28', 'roe-deer', 'the-north-marches'),
  ('spawn-w29', 'roe-deer', 'the-standing-water'),
  ('spawn-w30', 'roe-deer', 'the-west-ride'),
  ('spawn-w31', 'wild-boar', 'the-badger-ground'),
  ('spawn-w32', 'wild-boar', 'the-boundary-oak'),
  ('spawn-w33', 'wild-boar', 'the-bracken-edge'),
  ('spawn-w34', 'wild-boar', 'the-close-ground'),
  ('spawn-w35', 'wild-boar', 'the-drowned-holly'),
  ('spawn-w36', 'wild-boar', 'the-first-clearing'),
  ('spawn-w37', 'wild-boar', 'the-high-holly'),
  ('spawn-w38', 'wild-boar', 'the-holly-brake'),
  ('spawn-w39', 'wild-boar', 'the-last-oaks'),
  ('spawn-w40', 'wild-boar', 'the-nettle-glade'),
  ('spawn-w41', 'grey-wolf', 'the-alder-carr'),
  ('spawn-w42', 'grey-wolf', 'the-boundary-oak'),
  ('spawn-w43', 'grey-wolf', 'the-charcoal-ring'),
  ('spawn-w44', 'grey-wolf', 'the-drowned-holly'),
  ('spawn-w45', 'grey-wolf', 'the-far-south-turning'),
  ('spawn-w46', 'grey-wolf', 'the-holly-brake'),
  ('spawn-w47', 'grey-wolf', 'the-mire-edge'),
  ('spawn-w48', 'grey-wolf', 'the-old-pond'),
  ('spawn-w49', 'grey-wolf', 'the-south-turning'),
  ('spawn-w50', 'grey-wolf', 'the-timber-stack'),
  ('spawn-w51', 'grey-wolf', 'the-ant-hills'),
  ('spawn-w52', 'grey-wolf', 'the-crooked-stand'),
  ('spawn-w53', 'grey-wolf', 'the-gorse-brake'),
  ('spawn-w54', 'grey-wolf', 'the-lichen-wood'),
  ('spawn-w55', 'grey-wolf', 'the-pale-grass'),
  ('spawn-w56', 'grey-wolf', 'the-stunted-oaks'),
  ('spawn-w57', 'the-follower', 'the-ant-hills'),
  ('spawn-w58', 'the-follower', 'the-black-alders'),
  ('spawn-w59', 'the-follower', 'the-bracken-sea'),
  ('spawn-w60', 'the-follower', 'the-close-dark'),
  ('spawn-w61', 'the-follower', 'the-drowned-roots'),
  ('spawn-w62', 'the-follower', 'the-dry-heath'),
  ('spawn-w63', 'the-follower', 'the-far-hollow'),
  ('spawn-w64', 'the-follower', 'the-grey-scrub'),
  ('spawn-w65', 'the-follower', 'the-heart-of-it'),
  ('spawn-w66', 'the-follower', 'the-hollow-beeches'),
  ('spawn-w67', 'the-follower', 'the-lichen-wood'),
  ('spawn-w68', 'the-follower', 'the-low-mist'),
  ('spawn-w69', 'the-follower', 'the-moss-floor'),
  ('spawn-w70', 'the-follower', 'the-open-canopy'),
  ('spawn-w71', 'the-follower', 'the-rabbit-warren'),
  ('spawn-w72', 'the-follower', 'the-same-tree'),
  ('spawn-w73', 'the-follower', 'the-sodden-ground'),
  ('spawn-w74', 'the-follower', 'the-thin-birches'),
  ('spawn-w75', 'the-follower', 'the-turned-ground'),
  ('spawn-w76', 'the-follower', 'the-white-ground'),
  ('spawn-w77', 'charcoal-burner', 'the-ant-hills'),
  ('spawn-w78', 'charcoal-burner', 'the-broken-ground'),
  ('spawn-w79', 'charcoal-burner', 'the-dry-heath'),
  ('spawn-w80', 'charcoal-burner', 'the-grey-thicket'),
  ('spawn-w81', 'charcoal-burner', 'the-lichen-wood'),
  ('spawn-w82', 'charcoal-burner', 'the-old-burn'),
  ('spawn-w83', 'charcoal-burner', 'the-same-tree'),
  ('spawn-w84', 'charcoal-burner', 'the-thorn-waste'),
  ('spawn-w85', 'root-thing', 'the-black-loam'),
  ('spawn-w86', 'root-thing', 'the-bottom-of-it'),
  ('spawn-w87', 'root-thing', 'the-buried-lane'),
  ('spawn-w88', 'root-thing', 'the-clay-shelf'),
  ('spawn-w89', 'root-thing', 'the-cold-seep'),
  ('spawn-w90', 'root-thing', 'the-drip-line'),
  ('spawn-w91', 'root-thing', 'the-fern-pit'),
  ('spawn-w92', 'root-thing', 'the-flint-floor'),
  ('spawn-w93', 'root-thing', 'the-green-dark'),
  ('spawn-w94', 'root-thing', 'the-lost-stand'),
  ('spawn-w95', 'root-thing', 'the-low-sump'),
  ('spawn-w96', 'root-thing', 'the-lower-ditch'),
  ('spawn-w97', 'root-thing', 'the-old-ditch'),
  ('spawn-w98', 'root-thing', 'the-slip'),
  ('spawn-w99', 'root-thing', 'the-still-pool'),
  ('spawn-w100', 'root-thing', 'the-tree-fall'),
  ('spawn-w101', 'root-thing', 'the-under-eaves'),
  ('spawn-w102', 'root-thing', 'the-under-roots'),
  ('spawn-w103', 'the-mire-walker', 'the-black-pool'),
  ('spawn-w104', 'the-mire-walker', 'the-brown-water'),
  ('spawn-w105', 'the-mire-walker', 'the-flooded-ride'),
  ('spawn-w106', 'the-mire-walker', 'the-frog-chorus'),
  ('spawn-w107', 'the-mire-walker', 'the-quaking-ground'),
  ('spawn-w108', 'the-mire-walker', 'the-rush-bed'),
  ('spawn-w109', 'the-mire-walker', 'the-silted-pond'),
  ('spawn-w110', 'the-mire-walker', 'the-sunk-fence'),
  ('spawn-w111', 'the-mire-walker', 'the-alder-carr'),
  ('spawn-w112', 'the-mire-walker', 'the-drinking-pool'),
  ('spawn-w113', 'the-mire-walker', 'the-flood-meadow'),
  ('spawn-w114', 'the-mire-walker', 'the-wet-hollow'),
  ('spawn-w115', 'the-keeper-of-the-holding', 'the-hall-floor');
