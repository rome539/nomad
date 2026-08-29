-- 282 the pool grows rare blood (2026-08-28). A cousin for the great crab of
-- the sea cave (mig 281), by the same machinery every other cousin in this world
-- uses: a mob_variants row, rolled at spawn. It gets NO mob_spawns row of its
-- own — rollBloodline substitutes it for the base when the pool refills, exactly
-- as the pale drake substitutes for the drake.
--
-- "DEVIL" IS ALREADY THE WORD. The wrack crab's cousin is the devil crab, so the
-- great crab's cousin names itself and the line reads straight down: wrack crab,
-- devil crab, great crab, great devil crab.
--
-- THE STEP IS GENTLE, and that is mig 212's own rule rather than a guess: the
-- harder the base, the smaller the jump. Its measured median across nineteen
-- pairs was x1.50 hp and x1.29 damage, but the hardest base it had — the eel
-- cutter at 48hp — took only x1.17/x1.10. The great crab is 85hp, harder than
-- anything in that table, so it gets a smaller step again:
--
--     the great crab        85hp  5-9  armor 3
--     the great devil crab 100hp  6-10 armor 3      x1.18 hp, x1.15 damage
--
-- ARMOR DOES NOT MOVE. Three is where mob armour tops out in practice — it is
-- flat subtraction, and a fourth point is what turns a fast weapon from slow
-- into useless. The cousin is bigger and it hits harder; it is not better
-- armoured, because there is nowhere for that to go that is not a wall.
--
-- Twelve percent, matching the drake's own cousin — the one other boss-tier pair
-- in the world, and the right frequency for a thing you want people to have
-- heard about before they meet it.

INSERT OR REPLACE INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('the-great-devil-crab', 'the great devil crab',
   'The same animal as the one in every other pool along this coast, and then something went wrong with it, or very right. The shell is the deep bruised red of the small devil crabs and it has gone on growing past any size a shell should hold, until the plates have split along the seams and healed over in ridges. Both claws are the big one. The pale filed line runs the whole edge of it like a blade somebody kept. It does not sit in the water so much as occupy it.',
   6, 100, 6, 10, 1800, 1, 'crab-claw', 1.0, 3, NULL, 0, 1, 0.15);

INSERT OR REPLACE INTO mob_variants (base_id, variant_id, chance) VALUES
  ('the-great-crab', 'the-great-devil-crab', 0.12);
