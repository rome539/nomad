-- 233 what lives on the high ground (rome, 2026-08-19). Mig 232 is 79 rooms of
-- the mountain's fourth tier. This is what is on them.
--
-- THE RULING HOLDS for the fourth file running: the mountain is NOT FOR PEOPLE.
-- Nobody has been up here, nothing is still at its post, and every line below is
-- an animal doing what it does.
--
-- THE TIER'S ONE IDEA IS THAT NOTHING IS PRODUCED HERE. Below the cloud line
-- the mountain still grows something and every mouth on it is eating the ground
-- or eating a thing that ate the ground. Above the cloud there is no ground:
-- eleven rooms in mig 232 grow anything at all and none of it is worth a
-- mouthful. So the web inverts. Food is DELIVERED — off the face, out of the
-- ice, up on its own legs — and it collects on one fan under the whole
-- mountain, and what lives up here lives on that fan.
--
-- WHICH IS A MECHANISM AND NOT A MOOD, and this migration does not ship until
-- the code agrees with it. THE BONE GROUND IS CARRION_ROOMS (zone-data) and a
-- scavenger now gnaws carrion ground the way a grazer gnaws forage (ai.ts,
-- creatureEatsHere). Without that, a scavenger's only feeding route is a corpse
-- lying in its room, and the twenty-eight of them below would have banked hunger
-- to the cap and sat there advertising it forever — the same bug this world has
-- now shipped three times. THE FICTION WAS ALREADY GIVING THE ANSWER; the code
-- was the part that had not been told.
--
-- DENSITY 1.0 — 76 spawns over 79 rooms, against the cloud line's 0.8, the
-- middle's 0.6 and the foot's 0.4. Fourth time it needs saying: THE CURVE IS
-- DENSITY, NOT STATLINE. Nothing new here outstats the lead wolf.
--
-- THREE NEW LINES AND ONE NEW BLOODLINE, each earning its place:
--
--     snow fox         26hp 3-5 a0  the follower. Too small to make a kill
--                                   worth having and built entirely around
--                                   being where a bigger thing has just eaten.
--     carrion vulture  40hp 4-6 a0  the NUMBERS. Nine of them, and they call
--                                   each other in, so the fan is never one bird.
--     a chough         12hp 1-2 a0  harmless, and the worst thing on the tier to
--                                   have behind you: it follows and it SHOUTS.
--                                   An ALARM_CALLER with no other purpose.
--     a great vulture  56hp 5-8 a1  (variant) rare blood off the carrion
--                                   vulture. The biggest bird in the game and
--                                   the thing that owns the fan when it is there.
--
-- WHAT IS NOT HERE, and each absence is a decision:
--
--   NO GOAT, NO HIND, NO STAG. There is nothing to browse. The deer country is
--   two tiers down and a goat on a bone fan is a goat that starves at the cap.
--   The grazers up here are the ptarmigan and the hare, both of which live off
--   what is under the snow at the edges, and both of which are thin.
--
--   NO NEW APEX. The obvious move for a fourth tier is a bigger bear and it
--   would be wrong: the-baited-bear is 76hp/7-12/a2 and is already the hardest
--   thing in the world outside a boss, so a second one is a lateral copy that
--   teaches the player nothing. What makes this tier hard is that there are 79
--   bodies on 79 rooms, that a third of them call for company, and that you are
--   four tiers from a bank the whole time.
--
--   AND NOTHING THAT ACCOUNTS FOR THE LEAVINGS. Mig 232 puts three things on
--   this ground with no explanation on this roster: bones too big for anything
--   in this file, a nesting shelf whose nests have been empty for years, and a
--   swept floor that the wind cannot have swept because the wind up here comes
--   from one direction. Whatever does that is one tier up. It is deliberately
--   not in this migration and the player is meant to arrive at it from the
--   leavings, the way you would in a real place.
--
-- THE WEB:
--
--     ptarmigan 10 · hare 12 · chough 12 · snow hare 16 · ermine 18
--     raven 20 · snow fox 26 · vulture 40 · bone-breaker 44 · glutton 50
--     hill wolf 36 (and they call) · lynx 52 · great vulture 56
--
--     wolf, lynx, eagle, owl  -> the hare and the ptarmigan, as everywhere else
--     snow fox                -> chough, ptarmigan, hare. 26/3-5 against 12/1-2
--                                is clean, and the fox eats mostly by following.
--     vulture, great vulture  -> NOTHING. Both are SCAVENGERS only, like the
--                                bone-breaker, and the fan is what feeds them.
--     glutton                 -> as before, and it takes a carcass off any of
--                                the above that is not the great vulture.

-- ---- what they leave -------------------------------------------------------

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed,
   sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('white-brush', 'a white brush',
   'A fox''s tail taken in the winter coat, white to the root and so dense that closing your hand on it your fingers do not meet. There is a grey shadow along the top of it where the summer colour is waiting. It weighs almost nothing and it is the warmest thing you have ever held.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 6, 0, ''),

  ('vulture-quill', 'a vulture''s quill',
   'A primary feather as long as your arm, the vane worn ragged at the tip from a lifetime of turning against rock. The shaft is thicker than a finger and hollow and strong enough to lean on. Held up to the light there is old blood dried into the base of it that is not the bird''s.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 4, 0, ''),

  ('bald-head', 'a bald head',
   'The head and long naked neck of something very large that ate with its whole face for forty years, the skin of it grey-pink and creased and entirely featherless from the shoulders up, which is the only way a bird gets to do that work and stay clean. The eye is the size of a coin and there is nothing gentle about the shape of it.',
   'epic', 0, 0, 0, 0, '', 0, 1, 1, 1, 0, 0, 0, 9, 0, ''),

  ('red-legs', 'a pair of red legs',
   'The legs and curved red bill of a small black bird, kept because the colour of them is startling against everything at this height and because there is nothing else of it worth keeping. It was the noisiest thing on the mountain until very recently.',
   'common', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 2, 0, ''),

  ('frozen-haunch', 'a frozen haunch',
   'A hind leg off something the size of a deer, come out of the ice at the glacier''s toe in perfect condition and still frozen through, with the hair on and the cut end glassy. It is not old the way meat gets old. It is old the way a thing is old that stopped being anywhere weather could reach it, a very long time ago, and it will feed you.',
   'uncommon', 1, 14, 1, 0, '', 0, 1, 1, 2, 0, 0, 0, 5, 0, '');

-- ---- who lives here --------------------------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('snow-fox', 'a snow fox',
   'White from nose to brush and round-eared and much smaller than the foxes lower down, sitting at forty paces watching you with its tail curled over its feet. It is not afraid and it is not interested in you either. It is waiting to see whether you are going to leave something, and it will wait a very long time to find out.',
   3, 26, 3, 5, 480, 0, 'white-brush', 0.4, 0, NULL, 0, 1, 0),

  ('mountain-chough', 'a chough',
   'A crow the size of a jackdaw, black all over with a curved bill and legs of a red so bright it looks painted on, and it lands ten feet away and looks at you sideways and screams. Then it does it again. Everything within half a mile now knows the exact spot you are standing in, and it is going to follow you to the next one.',
   1, 12, 1, 2, 300, 0, 'red-legs', 0.45, 0, NULL, 0, 0, 0),

  -- THE NUMBERS. One is nothing. There are never one.
  ('carrion-vulture', 'a carrion vulture',
   'Hunched on the rock with its wings half open to the sun and its bald neck sunk between them, and it does not move as you come up, because moving is expensive and you are not yet food. When it does go it takes three heavy strides downhill and falls off the edge into the air and is instantly better at this than anything else on the mountain.',
   4, 40, 4, 6, 780, 0, 'vulture-quill', 0.5, 0, NULL, 0, 2, 0),

  -- ...and what the numbers are arranged around when it is there.
  ('great-vulture', 'a great vulture',
   'The wings when it opens them are wider than the room and the shadow crosses everything on the fan at once. The others go up off the carcass without any argument at all and stand about at a distance, and it comes down into the space they left and puts its whole head inside the ribs of the thing on the ground. It is aware of you. It has weighed you against what it is eating.',
   5, 56, 5, 8, 1800, 0, 'bald-head', 0.4, 1, NULL, 0, 3, 0);

-- Rare blood off the wake, the same way the stag comes off the hind and the lead
-- wolf off the pack: counted against the line's own cap, never its own crowd.
INSERT INTO mob_variants (base_id, variant_id, chance) VALUES ('carrion-vulture', 'great-vulture', 0.08);

-- ---- what the ice gives back -----------------------------------------------
-- The glacier's toe hands out what it swallowed at the top, decades later and
-- unspoiled, and this is the only real food on the tier. regrows = 1, which is
-- the dice floor-renewal law (mig 213) rather than a timer — the ice keeps
-- producing, on its own schedule, and never on demand.
INSERT OR IGNORE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('frozen-haunch', 'the-glacier-toe', 1),
  ('frozen-haunch', 'the-melt-run',    1),
  ('frozen-haunch', 'the-melt-lip',    1);

-- ---- where they stand ------------------------------------------------------
-- 76 spawns over 79 rooms, and the arithmetic is exact rather than approximate:
-- the three sanctuaries carry nothing (the snow hollow, the drift hollow, the
-- rib cage) and EVERY OTHER ROOM ON THE TIER CARRIES ONE. Density 1.0 across the
-- ground you can be caught on, which is the first tier of this mountain where
-- there is no empty room to stop and think in.

INSERT INTO mob_spawns (room_id, template_id) VALUES
  -- THE SNOWFIELD: open ground, no cover, and the thin end of the prey base.
  ('the-upper-brim', 'ptarmigan'),
  ('the-frost-face', 'scarp-raven'),
  ('the-snow-brim', 'ptarmigan'),
  ('the-high-neve', 'hill-wolf'),
  ('the-drift-foot', 'mountain-hare'),
  ('the-white-slope', 'mountain-hare'),
  ('the-wind-slab', 'ptarmigan'),
  ('the-sun-cup', 'mountain-hare'),
  ('the-snow-dome', 'hill-eagle'),
  ('the-broken-crust', 'hill-wolf'),
  ('the-runnel', 'ermine'),
  ('the-hard-pack', 'ptarmigan'),
  ('the-blue-shadow', 'snow-fox'),
  ('the-snow-tongue', 'hill-wolf'),
  ('the-tongue-foot', 'glutton'),

  -- THE BONE GROUND: the fan, and the reason anything is up here at all. This
  -- is where the density lands — the carrion rooms carry the wake.
  ('the-shelf-tail', 'mountain-chough'),
  ('the-fall-fan', 'scarp-raven'),
  ('the-bone-ground', 'carrion-vulture'),
  ('the-catch-slope', 'carrion-vulture'),
  ('the-boulder-nose', 'scarp-raven'),
  ('the-splinter-field', 'carrion-vulture'),
  ('the-lower-fan', 'snow-fox'),
  ('the-grey-run', 'carrion-vulture'),
  ('the-scoured-flat', 'bone-breaker'),
  ('the-dry-bones', 'bone-breaker'),
  ('the-last-fan', 'snow-fox'),

  -- THE RED SCREE: dead ground, and the things that cross it on the way to the
  -- fan. The gully is the one piece of cover in the whole red bowl.
  ('the-red-edge', 'ptarmigan'),
  ('the-oxide-flat', 'mountain-chough'),
  ('the-burnt-ground', 'snow-fox'),
  ('the-high-red', 'hill-eagle'),
  ('the-red-scree', 'mountain-hare'),
  ('the-iron-band', 'scarp-raven'),
  ('the-ochre-shelf', 'carrion-vulture'),
  ('the-scree-head', 'bone-breaker'),
  ('the-rust-slope', 'mountain-hare'),
  ('the-stained-run', 'ermine'),
  ('the-red-gully', 'lynx'),
  ('the-gully-top', 'eagle-owl'),

  -- THE KNIFE RIDGE: birds, and the two things that walk a ledge better than
  -- you do. Nothing on the ridge is a surprise; the ridge itself is.
  ('the-crest-step', 'scarp-raven'),
  ('the-first-notch', 'ptarmigan'),
  ('the-knife', 'mountain-chough'),
  ('the-north-drop', 'eagle-owl'),
  ('the-second-notch', 'snow-fox'),
  ('the-gendarme', 'hill-eagle'),
  ('the-ridge-walk', 'scarp-raven'),
  ('the-wind-tooth', 'carrion-vulture'),
  ('the-third-notch', 'ermine'),
  ('the-lean', 'glutton'),
  ('the-ridge-end', 'mountain-hare'),
  ('the-last-tooth', 'hill-eagle'),
  ('the-ridge-drop', 'bone-breaker'),

  -- THE GLACIER: ice carries almost nothing, and what is on it is crossing it.
  -- The toe is the exception, because the toe is where the ice hands things back.
  ('the-serac-field', 'scarp-raven'),
  ('the-ice-blocks', 'ermine'),
  ('the-crevasse-lip', 'bone-breaker'),
  ('the-glacier-bend', 'snow-fox'),
  ('the-white-tower', 'hill-wolf'),
  ('the-blue-ice', 'ptarmigan'),
  ('the-slot', 'ermine'),
  ('the-melt-lip', 'carrion-vulture'),
  ('the-ice-plain', 'mountain-hare'),
  ('the-glacier-head', 'hill-wolf'),
  ('the-moulin', 'eagle-owl'),
  ('the-melt-run', 'snow-fox'),
  ('the-glacier-toe', 'glutton'),

  -- THE SCOURED GROUND: the wind has had everything off it. What stands here is
  -- passing through, and the closer to the last rise, the thinner it gets.
  ('the-stone-desert', 'mountain-chough'),
  ('the-swept-ground', 'scarp-raven'),
  ('the-pavement', 'ptarmigan'),
  ('the-cold-terrace', 'snow-fox'),
  ('the-cold-plain', 'hill-wolf'),
  ('the-wind-cut', 'mountain-hare'),
  ('the-approach', 'lynx'),
  ('the-shelf-under', 'carrion-vulture'),
  ('the-last-ground', 'glutton'),
  ('the-summit-foot', 'bone-breaker'),
  ('the-under-shelf', 'carrion-vulture'),

  -- ...and one thing standing at the bottom of the ramp, which is as far as
  -- anything on this mountain is prepared to go.
  ('the-way-up', 'scarp-raven');
