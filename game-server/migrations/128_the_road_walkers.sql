-- THE ROAD WALKERS — the West Road's roster (2026-08-01)
--
-- ROADMAP ruling: roads get PATROLLERS, not residents. That is what makes a
-- road a road — you meet something GOING SOMEWHERE, not something that lives
-- where you found it. The fortress's rooms are all dens; this is the first
-- stretch of world where the thing you meet was already on its way before you
-- arrived and keeps going after.
--
-- Seven bodies over thirty rooms (density 0.16, the table's number) — a fifth
-- of the grounds' crowding. The road is meant to feel EMPTY and long, with the
-- danger in what the emptiness means: nowhere to hide, and a long way back.
--
-- Difficulty rides DISTANCE the way the mountain's will ride altitude. The
-- paved end nearest the fortress holds nothing at all; the first dog is 12
-- rooms out, and both far-end spawns sit past the Old Boundary, where the road
-- stops being maintained and starts being merely used.

-- ---- the carrier: the road's signature, and the reason it's a road ----------
-- A courier still walking a route for an institution that stopped existing.
-- Level 3 and armored 1 — a shade harder than a warden to put down, because
-- unlike a warden you meet him in the open with nowhere to break line of
-- sight. He is the only thing in the game that walks 25 rooms in one direction.
INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES (
  'road-carrier',
  'the carrier',
  'A tall figure walking at a steady pace that never varies, in a coat gone the colour of the road, with a flat leather satchel worn crosswise and both hands free. The satchel is buckled and the buckles are bright with use. Whatever it is carrying, it has been carrying a long way, and it has some distance yet to go.',
  3, 40, 3, 6, 900, 0,
  'dry-cigarettes', 0.12,
  1,
  'hobnailed-boots', 0.3,
  0, 0
);

-- ---- the masterless dogs: what a road leaves behind -------------------------
-- Bleed but no armor and thin hp: fast, hurts, dies. They are on the hunger
-- clock (STARVE_HUNTERS), which since the 2026-08-01 retune runs four times
-- slower — so an unprovoked hunt is rare and means something when it happens.
INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES (
  'masterless-dog',
  'a masterless dog',
  'Rangy, deep-chested, and carrying its head low. It still has a collar — a broad one, studded, made for a working animal that somebody valued — and the collar has long since stopped meaning anybody is coming for it. It watches you the way a dog watches a thing it has not yet decided about.',
  2, 24, 3, 5, 420, 0,
  'hound-fang', 0.3,
  0,
  NULL, 0,
  0.3, 0
);

-- ---- the footpads: the oldest reason not to walk a road alone ---------------
-- THIEVES family (code): it fights to rob, not to win — one grab and it bolts.
-- Placed exactly where the road gives cover, which on a road is rare and
-- therefore predictable: the hollow in the cutting, and the sunken holloway.
INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES (
  'footpad',
  'a footpad',
  'Someone waiting off the verge in clothes chosen to be nothing in particular, who stands up as you come level and is already closer than they were. No stance, no challenge, no interest in a fight — the whole trade is in the half-second where you work out what is happening.',
  2, 18, 2, 4, 600, 0,
  'bone-shiv', 0.35,
  0,
  'tattered-cloak', 0.3,
  0, 0
);

-- ---- the seven bodies ------------------------------------------------------
-- mob_spawns rows ARE the population cap (scheduleArrivals counts them against
-- the living), so this is exactly seven alive at once, forever.

-- One carrier. His den is the Roadwarden's Post, the one place on the road that
-- was ever an office; PATROLS overrides territory, so the den only decides
-- where he re-enters the world after he's put down.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-carrier-1', 'road-carrier', 'the-roadwarden-post');

-- Three dogs, none of them near the fortress. The mustering yard (walled, and
-- once full of animals), the tinker's camp (fires, and whatever was cooked on
-- them), and the rutted track out past the last paving.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-roaddog-1', 'masterless-dog', 'the-mustering-yard'),
  ('spawn-roaddog-2', 'masterless-dog', 'the-tinkers-camp'),
  ('spawn-roaddog-3', 'masterless-dog', 'the-rutted-track');

-- Three footpads, all at the road's blind spots: the hollow worn into the
-- cutting's face, the green tunnel, and the holloway where the banks close
-- over your head and the sound of your own feet comes back at you.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-footpad-1', 'footpad', 'the-beggars-hollow'),
  ('spawn-footpad-2', 'footpad', 'the-green-lane'),
  ('spawn-footpad-3', 'footpad', 'the-holloway');
