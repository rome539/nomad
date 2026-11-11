-- 383: THE MOUNTAIN DRESSES ITS OWN (2026-11-10). The mountain is the biggest
-- ground in the world and gave almost no gear: its animals drop pelts, quills
-- and antler that nothing was made from. Eight pieces are now made at the forge
-- from what its animals leave, and they fill the thin slots (feet and helm) and
-- give the hill warm boots, which nothing in the world had.

INSERT INTO item_templates (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, bleed, barter, traits) VALUES
  ('hare-fur-boots', 'a pair of hare-fur boots', 'Boots lined and cuffed in hare fur, four pelts to the pair. The hare grows more coat than it needs, and all of that is now round your feet. They are the first thing on this hill that keeps the cold out from below.', 'uncommon', 0, 'feet', 1, 1, 1, 1, 0, 8, 'fleeced'),
  ('wildcat-skin-cap', 'a wildcat-skin cap', 'A close cap of wildcat skin, striped, with the fur left on and turned inward over the ears. Nothing hung on it rattles, because nothing is hung on it. The cat it came off was never heard either.', 'uncommon', 0, 'helm', 1, 1, 1, 0, 0, 8, 'quiet'),
  ('antler-tine-spear', 'an antler-tine spear', 'A long tine off a cast antler, ground to a point and bound into a split ash shaft. Antler does not take an edge, but it takes a point and keeps it. It will reach a thing before the thing reaches you.', 'uncommon', 3, 'weapon', 0, 1, 1, 1, 0, 9, 'reach,pierce:1,piercing'),
  ('winter-pelt-boots', 'a pair of winter-pelt boots', 'Boots sewn from the white coats of snow hares, fur out and fur in. On snow they leave a print and make no sound doing it. Against anything but snow they are the most visible thing you own.', 'rare', 0, 'feet', 2, 1, 1, 1, 0, 14, 'fleeced,quiet'),
  ('lynx-fur-hood', 'a lynx-fur hood', 'A deep hood of lynx fur, smoke-grey and spotted, thick as a folded blanket over the skull. The ear-tufts were left on by whoever cut it, and stand up. It holds the wind off and it muffles you as well as it muffles the wind.', 'rare', 0, 'helm', 2, 1, 1, 1, 0, 15, 'fleeced,quiet'),
  ('ermine-trimmed-mantle', 'an ermine-trimmed mantle', 'A short mantle of fine wool, lined through with ermine, the black tail-tips left hanging in a row along the hem. Kings wore this for show. On a mountain it is worn because it weighs nothing and is warmer than a cloak three times as heavy.', 'rare', 0, 'cloak', 1, 1, 1, 0, 0, 14, 'fleeced'),
  ('owl-feather-cloak', 'an owl-feather cloak', 'A hooded cloak sewn over in barred owl feathers, laid the way they lay on the bird. Each one has the soft combed edge that lets an owl fly without a sound. The cloak moves the same way.', 'rare', 0, 'cloak', 1, 1, 1, 1, 0, 14, 'quiet,hooded'),
  ('eyrie-talon-hooks', 'a pair of eyrie-talon hooks', 'A pair of talons off the bird that holds the eyrie, each longer than a finger, set into wooden grips. They were made to close on a thing and not let go. In the hand they do the first half of that twice as fast.', 'rare', 3, 'weapon', 0, 2, 1, 1, 2, 15, 'pierce:1,piercing');

INSERT INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('hare-fur-boots', 2, 'hare-pelt', 4),
  ('wildcat-skin-cap', 2, 'wildcat-pelt', 2),
  ('antler-tine-spear', 2, 'stag-antler', 2),
  ('winter-pelt-boots', 3, 'winter-pelt', 3),
  ('lynx-fur-hood', 3, 'lynx-pelt', 2),
  ('ermine-trimmed-mantle', 3, 'ermine-skin', 3),
  ('owl-feather-cloak', 3, 'owl-feather', 3),
  ('eyrie-talon-hooks', 3, 'eyrie-talon', 2);
