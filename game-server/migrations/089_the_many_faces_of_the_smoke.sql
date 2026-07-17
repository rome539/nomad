-- 089: the many faces of the smoke (rome, 2026-07-17). The hard currency wears
-- more than one face now — a kept tin, a crushed pack off a dead soldier, a
-- twist of hand-rolled leaf from the deep. FLAVOR ONLY: every variant is worth
-- exactly the same (barter 20), stacks with its own kind, smokes the same, and
-- is still never named as money anywhere in-world. No new supply — the existing
-- cigarette drops are REPOINTED by provenance (same drop_chance on every row),
-- so what you loot tells you who you took it from, and the total stays put.

INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
  ('crushed-pack', 'a crushed pack of cigarettes',
   'A soft pack gone flat in a dead man''s coat, the cardboard split and the smokes inside bent but whole. The printing is worn to a ghost of itself. They still light. That is the only thing about them that was ever the point.',
   'rare'),
  ('hand-rolled-smokes', 'a twist of hand-rolled cigarettes',
   'Half a dozen cigarettes rolled by hand from salvaged leaf and whatever paper came to reach, tied off with a loop of thread. Somebody''s patient work, done down in the dark, for the one small comfort the dark hadn''t taken yet.',
   'rare');
UPDATE item_templates SET barter = 20 WHERE id IN ('crushed-pack', 'hand-rolled-smokes');

-- The human dead carry the crushed pack: soldiers, cutthroats, thieves, and the
-- keep's own bone-knights — a pack in the coat, flattened by death and looting.
UPDATE mob_keys SET key_item = 'crushed-pack'
 WHERE key_item = 'dry-cigarettes'
   AND template_id IN ('cutpurse', 'warden', 'warden-captain', 'cutthroat', 'last-watchman', 'bone-knight');
UPDATE cache_loot SET item_id = 'crushed-pack'
 WHERE item_id = 'dry-cigarettes' AND cache_id = 'box-bone';

-- The deep and the drowned and the vermin carry the hand-rolled: the truly
-- desperate roll their own, and the scavengers drag them into their nests.
UPDATE mob_keys SET key_item = 'hand-rolled-smokes'
 WHERE key_item = 'dry-cigarettes'
   AND template_id IN ('the-drowned', 'drowned-hulk', 'pale-stalker', 'two-hound', 'thrice-dead', 'fleet-rat', 'brood-rat', 'dire-hyena');
UPDATE cache_loot SET item_id = 'hand-rolled-smokes'
 WHERE item_id = 'dry-cigarettes' AND cache_id = 'box-crack';

-- Left on the KEPT TIN (dry-cigarettes), pristine, the premium find: the bosses
-- and the reliquary and the deep box — the powerful dead who could keep them dry
-- (forgotten-king, drowned-god, marrow-king, albino-rat, three-hound; reliquary,
-- box-deep). Those rows are untouched.
