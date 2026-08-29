-- 281 what lives in the cave (2026-08-28). Mig 279 dug the sea cave out to
-- eight rooms and nothing at all was living in it.
--
-- THE DEVIL CRAB ALREADY EXISTED and had never once been spawned — a template
-- written for the Crossing with no room to its name. It gets its home here:
-- four of them through the cave's middle, holding the ground between the mouth
-- and the pool. Rooted (zone-data ROOTED), because the way OUT of the cave is
-- unkeyed on purpose and a wandering crab would walk out of it for good.
--
-- THE GREAT CRAB is new, and it is what the pool has instead of a lock. It sits
-- on the chest at the dead end: level five, eighty-five hp behind three points
-- of shell, and it does not move — is_boss here means what it means everywhere
-- in this world, "stands where it lives", which is also what keeps the tide from
-- driving it out of its own cave (seaDrives spares bosses).
--
-- WHY IT IS NOT A REAL BOSS'S STATLINE: the kings and the drakes run 105-175 hp,
-- and this is a thing at the back of a cave, not the end of a region. It is a
-- fight you can lose in the dark with the water coming, which is the whole point
-- of putting it there — the door, the dark, the tide and the crab are four
-- different taxes on one chest, and no one of them should be the wall.
--
-- Its claw is the same trophy the small crabs drop, and deliberately: the crab
-- is not the prize. The chest behind it is the prize.

INSERT OR REPLACE INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('the-great-crab', 'the great crab',
   'It is the size of a cart and it has been in this pool long enough to have stopped being a crab and started being a feature of it — the shell crusted white with the same salt as the walls, barnacles on the back of it, a whole small ecology riding an animal. One claw is twice the other and worn smooth at the edge from a lifetime of doing the same thing to the same kind of shell. It does not hurry and it does not retreat. It has never had to.',
   5, 85, 5, 9, 1800, 1, 'crab-claw', 1.0, 3, NULL, 0, 1, 0.12);

INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-cave1', 'devil-crab', 'the-sand-crawl'),
  ('spawn-cave2', 'devil-crab', 'the-drowned-chamber'),
  ('spawn-cave3', 'devil-crab', 'the-shingle-bank'),
  ('spawn-cave4', 'devil-crab', 'the-fallen-roof'),
  ('spawn-cave5', 'the-great-crab', 'the-salt-pool');
