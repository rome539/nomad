-- 321: THE WOOD'S NIGHT, AND WHAT IT EATS (rome, 2026-10-21). The wood had no
-- small game at all - roe, stags and boar, and nothing an owl could lift - so
-- an owl there would have starved. Two small animals for it, and the owl.
--
-- THE TAWNY OWL, six, one to a stretch of old timber: the eagle owl's rules
-- (day-blind, a silent hunter, it roosts by day) at a wolf's weight, and it
-- lives on the two below.
-- THE SLOTH, eight, under the tall trees (rome asked for one; the wood is not a
-- zoo and does not have to be). It sits, it browses, it barely moves -
-- SLOW_WALKERS gives it five times anyone else's pace between steps - and it
-- does not run from anything, which is what makes it the owl's.
-- THE HEDGEHOG, ten, on the leaf floor, banks and thickets. Out at night, and
-- it curls: the spines are armour 3, the top of the mob scale, so a blade
-- glances off it and most of what tries to eat it gives up (HUNT_SUCCESS).
-- Neither small one carries anything worth a trade. Ids on every row (mig 309).
INSERT OR IGNORE INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES
  ('tawny-owl', 'a tawny owl',
   'A round brown owl the colour of the bark it sits against, so that you see it only when it turns its face to you. The face is a dish, and the eyes in it are black all the way through. It makes no sound when it moves, none at all, and it has been watching you for longer than you have been looking.',
   3, 26, 3, 6, 660, 0, 'owl-feather', 0.4, 0, NULL, 0, 0, 2),
  ('wood-sloth', 'a sloth',
   'It sits at the foot of a tree with its short hooked claws folded in front of it, furred grey-brown and green where the damp has got into the coat, chewing a leaf it pulled down from somewhere above. It turns its head toward you over the course of some time, and the face it turns is small and mild and smiling at nothing, and it goes back to the leaf.',
   1, 18, 1, 3, 480, 0, NULL, 0, 1, NULL, 0, 0, 1),
  ('hedgehog', 'a hedgehog',
   'A brown ball of spines on short legs, snuffling through the leaf litter with a long wet nose and making more noise about it than anything its size has any right to. When it hears you it stops, and tucks its face away, and becomes a thing with no front to it at all.',
   1, 10, 1, 2, 300, 0, NULL, 0, 3, NULL, 0, 0, 0);

INSERT OR IGNORE INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-towl-1', 'tawny-owl', 'the-great-root'),
  ('spawn-towl-2', 'tawny-owl', 'the-pollard-row'),
  ('spawn-towl-3', 'tawny-owl', 'the-standing-oaks'),
  ('spawn-towl-4', 'tawny-owl', 'the-last-oak'),
  ('spawn-towl-5', 'tawny-owl', 'the-pollard-line'),
  ('spawn-towl-6', 'tawny-owl', 'the-yew-walk'),
  ('spawn-sloth-1', 'wood-sloth', 'the-ancient-ash'),
  ('spawn-sloth-2', 'wood-sloth', 'the-fallen-giant'),
  ('spawn-sloth-3', 'wood-sloth', 'the-split-ash'),
  ('spawn-sloth-4', 'wood-sloth', 'the-oak-fall-gap'),
  ('spawn-sloth-5', 'wood-sloth', 'the-willow-margin'),
  ('spawn-sloth-6', 'wood-sloth', 'the-stunted-oaks'),
  ('spawn-sloth-7', 'wood-sloth', 'the-last-oaks'),
  ('spawn-sloth-8', 'wood-sloth', 'the-holly-tree'),
  ('spawn-hhog-1', 'hedgehog', 'the-boundary-bank'),
  ('spawn-hhog-2', 'hedgehog', 'the-bramble-margin'),
  ('spawn-hhog-3', 'hedgehog', 'the-moss-hall'),
  ('spawn-hhog-4', 'hedgehog', 'the-old-ditch'),
  ('spawn-hhog-5', 'hedgehog', 'the-sloe-thicket'),
  ('spawn-hhog-6', 'hedgehog', 'the-ward-ditch'),
  ('spawn-hhog-7', 'hedgehog', 'the-peeling-bank'),
  ('spawn-hhog-8', 'hedgehog', 'the-grey-thicket'),
  ('spawn-hhog-9', 'hedgehog', 'the-holly-hedge'),
  ('spawn-hhog-10', 'hedgehog', 'the-moss-steps');
