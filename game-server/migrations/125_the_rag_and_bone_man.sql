-- THE RAG-AND-BONE MAN (rome, 2026-08-01): the deep's mini-boss.
--
-- The gap this fills: the deep's roster runs 30-46 hp, and then nothing until
-- the King at 105-120. There was exactly one destination down there. The one
-- true mini-boss in the game (the three-hound, 76 hp) sits ABOVE the deep, at
-- the undercroft door.
--
-- It is not a bigger set of teeth. It is a thing that has been down here longer
-- than you, picking up everything the dark drops and hanging it on itself. It
-- builds its own loot table out of the deep's litter, so what it is worth is a
-- function of how long it has been left alive — the prize is emergent, never
-- rolled. Kill it and the whole pile falls where it falls.
--
-- Statline is TANK, not killer (rome, 2026-08-01: "fairly weak compared to the
-- rest of the deep mobs but very tanky"): 115 hp — the most of anything in the
-- game short of the King himself — hitting for 2-4, which ties the verdigris
-- thing for the WEAKEST swing in the deep. For scale, everything else down
-- there lands 4-7 or 4-8.
--
-- Armor stays at 3 (warden-captain's number) on purpose — mob armor is FLAT
-- subtraction, so 5 would floor a poorly-armed player to 1 damage a swing and
-- make the fight unwinnable rather than long. The real cost of this fight is
-- your weapon's condition and your food, not your life: ~20 rounds at 4s a
-- round will eat a blade. Which is the loop — it costs you gear to kill, and
-- pays you gear. An armored player takes maybe 40 over the whole grind; an
-- unarmored one does not finish it. That's the tuition.
--
-- PASSIVE. It is not in AGGRESSIVE, not in STARVE_HUNTERS, not in THIEVES, not
-- in SCAVENGERS, and has no PREYS_ON map — every unprovoked-attack path in the
-- game is gated on one of those, so it only ever swings at someone who swung
-- first (a grudge, which only a blow can create). If a later change puts it in
-- STARVE_HUNTERS this breaks silently: woundedPreyHunts doesn't check hunger,
-- so being off the hunger clock would NOT save it.
--
-- ONE AT A TIME. mob_spawns rows are the population cap (scheduleArrivals counts
-- them against the living), so the single row below means exactly one is alive
-- in the world at any moment. Nothing promotes into it (no mob_variants row)
-- and it doesn't breed.
--
-- Not a boss (is_boss 0) — it has to WANDER to scavenge at all.

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES (
  'rag-and-bone',
  'the rag-and-bone man',
  'It is roughly the shape of a man and about half again the size of one, and every inch of it is hung with what it has found: buckles, snapped blades, mail skirts, a boot, a tin cup, all of it lashed on with wire and gut and swinging when it swings. Nothing under the load is visible. It does not seem to want you. It wants what you are carrying, and it is willing to wait for you to put it down.',
  5, 115, 2, 4, 900, 0,
  'scrap-iron', 0.6,
  3,
  'lashed-warcoat', 0.35,
  0, 0
);

-- One den, one alive at a time (mob_spawns rows ARE the population cap). The
-- sunless well: a dead end hanging off the gasping dark, deliberately OFF the
-- corridor to the throne — the deep's crowding problem was everything funnelling
-- down the boss road, and a mini-boss parked on that road makes it worse. Its
-- den is somewhere you have to choose to go into, and TERRITORY_RADIUS 3 keeps
-- its rounds to the bone wing around it.
INSERT INTO mob_spawns (id, template_id, room_id)
VALUES ('spawn-ragbone-1', 'rag-and-bone', 'sunless-well');
