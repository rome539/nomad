-- Every bloodline gets its rare cousin now — not just the rats and hyenas.
-- Each ordinary den can, once in a while, turn up the mean version instead
-- (the roll lives in zone.ts:rollBloodline, capped against the base so the
-- population never grows). And the throne is no longer always the same king:
-- descend enough times and you'll meet someone else sitting on it.
--
-- Behaviours reuse the families already in zone.ts — a cutthroat still steals
-- and runs, a captain still walks the rounds, the drowned still seize — so this
-- is mostly flesh and a few new lines wiring the new ids into those families.

-- ============================ ELITE COUSINS ============================
-- Meaner than their kin, and they carry better. Cols:
-- (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs,
--  is_boss, loot_item, loot_chance, armor, gear_item, gear_drop)
INSERT OR REPLACE INTO mob_templates
(id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop) VALUES

-- skeleton -> a dead soldier who kept his mail and his sword. Still hollow,
-- still waits in the dark and hears you coming — but this one hits back hard.
('bone-knight', 'a bone-knight',
 'A tall skeleton in the rusted mail of some old garrison, sword still in hand out of habit older than death. It waits in the dark like the rest of them — but this one remembers how to use what it holds.',
 3, 32, 3, 5, 90, 0, 'finger-bone', 0.6, 2, 'chipped-falchion', 0.12),

-- cutpurse -> a killer, not a pickpocket. Still lifts your purse and bolts, but
-- opens a vein doing it.
('cutthroat', 'a cutthroat',
 'Lean and unhurried, with a thin knife and the calm of someone who has done this often. He still means to take what you carry and be gone — he just does not mind cutting you open on the way.',
 3, 22, 3, 5, 70, 0, 'fistful-teeth', 0.6, 0, 'bone-shiv', 0.12),

-- warden -> the captain of the dead watch. Same endless rounds, twice the wall.
('warden-captain', 'a warden-captain',
 'Bigger than the wardens it once led, in a captain''s dented harness, a maul rusted to its gauntlets. It walks the same rounds they do, forever, and nothing has ever made it break stride.',
 5, 52, 4, 7, 150, 0, 'warden-lantern', 0.7, 4, 'warden-maul', 0.12),

-- the-drowned -> a bloated hulk of the deep. Grips harder, holds its water.
('drowned-hulk', 'a drowned hulk',
 'A drowned thing swollen vast and pale, filling the flooded dark where it stands. When it takes hold there is a great deal more of it to pull against, and it is in no hurry to let the water have you instead.',
 4, 46, 4, 7, 120, 0, 'grave-pearl', 0.5, 1, 'iron-bound-shield', 0.10),

-- pale-crawler -> a bigger blind hunter. Waits unseen, drops heavier.
('pale-stalker', 'a pale stalker',
 'Longer than a man and thinner, the same colour as the things the light never finds. You will not see it either — only feel the dark move, once, and then a great deal of weight.',
 4, 32, 5, 8, 100, 0, 'pale-claw', 0.6, 0, 'fleshing-knife', 0.10),

-- twice-dead -> one that will not stay down even the second time.
('thrice-dead', 'a cairn-wight',
 'Older even than the barrow-dead, and worse at staying dead. Put it down and it gathers itself and stands; put it down again and, unbelievably, it does it once more. Only the third fall is the one that takes.',
 3, 26, 3, 5, 110, 0, 'finger-bone', 0.6, 1, 'notched-greatsword', 0.06);

-- ============================ OTHER THRONES ============================
-- Rare alternates to the Forgotten King — the throne holds whoever the dark
-- last left on it. Both are is_boss (they inherit the whole boss framework:
-- phases, the summon, no flight, the reliquary key), each a different fight.
INSERT OR REPLACE INTO mob_templates
(id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop) VALUES

-- The sunken throne is flooded; sometimes what sits in the water is a DROWNER.
-- He grips you where you stand and calls the dark down while he has you.
('drowned-god', 'the Drowned God',
 'Not a king — a thing the deep made when it was done with a king. It sits chest-deep in the black water of the throne, immense and patient, and when it closes its hand on you the whole flooded dark leans in.',
 6, 110, 6, 10, 600, 1, 'grave-pearl', 0.4, 1, 'warden-tower-shield', 0.20),

-- Or a REVENANT wears the crown: you put him down and he simply stands back up,
-- the fight beginning again from the throne.
('marrow-king', 'the Marrow-King',
 'A crowned skeleton the colour of old ivory, wound through with the bones of everyone who tried before you. Kill him and he comes apart — and then, without hurry, he draws the pieces back and sits again.',
 6, 105, 5, 9, 600, 1, 'door-signet', 0.3, 2, 'reaver-glaive', 0.20);

-- ---- the bloodlines: base -> rare cousin, and how rare ----
INSERT OR REPLACE INTO mob_variants (base_id, variant_id, chance) VALUES
('skeleton',       'bone-knight',    0.08),
('cutpurse',       'cutthroat',      0.10),
('warden',         'warden-captain', 0.07),
('the-drowned',    'drowned-hulk',   0.08),
('pale-crawler',   'pale-stalker',   0.08),
('twice-dead',     'thrice-dead',    0.06),
('forgotten-king', 'drowned-god',    0.15),
('forgotten-king', 'marrow-king',    0.12);

-- ---- pockets: cigarettes ride the mob_keys table (rare finds off the dead) ----
-- Every variant can turn up a tin, low. The elites of people (cutthroats,
-- captains) more than the beasts; the throne-things as freely as the King.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
('fleet-rat',      'dry-cigarettes', 0.02),
('brood-rat',      'dry-cigarettes', 0.03),
('dire-hyena',     'dry-cigarettes', 0.05),
('bone-knight',    'dry-cigarettes', 0.04),
('cutthroat',      'dry-cigarettes', 0.08),
('warden-captain', 'dry-cigarettes', 0.06),
('drowned-hulk',   'dry-cigarettes', 0.05),
('pale-stalker',   'dry-cigarettes', 0.04),
('thrice-dead',    'dry-cigarettes', 0.04),
('drowned-god',    'dry-cigarettes', 0.60),
('marrow-king',    'dry-cigarettes', 0.60);

-- ---- keys off the elites and the other thrones ----
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
('warden-captain', 'strongbox-key',  0.12),
('cutthroat',      'strongbox-key',  0.08),
('drowned-hulk',   'strongbox-key',  0.06),
('drowned-god',    'reliquary-key',  0.60),
('marrow-king',    'reliquary-key',  0.60);
