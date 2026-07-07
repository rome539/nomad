-- The toll into the deep. Everything funnels through The Long Descent (the throat
-- of the drowned depths), and until now a lone twice-dead held it — no toll at all.
-- Now a SENTINEL holds the door: a three-headed hound the wardens chained here and
-- then abandoned. It never leaves its post (SENTINELS set in zone-data), is deaf to
-- noise-lures, bites with three mouths (bleed) and bowls you over (stun). Getting
-- down means going through it. (And no — the lore and the code agree — it is NOT
-- that hound. Don't bring a lyre.)

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, armor, stun, bleed)
VALUES (
  'three-hound',
  'the three-headed hound',
  'Three heads on one heavy body, and each has already decided about you. You are thinking of the old story — the three-headed hound at the gate of the dead, and the one hero who charmed his way past. No. Not this one. There is no song for it, no honeyed cake, no clever trick; the wardens chained it to hold the stair, then stopped coming, and it has held it ever since. Getting down means going through.',
  4, 68, 7, 12, 150, 3, 0.15, 3
);

-- It replaces the lone wight at the throat of the deep — the descent has a real
-- keeper now.
DELETE FROM mob_spawns WHERE id = 'wight-1'; -- the twice-dead that used to loiter at the-descent
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('hound-1', 'three-hound', 'the-descent');

-- A guardian's purse: a real shot at the hard tender (below a King's 0.6, above
-- the rabble). Killing it clears the door AND might pay.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('three-hound', 'dry-cigarettes', 0.25);
