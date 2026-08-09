-- THE CHAINMAN (rome, 2026-08-08: "one more mob... he's rare and doesn't stay
-- for long, and this new mob will carry a new map, fully mapped out" / "the full
-- map is permanent... a rare drop from this new mob, and he can spawn anywhere").
--
-- A chainman is the man who drags the measuring chain — the one who actually
-- walks a boundary while someone else writes it down. The world already had him
-- implied and never had him: mig 178 put a Bounds House in the deepwood, full of
-- hazel tallies from the years somebody counted this place, opened by a marking
-- iron. Somebody walked all that. This is him, still walking, long after the
-- estate that paid him stopped existing.
--
-- HE IS NOT HOSTILE. He has no quarrel with you and will not start one. What he
-- has is somewhere else to be — he arrives, works his way across whatever ground
-- he turned up on, and is gone, whether or not you ever found him. Killing him
-- is a choice you make about a man who was measuring a wall.
--
-- HE SPAWNS ANYWHERE, which is why he has NO mob_spawns rows. Dens are fixed
-- rooms; he is a world-roll, like the hammerstone — the world checks every few
-- hours and mostly nothing happens (zone-data CHAINMAN_*). He can turn up in the
-- deep, on the road, in the wood, at a gate.
INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun) VALUES
  ('the-chainman', 'the chainman',
   'A spare, weathered man in a coat gone the colour of everything, with a hundred-link iron chain looped over one shoulder and a satchel on the other. He is counting under his breath and does not stop when you come in — he gets to the end of the count, marks something, and only then looks up. There is no one behind him. Whoever he is measuring this for has been dead a very long time.',
   4, 70, 3, 6, 2400, 0, '', 0, 1, '', 0, 0, 0);

-- =========================================================================
-- THE FINISHED CHART. Not a surveyor's blank that fills in as you walk it — a
-- chart somebody already finished, by walking all of it, with a chain.
--
-- Built as its OWN item rather than a pre-inked surveyor's map on purpose. A
-- surveyor's copy stores one map_ink row per room walked, so a "complete" one
-- would mean ~410 rows per copy AND would be frozen at the moment it was made:
-- stale the first time the world grows a room. This one holds no rows at all.
-- The renderer treats it as complete, so it is still complete after the next
-- migration adds a wing (zone-data FULL_MAP).
--
-- Permanent, per rome. It drops on death like everything else, and knowing the
-- way home has never been the thing that makes the walk home hard.
INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
  ('finished-chart', 'a finished chart',
   'Linen-backed and folded in eight, worn to felt along every crease and repaired twice with a different thread each time. Unfolded it is the whole of it — every hall, every ride, every stair down, in one hand, drawn to a scale by someone who paced all of it and did not guess once. In the corner, in the same small hand as everything else: a name, a year, and the word COMPLETE.',
   'legendary', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 40, 0, '');

-- The rare drop. 0.08 off a man who is rarely there and does not stay — the
-- chart is meant to be a thing that happens to you, not a thing you farm.
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-chainman', 'finished-chart', 0.08);
-- What he otherwise has on him: the tools of the job, and the sort of thing a
-- man carries when he walks for a living.
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-chainman', 'hardtack', 0.35);
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-chainman', 'crude-map', 0.25);
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-chainman', 'dry-cigarettes', 0.10);
