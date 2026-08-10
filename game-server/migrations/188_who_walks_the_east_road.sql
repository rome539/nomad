-- 188 who walks the east road (rome, 2026-08-10). The 102 rooms of mig 187 are
-- empty ground. This is what lives on them.
--
-- THE RULING THIS OBEYS: roads get PATROLLERS, not residents. You meet
-- something GOING SOMEWHERE. The fortress's own dead stand at posts; the
-- wood's things keep territories; a road is a line, and the things on a line
-- are travelling it. So the paving gets two hollow officials still walking a
-- beat that ended two centuries ago, and everything else out here is an animal
-- that lives in the country the road happens to cross.
--
-- Three grounds, three ecologies, because the east road is three routes:
--   THE PAVING  — the institution, still collecting, still patrolling.
--   THE DROVE   — dogs. The stock is gone; what was driving it is not.
--   THE BECK    — otter, heron, adder. Water makes its own living.
--   THE RISE    — goat and raven, which is what the high ground has.
--
-- The road brings its own traffic besides: footpads, cutthroats, waymen and
-- masterless dogs are MIGRANTS and the east road is region 'road', so they
-- walk up it on their own. Nothing here needs to spawn them.

-- ---- what they leave -------------------------------------------------------
INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('otter-pelt', 'an otter pelt',
   'Dense, dark, and still faintly oiled — the underfur is so tight that water never reached the skin at all. It is the warmest small thing anyone out here is likely to be carrying, and everyone who sees it knows what it took to get.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 9, 0, ''),

  ('heron-plume', 'a heron''s plume',
   'A long grey crest-feather, near enough two hands from quill to tip, with a spine to it that a smaller bird could not manage. Held up, it moves in air you cannot feel.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 7, 0, ''),

  ('adder-skin', 'a shed adder-skin',
   'The whole animal in paper, inside out, down to the scales over the eyes — sloughed in one piece against a stone and left where it came off. Dry, weightless, and unsettlingly exact.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 8, 0, ''),

  ('goat-horn', 'a goat''s horn',
   'Curved, ridged in bands like a tally of hard winters, and hollow. Cut and drilled it would carry a note a long way across broken ground, which is presumably how it came to be worth taking off the animal.',
   'common', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 5, 0, ''),

  ('raven-feather', 'a raven''s flight-feather',
   'Black, and not simply black — turned in the light it goes oil-blue and then green and then back. A hand''s length of it, stiff as a blade down the spine. It was not moulted. Something took it.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 8, 0, ''),

  ('toll-token', 'a toll token',
   'A disc of stamped lead on a thong, marked with a road, a date-cut and a number. It proved you had paid to be where you were standing. Something out here is still checking, and is not interested in an explanation.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 16, 0, '');

-- ---- who they are ----------------------------------------------------------
INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  -- THE PAVING. Two officials. Neither is guarding anything: they are WORKING,
  -- and you are an irregularity in the work.
  ('the-toll-clerk', 'the toll clerk',
   'It stands at the verge with a satchel on a strap and one hand out, palm up, and it has been standing like that long enough for the strap to wear a groove into the bone of the shoulder. The satchel still has weight in it. The hand does not move, and it does not lower, and it will not lower while you are in front of it.',
   3, 34, 4, 7, 900, 0, 'toll-token', 0.35, 1, 'leather-cap', 0.15, 0, 2),

  ('the-long-warden', 'the long warden',
   'A hollow thing in a coat of plates gone the colour of the road, walking east at a pace it has clearly held for a very long time. It does not patrol a place. It patrols a DISTANCE, out and back, and whatever it was posted against has had two centuries to stop being a problem and has not been told.',
   4, 48, 5, 9, 1500, 0, 'war-medal', 0.45, 3, 'hobnailed-boots', 0.25, 0, 2),

  -- THE DROVE. The stock is two hundred years gone. The dogs went on working.
  ('drove-dog', 'a drove dog',
   'Long-legged, rough-coated and low to the grass, working a line across the hillside with its head down and its shoulder turned. It is not stalking you. It is putting you somewhere, and it has already decided where, and there will be another one on your other side by the time you have understood that.',
   3, 30, 4, 7, 1200, 0, 'dogs-collar', 0.4, 0, '', 0, 2, 0),

  ('the-drove-master', 'the drove master',
   'Bigger than the rest and grey to the muzzle, and it does not run the line at all — it sits on the high ground above the work and watches it happen. When it comes down, the others give it the room, and the shape of what they were doing changes.',
   4, 46, 5, 9, 1800, 0, 'dogs-collar', 0.6, 1, '', 0, 2, 0),

  -- THE BECK. Water makes its own living and does not care about the road.
  ('otter', 'an otter',
   'It comes out of the water onto a stone with a fish across its jaws, sees you, and does not hurry. Everything about it is built for a medium you are not in. On land it looks like a mistake; the moment it is back in the beck it stops looking like anything at all.',
   1, 18, 2, 4, 900, 0, 'otter-pelt', 0.55, 0, '', 0, 1, 0),

  ('grey-heron', 'a grey heron',
   'Standing in the shallows on one leg with its neck folded down into its shoulders, entirely grey, entirely still. It has been in that exact position since before you came round the bank. When it goes up it goes up slowly, enormously, and it makes a noise like something being torn.',
   1, 16, 2, 4, 900, 0, 'heron-plume', 0.6, 0, '', 0, 0, 0),

  ('the-miller', 'the miller',
   'Waist-deep in his own ground floor, turned away, working at something under the water with both hands. The wheel behind him is not going round. He has the swollen look of a man the water has had a long time and the patience of one who has stopped noticing, and when he turns round he keeps hold of whatever it was.',
   4, 52, 6, 10, 1800, 0, 'grave-pearl', 0.4, 2, 'gaff-hook', 0.15, 0, 3),

  ('gill-adder', 'a gill adder',
   'A short thick snake the colour of wet bracken, lying in the one patch of sun that reaches the bottom of the cleft. The zigzag down its back is the most legible thing in the gill. It will not come at you. It will simply be where you were about to put your hand.',
   2, 14, 3, 6, 1200, 0, 'adder-skin', 0.5, 0, '', 0, 4, 0),

  -- THE RISE. What the high ground has, which is not much and is very good at it.
  ('feral-goat', 'a feral goat',
   'Standing on something you would not stand on, chewing, watching you with a horizontal pupil that gives away nothing at all. The coat is matted into ropes and the horns have been used. It is on the wrong side of a drop and it is not concerned about it.',
   2, 26, 3, 6, 900, 0, 'goat-horn', 0.5, 1, '', 0, 0, 1),

  ('scarp-raven', 'a scarp raven',
   'Big as a cat, black to the point of blue, working the updraught along the face without a wingbeat. It comes back three times to look at you from three different distances, which is a thing that is being decided rather than a thing that is happening.',
   2, 20, 3, 5, 900, 0, 'raven-feather', 0.5, 0, '', 0, 1, 0);

-- The drove master is the drove's rare blood, same shape as the lead dog.
INSERT INTO mob_variants (base_id, variant_id, chance) VALUES ('drove-dog', 'the-drove-master', 0.10);

-- ---- where they stand ------------------------------------------------------
-- THE PAVING: the clerk works the places that collected, the warden works the
-- length. Sparse on purpose — a road you meet nothing on for six rooms and then
-- meet one thing on is a road; a road with something in every room is a dungeon.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-toll-clerk', 'the-toll-stone');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-toll-clerk', 'the-weighbridge');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-toll-clerk', 'the-tollkeepers-ruin');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-long-warden', 'the-hollow-way');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-long-warden', 'the-long-rise');

-- THE DROVE: five, spread the length of the green way, because they work spread.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('drove-dog', 'the-drove-green');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('drove-dog', 'the-wether-slope');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('drove-dog', 'the-high-common');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('drove-dog', 'the-hare-ground');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('drove-dog', 'the-drove-head');

-- THE BECK: otter on the fast water, heron on the still, and the miller in his mill.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('otter', 'the-otter-holt');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('otter', 'the-tail-race');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('otter', 'the-osier-island');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-heron', 'the-millpond');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-heron', 'the-hatchpool');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-heron', 'the-flood-mead');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-miller', 'the-drowned-mill');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('gill-adder', 'the-gill-foot');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('gill-adder', 'the-rowan-gill');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('gill-adder', 'the-sunken-alders');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('gill-adder', 'the-gill-narrows');

-- THE RISE: goats on the face, ravens above it. Density climbs with altitude,
-- which is the mountain's law arriving early — the last stretch before the
-- Crossing should already feel like the thing it is about to become.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('feral-goat', 'the-cutting-ledge');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('feral-goat', 'the-third-hairpin');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('feral-goat', 'the-scarp-top');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('feral-goat', 'the-peat-cuttings');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('scarp-raven', 'the-rope-post');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('scarp-raven', 'the-boundary-cairn');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('scarp-raven', 'the-watershed');

-- ---- what the ground holds -------------------------------------------------
-- Regrowing where the country would keep making more of it, once-only where
-- somebody left a thing exactly once (the floor-renewal law, f60ef32).
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('watercress', 'the-drowned-ford', 1),      -- thick on the downstream side, and the description says so
  ('watercress', 'the-spring-line', 1),
  ('hoof-fungus', 'the-hollow-oak', 1),
  ('hoof-fungus', 'the-hanging-wood', 1),
  ('lopped-stave', 'the-withy-beds', 1),      -- the stools would still cut, if anybody wanted a basket
  ('lopped-stave', 'the-osier-island', 1),
  ('torch', 'the-carters-rest', 1),           -- the one hearth on the paving that has been used since the fall
  ('torch', 'the-shelter-stone', 1),          -- and the halfway house of the climb
  ('scrap-iron', 'the-weighbridge', 0),       -- the mechanism is in the pit, under water
  ('scrap-iron', 'the-road-kiln', 0);
