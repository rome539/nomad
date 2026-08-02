-- THE WOODWARD (rome, 2026-08-02: "what's in the center of the maze? we need a
-- boss, a minotaur or equivalent") — the maze's keeper.
--
-- NOT A MINOTAUR. Same objection as the dragon: NOMAD's register is dead
-- institutions and things that used to be people, and a bull-headed man out of
-- Greek myth would be the first borrowed thing in this world. So: the WOODWARD,
-- which was a real office. He kept the wood. He walked its bounds, knew every
-- stand in it by name, took the tools off anyone cutting without right, and
-- answered to a lord who has been dead for centuries. He is still doing the job.
-- Same fight, same fear, different words.
--
-- WHAT MAKES HIM THE MAZE'S BOSS IS THAT HE WALKS IT. He patrols a closed
-- circuit of the centre core (PATROLS, zone-data.ts) — the one you cannot
-- navigate, where turning round never retraces and every way out spits you
-- somewhere you did not choose. He walks it correctly, forever. You are lost in
-- his rounds. The maze is not a place he is kept in; it is a place he keeps.
--
-- This needed one engine change: bosses stand where they live (the king in his
-- hoard, the hound on its threshold) because a wandering boss drifts off the
-- thing it guards. A boss with a PATROLS route is now exempt — its route IS
-- where it lives. No existing boss has a route, so nothing else changes.
--
-- STATLINE. 145 hp, hitting 7-11 through armor 3, with bleed and stun: above
-- the keeper of the holding (130) and below the forgotten king. He is meant to
-- be the hardest thing on the surface. The fight is winnable and long, and the
-- real danger is where it happens — you cannot break off in a straight line,
-- because there are no straight lines in there. Fleeing him means fleeing into
-- the part of the world that lies to you.
--
-- ONE, and only one: a single mob_spawns row is the population cap.

INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('woodwards-axe', 'the woodward''s axe',
   'A felling axe with a haft as long as your arm and a head that has been reground so many times the maker''s stamp is a shadow. It is a tool for taking down something much bigger than a man, and it has been maintained, which is the part worth thinking about.',
   'rare', 0, 0, 0, 9, 'weapon', 0, 1, 2, 6, 0.2, 0, 0, 18, 0),
  ('bounds-tally', 'a bounds tally',
   'A stick of hazel scored across in notches, hundreds of them, in groups of five and then in groups of groups. Somebody walked a boundary and cut a mark each time. The count runs to a number of years that does not bear working out.',
   'rare', 0, 0, 0, 0, '', 0, 0, 0, 0, 0, 0, 0, 22, 0);

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES (
  'the-woodward',
  'the woodward',
  'A big man in a coat of oiled leather gone black with age, carrying a felling axe at the trail as though it weighs nothing, walking at a pace he has clearly walked a great many times. He is not searching for anything. He looks up when you come into view, and what is in his face is not surprise — it is the mild, unhurried interest of somebody who has found you on ground he is responsible for, and now has to decide what you are doing on it.',
  6, 145, 7, 11, 2400, 1,
  'bounds-tally', 0.45,
  3,
  'woodwards-axe', 0.4,
  0.35, 1
);

-- His den is the heart of the maze. PATROLS overrides territory, so this only
-- decides where he re-enters the world after he is put down — in the middle of
-- his own rounds, which is the only place he has ever been.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-woodward-1', 'the-woodward', 'the-heart-of-it');
