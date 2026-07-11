-- The runt of the wardens' litter. They bred hounds for the door, and not
-- every whelp came out with three heads. When the stair's keeper is put down,
-- once in a while it is THIS that pads out of the dark to hold the post
-- instead — same bloodline, same chain, one head and a lot of meanness short.
-- A lucky window for whoever finds it on the throne: fewer teeth. Not few.
--
-- Rides the bloodline system (mob_variants): no spawn rows of its own, so it
-- counts against the three-hound's cap and refills its post. Template +
-- variant row = redeploy only, NO reseed.

INSERT OR REPLACE INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, armor, stun, bleed, loot_item, loot_chance)
VALUES (
  'two-hound',
  'the two-headed hound',
  'Two heads on a lean frame, and both of them hungry. Kin to the stair''s keeper — the wardens bred hounds for that door, and this one came out of the litter a head short and without the bulk to make up for it. It holds the post the same way all the same: sprawled across the stair, asleep until something dares it. Fewer teeth. Not few.',
  3, 44, 5, 9, 360, 1, 0.10, 2, 'hound-fang', 0.6
);

-- One refill in ten sends the runt to the throne instead of the big one.
INSERT OR REPLACE INTO mob_variants (base_id, variant_id, chance) VALUES
  ('three-hound', 'two-hound', 0.10);

-- A smaller purse for a smaller guardian (the big one pays 0.25).
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('two-hound', 'dry-cigarettes', 0.10);

-- The fang no longer swears to three heads — either keeper's jaws prove the
-- same thing at the door.
UPDATE item_templates
SET description = 'A fang as long as a knife, from a head that guarded the stair. Proof, mostly — that the door stood open because you made it so.'
WHERE id = 'hound-fang';
