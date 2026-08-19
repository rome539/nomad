-- 247 the rare blood of the mountain (rome, 2026-08-19): variants for the
-- mountain's inhabitants.
--
-- WHAT IT HAD: five, and every one of them on something that EATS GRASS.
--
--     mountain-hare -> snow-hare .15 · feral-goat -> old-billy .10
--     red-hind -> red-stag .12 · hill-wolf -> lead-wolf .10
--     carrion-vulture -> great-vulture .08
--
-- One predator line out of five and not a single person, on a region with
-- twenty-six lines in it. Every OTHER band in the world rolls rare blood on the
-- things that hunt you — the hyena, the crawler, the drowned, the wolf, the boar,
-- the cutpurse, the footpad, the warden, the king himself.
--
-- WHAT A VARIANT IS HERE, read off all thirty-four that already exist: NOT a
-- bigger number. Roughly a third of them keep the base's own trophy and three
-- are outright WEAKER than what they roll off (the fleet rat, the two-hound, the
-- thrice-dead). What changes is what the thing DOES. So every line below earns
-- its place with a BEHAVIOUR — a set membership, or a set it is deliberately
-- kept out of — and the statline follows the world's measured shape: +1 level,
-- hp x1.3-1.5, damage +1-2 at each end, armor +0-1.
--
-- TWO IDEAS DIED ON CONTACT WITH THE EXISTING WORLD, and both deaths were
-- correct: a "covey" for the ptarmigan (the ptarmigan is ALREADY an
-- ALARM_CALLER, and the chough exists for no other purpose than that), and a
-- silent owl (the eagle owl is already the one bird in the game you do not hear
-- coming). Nothing here does a job the mountain was already doing.
--
-- NO VARIANT, ON PURPOSE: the chough (its whole niche is the alarm), the gill
-- adder (two bodies up here; the stone adder is the mountain's snake), the hill
-- eagle (the eyrie-holder IS its escalation, sitting a tier above it), the
-- brooding vulture (four bodies, already aggressive and rooted), the lynx (the
-- cave lion is the cat escalation and a second stealth cat blunts it), and the
-- CAVE LION itself for now — it became an elite in mig 246 and the bear it was
-- modelled on does carry one, so that slot is open, not closed.

-- ---- what the rare blood leaves ---------------------------------------------
-- Four new trophies. The other eight variants keep the base's, which is what
-- two thirds of the world's variants already do.

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed,
   sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('tally-stick', 'a tally stick',
   'A shaft of hazel a foot long, squared off, notched down two faces and round the end and then down the faces again where he ran out of room. A herd counts his beasts onto the hill in the spring and off it in the autumn and the stick is the count. There is no reading it now. Whatever it says, he has gone on adding to it a long time after there was anything left to add.',
   'uncommon', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 6, 0, ''),

  ('bearded-quill', 'a bearded quill',
   'A flight feather two feet long off a bird with a beard of black bristle at the base of its bill, which is a thing almost nobody has been close enough to see. The shaft is thick as a finger and the vane is worn ragged down one side — the side that goes past the rock, every time, on the way up.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 8, 0, ''),

  ('glutton-skull', 'a glutton''s skull',
   'Short, broad and appallingly heavy for its size, with a crest along the top of it where the jaw muscle anchored and a carnassial tooth you would not want to see used. Two of the front teeth are broken off square and the bone has grown back around the stumps. It went on eating for years after that. Whatever it was breaking, it did not stop to heal first.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 14, 0, ''),

  ('pale-scale', 'a pale scale',
   'The same plate off the same animal, and not the same colour at all: this one has gone the white of everything else that has spent long enough up there — the ptarmigan, the ermine, the fox. It is thinner than the grey one and harder, and the bloom on it does not shift when it moves, because there is nothing left in it to shift. It is warm, and it is warm for longer.',
   'legendary', 0, 0, 0, 0, '', 0, 1, 1, 3, 0, 0, 0, 46, 0, '');

-- ---- THE FOOT ---------------------------------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  -- THIEVES + HOARDERS. A raven caches. This is not a fight, it is a robbery
  -- with wings, and the second set means what it takes goes somewhere.
  ('the-old-raven', 'the old raven',
   'Half again the size of the others and it does not go up when you arrive. It walks two steps sideways along the stone, turns its head fully over to put one eye on you, and then goes back to what it was doing, which is working at something with the point of its bill. Ravens live forty years. This one has watched a great many people come up this hill carrying things, and it has learned exactly which of those things it wants.',
   3, 30, 3, 6, 1500, 0, 'raven-feather', 0.45, 0, NULL, 0, 0, 0),

  -- THIEVES, at the foot, where you have least and the door is close.
  ('the-raiding-fox', 'the raiding fox',
   'Bigger than the hill foxes and a great deal bolder, with the coat gone patchy along the flanks from squeezing through places it should not fit. It has found out what a person carrying a pack is: a thing that is slow, that cannot follow, and that has to put the pack down eventually. It is not frightened of you. It has done this before and it has never once been caught.',
   3, 28, 3, 5, 1200, 0, 'fox-brush', 0.45, 0, NULL, 0, 0, 0),

  -- VITALS_THREATS. A stoat kills by biting the base of the skull, and that
  -- mechanic already exists in this engine. Twenty hit points that can end you.
  ('the-dancer', 'the dancer',
   'It comes at you in a way nothing else does — not a line but a series of them, up on its hind legs and down, sideways, over, twisting in the air for no reason you can see, closer each time and never once where you last looked. Country people had a name for this and would not say it after dark. Whatever it is for, it is not for you: it is what this animal does to a rabbit four times its weight, just before it goes over the shoulder and finds the back of the neck.',
   3, 22, 3, 6, 900, 0, 'ermine-skin', 0.45, 0, NULL, 0, 2, 0),

  -- PACK_CALLERS. The dog is the one line up here that set was written for.
  ('the-last-dog', 'the last dog',
   'The rest are thin. This one is not, and there is no good reason for that. It comes off the slope at a flat run the moment it has you, stops dead at ten yards, and drops — chest down, eyes on you, one paw lifted — because that is what it does to a thing it means to move, and it means to move you. Then it lifts its head and calls, once, up the hill. Something up there has always answered.',
   3, 34, 4, 7, 1200, 0, 'dogs-collar', 0.40, 0, NULL, 0, 0, 0),

  -- Out of nothing, into AGGRESSIVE and out of the flee branch: he does not
  -- hold a line any more.
  ('the-one-who-stayed', 'the one who stayed',
   'He is not standing at the top of the pasture. He is coming down it, at the pace a man walks when he has decided something, with the stick held down along his leg instead of across him. The frock has gone through at both elbows and been mended and gone through again. He came up with the others in the spring of a year nobody now counts and he did not go down with them, and every season since has been him alone on this hill with the work and no flock and no reason and no way off it that he was willing to take.',
   4, 48, 5, 8, 1800, 0, 'tally-stick', 0.45, 1, 'thick-hide-jack', 0.28, 0, 0),

  -- LISTENERS: she works by ear and stops when you move. And she carries.
  ('the-butter-wife', 'the butter wife',
   'The pail in her lap is not dry. She has the churn between her knees and she is working it in a slow figure that has not changed in a very long while, and there is a sound coming off it that a churn makes only when there is something in it. She does not look up. When you shift your feet she stops — completely, mid-stroke — and holds it, listening, with her head turned a little away from you. Then she starts again. Whatever she is making, she is still making it, and somebody is still eating it.',
   4, 44, 5, 8, 1800, 0, 'butter-print', 0.45, 0, 'hide-cloak', 0.28, 0, 0);

-- ---- THE MIDDLE AND THE CLOUD LINE ------------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  -- Kept OUT of the flee branch by weight of hp and bleed rather than a set:
  -- what makes it read is that it does not give ground, and the bleed is why.
  ('the-gravid-adder', 'the gravid adder',
   'Thicker through the middle than an adder has any business being, and it does not go. Every other snake on this mountain is gone into the stones before you have finished seeing it; this one draws back into a flat coil on the warm rock and stays exactly where it is, because it is carrying and there is nowhere it can go that is this warm. It will let you get closer than is wise. It has already decided what happens if you do.',
   4, 30, 5, 8, 1200, 0, 'stone-adder-skin', 0.45, 0, NULL, 0, 3, 0),

  -- STARVE_HUNTERS: the morph that cannot hide, so it does not wait.
  ('the-blue-fox', 'the blue fox',
   'It never turned. Every fox up here goes white for the winter and this one has stayed the colour of wet slate, which on open snow means it can be seen from a mile off by everything it has ever tried to creep up on. It has not eaten properly in a long time and it has stopped pretending to stalk. It simply comes, in the open, at a trot, in full view, because sneaking has never once worked for it and it has nothing left to lose by walking straight at you.',
   4, 34, 4, 7, 1200, 0, 'white-brush', 0.45, 0, NULL, 0, 0, 0),

  -- AGGRESSIVE. Every cat on this mountain waits. This one does not.
  ('the-tom', 'the tom',
   'A wildcat the size of a dog, with a tail like a bottle brush ringed black to a blunt end and a head far too broad for the body. It is not hiding and it is not leaving and it is not doing the thing the others do where they flatten and hope. It is walking toward you with its ears going back, and it has been the largest thing in every argument it has ever had.',
   4, 38, 5, 8, 1500, 0, 'wildcat-pelt', 0.45, 1, NULL, 0, 2, 0);

-- ---- THE HIGH GROUND AND THE TERRITORY --------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  -- THIEVES, and the only one in the world that takes what it takes UPWARD.
  -- A lammergeier's entire living is carrying things up and dropping them on
  -- rock until they come apart. The room list up here is nothing but rock.
  ('the-bone-dropper', 'the bone-dropper',
   'It is standing over the bones with its wings half out and it has a beard — an actual beard, of black bristle, under a bill built for one job. The others here are waiting for something to be dead. This one is not waiting for anything: it takes what it wants up, and it lets go, and the rock does the rest, and it has been doing that to this same terrace for so long that the whole slope below is white with the results. It is looking at what you are carrying the way it looks at a thigh bone.',
   5, 52, 5, 8, 1800, 0, 'bearded-quill', 0.45, 1, NULL, 0, 0, 0),

  -- STARVE_HUNTERS and armor 3, which no other ordinary creature on this
  -- mountain has. The worst animal up here, old.
  ('the-old-glutton', 'the old glutton',
   'The face is wrong. Something took the left side of it a long time ago and it healed the way a thing heals when nobody is helping, and both front teeth are broken off square and grown over. It has gone on eating for years since. It is bigger than the others and slower and it does not care about either, because in all that time nothing on this mountain has managed to make it stop, and it has stopped needing to be quick about anything at all.',
   6, 62, 7, 10, 2400, 0, 'glutton-skull', 0.45, 3, NULL, 0, 1, 0);

-- ---- THE SUMMIT -------------------------------------------------------------
-- The throne's own rule (the forgotten king rolls the drowned god and the marrow
-- king off the same chair): a boss variant is a DIFFERENT INDIVIDUAL with its
-- own trophy, never a bigger copy. One room, two hours, and now you do not know
-- which of them is up there.

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('the-pale-drake', 'the pale drake',
   'It is lying where the other one lies and it is not the other one. This one has gone white — not the white of snow on it but the white of the thing itself, the way the ptarmigan goes and the ermine goes and the fox goes, and it is the only animal on this mountain big enough that you would never have expected it to. The eye it opens has no colour in it either. It is thinner than it should be for the length of it, and older than anything else here by a margin that does not bear thinking about, and it has not needed to hurry in a very long time.',
   7, 160, 8, 13, 7200, 1, 'pale-scale', 0.60, 3, NULL, 0, 3, 0.12);

-- ---- the rolls --------------------------------------------------------------
-- Odds follow the world's own band: common blood .10-.15, a real escalation
-- .05-.08, and the throne's own .12-.15 because there is only ever one of it.

INSERT INTO mob_variants (base_id, variant_id, chance) VALUES
  ('scarp-raven',   'the-old-raven',      0.06),
  ('hill-fox',      'the-raiding-fox',    0.08),
  ('ermine',        'the-dancer',         0.06),
  ('a-fold-dog',    'the-last-dog',       0.10),
  ('the-herd',      'the-one-who-stayed', 0.08),
  ('the-milker',    'the-butter-wife',    0.06),
  ('stone-adder',   'the-gravid-adder',   0.05),
  ('snow-fox',      'the-blue-fox',       0.06),
  ('wildcat',       'the-tom',            0.08),
  ('bone-breaker',  'the-bone-dropper',   0.05),
  ('glutton',       'the-old-glutton',    0.05),
  ('the-drake',     'the-pale-drake',     0.12);
