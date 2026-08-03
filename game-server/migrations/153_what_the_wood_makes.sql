-- WHAT THE WOOD MAKES (rome, 2026-08-03: "what new gear can we introduce with
-- the new mobs... what about the woodward gear you can make? what is the keeper
-- dropping? ??????").
--
-- Two holes, both structural, both his:
--
-- 1. THE FORGE WAS A DUNGEON-ONLY ECONOMY. All seven of its materials — teeth,
--    pale claw, hyena fang, finger bone, drowned pearl, gaunt pelt, marrow shard
--    — come off fortress and deep mobs. The wood drops eight trophy types and
--    not one of them fed a single recipe. Wolf pelts and boar tusks were barter
--    chips and nothing else, so a wanderer who lived on the surface could not
--    make anything, and the bench only ever paid you for going down.
--
-- 2. THE WOOD DROPPED NO ARMOUR AT ALL. Its entire gear output was three
--    weapons. That sat badly against mig 148, which concluded armour is the
--    whole problem for a fresh key: the one zone tuned FOR new players was the
--    one zone that could not equip them.
--
-- And under both, the boss tier. Every deep boss drops an epic and anchors an
-- epic recipe (drowned pearl -> greatplate, marrow shard -> ruin). The woodward
-- dropped a rare axe and a bounds tally that forged nothing; the keeper dropped
-- a GRAVEBLADE — an uncommon barrow sword from migration 004, a fortress
-- commoner's weapon worth 6 barter, on a 130 hp boss at the far side of a maze.
-- That was a placeholder nobody ever replaced.
--
-- =========================================================================
-- THE LOAD LAW HOLDS. I proposed light armour that broke it and was wrong:
-- mig 096 sets weight by formula — body and helm weight = armour - 1, cloaks
-- and feet light, weapons by damage tier — and it is idempotent, so anything
-- cut against it gets flattened the next time it runs. So the wood does NOT get
-- cheap armour. It gets the same armour-for-weight as everyone and pays for its
-- identity in TRAITS: two new ones, both hooks into systems the wood itself
-- taught us to care about.
--
--   STAUNCHED — a wound clots a tick sooner (3 -> 2). The first thing in the
--   game that touches bleed AFTER it opens: wardhide and mailward can only stop
--   one starting, and armour cannot help at all, because a bleed is subtracted
--   raw. That is exactly why the woodward and the keeper hit so much harder
--   than their damage column claimed (mig 151). The wood teaches you to fear
--   bleeding and then sells you the moss for it.
--
--   HOODED — a torch catches in the rain. `raining()` refuses one flatly today,
--   and the wood is the one region that is outdoors end to end, so weather was
--   a lockout with no answer. Now it is a kit decision.
--
-- Both join the trait roll pool for their slots (TRAIT_POOL, zone-data.ts), so
-- found gear can carry them too, at TRAIT_ROLL_ODDS like everything else.
--
-- =========================================================================
-- THE BENCH (wood materials, costed exactly like the existing recipes:
-- 2 scrap + 2 for uncommon, 3 for rare, 5 + 1 boss token for epic).

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('wolfskin-cloak', 'a wolfskin cloak',
   'Grey pelt with the throat-pale still showing, cut for a person and lashed at the shoulder. The head is left on and makes a hood deep enough to work under in weather. It smells, faintly and permanently, of wolf.',
   'uncommon', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0, 0, 0, 6, 0, 'hooded'),

  ('tusk-goad', 'a tusk-goad',
   'A boar''s lower tusk lashed to a shaft of ash, point out, the way a herdsman goads what he cannot outrun. The tusk kept growing its whole life and never stopped being sharp.',
   'uncommon', 0, 0, 0, 3, 'weapon', 0, 1, 1, 1, 0, 0, 0, 6, 0, 'pierce:1,piercing'),

  ('moss-packed-jerkin', 'a moss-packed jerkin',
   'A plain jerkin quilted in panels and packed through with grave-moss, which is the thing everyone in the wood knows and nobody writes down: it drinks blood and holds a wound shut. It weeps green when it is wet.',
   'uncommon', 0, 0, 0, 0, 'armor', 2, 1, 1, 1, 0, 0, 0, 6, 0, 'staunched'),

  ('white-hide-coat', 'a white-hide coat',
   'The hide of a white roe, which is one deer in fifty and a thing hunters used to leave alone on principle. Someone did not. Thick through the shoulder and soft as nothing else in the wood.',
   'rare', 0, 0, 0, 0, 'armor', 3, 1, 1, 2, 0, 0, 0, 9, 0, 'wardhide'),

  ('wolf-skull-helm', 'a wolf-skull helm',
   'The braincase of a big grey, boiled out and strapped over a padded cap, the upper jaw riding forward over your brow. It does not make you look like a wolf. It makes you look like something that beat one.',
   'rare', 0, 0, 0, 0, 'helm', 2, 1, 1, 1, 0, 0, 0, 9, 0, 'padded'),

-- THE BOSS TIER.
  ('woodwards-coat', 'the woodward''s coat',
   'Oiled leather gone black with age and weather, cut long, patched at both elbows by the same careful hand. It is the coat he walked his bounds in for however many years that was, and it has turned more than weather.',
   'epic', 0, 0, 0, 0, 'armor', 4, 1, 1, 3, 0, 0, 0, 19, 0, 'wardhide,strapped'),

  ('keepers-wrap', 'the keeper''s wrap',
   'A long wrap of waxed cloth, hooded deep, the inner lining packed with moss and stitched shut over it. Whoever kept the holding kept themselves alive out here a long time, and this is most of how.',
   'epic', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0, 0, 0, 19, 0, 'staunched,hooded');

INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('wolfskin-cloak',     2, 'wolf-pelt',    2),
  ('tusk-goad',          2, 'boar-tusk',    2),
  ('moss-packed-jerkin', 2, 'grave-moss',   3),
  ('white-hide-coat',    3, 'white-hide',   1),
  ('wolf-skull-helm',    3, 'wolf-skull',   2),
  ('woodwards-coat',     5, 'bounds-tally', 1);

-- The keeper stops handing out a fortress commoner's sword. Her wrap is the
-- only epic cloak in the game that carries both new traits, and it is a LIGHT
-- capstone on purpose: the deep's three epics are greatplate, weapon and shield,
-- all heavy. The surface answers with a different kind of power rather than a
-- bigger number — and it costs the armour ladder nothing, because cloaks cap at
-- 2 armour even at epic. Her drop rate and her cigarettes are untouched.
UPDATE mob_templates SET gear_item = 'keepers-wrap' WHERE id = 'the-keeper-of-the-holding';

-- NOT DONE, and deliberately: the woodward's axe stays rare at 5 dmg. Mig 145
-- put it there on purpose after it shipped at 9, and it already carries the
-- joint-highest stun in the game and the heaviest weight in it. Making it epic
-- to match the other bosses would re-break that ruling for symmetry's sake.
-- Also still unfed: the mire-walker's grave-pearl. It is not a boss token and
-- its own tier can wait for a reason better than tidiness.
