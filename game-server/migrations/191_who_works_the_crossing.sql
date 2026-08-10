-- 191 who works the crossing (rome, 2026-08-10). The 204 rooms of mig 190 are
-- empty ground. This is what is on them.
--
-- THE RULING THIS OBEYS: a crossing is a WORKPLACE. The east road got
-- patrollers because a road is a line and the things on a line are travelling
-- it. This is not a line — it is a mile of water that five trades made a living
-- off, and the dead out here are still AT WORK. The ferryman is still ferrying.
-- The mason is still pointing the arch that fell. The cutter is still lifting
-- his grigs. None of them is guarding anything and none of them is waiting for
-- you; you have walked into a shift that never ended, and interrupted it.
--
-- Five grounds, five ecologies, one per route:
--   THE CAUSEWAY — the road that drowns. Its dead drowned STANDING ON IT.
--   THE BRIDGE   — stone in deep water. Birds own it now; one man disagrees.
--   THE FORD     — a mile of gravel. Birds, eels, and what the stock left.
--   THE FERRY    — the deep channel. This is where the water is over your head.
--   THE EYOTS    — marsh. Everything here is somebody's livelihood, gone feral.
-- And the FAR STRAND, which is where people lived, and so is the only ground
-- out here with a garden and a thief in it.
--
-- NO ROAD TRAFFIC WALKS IN, and that is currently a GAP rather than a decision.
-- MIGRATE_BANDS is road/wood/den/out; 'crossing' is not in it, so footpads,
-- cutthroats, waymen and masterless dogs stop dead at the scarp and the region
-- has no human traffic but its own. Adding the band as it stands would put a
-- footpad in the middle of the deep channel, so it wants a room filter first.
-- Named here so it is not discovered as a surprise later.
--
-- CIGARETTES: the mig 186 law holds without exception. Ten bodies out here had
-- hands and pockets; those ten can carry smokes. The seals, eels, gulls, crabs
-- and bitterns cannot, and do not, at any rate.

-- ---- what they leave -------------------------------------------------------
INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('ferrymans-fare', 'a ferryman''s fare',
   'Two small coins, worn smooth past any face or figure, still warm from wherever they were being kept. Everybody knows the story about coins and ferrymen. Nobody who tells it mentions that the ferryman has to put them somewhere.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 18, 0, ''),

  ('conger-jaw', 'a conger''s jaw',
   'Hinged, and longer than a hand, and set with teeth that all rake the same way — inward. Nothing that goes in comes back out past them. The bone is heavy for its size and the joint still works if you move it, which you should not.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 1, 0, 0, 0, 11, 0, ''),

  ('seal-pelt', 'a seal pelt',
   'Short, dense, silver-grey and mottled like weather over water, and heavier wet than anything this size has a right to be. There are old stories about these on every coast and every one of them is about somebody keeping one where its owner could not find it.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 2, 0, 0, 0, 20, 0, ''),

  ('tide-tally', 'a tide tally',
   'A strip of oak notched down both edges — one edge for the height, one for the hour — kept by somebody whose whole job was knowing when the road was a road. The last dozen notches are cut deeper and closer together than the rest.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 12, 0, ''),

  ('crab-claw', 'a crab''s claw',
   'The big one, off a shore crab the size of two hands, still articulated and still shutting when the tendon dries. It will hold a finger long enough to matter.',
   'common', 1, 2, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 4, 0, ''),

  ('masons-mallet', 'a mason''s mallet',
   'A cylinder of lignum on a short handle, faced flat at both ends and burred over from use, and it is the only tool that ever touched the good stonework out here. It is dense out of all proportion to its size. It was never a weapon and it does not need to be.',
   'uncommon', 0, 0, 0, 6, 'weapon', 0, 1, 1, 4, 0.25, 0, 0, 10, 0, ''),

  ('gull-egg', 'a gull''s egg',
   'Olive and blotched brown, big as a fist, still warm. Taking it is the simplest transaction on this shore: one meal, and a colony that will remember your shape for the rest of the day.',
   'common', 1, 6, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 3, 0, ''),

  ('oyster-knife', 'an oyster knife',
   'A short blunt-ended blade with a guard, made for getting into a thing that does not want opening and for not going through your own hand when it gives. Somebody ground this one down to half its width over a working life.',
   'uncommon', 0, 0, 0, 5, 'weapon', 0, 2, 1, 2, 0, 0, 2, 9, 0, ''),

  ('eel-grig', 'an eel grig',
   'A trap of woven withy, two feet long, with a funnel throat and a cork bung at the tail. There is nothing in it. It is baited, and the bait is fresh, and it was lifted and re-set within the day.',
   'uncommon', 0, 0, 1, 0, '', 0, 1, 1, 2, 0, 0, 0, 10, 0, ''),

  ('bitterns-feather', 'a bittern''s feather',
   'Buff and barred and streaked lengthwise, and against cut reed it stops being a feather at all — the pattern is not camouflage laid over a bird, it is the reed bed itself, growing out of one.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 9, 0, ''),

  ('viper-fang', 'a fen viper''s fang',
   'Hinged, hollow, and no longer than a thumbnail, lying back along the jaw until it is wanted. Held to the light there is a bead of something still in the channel of it.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 11, 0, ''),

  ('salt-block', 'a block of salt',
   'Grey-white, hard as sandstone, and heavy — a whole pan boiled down and dried in a mould. This was money once and it is close enough to money now. It has to be kept dry and it will not be.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 4, 0, 0, 0, 14, 0, ''),

  ('fowlers-hood', 'a fowler''s hood',
   'Sacking and reed sewn onto a felt cap, shapeless, filthy, and the single most effective piece of equipment on this shore — a man in this is not a man-shaped thing, and birds that will not let you inside forty yards will let it inside ten.',
   'uncommon', 0, 0, 0, 0, 'head', 2, 1, 1, 1, 0, 0, 0, 9, 0, 'quiet'),

  ('cutters-jerkin', 'an eel cutter''s jerkin',
   'Eel-skin, dozens of them, sewn overlapping onto a canvas back and oiled until the whole thing has gone the colour and near enough the texture of the water it was worn in. It sheds a river. It smells of the river forever.',
   'uncommon', 0, 0, 0, 0, 'body', 4, 1, 1, 3, 0, 0, 0, 13, 0, ''),

  ('drowned-bell', 'a drowned bell',
   'A hand-bell off the causeway, green to the crown, with the clapper still swinging free. It was rung to tell the road the water was coming. It has been under twice a day for two centuries and it still rings, and it rings wet.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 3, 0, 0, 0, 17, 0, ''),

  ('pilots-mark', 'a pilot''s mark',
   'A palm-sized plate of brass on a lanyard, cut through with a channel, three bars and a number — the shape of one specific safe line across one specific mile of water, made for a man who had to know it in the dark. It is worth exactly as much as the water it describes is dangerous.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 22, 0, '');

-- ---- who they are ----------------------------------------------------------
INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  -- THE CAUSEWAY. Everything on this road drowned standing on it, which is what
  -- happens on a road that is under water for part of every day and does not
  -- look it when you set out.
  ('the-tide-warden', 'the tide warden',
   'It walks the causeway from end to end with a notched stick in one hand, and at every milestone it stops and looks at the water and cuts the stick, and goes on. The coat is sodden through and has been for a long time. It is not warning anybody. It is keeping the record, and the record is the job.',
   4, 46, 5, 9, 1500, 0, 'tide-tally', 0.45, 2, 'hobnailed-boots', 0.2, 0, 2),

  ('the-refuge-man', 'the refuge man',
   'Standing in the causeway refuge with his back to the opening and his hands flat on the stone at shoulder height, exactly as a man stands when he has got somewhere just barely in time and is waiting for something to pass. It did not pass. He is still standing like that and the refuge is dry today.',
   5, 58, 6, 11, 1800, 0, 'drowned-bell', 0.35, 3, 'watchmans-boots', 0.15, 0, 3),

  ('wrack-crab', 'a wrack crab',
   'The size of two hands across the back, mottled green-black, coming up out of the weed sideways with one claw high and the other tucked. There is never one of them. When you move the weed you find out how many there were.',
   1, 14, 2, 5, 600, 0, 'crab-claw', 0.6, 2, '', 0, 2, 0),

  -- THE BRIDGE. Four piers of good stone in deep water. The gulls have had it
  -- for two hundred years and one man has not accepted that.
  ('the-bridge-mason', 'the bridge mason',
   'Out on the broken edge of the span with a mallet in his fist, working at a joint that has nothing beyond it — dressing the stone at the exact point where the bridge stops. He has been making the end of it neat for two centuries. He does not turn round for you. He turns round for the mallet.',
   5, 62, 7, 12, 2100, 0, 'masons-mallet', 0.4, 3, 'padded-jerkin', 0.2, 0, 3),

  ('great-gull', 'a great gull',
   'The big kind — the size of a goose, with a bill built for opening things and an eye with no give in it whatever. It is not frightened of you and there is no version of this where it becomes frightened of you. It has taken a rat off this parapet and it did not need to land to do it.',
   3, 28, 4, 8, 900, 0, 'gull-egg', 0.5, 0, '', 0, 2, 0),

  ('the-scaffold-hand', 'the scaffold hand',
   'Hanging in the rotted scaffold under the arch in a rope harness gone to fibre, upside down at the hip, working at the underside of the stonework with both arms free. That is how the job was done. He is doing the job. The rope has not been sound in living memory.',
   4, 44, 5, 10, 1500, 0, 'iron', 0.5, 1, 'coppice-treads', 0.15, 2, 0),

  -- THE FORD. A mile of gravel and the birds that own it. The safest crossing
  -- and the one where something gets a whole day to notice you on it.
  ('oystercatcher', 'an oystercatcher',
   'Black and white and built out of two straight lines, with a bill the colour of a hot iron, running the tideline ahead of you and stopping and running again. When it decides you are too close it goes up screaming and it does not stop screaming, and every bird on the flats takes it seriously.',
   1, 12, 2, 4, 600, 0, '', 0, 0, '', 0, 0, 0),

  ('ford-eel', 'a ford eel',
   'A yard of it in four inches of water, going upstream over the gravel with its whole body doing the work, and it is not troubled by the shallowness at all. It can cross wet grass. It is crossing this because the crossing is a thing it does.',
   2, 20, 3, 6, 900, 0, 'pale-eel', 0.4, 0, '', 0, 3, 0),

  ('the-drover', 'the drover',
   'Coming the other way across the shoals with a stick over his shoulder and his coat tied at the waist, at the unhurried working pace of a man who has all day because the water says he has all day. There is nothing in front of him. He is still driving it, and he still expects the road.',
   4, 50, 5, 9, 1800, 0, 'tusk-goad', 0.35, 2, 'hide-cloak', 0.2, 0, 2),

  ('the-quicksand', 'the quicksand',
   'A patch of the flat exactly like every other patch of the flat, until it is not. It does not move toward you and it has no shape and there is nothing to hit. What there is, is a great deal of it, and it has hold of you to the knee before the ground has finished being ground.',
   4, 40, 6, 10, 2400, 0, 'grave-pearl', 0.3, 6, '', 0, 0, 4),

  -- THE FERRY. The deep channel, and the only water above ground that is over
  -- your head. Everything here is at home in it and you are not.
  ('the-drowned-ferryman', 'the drowned ferryman',
   'He comes hand over hand along the rope with the whole of him under the water except the hands, and the hands are white and swollen and perfectly steady, and they do not slip on wet hemp. He worked this rope for a lifetime. The lifetime ended and the shift did not. He will take you across. That is the whole of the problem.',
   6, 84, 8, 14, 2700, 1, 'ferrymans-fare', 0.5, 4, 'eel-skin-cloak', 0.25, 0, 3),

  ('conger', 'a conger',
   'Six feet of it out of a hole in the pier foot, thick as a thigh at the shoulder, grey-brown and moving nothing but the last third of itself. It does not chase and it does not need to. It is a mouth on the end of an arm, and the arm goes back into the stone.',
   4, 46, 6, 11, 1500, 0, 'conger-jaw', 0.45, 2, '', 0, 4, 0),

  ('grey-seal', 'a grey seal',
   'Hauled out on the gravel like something dropped there, enormous, comic, and asleep. In the water it is none of those things. It has a dog''s head and a dog''s teeth and a dog''s opinion about what is worth chasing, and it is faster than you in the medium it is in.',
   3, 40, 4, 8, 1200, 0, 'seal-pelt', 0.35, 2, '', 0, 3, 0),

  ('the-pilot', 'the pilot',
   'Standing on the far rope stage with a brass plate in his hand, looking at the water and not at you, reading a line across it that has not existed for two hundred years. He knew this channel better than anybody alive knows anything. He has not stopped knowing it. He is simply out of water to know it about.',
   5, 56, 6, 11, 2100, 0, 'pilots-mark', 0.4, 2, 'felt-soled-boots', 0.2, 0, 2),

  -- THE EYOTS. Everything in the marsh was somebody's living, and the living
  -- outlasted the people. The reed does not need anything to be hostile.
  ('the-eel-cutter', 'the eel cutter',
   'Poling a flat-bottomed boat down the cut with a grig hanging off the transom and his back to you, working the line of traps in order, lifting, emptying, re-setting, moving on. He is very good at it. He has not looked up since before you were born and he will look up now.',
   4, 48, 5, 10, 1500, 0, 'eel-grig', 0.4, 2, 'cutters-jerkin', 0.25, 2, 0),

  ('the-fowler', 'the fowler',
   'Flat on his front on the quaking turf in a hood of sacking and reed, absolutely still, with something long beside him under a blanket of cut sedge. You did not see him and you were not going to. He was not waiting for you and he is extremely unhappy about the difference you have just made to his morning.',
   4, 44, 6, 11, 1500, 0, 'fowlers-hood', 0.4, 1, 'oyster-knife', 0.25, 3, 0),

  ('bittern', 'a bittern',
   'Somewhere within ten feet of you, pointing straight up, striped exactly like the reed it is standing in and swaying at exactly the reed''s rate. You will not find it by looking. You will find it when it decides the distance is wrong and comes out of the stems at the height of your face.',
   2, 22, 4, 7, 900, 0, 'bitterns-feather', 0.5, 0, '', 0, 2, 0),

  ('fen-viper', 'a fen viper',
   'Coiled on the one dry plank of the causey, exactly the colour of wet withy, and it has been there since before you came round the reed. It does not want this. It has nowhere to go that is not water, and you are standing on the plank.',
   3, 18, 4, 8, 1200, 0, 'viper-fang', 0.45, 0, '', 0, 5, 0),

  ('the-reed-walker', 'the reed walker',
   'A shape going through the maze one cut over from yours, at your pace, on your side, staying with you. The reed is too thick to see through and it is never quite where the sound says. It is not lost. It has been in here long enough to be the only thing that is not.',
   5, 54, 6, 12, 1800, 0, 'grave-moss', 0.4, 1, 'moss-lined-boots', 0.2, 3, 0),

  ('marsh-hound', 'a marsh hound',
   'Lean, wet to the shoulder, and working the reed edge with its nose down and its ears up, quartering ground the way a dog does when it is doing a job it was taught. Somebody taught it. That was a long time ago and it has kept the method and lost the point of it.',
   3, 32, 4, 8, 1200, 0, 'dogs-collar', 0.4, 1, '', 0, 2, 0),

  -- THE FAR STRAND. People lived here. That is the only reason there is a
  -- garden, a smoke house, and something waiting where the road comes ashore.
  ('the-salt-widow', 'the salt widow',
   'Working the pan house, feeding a flue that has no fire in it, in a coat crusted white to the elbow. The pan is cold and has been cold since the fall and she is boiling it anyway, and the work is the whole of her and there is nothing else left in there at all.',
   5, 52, 6, 11, 1800, 0, 'salt-block', 0.5, 2, 'keepers-wrap', 0.2, 0, 3),

  ('strand-thief', 'a strand thief',
   'Working the wrack line ahead of you, turning things over with a foot, and he has already seen you and has already decided how this goes. Everything he owns came off this beach. He does not think of what he does as stealing, because the sea does not own things either.',
   3, 34, 4, 8, 1200, 0, 'oyster-knife', 0.3, 1, 'tattered-cloak', 0.2, 2, 0);

-- The pilot is the ferryman's rare blood — the same trade, one rank up, and the
-- only man out here who could have got you across without the boat.
INSERT INTO mob_variants (base_id, variant_id, chance) VALUES ('the-eel-cutter', 'the-pilot', 0.08);

-- ---- what they carry -------------------------------------------------------
-- MIG 186 HOLDS: hands and pockets only. Ten bodies out here qualify; the
-- seals, congers, eels, gulls, crabs, vipers, bitterns and hounds do not and
-- never will. Rates are low and the ferryman is the best of them, because he is
-- a boss on a 45-minute respawn at the end of the hardest of the five ways.
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('the-drowned-ferryman', 'dry-cigarettes',     0.150),  -- kept dry in a tin, by a man whose whole art was keeping things dry
  ('the-pilot',            'dry-cigarettes',     0.080),
  ('the-salt-widow',       'hand-rolled-smokes', 0.030),
  ('the-eel-cutter',       'hand-rolled-smokes', 0.025),
  ('the-fowler',           'hand-rolled-smokes', 0.025),
  ('strand-thief',         'crushed-pack',       0.025),  -- off somebody else, and crushed in the taking
  ('the-bridge-mason',     'hand-rolled-smokes', 0.020),
  ('the-tide-warden',      'crushed-pack',       0.015),
  ('the-refuge-man',       'crushed-pack',       0.015),
  ('the-drover',           'hand-rolled-smokes', 0.015),
  ('the-scaffold-hand',    'hand-rolled-smokes', 0.010);

-- ---- where they stand ------------------------------------------------------
-- THE CAUSEWAY: sparse along the road, because a road you meet nothing on for
-- six rooms and then meet one thing on is a road. The crabs are the exception —
-- they are weed, and weed is continuous.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-tide-warden', 'the-half-tide-post');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-tide-warden', 'the-far-milestone');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-refuge-man', 'the-refuge');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('wrack-crab', 'the-crab-pools');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('wrack-crab', 'the-wrack-bank');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('wrack-crab', 'the-wrack-line');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('wrack-crab', 'the-mussel-bank');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('wrack-crab', 'the-shellfish-scars');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('wrack-crab', 'the-oyster-scars');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('wrack-crab', 'the-limpet-rocks');

-- THE BRIDGE: the gulls own the piers, the mason owns the broken edge, and the
-- scaffold hand is under the one arch that still has scaffold on it.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-bridge-mason', 'the-broken-arch');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-scaffold-hand', 'the-scaffold-stub');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('great-gull', 'the-first-pier');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('great-gull', 'the-second-pier');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('great-gull', 'the-third-pier');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('great-gull', 'the-fourth-pier');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('great-gull', 'the-starling');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('great-gull', 'the-gull-flats');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('conger', 'the-pier-foot');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('conger', 'the-drowned-span');

-- THE FORD: the oystercatchers are the ford's alarm system and they are spread
-- the whole width of it on purpose — the ford's danger is that it is slow and
-- open, and the birds are what makes slow and open expensive.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('oystercatcher', 'the-first-shoal');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('oystercatcher', 'the-second-shoal');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('oystercatcher', 'the-long-bank');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('oystercatcher', 'the-shell-bank');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('oystercatcher', 'the-last-shoal');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('oystercatcher', 'the-mussel-scaup');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('ford-eel', 'the-third-channel');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('ford-eel', 'the-fifth-channel');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('ford-eel', 'the-eel-grass');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-drover', 'the-mid-ford');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-drover', 'the-drove-road');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-quicksand', 'the-quicksand-flat');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-quicksand', 'the-tide-race');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-seal', 'the-gravel-flats');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-seal', 'the-cockle-beds');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-seal', 'the-midden');

-- THE FERRY: the deep channel, and it is the shortest of the five, so it is the
-- most expensive per room in the region. The ferryman is at the middle of the
-- rope, which is the furthest point from either bank.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-drowned-ferryman', 'the-mid-channel');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-pilot', 'the-far-rope-stage');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('conger', 'the-green-water');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('conger', 'the-deep-mark');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('conger', 'the-under-rope');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-seal', 'the-slack');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-seal', 'the-drowned-mooring');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('ford-eel', 'the-eel-lines');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('ford-eel', 'the-weed-raft');

-- THE EYOTS: the densest ground in the region, because the reed is the only
-- place out here where a thing can be four feet away and unfound. Never drowned,
-- never quick, and this is the price of that.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-eel-cutter', 'the-cut-reed');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-eel-cutter', 'the-eel-hut');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-eel-cutter', 'the-stake-line');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-fowler', 'the-fowlers-hide');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-fowler', 'the-quaking-turf');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-fowler', 'the-decoy-pipe');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-fowler', 'the-fowlers-track');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('bittern', 'the-reed-maze');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('bittern', 'the-reed-fork');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('bittern', 'the-dead-end');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('bittern', 'the-reed-gate');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('bittern', 'the-salt-marsh');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('fen-viper', 'the-brushwood-causey');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('fen-viper', 'the-long-causey');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('fen-viper', 'the-plank-run');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('fen-viper', 'the-tern-causey');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('fen-viper', 'the-samphire-flat');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-reed-walker', 'the-cutters-eyot');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-reed-walker', 'the-sunken-forest');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('marsh-hound', 'the-black-eyot');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('marsh-hound', 'the-salt-causey');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('marsh-hound', 'the-creek-crossing');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('marsh-hound', 'the-hard-approach');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('marsh-hound', 'the-salting-edge');

-- THE FAR STRAND: thin. This is where people lived and it is the one ground out
-- here that is supposed to feel like arriving. The gate is on it.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-salt-widow', 'the-pan-house');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-salt-widow', 'the-salt-pans');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('strand-thief', 'the-boat-graves');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('strand-thief', 'the-storm-line');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('strand-thief', 'the-drying-frames');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('great-gull', 'the-storm-line');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('wrack-crab', 'the-cockle-scars');

-- ---- what the ground holds -------------------------------------------------
-- Regrowing where the country would keep making more of it, once-only where
-- somebody left a thing exactly once (the floor-renewal law, f60ef32).
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('salt-fish', 'the-smoke-house', 1),          -- the rods are still hung, and the stone still smells of it
  ('salt-fish', 'the-net-loft', 1),
  ('watercress', 'the-cold-spring', 1),         -- the one sweet water in the middle of a mile of salt
  ('watercress', 'the-well-yard', 1),
  ('cave-nettle', 'the-keepers-garden', 1),     -- something has been at the beans; the nettles it left
  ('torch', 'the-refuge', 1),                   -- the causeway's one dry hole, and it has been used
  ('torch', 'the-bothy-of-the-crossing', 1),    -- LEAVE IT DRY, LEAVE IT FUELLED
  ('torch', 'the-passengers-rest', 1),
  ('lopped-stave', 'the-cut-reed', 1),          -- withy, cut and stacked, for the grigs
  ('lopped-stave', 'the-sunken-hurdles', 1),
  ('crab-claw', 'the-shell-scar', 1),
  ('scrap-iron', 'the-half-drowned-cart', 0),   -- the tyres and the hoop-irons, and nothing else left of it
  ('scrap-iron', 'the-wreck-ribs', 0),
  ('scrap-iron', 'the-sluice-stone', 0),        -- the gate mechanism, seized in its slot
  ('salt-block', 'the-salt-store', 0),          -- a drift of it in the corner, hard as rock
  ('eel-grig', 'the-hook-hut', 0),
  ('eel-grig', 'the-eel-staithe', 0),           -- a dozen of them stacked under the planks, mended
  ('oyster-knife', 'the-hurdle-store', 0),
  ('hooded-lantern', 'the-far-tide-mark', 0),   -- frame intact, glass gone, and a stub of candle run down the side
  ('gaff-hook', 'the-boat-house', 0),           -- the tools still laid out along the keel
  ('crude-map', 'the-old-boat', 0),             -- somebody's own idea of the way through the reed
  ('surveyor-map', 'the-crossing-house', 0);    -- the institution's, and it is right
