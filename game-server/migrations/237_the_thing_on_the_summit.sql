-- 237 the thing on the summit (rome, 2026-08-19). Mig 236 is one room. This is
-- what is standing in it, and it is the last piece of the mountain.
--
-- IT IS AN ANIMAL. That has been the ruling since the region was scoped and
-- every decision in this file serves it. No hoard — there is nothing in that
-- room but swept rock. No speech, no name it calls itself, no bargain, no
-- riddle, no curse laid on anybody. It does not know what a person is. What it
-- has is a territory it will not leave, a nest it keeps clean, prey it carries
-- home from four tiers down because everything near home was eaten a long time
-- ago, and a strong preference for being left alone on the one piece of ground
-- in the world that is higher than everything else.
--
-- Every one of those is a thing an eagle does. The size is the only difference,
-- and the size is why the rock has run.
--
-- IT IS NOT A GOD AND IT IS NOT A GUARD. There is nothing behind it. The summit
-- is not a door to anywhere, killing it opens nothing, and the whole reward is
-- what it drops plus the fact that you got up there and back down. Five tiers
-- from a gate, and the extraction the entire game rests on is the fight after
-- the fight.
--
-- THE STATLINE IS INSIDE THE TABLE, and that is deliberate. 150hp against the
-- forgotten king's 120 and the woodward's 175; 8-13 damage against the drowned
-- ferryman's 8-14; armor 3 against the keeper's 3 and the ferryman's 4. It is
-- the biggest, but it is not off the chart, because the chart is what the whole
-- world's gear is measured against and gear tops out at epic. WHAT MAKES IT THE
-- HARDEST FIGHT IN THE GAME IS THE THREE THINGS IT DOES (zone-data, ai.ts):
--
--   THE ARC     — it is a SWEEPER. Every blow it lands drags through everyone
--                 else standing there. The summit is one open bowl with nothing
--                 to stand behind, so bringing friends is a decision with a
--                 cost, and that is the first honest use this world has made of
--                 the mason's rule.
--   THE BREATH  — past two thirds it plants and DRAWS, announced in the room a
--                 full beat and a half before it lands, and then it takes
--                 everyone at once and ignores the dogpile cap. Armor thins it;
--                 nothing stops it. The room has exactly one exit and the
--                 telegraph is long enough to use it. That is the fairness: you
--                 are never hit by this without having been told.
--   THE AIR     — past the last third it goes up for three beats and NOTHING
--                 SWUNG REACHES IT. It comes through low on somebody each beat.
--                 The answer is the THROW, which still reaches it, and this is
--                 the one place in the game where carrying something to throw
--                 stops being a luxury.
--
-- RESPAWN 2 HOURS, longest in the world (the woodward is 40 minutes, the
-- ferryman 45). It is one animal on one mountain. It should be a thing people
-- know is back rather than a thing that is always there.
--
-- WHAT IT LEAVES. One trophy, and it is the most valuable object in the game by
-- barter, because five tiers of carrying it down is the price. NOT gear: it has
-- no hands, nothing has ever worked its hide, and there is no smith at the gate
-- to work it now (the forge is unmanned and stays unmanned). A trophy is a
-- statement that you were up there, which is the whole economy of this region.

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed,
   sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('summit-scale', 'a scale off the summit',
   'A single plate the size of a dinner tray, thin at the edge and thick as your thumb through the middle, the colour of wet slate with a bloom on it that shifts when it moves. It weighs about as much as a shield and it is warm — hours after, days after, still warm, and nobody has ever been able to say why. It is the only proof that will ever exist of what is up there, and everybody who sees it knows exactly what it is.',
   'legendary', 0, 0, 0, 0, '', 0, 1, 1, 3, 0, 0, 0, 40, 0, ''),

  ('summit-tooth', 'a tooth off the summit',
   'Longer than your hand and curved back, worn flat along one side by a lifetime of closing on rock, with a root on it as long again as the crown. It came out of a jaw that carries something like forty of these. Turned over in the hand, the wear tells you it did not use them to fight anything. It used them to carry things a very long way.',
   'epic', 0, 0, 0, 0, '', 0, 1, 1, 2, 0, 0, 0, 22, 0, '');

-- ---- the animal ------------------------------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('the-drake', 'the drake',
   'It is lying in the ring of run stone with its head down on its forelimbs like a dog by a fire, and it fills the middle of the bowl. The colour of it is the colour of the rock. When it takes a breath the whole shape of it moves and the movement is what tells you which parts are it and which parts are the mountain. It opens one eye without lifting its head. It has been aware of you since the threshold, it has watched a great many things come up this ramp, and there is nothing in the way it is looking at you that has any opinion about it at all.',
   7, 150, 8, 13, 7200, 1, 'summit-scale', 0.6, 3, NULL, 0, 3, 0.12);

-- ---- and one shed tooth, lying in the ring ---------------------------------
-- A template carries ONE loot row, so the tooth is not a second drop — it is a
-- thing on the floor, which is what a shed tooth is. regrows = 0: it does not
-- come back. There is exactly one of these in the world and when somebody
-- carries it down there will never be another.
--
-- Note what taking it costs. It is lying in the ring of run stone, which is
-- where the animal lies, so the tooth is not a consolation prize for reaching
-- the room — it is inside the fight, and picking it up is a beat you spent not
-- swinging.
INSERT OR IGNORE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('summit-tooth', 'the-summit', 0);

-- ---- where it stands -------------------------------------------------------
-- One row. One animal, one room, and no second one anywhere in the world.

INSERT INTO mob_spawns (room_id, template_id) VALUES
  ('the-summit', 'the-drake');
