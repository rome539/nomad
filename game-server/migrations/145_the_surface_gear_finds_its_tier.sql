-- THE SURFACE GEAR FINDS ITS TIER (rome, 2026-08-02: "why the fuck the burner's
-- billhook 5 dmg", then "look at all the new gear you added") — three things I
-- got wrong this morning, fixed against the ladder that already existed.
--
-- =========================================================================
-- 1. THE BURNER'S BILLHOOK — dmg 5 -> 3, and it CLEAVES like a billhook should.
--
-- It shipped as legendary-tier damage on an uncommon 4-barter drop off a level-4
-- mob: every other dmg-5 weapon in the game is rare, epic or legendary. Worse,
-- it had no secondary at all — pure raw damage, which is the one stat that
-- should never be cheap.
--
-- And it was the wrong stat entirely. `sweep > 1` is the CLEAVING trait — one
-- more foe per landed swing — and the game's own `rusty-billhook` has sweep 2.
-- A billhook is a brush-clearing tool; cleaving is what it IS. I gave mine
-- sweep 1 and made up the difference in damage, which is backwards.
--
-- So it becomes what it should have been from the start: the rusty billhook,
-- kept sharp. Same identity, better numbers, one tier up.
--   rusty-billhook    common     dmg 2, sweep 2, bleed 1, wt 0,  2b
--   burners-billhook  uncommon   dmg 3, sweep 2, bleed 1, wt 1,  6b   <- here
--   headtaker-axe     rare       dmg 3, sweep 2, bleed 2, wt 1,  9b
--
-- =========================================================================
-- 2. THE WOODWARD'S AXE — dmg 9 -> 5, and it stops being the new ceiling.
--
-- The best weapon in the game before this morning was the poleaxe at 6. I gave
-- a rare drop a 50% jump over every epic AND legendary in the world. Nine was
-- not a tuning choice, it was a number I typed.
--
-- What it should be is the heavy CLEAVER — the felling axe it is described as.
-- Every existing sweep-2 weapon caps at dmg 4; this sits at 5 with the joint
-- highest stun in the game (0.2, level with the marrow-scepter and the forged
-- warmaul) and pays for both in weight. At 4 it is the heaviest weapon there is
-- — nothing else passes 3 — so under the load law it costs you dodge, quiet and
-- poise every step you carry it. Bleed goes to 0: it is a wedge, not an edge.
-- Weight 6 was also absurd on its own terms and is cut to 4.
--
-- =========================================================================
-- 3. THE ROAD STOPS FARMING THE DEEP'S TROPHY.
--
-- hound-fang is the deep sentinel's tooth, 8 barter, the most valuable COMMON
-- in the game. I hung it on the road's most numerous mob at 0.30 and on its
-- variant at 0.55 — so the cheapest fight in the world pays better per kill
-- than the wolf pelt or the boar tusk, and killing the actual three-headed
-- hound is quietly worth less.
--
-- The road dogs get their own trophy instead, and it says what they are: these
-- are somebody's dogs, still wearing the collar, with nobody left to answer to.
--
-- THE WHITE HIDE STAYS ABOVE THE CIGARETTES (rome). 24 against 20 — the top of
-- the barter ladder short of the epics, off a one-in-fifty that does not run.

INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('dogs-collar', 'a dog''s collar',
   'A broad leather collar with a bronze plate riveted to it, worn thin where something pulled against it for years. There is a name stamped in the plate, and it is not the dog''s — a collar names the owner, so that anyone finding the animal knows whose it is. Nobody has come looking.',
   'common', 0, 0, 0, 0, '', 0, 0, 1, 0, 0, 0, 0, 3, 0);

-- 1. the billhook becomes a billhook
UPDATE item_templates SET dmg = 3, sweep = 2, bleed = 1, weight = 1, barter = 6
  WHERE id = 'burners-billhook';

-- 2. the axe becomes the heavy cleaver, not the ceiling
UPDATE item_templates SET dmg = 5, sweep = 2, stun = 0.2, bleed = 0, weight = 4
  WHERE id = 'woodwards-axe';

-- 3. the road's dogs carry the road's trophy
UPDATE mob_templates SET loot_item = 'dogs-collar', loot_chance = 0.35 WHERE id = 'masterless-dog';
UPDATE mob_templates SET loot_item = 'dogs-collar', loot_chance = 0.55 WHERE id = 'lead-dog';

-- =========================================================================
-- 4. SWEEP 1, LIKE EVERYTHING ELSE. Every item I wrote today carries sweep = 0
-- while every item written before carries 1 — I passed the column explicitly
-- and passed the wrong default, eleven times.
--
-- It is not a live bug: the swing site clamps with Math.max(1, ...), so a
-- sweep-0 weapon still hits one foe, and none of the eleven are weapons anyway.
-- It is worse than a bug — it is a wrong pattern sitting in the table for the
-- next person to copy, and a weapon written from one of these rows would look
-- fine and be wrong. (`longbrand` carries 0 too; that one predates today and is
-- left alone.)
UPDATE item_templates SET sweep = 1 WHERE sweep = 0 AND id != 'longbrand';
