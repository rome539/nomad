-- 231 what lives at the cloud line (rome, 2026-08-19). Mig 230 is 80 rooms of
-- the mountain's third tier. This is what is on them.
--
-- THE RULING HOLDS for the third file running: the mountain is NOT FOR PEOPLE.
-- No institution, no leavings, nothing still at its post. Tier one was where we
-- stop, tier two was four countries at one altitude with no opinion about us,
-- and this tier is the one where you cannot see. Everything below reads off
-- that.
--
-- DENSITY 0.8, against the middle's 0.6 and the foot's 0.4 — 64 spawns over 80
-- rooms (85 and 68 after tier four added two more ways up). Third time this has to be said because it is the load-bearing decision
-- of the whole region: THE CURVE IS DENSITY, NOT STATLINE. The hardest thing in
-- this world takes 15-17 rounds to kill and puts a medium build down in 10, and
-- there is no headroom left above that. A tier that got harder by inflating hp
-- would break the table for every region at once. This one gets harder by being
-- crowded, by being blind, and by containing a pack.
--
-- THE PACK IS THE TIER. Everything else here is one animal you can see coming.
-- The hill wolves are not individually a step up from the lynx below them — one
-- of them is a smaller animal than a lynx and loses to it. What they are is
-- SEVEN spawns of a line that calls, in a country where the cloud sits all day
-- and a called-in second wolf is not a second wolf, it is a wolf you did not
-- watch arrive. DOGPILE_CAP is 3, so the ceiling on what can actually land a
-- blow is fixed and known; the pack does not break the damage table, it just
-- means you never fight one thing here.
--
-- AND THE STAG STOPS BEING UNTOUCHABLE, which mig 227 and mig 229 both promised
-- in writing. Nothing at the foot could take him. The lynx could take a hind and
-- not him. Here, three wolves can, and a lead wolf can alone — see PACK_PREY,
-- where red-stag needs a strength of 3 and red-hind needs 2. That is the payoff
-- of having written the promise down twice rather than a new rule.
--
-- FOUR NEW LINES, and the same bar as always — each does something no line in
-- this world already does:
--
--     hill wolf    36hp 4-7 a1  the pack. Alone: hare, ptarmigan. Two: the goat
--                               and the hind. Three: the stag.
--     the lead wolf 54hp 6-9 a1 (variant) rare blood off the hill wolf, and the
--                               one animal on this mountain that takes a stag
--                               without help.
--     a glutton    50hp 6-9 a2  the thief. Kills small, and takes big off
--                               whatever killed it. Armor 2 — the only thing up
--                               here that punishes a fast weapon.
--     a bone-breaker 44hp 4-7   eats BONE, and nothing else. A pure scavenger
--                               with no prey map at all, which no other line in
--                               the game is: everything that scavenges here also
--                               hunts. This one waits for the wolves.
--
-- WHY A NEW WOLF AND NOT THE GREY WOLF. Reuse is the standing principle and it
-- is why nine of this tier's lines already exist. The wolf is the exception on
-- purpose: grey-wolf is the WOOD's animal and it stands in eleven tables that
-- the wood's balance is measured against — PACK_PREY, STARVE_HUNTERS, the moon
-- howl, the retreat-cutting. Giving it a mountain prey map to let it take a stag
-- would have changed what a wolf does forty rooms away in a region nobody asked
-- me to touch. A separate line costs one template and changes nothing anywhere
-- else.
--
-- THE ICE HAS THREE SPAWNS IN NINE ROOMS, deliberately, and it is the same move
-- the lochan made in mig 229. The neve, the ice fall, the crevasse field, the
-- blue wall, the bergschrund, the ice shelf, the rime, the cornice, the cold
-- crest: nothing lives on permanent ice, because there is nothing on permanent
-- ice to eat. An ermine crossing it, a raven on the cornice, and the
-- bone-breaker working the crevasses for what fell in, and that is all. It
-- makes the ice a CORRIDOR rather than a country, which is what ice is.
--
-- NO ADDERS ON THIS TIER, for the same kind of reason. The sun shelves are the
-- warm side and the warm slabs below them carry two, but a reptile has an
-- altitude and this is above it. An absence the ground states out loud.
--
-- THE WEB, closed inside the band as it has to be ('mountain' is not in
-- MIGRATE_BANDS, so nothing walks up from the road to stock this ground):
--
--     ptarmigan 10 · hare 12 · snow hare 16 · ermine 18
--     hind 30 · goat 26 · stag 48
--     raven 20 · fox 22 · wildcat 28 · eagle 34 · owl 40
--     bone-breaker 44 · glutton 50 · lynx 52 · hill wolf 36 (x3) · lead wolf 54
--
--     hill wolf   -> hare, snow hare, ptarmigan       alone
--                 -> goat, hind                       two of them
--                 -> stag                             three
--     lead wolf   -> all of the above, alone. 54/6-9 against 48/4-8 is thin,
--                    which is right: he wins it, and not easily.
--     glutton     -> hare, snow hare, ptarmigan, ERMINE, and it SCAVENGES, which
--                    is where it actually eats. 50/6-9 against 18/3-5 is clean.
--     bone-breaker-> nothing. SCAVENGERS only, and that is the whole animal.

-- ---- what they leave -------------------------------------------------------
-- Trophies. Nothing up here has hands, so nothing up here carries gear, and the
-- cigarette law (mig 186) goes on not applying to the mountain.

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed,
   sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('hill-wolf-pelt', 'a hill wolf''s pelt',
   'Grey going to cream underneath, and longer in the guard hair than any wolf that lives lower down — it stands out from the skin rather than lying along it, which is what keeps the weather off. There is old scarring across the shoulder that healed while the animal went on working. Nothing that hunts in company gets to stop and mend.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 1, 0, 0, 0, 6, 0, ''),

  ('wolf-ruff', 'a wolf''s ruff',
   'The mane off the neck and shoulders of something that was leading, taken whole: a hand''s depth of hair standing off in every direction, pale at the roots and near-black at the tips. On the animal it made him look half again his size when he wanted to, and the point of that was never you. It was the others.',
   'epic', 0, 0, 0, 0, '', 0, 1, 1, 1, 0, 0, 0, 10, 0, ''),

  ('glutton-pelt', 'a glutton''s pelt',
   'Dark brown with a pale band sweeping down each flank, coarse, oily, and so dense you cannot part it to the skin with your fingers. Breathe on it in the cold and the frost does not take — the one fur that never ices up, which is why anyone who ever had to sleep out up here wanted this and no other.',
   'epic', 0, 0, 0, 0, '', 0, 1, 1, 2, 0, 0, 0, 9, 0, ''),

  ('stained-quill', 'a rust-stained quill',
   'A flight feather longer than your forearm, black-grey along the vane and stained a deep rust-orange for its whole length. Nothing bled on it. The bird does that to itself, deliberately, bathing in iron mud, and no one has ever been able to say why a creature that eats bone should care what colour it is.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 6, 0, ''),

  ('cracked-marrowbone', 'a cracked marrowbone',
   'A leg bone off something the size of a deer, dropped from a height onto rock until it split lengthwise, and cleaned out. The break is not a break an animal''s teeth make. Somebody carried this up, let go of it, and came down after it, and did that as many times as it took.',
   'common', 1, 5, 1, 0, '', 0, 1, 1, 0, 0, 0, 0, 3, 0, '');

-- ---- who lives here --------------------------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  -- THE PACK. One is a manageable animal. One is also almost never what is
  -- standing there, and in cloud you find out which after it matters.
  ('hill-wolf', 'a hill wolf',
   'Long in the leg and light through the body, grey with the cream showing at the throat, and it is standing side-on to you at a distance it has chosen. It is not looking at you directly and it has not stopped moving — a slow drift across the slope that never quite closes and never quite opens. Somewhere behind the cloud another one is doing the same thing.',
   4, 36, 4, 7, 720, 0, 'hill-wolf-pelt', 0.4, 1, NULL, 0, 2, 0),

  -- THE LEAD WOLF. Rare blood off the line, the same way the stag comes up out
  -- of the hind. The animal the last two migrations kept promising.
  ('lead-wolf', 'a lead wolf',
   'Half again the size of the others and carrying a ruff that doubles his neck, standing square where they stand side-on, and looking at you the way none of them will. He does not drift. Everything else on this slope is arranged around where he is, including the things that have not seen him, and including now you.',
   5, 54, 6, 9, 1500, 0, 'wolf-ruff', 0.45, 1, NULL, 0, 3, 0),

  -- THE GLUTTON. Not fast, not clever, and not leaving.
  ('glutton', 'a glutton',
   'Low, humped, and far heavier than the size of it explains, with a bear''s gait and a bear''s indifference and a pale band swept down each flank. It has its head in something that was killed by something else. It looks up, works out exactly what you are, and puts its head back down, and that is the whole of its opinion.',
   5, 50, 6, 9, 1200, 0, 'glutton-pelt', 0.35, 2, NULL, 0, 3, 0.1),

  -- THE BONE-BREAKER. The one pure scavenger in the game: no prey, no hunt, and
  -- an entire animal built round the last part of a carcass nothing else wants.
  ('bone-breaker', 'a bone-breaker',
   'A vulture that is not shaped like one — narrow, long-tailed, rust-red underneath, and it goes past below you along the face with the wings held dead still. It carries something pale in its feet, climbs, and drops it on the rocks, and the sound comes up a moment after. Then it goes down after the pieces. It has no use for anything on you that is not bone.',
   4, 44, 4, 7, 900, 0, 'stained-quill', 0.4, 0, NULL, 0, 2, 0);

-- The lead wolf comes up out of the pack the way the stag comes up out of the
-- hinds and the old billy out of the goats: rare blood on a refill, counted
-- against the line's own cap, never a population of its own.
INSERT INTO mob_variants (base_id, variant_id, chance) VALUES ('hill-wolf', 'lead-wolf', 0.1);

-- The bone-breaker's own leavings, on the ground it makes them on. Not a drop —
-- a thing lying in a room, because the whole animal is a story about dropping
-- something from a height onto rock, and the rock should have some on it.
--
-- regrows = 1, which does NOT mean "it comes back" (mig 213). A regrowing row
-- goes through the dice floor-renewal law — taking it schedules a check and the
-- world ROLLS whether it puts another there. That is exactly right for this one:
-- the bird is still working, so the rock keeps getting bones on it, but four
-- rooms of free food on a fixed timer is the infinite-armoury bug wearing a
-- different hat. It heals 5, which is a mouthful, not a meal.
INSERT OR IGNORE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('cracked-marrowbone', 'the-hanging-scree', 1),
  ('cracked-marrowbone', 'the-fall-line',     1),
  ('cracked-marrowbone', 'the-outwash',       1),
  ('cracked-marrowbone', 'the-stone-run',     1);

-- ---- where they stand ------------------------------------------------------
-- 68 spawns over 85 rooms. The three sanctuaries carry nothing (the under-rib,
-- the clear window, the tarn edge) — a spawn in a room nothing may enter is a
-- body that never gets eaten and never gets fought.

INSERT INTO mob_spawns (room_id, template_id) VALUES
  -- THE RAKE TOP: what the ramp delivers you onto, and the first wolves.
  ('the-rake-top', 'hill-wolf'),
  ('the-first-buttress', 'scarp-raven'),
  ('the-rib-foot', 'mountain-hare'),
  ('the-rib-gap', 'ptarmigan'),
  ('the-second-rib', 'feral-goat'),
  ('the-hanging-scree', 'hill-wolf'),
  ('the-fall-line', 'glutton'),

  -- THE ARETE: air on both sides, so it is birds and the one animal that walks
  -- a ledge better than you do.
  ('the-arete-foot', 'feral-goat'),
  ('the-first-tower', 'hill-eagle'),
  ('the-notch-of-air', 'scarp-raven'),
  ('the-second-tower', 'feral-goat'),
  ('the-arete-walk', 'ptarmigan'),
  ('the-bad-step', 'scarp-raven'),
  ('the-horns', 'hill-eagle'),
  ('the-arete-end', 'bone-breaker'),

  -- THE HANGING VALLEY: the grazing, the water, and therefore the pack.
  ('the-valley-mouth', 'hill-wolf'),
  ('the-hanging-floor', 'red-hind'),
  ('the-upper-lochan', 'red-hind'),
  ('the-far-shore-high', 'mountain-hare'),
  ('the-valley-head', 'hill-wolf'),
  ('the-moraine-loop', 'mountain-hare'),
  ('the-outwash', 'ptarmigan'),
  ('the-braided-flats', 'red-hind'),
  ('the-till', 'mountain-hare'),
  ('the-step-in-the-floor', 'ermine'),
  ('the-valley-shoulder', 'hill-wolf'),
  ('the-south-bank', 'lynx'),

  -- THE CLOUD: where you cannot see, which is why two more wolves and the
  -- second glutton are here rather than anywhere else.
  ('the-cloud-base', 'hill-wolf'),
  ('the-white-out', 'glutton'),
  ('the-grey-nothing', 'hill-wolf'),
  ('the-inversion', 'eagle-owl'),
  ('the-brocken', 'scarp-raven'),
  ('the-standing-cloud', 'eagle-owl'),
  ('the-cloud-foot', 'mountain-hare'),
  ('the-rising-ground', 'ptarmigan'),

  -- THE PERMANENT ICE: three, in nine rooms, and that is the point of it.
  ('the-neve', 'ermine'),
  ('the-crevasse-field', 'bone-breaker'),
  ('the-cornice', 'scarp-raven'),

  -- THE NORTH SPUR: a bare rib with a tarn on it and no cover for its length.
  ('the-crown-step', 'ptarmigan'),
  ('the-north-rib', 'mountain-hare'),
  ('the-spur-walk', 'ptarmigan'),
  ('the-spur-head', 'hill-eagle'),
  ('the-wind-scoop', 'ermine'),
  ('the-cold-plateau', 'ptarmigan'),
  ('the-frost-pavement', 'mountain-hare'),
  ('the-stripe-field', 'ptarmigan'),
  ('the-high-tarn', 'red-hind'),
  ('the-spur-end', 'eagle-owl'),
  ('the-lee-drift', 'mountain-hare'),

  -- THE SOUTH SHELVES: the sun side. The only pleasant walking on this tier and
  -- the only ground with cover on it, which is why the ambushers are here.
  ('the-shelf-head', 'feral-goat'),
  ('the-long-shelf', 'mountain-hare'),
  ('the-shelf-break', 'hill-fox'),
  ('the-upper-heather', 'red-hind'),
  ('the-last-green', 'red-hind'),
  ('the-stone-run', 'feral-goat'),
  ('the-sun-buttress', 'wildcat'),
  ('the-warm-gully', 'hill-fox'),
  ('the-shelf-end', 'feral-goat'),
  ('the-scoop-of-grass', 'red-hind'),
  ('the-high-spring', 'mountain-hare'),
  ('the-dry-shelf', 'lynx'),
  ('the-sun-notch', 'wildcat'),
  ('the-last-shelf', 'lynx'),
  ('the-shelf-drop', 'glutton'),

  -- THE TWO WAYS UP added with tier four: the cold ramp on the shaded side and
  -- the ledge traverse on the warm one. The ledge gets the pair that the room
  -- text says keep an appointment on it — something that eats there, and
  -- something that waits there.
  ('the-cold-ramp', 'ptarmigan'),
  ('the-hot-ledge', 'feral-goat'),
  ('the-dry-ledge', 'lynx'),
  ('the-heather-step', 'mountain-hare');
