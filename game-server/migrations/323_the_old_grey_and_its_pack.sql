-- THE OLD GREY (2026-10-21). The wolf boss behind the moon door, in the lie at
-- the dead end of the ground 322 put down behind the glade.
--
-- A WOLF, and the oldest one. Not a monster and not a god: an animal that has
-- lived much longer than its kind does, in a pocket of the wood that is only
-- open on the nights the moon opens it. Its pack lies up with it. The moon
-- only opens the door; the blood moon belongs to the hollow, and this is a
-- living animal, the same hard fight on any night.
--
-- STATLINE. 140 hp, hitting 6-11 through armor 2, with bleed: above the keeper
-- of the holding (130), below the woodward (145 at ship, 175 now). The danger
-- is not the number, it is the two greys at its side and the door behind you
-- that is closing on its own clock.
--
-- ONE, and only one: a single mob_spawns row is the population cap.

INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('old-greys-pelt', 'the old grey''s pelt',
   'A wolf''s pelt grey from nose to tail, and not the grey of its kind: the grey of age, every hair of it gone white at the tip. It is bigger than a wolf''s pelt has any right to be, and scarred all over the inside where the hide healed and was torn and healed again.',
   'epic', 0, 0, 0, 0, '', 0, 0, 0, 3, 0, 0, 0, 20, 0);

-- THE PELT MAKES A MANTLE, at the forge, the way the lion's pelt makes its
-- cloak: one pelt and the hide work (forgeCost turns the 3 into leather). Epic,
-- because gear tops out there. Quiet, because the animal it came off never made
-- a sound; fleeced, because it was built to lie out all night.
INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('old-greys-mantle', 'the old grey''s mantle',
   'The old grey''s whole pelt, cured and worn across the shoulders with the head left on and riding at your collar, white muzzle and torn ears and all. It is heavier than it looks and it hangs without a sound, the way the animal moved.',
   'epic', 0, 0, 0, 0, 'cloak', 2, 1, 1, 3, 0, 0, 0, 20, 0, 'quiet,fleeced');

INSERT INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('old-greys-mantle', 3, 'old-greys-pelt', 1);

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES (
  'the-old-grey',
  'the old grey',
  'A wolf bigger than any wolf should be, gone grey all over: not the grey of its kind but the grey of age, the muzzle white, the ears notched and torn, the old scars showing pale through the coat. It moves without hurry and without any sound at all. It is not curious about you. It looks at you the way it looks at everything the door lets in.',
  6, 140, 6, 11, 2400, 1,
  'old-greys-pelt', 0.6,
  2,
  NULL, 0,
  0.3, 0
);

-- The old grey and the two that lie up with it. Ids given (mig 309: a NULL-id
-- spawn row reshuffles the live world).
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-old-grey-1', 'the-old-grey', 'the-grey-lie'),
  ('spawn-grey-lie-wolf-1', 'grey-wolf', 'the-grey-lie'),
  ('spawn-grey-lie-wolf-2', 'grey-wolf', 'the-grey-lie');

-- The silvered casket goes to the back of the lie: the moon still keeps it, and
-- now something else keeps it too.
UPDATE caches SET room_id = 'the-grey-lie',
  description = 'A small casket gone silver with age, pushed in among the roots at the back of the lie as if something had dragged it there and lain down in front of it. The moon has been keeping it for whoever the door lets in, and so has the old grey.'
WHERE id = 'box-glade';
