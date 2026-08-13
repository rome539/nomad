-- 212 the crossing grows rare blood (rome, 2026-08-12: variants for the
-- crossing mobs, and maybe the east road).
--
-- The Crossing had ONE variant in it — the pilot, off the eel cutter — and the
-- east road two. Every other line out there is flat: a wrack crab is a wrack
-- crab is a wrack crab, sixteen times over. The wood has three rare bloods and
-- the fortress five, and they are most of what makes those bands feel like they
-- have weather in them: the walk where the wolf turns out to be the dire one is
-- a different walk.
--
-- WHAT A COUSIN COSTS, measured off all nineteen existing pairs rather than
-- picked by eye — the median is x1.50 hp and x1.29 damage, and the pattern
-- inside it is the part that matters: THE HARDER THE BASE, THE GENTLER THE
-- STEP. The eel cutter (48hp) to the pilot is only x1.17/x1.10, while a 14hp
-- cutpurse to a cutthroat is x1.86/x2.50.
--
-- That pattern is load-bearing here, because the Crossing's bases are ALREADY
-- the hardest tier in the game — which is the thing mig 205 had to clean up.
-- A perfectly legal x1.30 on a 46hp conger lands at 56hp, which would be the
-- 8th toughest non-boss of 77, and four of those at once all in one band is
-- 205's mistake told again. So the small stuff gets a real cousin and the big
-- stuff gets a slight one:
--
--     base            n    ->  cousin              step
--     wrack crab     16    ->  20hp 2-4            x1.43
--     ford eel       10    ->  26hp 3-6            x1.30
--     otter           3    ->  24hp 2-4            x1.33
--     feral goat     14    ->  34hp 3-6            x1.31
--     great gull     11    ->  34hp 4-7            x1.21
--     marsh hound     5    ->  38hp 5-8            x1.19
--     strand thief    3    ->  40hp 4-8            x1.18
--     grey seal       6    ->  46hp 4-8            x1.15
--     conger          8    ->  48hp 6-10           x1.14
--
-- Top new mob is 48hp: level with the dire wolf (52) and the warden captain
-- (52), under the pilot (56), the mason (62), the three-hound (76) — and well
-- under 84hp, which is where bosses actually start (the ferryman). Nothing
-- added here enters the top seven of the roster.
--
-- AND THE CONGER ITSELF STEPS BACK (rome: lower the conger too). At 46hp/6-10
-- it was the second hardest-hitting non-boss in the game behind the three-hound
-- — an ordinary animal you meet eight times on one walk, hitting harder than
-- the old boar and every warden. It goes to 42/5-9, and the OLD conger takes
-- roughly the statline the ordinary one has today. The fight you already know
-- becomes the rare one instead of the default one, which is what a variant is
-- for.
UPDATE mob_templates SET max_hp = 42, dmg_min = 5, dmg_max = 9 WHERE id = 'conger';

-- WHAT THEY ARE WORTH. Measured off all twenty-one existing pairs, because the
-- first pass of this file got it wrong: it gave each cousin the base's trophy
-- at the BASE's rate, which makes the rare blood worth exactly as much as the
-- common one and the whole roll pointless.
--
-- The roster's actual law is that a cousin is always worth more, one of two
-- ways: eleven keep the base's trophy at a much better rate (the old boar 0.4
-- -> 0.7, the dire hyena 0.3 -> 0.6, the pale stalker 0.35 -> 0.65 — call it
-- 1.6x-2x), and ten drop something of their own instead (the dire wolf leaves
-- a wolf SKULL where a grey leaves a pelt).
--
-- These take the first road: the same trophy at roughly 1.6x, capped at 0.85
-- (the albino rat's rate, the highest in the game). A named trophy per cousin
-- would mean nine new item rows, nine barter values and a pass through the
-- trophy table — worth doing, but it is its own ship, not a rider on this one.
--
-- ...WITH ONE EXCEPTION, AND IT IS THE POINT (rome: the oyster knife is a
-- powerful thing to drop that often). The 1.6x law is a law about TROPHIES —
-- bone, horn, pelt, jaw: things whose only use is barter. The strand thief's
-- oyster knife is not one of those. It is a WEAPON: 3 damage, bleed 1, uncommon,
-- barter 9, and the roster is careful about those. Every weapon a cousin drops
-- rides the GEAR slot at a modest rate (the cutthroat's shiv at 0.1, the
-- wayman's at 0.4) precisely so a rare roll cannot flood a band with blades.
--
-- So the wrecker's knife stays at the strand thief's own 0.3. He is worth more
-- than a beachcomber in the fight and in what he wears, not in how many knives
-- the shore is carrying by the end of the week.
--
-- Gear is the other half and the law there is narrower: gear drops from things
-- that WORE it. Of the twenty-one cousins, the ones carrying gear are men and
-- the deep's big blood — a cutthroat's shiv, a warden captain's mace, the
-- pilot's boots. Eight of these nine are animals and get none. The wrecker is
-- the exception, because he is a man who dressed out of other people's ships:
-- his cloak rate goes 0.2 -> 0.3.
--
-- Respawns match the base — a variant does not get its own clock, it rides the
-- base's spawn rows.
INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun) VALUES

  ('devil-crab', 'a devil crab',
   'Half again the size of the others and a different colour under the weed — a deep red-brown, with the shell edged in a pale line like something filed. It does not go sideways out of your way. It turns to face you, lifts both claws above the line of its own back, and waits there, and the waiting is the part that tells you what it is. The fishermen who named this one were not being poetic.',
   2, 20, 2, 4, 600, 0, 'crab-claw', 0.85, 2, NULL, 0, 1, 0),

  ('silver-eel', 'a silver eel',
   'Longer than the others and gone the colour of a knife — belly bright, back near black, the eye grown huge. This is what a ford eel turns into when it has decided to leave: it will run the channel to the sea and it will not feed again once it goes. It is fat with everything it has eaten to get ready, and it is in no mood at all.',
   3, 26, 3, 6, 900, 0, 'pale-eel', 0.65, 0, NULL, 0, 2, 0),

  ('dog-otter', 'a dog otter',
   'The big male, and there is no mistaking him for the others once you have seen the head — broad, scarred across the muzzle, the whiskers gone white on one side. He works this length of the beck and he has driven everything else off it. He is not afraid of you. He has simply not decided yet whether you are worth getting wet for.',
   2, 24, 2, 4, 900, 0, 'otter-pelt', 0.85, 0, NULL, 0, 1, 0),

  ('old-billy', 'an old billy',
   'A rank yellow-eyed thing with a beard gone to felt and horns that sweep back and then out, one of them split along its length and both of them scarred where they have been used. He smells like a room nobody has opened. He does not run with the others, he does not run from anything, and he puts his head down at a distance that suggests he has done the arithmetic before.',
   3, 34, 3, 6, 900, 0, 'goat-horn', 0.8, 0, NULL, 0, 0, 0.14),

  ('black-backed-gull', 'a black-backed gull',
   'The size of a goose, with a back like wet slate and a bill that could open a crab or a skull with the same stroke. The others give it the whole pier. It eats what the tide leaves, and it eats what the other birds have, and on a bad week it eats the other birds. It watches you with one eye and then the other, unhurried, the way a thing does when it is decided.',
   4, 34, 4, 7, 900, 0, 'gull-egg', 0.8, 0, NULL, 0, 2, 0),

  ('a-lymer', 'a lymer',
   'It does not quarter the ground like the others. It came straight, and it is already here, and it has been on your scent since the causeway. A lymer is the hound you put on a line ahead of the pack — the one that finds, so the rest can run. Somebody bred this and somebody trained it and both of them are two hundred years dead, and the dog is still working.',
   4, 38, 5, 8, 1200, 0, 'dogs-collar', 0.65, 1, NULL, 0, 2, 0),

  ('the-wrecker', 'a wrecker',
   'Heavier than the beachcombers, and dressed out of better wardrobes than the strand provides. He did not wait for the sea to give him things. He worked the lights — a lantern walked along the headland on the wrong night, at the wrong height, until something came in trusting it — and he has the patience of a man who has stood in the cold for a whole tide to be paid at the end of it. He is looking at your pack the way he used to look at a hull.',
   4, 40, 4, 8, 1200, 0, 'oyster-knife', 0.3, 2, 'tattered-cloak', 0.3, 2, 0),

  ('bull-seal', 'a bull seal',
   'Forty stone of him up on the shingle, and the neck is the tell — thick as a barrel, scarred white all over in the half-moon shapes of other bulls'' teeth. He holds this haul-out and he holds it against his own kind, which is a harder job than holding it against you. He comes up the stones faster than anything that shape has any business moving, and he does not bite so much as arrive.',
   4, 46, 4, 8, 1200, 0, 'seal-pelt', 0.6, 2, NULL, 0, 2, 0),

  ('old-conger', 'the old conger',
   'The hole in the pier is the same hole. What comes out of it is not the same arm. This one is thicker than your leg where it leaves the stone and you never see the end of it — grey going to green, the skin scarred pale where the stone has taken layers off over the years, and a head on it like a wet boot with the teeth raked backward. It has been in this pier longer than the pier has been broken. It has learned the shape of the gap and it knows exactly how far out it can reach.',
   5, 48, 6, 10, 1500, 0, 'conger-jaw', 0.7, 2, NULL, 0, 2, 0);

-- The rolls. Rarer for the bigger blood, same as the roster already does (the
-- dire wolf at 8%, the albino rat at 3%, the ordinary mean cousins at 10%).
INSERT INTO mob_variants (base_id, variant_id, chance) VALUES
  ('wrack-crab',   'devil-crab',        0.10),
  ('ford-eel',     'silver-eel',        0.10),
  ('otter',        'dog-otter',         0.10),
  ('feral-goat',   'old-billy',         0.10),
  ('great-gull',   'black-backed-gull', 0.08),
  ('marsh-hound',  'a-lymer',           0.08),
  ('strand-thief', 'the-wrecker',       0.08),
  ('grey-seal',    'bull-seal',         0.07),
  ('conger',       'old-conger',        0.06);
