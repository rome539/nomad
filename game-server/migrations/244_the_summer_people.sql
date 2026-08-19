-- 244 the summer people (rome, 2026-08-19).
--
-- THE COMPLAINT, and it was right: every one of the mountain's 22 lines is an
-- animal. 319 bodies over 398 rooms and not one of them carries anything, says
-- anything, or wants anything. Measured against the rest of the world:
--
--     region      lines   lines carrying gear   people
--     crossing      22            12            drover, eel-cutter, fowler,
--                                               pilot, salt-widow, mason...
--     road          16             7            toll-clerk, warden, miller
--     wood          10             6            woodward, keeper, burner
--     out            8             5            sapper, bellfounder, cutpurse
--     MOUNTAIN      22             0            NONE
--
-- The region's ruling was that the mountain is not FOR people, and I read that
-- as no people at all, which is not what it says and not what the ground says
-- either. Mig 241 laid forty-two pieces of dead men's kit on that floor and did
-- not put one dead man anywhere near it. The foot is named entirely after people
-- who are not in it: the Shieling, the Stell, the Milking Fold, the Turf Wall,
-- the Last Pasture, the Wether Ledge, the High Fold, the Hearth Stone.
--
-- SO: THE SUMMER PEOPLE, and only them. A shieling is a summer hut — you bring
-- the flock up to the high grazing when the snow goes, you live in the hut, you
-- milk and you make butter and you keep the beasts off the crags, and in autumn
-- you bring everything down.
--
-- IT IS NOT SUMMER. Every animal on this mountain is in winter coat — the
-- ptarmigan, the ermine and the snow fox have all gone white, which is a thing
-- this roster has been quietly saying since tier one. The people in this
-- migration did not go down. There is no flock. They are still doing the work.
--
-- That is the whole horror and it is deliberately NOT a supernatural one: no
-- rising, no rot, no HOLLOW, no revenant flag. They are people, they will bleed,
-- and they are exactly as alive as the drover down on the shoals who is still
-- driving stock that is not coming (mig 191). This mountain gets the crossing's
-- register, not the deep's.
--
-- THEY DO NOT COME AT YOU. Deliberately kept out of AGGRESSIVE: the foot is a
-- WAKE POINT since mig 240, and a fresh wanderer with nothing must be able to
-- see a person on a hillside and choose to walk around them. If you start it,
-- they finish it.
--
-- THE STATLINE sits between the foot's animals (lv1-2, 10-30hp) and the
-- crossing's working people (lv4-5, 44-58hp), because that is honestly where
-- they are: not professionals of a killing trade, just hill folk who are strong
-- from the work and have a tool in their hands. lv2-3, 26-36hp. The herd is the
-- hardest thing at the foot and he is still softer than one stone adder a tier
-- up.
--
-- AND THEY CARRY, which is the point rome was actually making. Three lines, two
-- of them with a gear slot, at the crossing's own rates (0.15-0.35). This is the
-- mountain's FIRST gear that comes off a body rather than off the floor.

-- ---- what they leave -------------------------------------------------------
-- Two trophies, both domestic, both worth almost nothing, which is correct: the
-- keeper pays for proof, and the proof that somebody is still keeping a flock up
-- there in the wrong season is worth about as much as a bell.

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed,
   sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('wether-bell', 'a wether''s bell',
   'A flat iron bell off the neck of the lead sheep, the kind you hang on the one beast the rest will follow, so you can find the flock in cloud. The clapper is bound up in a twist of wire — somebody stopped it ringing on purpose. There is no flock on this mountain to find.',
   'common', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 4, 0, ''),

  ('butter-print', 'a butter print',
   'A round of worn sycamore with a shallow mark cut into the face — a fir tree over three notches — for stamping a pat of butter so the buyer knows whose hand made it. The wood is soft with handling and sweet-smelling still. It was cut for somebody who expected to sell butter at the bottom of the hill in the autumn.',
   'common', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 3, 0, '');

-- ---- the people ------------------------------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('the-herd', 'the herd',
   'A man standing at the top of the pasture in a frock coat gone the colour of the ground, with a long stick held across him in both hands the way you hold one when you are turning a flock. He is looking down the fall of the hill at grazing with nothing on it, and every so often he moves three steps along the contour and stands again, keeping a line. He does not look at you when you come up. He has been keeping this line since the season ended and there is nothing on this mountain left to keep it against.',
   3, 36, 4, 7, 1500, 0, 'wether-bell', 0.40, 1, 'drovers-frock', 0.25, 0, 0),

  ('the-milker', 'the milker',
   'She is crouched at the fold wall with a wooden pail braced between her knees and her hands working, steadily, at nothing at all — the same two-handed pull, the same pause to shift her grip, the same glance up the hill between. The pail has been dry so long the staves have shrunk apart. She keeps at it. When you come near she moves over a little on the stone to give you room, and carries on.',
   3, 34, 4, 6, 1500, 0, 'butter-print', 0.40, 0, 'moss-lined-boots', 0.20, 0, 0),

  ('a-fold-dog', 'a fold dog',
   'A rough black-and-white collie running a wide arc out across the slope, low and fast, belly to the heather, cutting in at the top of the swing to turn a flock that is not there. It completes the gather, brings nothing to a heel that is not standing where it used to stand, and goes out to run the arc again. It has been fed by nobody. There is a lot less of it than there was.',
   2, 26, 3, 6, 900, 0, 'dogs-collar', 0.35, 0, NULL, 0, 0, 0);

-- ---- where they are --------------------------------------------------------
-- FOURTEEN BODIES over the foot's 73 rooms, all of them on ground the region
-- already named after this work. Nothing in the four doors and nothing in the
-- Hearth Stone, which is a sanctuary.
--
--   the herd  (5)  the grazing: the pasture, the folds, the ledge, the pass.
--   the milker(4)  the huts and the ground you walk between them.
--   the dog   (5)  ranges widest, because that is what the dog is for.

INSERT INTO mob_spawns (room_id, template_id) VALUES
  ('the-last-pasture',  'the-herd'),
  ('the-high-fold',     'the-herd'),
  ('the-wether-ledge',  'the-herd'),
  ('the-hanging-turf',  'the-herd'),
  ('the-bealach',       'the-herd'),

  ('the-milking-fold',  'the-milker'),
  ('the-turf-wall',     'the-milker'),
  ('the-nettle-ground', 'the-milker'),
  ('the-rush-hollow',   'the-milker'),

  ('the-goat-track',     'a-fold-dog'),
  ('the-bracken-slope',  'a-fold-dog'),
  ('the-cotton-grass',   'a-fold-dog'),
  ('the-first-rise',     'a-fold-dog'),
  ('the-track-head',     'a-fold-dog');
