-- 267 what you cut off a carcass (rome, 2026-08-22).
--
-- Thirteen mob lines in 133 dropped food, and four of those were the crossing's
-- crabs and gulls. A world of deer, boar, goats and hares fed nobody. The
-- mountain was the worst of it: 26 lines, one food drop, off the weakest bird on
-- the hill, five tiers from the nearest gate.
--
-- BIG GRAZERS AND PIGS ONLY. Predators and birds go on giving trophies alone —
-- nobody eats a wolf or a vulture, and the world already says so with the
-- hyena-haunch, which exists because a hyena is what you eat when there is
-- nothing else.
--
-- The meat is a SECOND drop, not a swap: mob_templates has one loot_item, and
-- the trophies are the barter currency the keeper, the board and mig 081's rate
-- table all stand on. You take the hide AND the haunch.
--
-- It rides mob_keys, which is the world's existing second-drop channel — a
-- (template, item, chance) row rolled on every death, with the pack-full spill
-- and the drop line already written. It is only NAMED for keys; nothing in it
-- is key-shaped. So this migration is data and touches no code.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES

-- Between the roe's haunch (11) and rat-meat (5). A goat worked to death on a
-- crag is not a fat animal.
('goat-haunch', 'a goat haunch',
 'The back leg of a hill goat, taken off at the hip and still warm. Dark, close-grained meat with almost no fat on it — the animal spent its life standing on things that would kill you, and it is all sinew and work. It will want cooking, or a long time in the smoke.', 'common', 1, 8, 0, 0, '', 0, 1, 1, 1, 0.0, 0.0, 0, 3, 0, ''),

-- The most meat on any animal in the world.
('boar-side', 'a side of boar',
 'A whole flank off a wild pig, ribs and all, heavy enough that you feel it every step. The fat on it is yellow and there is a great deal of it. This is more food than one person can eat before it turns, which is what the smokehouse is for.', 'common', 1, 13, 0, 0, '', 0, 1, 1, 2, 0.0, 0.0, 0, 5, 0, ''),

-- A meal for one, and the first thing on the mountain a hungry wanderer can eat.
('hare-carcass', 'a hare, paunched',
 'A hill hare, gutted and still in its skin, hanging by the back legs off your hand. There is not much on it and what there is is lean and dark and tastes of the ground it ran on. One person, one sitting.', 'common', 1, 7, 0, 0, '', 0, 1, 1, 1, 0.0, 0.0, 0, 2, 0, ''),

-- THE HIND'S OWN HIDE. She dropped a HARE PELT — a red deer giving up a hare's
-- skin, at 0.2, since the foot of the mountain shipped. The stag beside her
-- correctly gives an antler; this is her half of it. Priced with the wolf pelt:
-- a big skin off a big animal, and nothing rare about it.
('hind-hide', 'a red hind''s hide',
 'The whole skin off a red hind, folded hair-in and heavier than it looks. Deep red-brown, thick through the shoulder and worn thin over the flank where she lay down. It is a good hide and there is a great deal of it.', 'common', 0, 0, 0, 0, '', 0, 1, 1, 1, 0.0, 0.0, 0, 6, 0, '');

-- The hind stops handing out hare skins.
UPDATE mob_templates SET loot_item = 'hind-hide' WHERE id = 'red-hind';

-- ---- who gives up what ------------------------------------------------------
-- Big grazers and pigs, 0.35-0.5. The deer are the surface's best fresh meat and
-- the likeliest cut; the goats are lean and worked and the old billy is mostly
-- horn and grievance.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('red-hind',      'deer-haunch',  0.50),
  ('red-stag',      'deer-haunch',  0.50),
  ('roe-deer',      'deer-haunch',  0.40),
  ('old-boar',      'boar-side',    0.50),
  ('wild-boar',     'boar-side',    0.45),
  ('feral-goat',    'goat-haunch',  0.40),
  ('old-billy',     'goat-haunch',  0.35),
  ('mountain-hare', 'hare-carcass', 0.40),
  ('snow-hare',     'hare-carcass', 0.40);

-- Curing lives in code (CURE_RECIPES, zone-data), so the three new meats join
-- the smokehouse chain there — not here.
