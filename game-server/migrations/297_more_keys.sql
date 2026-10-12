-- MORE KEYS ON THE ROAD, AND A RARE RING (rome, 2026-10-12).
--
-- The notched iron key opens 22 strongboxes, more than every other key put
-- together, and it fell from only a handful of kinds at 3-5% - about one key
-- per 29 kills of them, and none at all from most of what a wanderer kills.
-- People who would plausibly carry a key now do: the footpad goes from 3% to
-- 5%, and the drover, the fowler and the eel-cutter join at 5%.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('footpad', 'strongbox-key', 0.05);
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-drover', 'strongbox-key', 0.05);
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-fowler', 'strongbox-key', 0.05);
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-eel-cutter', 'strongbox-key', 0.05);

-- THE GREAT RING. A keyholder's ring: it opens any strongbox, warden's vault or
-- toll box, and loses a key to each lock it opens - nobody knows how many are
-- left on it until the last one turns (keys.ts). Rare, and only on the ones
-- who kept keys for a living.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES ('ring-of-keys', 'a great ring of keys',
  'A ring of black iron as wide as a hand, crowded with keys of every age and make - strongbox keys, long vault keys, a toll key, and some that nobody alive could name the lock for. A keyholder carried this. It is heavier than it looks, and it is not as full as it was.',
  'rare', 0, 0, 0, 0, '', 0, 1, 1, 0, 0, 0, 0, 30, 0, '');
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('last-watchman', 'ring-of-keys', 0.03);
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-long-warden', 'ring-of-keys', 0.03);
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-tide-warden', 'ring-of-keys', 0.03);
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-keeper-of-the-holding', 'ring-of-keys', 0.03);
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('the-toll-clerk', 'ring-of-keys', 0.02);
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES ('warden', 'ring-of-keys', 0.01);
