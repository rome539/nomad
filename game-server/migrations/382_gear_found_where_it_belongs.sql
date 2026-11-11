-- 382: GEAR FOUND WHERE IT BELONGS (2026-11-10). An audit of every piece and
-- every way it is come by, and the first part of what it called for.
--
-- THE FORTRESS BOXES HELD THE SAME PIECES THREE AND FOUR TIMES OVER, so a key
-- to the deep box gave two rares and the reliquary two epics, while a mountain
-- box gave one uncommon. Each piece now lies in one fortress box. The spare
-- copies of the plain pieces go out to the thin ground: the mountain's boxes,
-- the road's relay box (which held no gear at all) and the wood's solar. The
-- fortress's own named kit loses its spare copies and goes nowhere.
--
-- KEYS: a strongbox key dropped about twice in a full clear of the world, for
-- twenty-two boxes, and the keeper sold one for 15, so every box was a bought
-- box. Every living person who would carry one now carries one about one time
-- in eight, and the keeper's is 40.
--
-- THE KEEPER AND THE FORGE NO LONGER SELL THE SAME THINGS. The keeper sold
-- rare gear for less than a mountain clear's trophies fetch; it keeps commons,
-- uncommons, supplies and keys. The forge gives up the plain commons and
-- uncommons the keeper sells. Two epics only the keeper sold go into boxes.
--
-- THE PIECES THAT DID NOT EARN THEIR RARITY: the boss-forged pieces, and the
-- epics and legendaries a lower piece matched, each get the number or the
-- trait that sets them apart. The uncommon knives come back under the rare
-- one. The cave lion no longer wears mail: its prize is the pelt.
--
-- (Breaking gear down gives half what it did, in zone-data SALVAGE_YIELD,
-- shipped with this: a rare broke into more than a rare cost to make.)

-- one box each
DELETE FROM cache_loot WHERE cache_id = 'box-deep' AND item_id IN ('headtaker-axe', 'boiled-cuirass', 'plated-greaves', 'chitin-harness', 'drowned-divers-shroud', 'cargo-plate');
DELETE FROM cache_loot WHERE cache_id = 'box-armory' AND item_id IN ('polehammer', 'poleaxe', 'gravestone-shield', 'kings-guard-blade', 'warden-sabatons');
DELETE FROM cache_loot WHERE cache_id = 'box-bone' AND item_id IN ('greatblade');
DELETE FROM cache_loot WHERE cache_id = 'reliquary' AND item_id IN ('flanged-mace', 'reaver-glaive', 'halberd', 'warden-tower-shield', 'gravestone-shield', 'drowned-divers-shroud', 'deadplate-harness');
DELETE FROM cache_loot WHERE cache_id = 'box-abyss' AND item_id IN ('reaver-glaive', 'widow-maker', 'crown-guard-pavise');
DELETE FROM cache_loot WHERE cache_id = 'box-tide' AND item_id IN ('warden-tower-shield', 'barbed-warplate', 'grave-glaive', 'mirror-plate');
-- the spare copies, out on the thin ground
INSERT INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-relay', 'headtaker-axe', 0.15),
  ('box-relay', 'boiled-cuirass', 0.15),
  ('shieling-kist', 'polehammer', 0.12),
  ('slabs-locker', 'greatblade', 0.12),
  ('ridge-cache', 'flanged-mace', 0.08),
  ('cairn-cache', 'poleaxe', 0.08),
  ('box-kept', 'reaver-glaive', 0.12),
  ('box-solar', 'halberd', 0.08),
  ('box-kept', 'hookbill-cleaver', 0.1),
  ('box-cave', 'barbed-round-shield', 0.12);
-- the lion's prize is its pelt
UPDATE mob_templates SET gear_item = NULL, gear_drop = 0 WHERE id = 'cave-lion';
-- keys on the people who would carry them
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('footpad', 'strongbox-key', 0.12),
  ('wayman', 'strongbox-key', 0.12),
  ('cutpurse', 'strongbox-key', 0.12),
  ('cutthroat', 'strongbox-key', 0.12),
  ('strand-thief', 'strongbox-key', 0.12),
  ('the-wrecker', 'strongbox-key', 0.12),
  ('the-toll-clerk', 'strongbox-key', 0.12),
  ('charcoal-burner', 'strongbox-key', 0.12),
  ('the-herd', 'strongbox-key', 0.12),
  ('the-milker', 'strongbox-key', 0.12),
  ('the-fowler', 'strongbox-key', 0.12),
  ('the-eel-cutter', 'strongbox-key', 0.12),
  ('the-drover', 'strongbox-key', 0.12),
  ('the-one-who-stayed', 'strongbox-key', 0.12),
  ('the-butter-wife', 'strongbox-key', 0.12),
  ('the-long-warden', 'strongbox-key', 0.12),
  ('the-tide-warden', 'strongbox-key', 0.12),
  ('the-bridge-mason', 'strongbox-key', 0.12),
  ('the-miller', 'strongbox-key', 0.12),
  ('the-refuge-man', 'strongbox-key', 0.12),
  ('the-sapper', 'strongbox-key', 0.12),
  ('the-cook', 'strongbox-key', 0.12),
  ('the-pilot', 'strongbox-key', 0.12),
  ('the-salt-widow', 'strongbox-key', 0.12),
  ('the-scaffold-hand', 'strongbox-key', 0.12);
UPDATE fence_stock SET cost = 40 WHERE item_id = 'strongbox-key';
-- the keeper keeps commons and uncommons
DELETE FROM fence_stock WHERE item_id IN ('barbed-round-shield', 'boiled-cuirass', 'fleece-lined-jack', 'fleshing-knife', 'greatblade', 'hookbill-cleaver', 'iron-man-catcher', 'lashed-warcoat', 'longbrand', 'mirror-bright-jack', 'pine-brand', 'plated-greaves', 'polehammer', 'reaping-blade', 'skull-headed-maul', 'tar-brand', 'tarred-cuirass', 'warden-greathelm', 'warden-maul', 'warden-tower-shield', 'white-hide-mantle', 'winter-cuirass');
-- the forge gives up what the keeper sells plain
DELETE FROM forge_recipes WHERE item_id IN ('hide-cloak', 'iron-bound-shield', 'kindling-hatchet', 'knotted-lash', 'mail-hauberk', 'mirror-bright-helm', 'nail-studded-jack', 'pedlars-coat', 'rusted-sword', 'short-spear', 'studded-maul');
-- the boss-forged pieces are the best of their kind
UPDATE item_templates SET dmg = 6, stun = 0.2 WHERE id = 'smiths-ruin';
UPDATE item_templates SET block = 0.32 WHERE id = 'smiths-aegis';
UPDATE item_templates SET weight = 2, traits = 'fleeced,hooded,wardhide' WHERE id = 'lion-pelt-cloak';
-- pieces a lower one matched
UPDATE item_templates SET traits = 'wardhide' WHERE id IN ('hyena-mantle', 'coral-crown', 'chitin-harness');
UPDATE item_templates SET traits = 'quiet,staunched' WHERE id = 'shadow-step-boots';
UPDATE item_templates SET traits = 'slick,quiet,watertight' WHERE id = 'still-water-shroud';
UPDATE item_templates SET traits = 'quiet,slick,staunched' WHERE id = 'pale-tread';
UPDATE item_templates SET bleed = 3, traits = 'reach,two-handed,pierce:3,piercing' WHERE id = 'houndsbane';
UPDATE item_templates SET traits = 'mailward' WHERE id = 'warden-plate';
UPDATE item_templates SET armor = 4 WHERE id = 'abyssal-scale-coat';
-- the uncommon knives, under the rare one
UPDATE item_templates SET speed = 2 WHERE id = 'stiletto';
UPDATE item_templates SET dmg = 2 WHERE id = 'oyster-knife';
-- the two legendaries nobody could find, and the one everybody could
UPDATE mob_templates SET gear_drop = 0.05 WHERE id IN ('drowned-hulk', 'last-watchman');
UPDATE mob_templates SET gear_drop = 0.02 WHERE id = 'marrow-cantor';
