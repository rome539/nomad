-- 088: the longbrand — the rare torch (rome, 2026-07-15: "mirror the
-- hammerstone"; built 2026-07-17). The pitch-soaked torch's garrison elder:
-- heartwood dipped and dipped again until the seal took, made for the night
-- watch — one spark buys two and a half torches of burning (BRAND_BURN_MS in
-- code), and the seal keeps the damp out (a strayed brand never sods). Still
-- an OPEN flame: the fire-fear wakes to it, the rain drowns it, the cold
-- pinches it. Better at a torch's one job; nothing else.
-- No fixed spawns (the hammerstone's law — "people just run to the same
-- spots"): the world ROLLS one up every so often into fire-keeping country
-- (BRAND_HAUNTS in zone-data: hearths, watch posts, the garrison's
-- light-rooms), capped at one lying unfound. You find it where the old
-- fire was kept; you can't farm a spot.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('longbrand', 'a longbrand',
   'A brand of dense heartwood, dipped and dipped again until the pitch sealed it black and glassy. Garrison work, made for the long watches — a torch is a match struck against the dark; this is an argument with it. It will burn until well after a plain torch would be ash.',
   'rare', 0, 0, 0, 0, '', 0, 0, 0, 1, 0, 0, 0, 4, 0);

DELETE FROM ground_spawns WHERE item_id = 'longbrand';
