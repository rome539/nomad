-- 194 who stayed behind (rome, 2026-08-10). The 29 rooms of mig 193.
--
-- THE RULING: this is the FIRST GROUND. Everything here is levels 1-4 and it
-- stays that way -- the ring under the walls is where a fresh nomad learns what
-- a fight costs, and the expansion must not turn the tutorial into a gauntlet.
-- So it is mostly EXISTING lines spread onto new rooms (rats in the ruins,
-- hyenas on the grave ground, a cutpurse where the traffic is), and exactly
-- three new bodies, one per place that earned one.
--
-- The three are all the same idea the east road and the Crossing are built on,
-- arriving here first because this is where a player meets it first: the work
-- outlasted the reason for it. The sapper is still driving the gallery under a
-- wall that came down two centuries ago. The bellfounder is still tending a
-- melt that set hard before the fires went out.

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('sappers-pick', 'a sapper''s pick',
   'Short in the haft because a gallery is four feet wide, and heavy in the head because chalk is soft and flint is not. The steel is worn back to a stub on one side from being driven into stone by somebody who did it all day, every day, for a season.',
   'uncommon', 0, 0, 0, 6, 'weapon', 0, 1, 1, 3, 0.2, 0, 1, 9, 0, ''),

  ('bell-metal', 'a lump of bell metal',
   'Grey, heavy out of all proportion, and shaped by nothing but the hollow it cooled in. Bronze with the tin run high, which is the mix you use when you want a thing to ring and nothing else. It will never ring again and it is worth a great deal as metal, which is precisely the calculation somebody already made.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 5, 0, 0, 0, 16, 0, ''),

  ('hempen-cord', 'a length of hempen cord',
   'Tarred against the weather and still sound, cut through cleanly at one end and worn shiny in one particular place along its length. It has been rained on for two hundred years and it would hold your weight today.',
   'common', 0, 0, 0, 0, '', 0, 1, 1, 1, 0, 0, 0, 4, 0, '');

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('the-sapper', 'the sapper',
   'On his knees at the face of the gallery with a short pick, working the chalk out in front of him a handful at a time, in the dark, in four feet of headroom. He does not need the light you brought and he has not stopped for it. The wall he was digging toward came down two hundred years ago and he is still going east.',
   3, 34, 4, 8, 1200, 0, 'sappers-pick', 0.4, 1, 'moss-packed-cap', 0.15, 0, 1),

  ('the-bellfounder', 'the bellfounder',
   'Crouched over the bell pit with a long iron rake, tending a melt in a clay-lined hole with no fire under it, watching the surface of metal that set hard before the fires went out. He got the bell down out of the tower and into the ground and most of the way to being money. He is still watching it.',
   3, 38, 4, 8, 1500, 0, 'bell-metal', 0.35, 2, 'burners-hatchet', 0.15, 0, 2),

  ('gibbet-crow', 'a gibbet crow',
   'Sitting on the iron arm with its head turned to put one eye on you, entirely black, and entirely unbothered. There has been nothing on this post for a very long time and it is sitting on it anyway, which means either it remembers or its grandmother did.',
   1, 14, 2, 5, 900, 0, 'hempen-cord', 0.35, 0, '', 0, 1, 0);

-- Cigarettes: the mig 186 law. Two of the three had hands and pockets; the crow
-- does not, and never will.
INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('the-sapper',      'hand-rolled-smokes', 0.020),
  ('the-bellfounder', 'crushed-pack',       0.015);

-- ---- where they stand ------------------------------------------------------
-- THE SIEGE LINES. Thin above ground -- earthworks are empty by nature and the
-- emptiness is the point -- and the mine is where it concentrates.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-sapper', 'the-mine-gallery');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-sapper', 'the-camouflet');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('rat', 'the-mine-mouth');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('rat', 'the-sap-head');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('fleet-rat', 'the-camp-ground');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('fleet-rat', 'the-suttlers-row');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('cutpurse', 'the-horse-lines');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grave-hyena', 'the-spoil-heap');

-- THE VILLAGE. Vermin in the ruins, and the founder at his pit.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('the-bellfounder', 'the-bell-pit');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('rat', 'the-village-street');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('rat', 'the-tithe-barn');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('fleet-rat', 'the-church-shell');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('fleet-rat', 'the-pound');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('cutpurse', 'the-green');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grave-hyena', 'the-churchyard');

-- THE HOLDING. The quietest ground in the region, and it should stay that way:
-- one room in four has anything on it. A player who has just come out of the
-- gate for the first time needs somewhere that is only a place.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('rat', 'the-cider-house');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('fleet-rat', 'the-culver-house');

-- THE GALLOWS. Crows, and what crows follow.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('gibbet-crow', 'the-gibbet-field');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('gibbet-crow', 'the-crossroads-grave');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('gibbet-crow', 'the-mass-grave');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grave-hyena', 'the-charnel');

-- ---- what the ground holds -------------------------------------------------
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('scrap-iron', 'the-forge-pit', 1),          -- an army's smithy: the ground still gives it up
  ('scrap-iron', 'the-shot-pile', 0),
  ('scrap-iron', 'the-village-smithy', 0),
  ('hammerstone', 'the-spoil-heap', 1),
  ('torch', 'the-marshals-lodging', 1),        -- the one roof and hearth in the lines
  ('torch', 'the-cider-house', 1),
  ('linen-strips', 'the-charnel', 0),
  ('windfall-pears', 'the-orchard-rows', 1),   -- badly, out of the tops, but it still fruits
  ('watercress', 'the-fish-stew', 1),
  ('bloodwort', 'the-churchyard', 1),
  ('grave-moss', 'the-crossroads-grave', 1),
  ('hempen-cord', 'the-gibbet-field', 0),
  ('bone-charm', 'the-bell-pit', 0),
  ('knucklebone', 'the-camouflet', 0);
