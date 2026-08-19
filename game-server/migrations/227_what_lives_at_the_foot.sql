-- 227 what lives at the foot (rome, 2026-08-18). Mig 226 is 73 rooms of empty
-- ground. This is what is on them.
--
-- THE RULING THIS OBEYS: the mountain is NOT FOR PEOPLE. Every other roster in
-- this world is people, or what people left, or what moved into what people
-- left. The east road got patrollers because a road is a line and the things on
-- a line are travelling it. The Crossing got a workforce because a mile of water
-- is five trades, and the dead out there are still at their shift. Even the
-- wood's animals live inside somebody's old pale, with a keeper walking it.
--
-- There is no institution up here and there never was one, so there is nothing
-- to be still doing. THE FOOT IS ANIMALS. Not one thing in this file is guarding
-- anything, waiting for anybody, or finishing a job — they are eating, or being
-- eaten, or sitting out the weather. The only people on the mountain are the
-- four at the FOOT — the shieling, the stell, the hollow under the erratic, the
-- shelter crag — and they are the exception that draws the line rather than
-- breaking it. All four are on the summer ground, all four came up with the
-- grazing and stayed when it stopped, and there is not one above them. Where
-- the doors end is where the mountain starts.
--
-- WHICH MEANS THE WEB HAS TO CLOSE INSIDE THE BAND, and that is a hard rule
-- rather than a preference. 'mountain' is not in MIGRATE_BANDS — the same
-- decision the Crossing made in mig 191 — so nothing walks up from the road to
-- stock this ground. Every predator here has its prey standing on the same
-- hillside or it starves at the cap advertising it, which is the bug this world
-- has now shipped three times (the crabs on the wrack, the west road's strays,
-- the outworks' rats). Written out so the next tier can be checked against it:
--
--     ptarmigan  10hp 1-2  ]
--     hare       12hp 1-2  ]  the base. Both GRAZERS: they eat the ground,
--     hind       30hp 2-4  ]  which is why the forage rooms in this migration
--     goat       26hp 2-5  ]  are not decoration.
--
--     fox        22hp 2-4  takes hare, ptarmigan            solo, clean
--     wildcat    28hp 4-7  takes hare, ptarmigan            solo, clean
--     eagle      34hp 4-7  takes hare, ptarmigan, GOAT      solo — 34/4-7
--                          against 26hp/2-5 is a genuine outstat, and a bird
--                          this size taking a goat off a ledge is the least
--                          surprising thing on any mountain in the world.
--     raven      20hp      eats what the above leave. Already in SCAVENGERS.
--
-- NOTHING TAKES THE STAG, and that is deliberate rather than an omission. A
-- grown red stag at the foot of a mountain has no predator, and the tier reads
-- better for having one animal in it that simply is not anybody's business. The
-- things that will eventually be able to take one live further up.
--
-- THREE LINES ARE REUSED RATHER THAN INVENTED. The feral goat, the old billy and
-- the scarp raven already exist, already have their sounds, their sleeping
-- lines, their alarm behaviour and their place in four other tables — and all
-- three are mountain animals that were seeded on a scarp because there was no
-- mountain yet. Bringing them here costs nothing and connects this band's web to
-- the one the road already runs.
--
-- DENSITY 0.4 (29 spawns over 73 rooms), which is the shallow end of the
-- region's curve and the thinnest ground in the game bar the dens. Altitude is
-- the difficulty curve; this is the bottom of it.

-- ---- what they leave -------------------------------------------------------
-- Trophies only. Nothing up here carries gear, because nothing up here has
-- hands or pockets — and the cigarette law (mig 186) therefore excludes this
-- whole file without needing to be argued.

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed,
   sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('hare-pelt', 'a hare''s pelt',
   'Winter fur, thick past any use a hare has for it on a hillside this size, and white at the roots where it was going to turn. Held up it weighs nothing at all. Whatever else the mountain does to a thing, it makes it warm first.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 3, 0, ''),

  ('hill-fowl', 'a hill fowl',
   'Plump, close-feathered and heavier in the hand than it looks, with feathered feet that stop it going through snow. The breast is dark meat and there is a good deal of it. Birds that live where nothing else will are always better eating than birds that had a choice.',
   'common', 1, 6, 1, 0, '', 0, 1, 1, 0, 0, 0, 0, 2, 0, ''),

  ('fox-brush', 'a fox''s brush',
   'The tail, and half the animal''s length in it, red going to grey going to a white tip. It is the part of a fox you actually see — the rest is low and quick and the colour of the ground, and this is what goes over the top of the heather after it.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 4, 0, ''),

  ('wildcat-pelt', 'a wildcat''s pelt',
   'Broad-striped, thick, and far bigger than any cat that ever sat by a fire; the tail alone is blunt and ringed and as thick as your wrist. There are old scars across the shoulder that healed badly and did not stop it. Nothing about this animal was ever anybody''s.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 1, 0, 0, 0, 6, 0, ''),

  ('eagle-feather', 'an eagle''s feather',
   'A flight feather the length of your forearm, dark brown going to gold at the shaft, stiff enough to stand on its own point. It was not moulted. Something took this bird, or the bird took something and lost it in the doing.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 7, 0, ''),

  ('stag-antler', 'a stag''s antler',
   'Cast, not cut — the base is a clean concave scar where it let go of the skull, which they do every spring and grow again bigger. Six points on it. The mice have been at the tips, because up here nothing that is made of anything gets to just lie there.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 2, 0, 0, 0, 8, 0, '');

-- ---- who lives here --------------------------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  -- THE BASE. Both graze, both run, and between them they are what everything
  -- else on this hill is eating. Kept cheap on purpose: this is the shallow end.
  ('ptarmigan', 'a ptarmigan',
   'A round grey-and-white bird the exact colours of the rock it is standing on, which is why you are looking at it now and were not a moment ago. It does not fly until you are close enough to regret it, and then it goes off downhill with a noise like a rattle being shaken, and everything on this hillside hears where you are.',
   1, 10, 1, 2, 240, 0, 'hill-fowl', 0.55, 0, NULL, 0, 0, 0),

  ('mountain-hare', 'a mountain hare',
   'Bigger than a hare has any business being, with black tips to its ears and a coat caught halfway between the brown it wears in summer and the white it wears in snow, so that it matches nothing at all just now. It sits absolutely still until the moment it does not, and then it goes uphill, which nothing chasing it expects.',
   1, 12, 1, 2, 240, 0, 'hare-pelt', 0.45, 0, NULL, 0, 0, 0),

  ('red-hind', 'a red hind',
   'Deep red-brown, rangy, and taller at the shoulder than you would credit from a distance, standing in the open with her head up and her ears working independently of each other. She has been aware of you for some time. She is deciding, without hurry, whether you are worth moving for.',
   2, 30, 2, 4, 420, 0, 'hare-pelt', 0.2, 0, NULL, 0, 0, 0),

  -- THE STAG, and nothing on this tier can touch him. A variant of the hind, so
  -- he refills against her cap rather than his own (see rollBloodline).
  ('red-stag', 'a red stag',
   'Head up, antlers back over his shoulders in a spread wider than your arms, and a neck gone thick and maned with the season. He does not move off and he does not look away. Everything else on the mountain has a plan for you; he has simply weighed you, decided, and gone back to what he was doing.',
   3, 48, 4, 8, 900, 0, 'stag-antler', 0.5, 1, NULL, 0, 1, 0),

  -- THE HUNTERS. Small, solitary, and none of them interested in you until the
  -- clock runs out on them.
  ('hill-fox', 'a hill fox',
   'Low and quick and the colour of dead bracken, working the edge of the scree with its nose down and its brush out straight behind it for balance. It knows exactly where you are and has decided you are not the interesting thing here. Something under the stones is.',
   2, 22, 2, 4, 360, 0, 'fox-brush', 0.4, 0, NULL, 0, 1, 0),

  ('wildcat', 'a wildcat',
   'Twice the size of a cat and none of the manner, broad in the head, thick in the tail, banded like the shadow of grass on stone. It has flattened itself against the rock and it is not hiding from you — it is hiding, and you have walked into the middle of it. The ears go back very slowly.',
   3, 28, 4, 7, 480, 0, 'wildcat-pelt', 0.35, 0, NULL, 0, 2, 0),

  ('hill-eagle', 'an eagle',
   'It comes along the face without a wingbeat, close enough that you hear the air come off it, and the shadow crosses you before the bird does. On the ground it is chest-high and walks badly and is the worst thing on this hillside to be near. Nothing up here is its business except what it can carry, and it can carry a great deal.',
   4, 34, 4, 7, 600, 0, 'eagle-feather', 0.4, 0, NULL, 0, 2, 0);

-- The stag comes up out of the hind's line, the same way the old billy comes up
-- out of the goats: rare blood on a refill, not a separate population.
INSERT INTO mob_variants (base_id, variant_id, chance) VALUES ('red-hind', 'red-stag', 0.12);

-- ---- where they stand ------------------------------------------------------
-- 29 spawns over 73 rooms. The grazers are on the ground that grows something,
-- the hunters are on the ground that overlooks it, and the raven is on the rock
-- it has been named for since the map was drawn.

INSERT INTO mob_spawns (room_id, template_id) VALUES
  -- the base, spread across the grazing and the wet
  ('the-wind-flat', 'ptarmigan'),
  ('the-cotton-grass', 'ptarmigan'),
  ('the-hanging-turf', 'ptarmigan'),
  ('the-north-scree', 'ptarmigan'),
  ('the-thorn-scrub', 'mountain-hare'),
  ('the-bracken-slope', 'mountain-hare'),
  ('the-rush-hollow', 'mountain-hare'),
  ('the-boulder-field', 'mountain-hare'),
  ('the-sorted-ground', 'mountain-hare'),
  ('the-goat-track', 'mountain-hare'),
  ('the-quaking-moss', 'mountain-hare'),
  ('the-last-pasture', 'red-hind'),
  ('the-wether-ledge', 'red-hind'),
  ('the-high-fold', 'red-hind'),

  -- the goats, off the scarp at last and onto a mountain. NOT in the stell or
  -- the shelter crag: those are GATES as of the four-doors-at-the-foot ruling,
  -- and a seeded body inside a gate is a body nothing can reach and nothing can
  -- refill (applyArrivals filters entry rooms out of a line's homes) — it would
  -- simply stand in the doorway for the life of the world.
  ('the-turf-wall', 'feral-goat'),
  ('the-rush-hollow', 'feral-goat'),
  ('the-scree-toe', 'feral-goat'),
  ('the-wether-ledge', 'feral-goat'),
  ('the-shattered-rib', 'feral-goat'),
  ('the-slabs', 'feral-goat'),

  -- the hunters
  ('the-peat-hags', 'hill-fox'),
  ('the-moraine-bank', 'hill-fox'),
  ('the-mire-foot', 'hill-fox'),
  ('the-loose-slope', 'wildcat'),
  ('the-cleft', 'wildcat'),
  ('the-crag-shadow', 'hill-eagle'),
  ('the-first-crag', 'hill-eagle'),

  -- and what cleans up after them
  ('the-raven-stone', 'scarp-raven'),
  ('the-gully-foot', 'scarp-raven');
