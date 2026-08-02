-- THE RARE BLOOD OF THE SURFACE (rome, 2026-08-02: "what about dire wolf,
-- white roe (very rare) and whatever extra that makes sense") — the road and
-- the wood get their cousins.
--
-- The fortress has thirteen variant lines and the two hundred rooms shipped
-- this morning had NONE, which is the one system the new world skipped. The
-- fortress teaches you that a den is usually the ordinary thing and once in a
-- while the mean cousin, so you never quite trust a room you have cleared
-- before. The surface was making the opposite promise: what you saw last time
-- is what is there.
--
-- Odds sit on the ladder that already exists — 0.03-0.10 for a nasty surprise,
-- and one deliberate outlier below all of it.
--
-- WHAT MAKES THE WHITE ROE WORK IS THAT IT DOES NOT RUN. Everything else in the
-- wood that can bolt, bolts; RUNNERS is keyed by template id, and the white roe
-- is deliberately NOT in it. So the rarest thing on the surface is the one that
-- stands in the open and looks back at you. It is still prey — it stays in
-- VERMIN and on the wolves' PREYS_ON list — which means the wood can take it
-- from you while you are deciding. Find it before they do.

-- ---- what the new blood carries ------------------------------------------
INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('wolf-skull', 'a wolf''s skull',
   'Long, narrow, and heavier than it looks, with the teeth still seated and the old ridge of bone down the top of it worn smooth. Something carried this head a long time and used it hard.',
   'rare', 0, 0, 0, 0, '', 0, 0, 0, 0.3, 0, 0, 0, 14, 0),
  ('white-hide', 'a white hide',
   'Short-haired and very pale, near enough to white that it holds what little light there is and gives it back. There is no mark on it anywhere. People who kept woods had strong opinions about killing the pale ones, and wrote none of them down as law, which tells you they did not think they needed to.',
   'rare', 0, 0, 0, 0, '', 0, 0, 0, 0.5, 0, 0, 0, 24, 0);

-- ---- the cousins ----------------------------------------------------------
INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  -- THE ROAD ----------------------------------------------------------------
  ('lead-dog', 'the lead dog',
   'Bigger than the others and older, with a grey muzzle and a set of scars that run all one way, as though everything that ever went at it came from the same side and did not get to try twice. It does not circle. It stands square in the road and waits to see what you are going to do about it.',
   3, 36, 4, 7, 900, 0, 'hound-fang', 0.55, 0, NULL, 0, 2, 0),

  ('wayman', 'a wayman',
   'A lean man standing off the verge in a coat that fits him, which on this road is worth noticing — somebody else was measured for it. He has a blade already out and held low and easy, and he does not open with a demand. He has learned that the demand goes better after.',
   3, 30, 4, 6, 1200, 0, 'dry-cigarettes', 0.10, 1, 'bone-shiv', 0.4, 2, 0),

  -- THE WOOD ----------------------------------------------------------------
  ('dire-wolf', 'a dire wolf',
   'Half again the size of the others and running with them all the same, which is the part that stops you: it is not a lone monster, it is one of the pack and the pack is used to it. The head is enormous. It watches you the way the others watch the deer.',
   4, 52, 5, 9, 1500, 0, 'wolf-skull', 0.5, 1, NULL, 0, 3, 0),

  ('white-roe', 'a white roe',
   'A roe deer the colour of bone, standing in the open where nothing stands in the open, looking directly at you. It does not startle. It does not lower its head to feed. Every other living thing in this wood has somewhere it would rather be, and it is very hard to keep looking at the one thing that does not.',
   1, 20, 1, 2, 5400, 0, 'white-hide', 0.9, 0, NULL, 0, 0, 0),

  ('old-boar', 'an old boar',
   'It has been shot at and speared and got away with it: there is a broken shaft healed into the shoulder and the tusks have grown past any use for rooting. It does not warn you and it does not stop when it is hurt. Whatever a boar is for, this one has stopped doing it and does the other thing now.',
   4, 70, 6, 10, 1800, 0, 'boar-tusk', 0.7, 2, NULL, 0, 3, 1),

  ('something-ahead', 'something ahead',
   'The step you have been hearing behind you all this time is in front of you now, and still keeping your pace, and still stopping when you stop. Nothing came past you. There is no version of the last hour in which anything came past you.',
   5, 55, 6, 10, 3000, 0, 'grave-moss', 0.5, 0, NULL, 0, 3, 1);

-- ---- who rides whose dens -------------------------------------------------
-- The white roe is the outlier: one in fifty, against a ladder that bottoms out
-- at one in thirty-three. It should be a thing you tell somebody about.
INSERT INTO mob_variants (base_id, variant_id, chance) VALUES
  ('masterless-dog', 'lead-dog',        0.10),
  ('footpad',        'wayman',          0.10),
  ('grey-wolf',      'dire-wolf',       0.08),
  ('wild-boar',      'old-boar',        0.10),
  ('the-follower',   'something-ahead', 0.05),
  ('roe-deer',       'white-roe',       0.02);
