-- The exclusives pass (rome, 2026-07-08): the corpse-gear table was mostly
-- fence-duplicates, so hunting a SPECIFIC creature was rarely gear-motivated —
-- and the three-headed hound, the hardest non-boss fight in the game, dropped
-- NOTHING (sneaking past was strictly correct; killing it was charity). Ten new
-- pieces the keeper will never touch: the fence dresses you, the deep defines you.
--
-- Drop-rate principle (rome, this pass): THE SPAWN IS ALREADY THE GATE — the
-- drop shouldn't double-gate it. Trophies near-certain, signature hide about
-- half, epics-off-elites about a tenth; spawn rarity does the rest.
--
-- Traits reuse the 045 hooks (zone-data.ts sets grow by an id or two — wardhide,
-- quiet, slick, thorns, reach). No new systems, no strictly-better pieces:
-- every stat line was checked against its slot neighbors in the audit model.

-- cols: (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed)
INSERT OR REPLACE INTO item_templates
(id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed) VALUES

-- ---- off creatures: worn visibly, pried loose when they fall ----
('sentinels-mantle', 'a sentinel''s mantle', 'The hide of the three-headed hound, thick enough to shrug off claws for a century of standing watch. Whatever rakes at you now drags through it first.',
 'rare',     0, 'cloak',  2, 1, 1, 0, 0.00, 0,    0),
('pale-hide-hood', 'a pale-hide hood', 'A hood cut from the albino''s colorless pelt. The thing lived unheard in a den full of listeners; its skin remembers how.',
 'uncommon', 0, 'helm',   1, 1, 1, 0, 0.00, 0,    0),
('crawlers-hooks', 'a pair of crawler''s hooks', 'The pale crawler''s own killing claws, cut free and lashed to handles. They open more than they cut — what they touch keeps weeping.',
 'rare',     2, 'weapon', 0, 2, 1, 0, 0.00, 0,    3),
('gaff-hook', 'a gaff-hook', 'A drowned fisherman''s gaff, long-hafted and cruelly barbed. It keeps the water''s things at pole''s length and leaves them leaking.',
 'uncommon', 2, 'weapon', 0, 1, 1, 0, 0.00, 0,    1),
('knights-kite-shield', 'a knight''s kite-shield', 'A bone-knight''s kite, ancient lacquer over older bone. Lighter than a wall, wider than a fist — the shape a man dies holding.',
 'rare',     0, 'shield', 0, 1, 1, 1, 0.00, 0.30, 0),

-- ---- in coffers only: the deep guards its own answers ----
('kelp-woven-mail', 'kelp-woven mail', 'A shirt of rings threaded through cured kelp, supple and forever damp. Cold arms slide from it like the tide going out.',
 'rare',     0, 'armor',  2, 1, 1, 0, 0.00, 0,    0),
('shade-wrapped-greaves', 'shade-wrapped greaves', 'Greaves muffled in layer on layer of grey funeral cloth. Less iron than you''d like; less sound than they''d need.',
 'rare',     0, 'feet',   1, 1, 1, 0, 0.00, 0,    0),
('crown-guard-pavise', 'a crown-guard pavise', 'A full pavise from the King''s own guard, its face set with a fist of forward spikes. It was never meant to only catch blows.',
 'epic',     0, 'shield', 0, 1, 1, 2, 0.00, 0.40, 0),
('abyssal-scale-coat', 'an abyssal-scale coat', 'A coat of overlapping scales from something that swam the sunless water and was never once caught. Light as skin, and nothing holds it.',
 'epic',     0, 'armor',  3, 1, 1, 0, 0.00, 0,    0),

-- ---- and the hound finally pays: three heads, at least one good fang ----
('hound-fang', 'a hound''s fang', 'A fang as long as a knife from one of the three heads. Proof, mostly — that the door stood open because you made it so.',
 'common',   0, '',       0, 1, 1, 0, 0.00, 0,    0);

UPDATE item_templates SET barter = 8 WHERE id = 'hound-fang';

-- ---- the creatures carry them (gear_item = wielded visibly, drops when it falls) ----
-- The hound: near-certain trophy + the mantle about half the time.
UPDATE mob_templates SET loot_item = 'hound-fang', loot_chance = 0.9,
                         gear_item = 'sentinels-mantle', gear_drop = 0.45 WHERE id = 'three-hound';
-- The albino (3% bloodline — the spawn is the gate): the hood usually survives.
UPDATE mob_templates SET gear_item = 'pale-hide-hood', gear_drop = 0.6 WHERE id = 'albino-rat';
-- Swaps, not churn: mobs whose gear duplicated the fence counter now carry
-- exclusives instead. (The crawler keeps the fleshing-knife; the hulk keeps
-- the iron-bound shield — only the signature cousins upgrade.)
UPDATE mob_templates SET gear_item = 'crawlers-hooks',      gear_drop = 0.2  WHERE id = 'pale-stalker';
UPDATE mob_templates SET gear_item = 'gaff-hook',           gear_drop = 0.12 WHERE id = 'the-drowned';
UPDATE mob_templates SET gear_item = 'knights-kite-shield', gear_drop = 0.1  WHERE id = 'bone-knight';
-- The captain wields the epic mace his men only dream of (coffer epic, now
-- huntable — 0.07 variant x 0.10 drop keeps the faucet a trickle).
UPDATE mob_templates SET gear_item = 'flanged-mace',        gear_drop = 0.10 WHERE id = 'warden-captain';
-- The dire-hyena's mantle is literally its pelt, yet the beast almost never
-- yielded it (0.036) while the keeper sold it over the counter for 18. Flipped:
-- the pelt comes OFF THE BEAST (signature hide ~a third — skinning a hyena is
-- ugly work) and off the counter entirely. Net supply goes DOWN: an infinite
-- fence faucet closes; a 1-in-10 bloodline hunt opens. Scarcer AND truer.
UPDATE mob_templates SET gear_drop = 0.3 WHERE id = 'dire-hyena';
DELETE FROM fence_stock WHERE item_id = 'hyena-mantle';
-- (The door-signet stays 1-in-5 off the King — deliberate myth, rome's call
-- 2026-07-08: the one legendary is allowed to double-gate.)

-- ---- coffer placement: the deep guards its own counters (043 doctrine) ----
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-deep',  'crawlers-hooks',        0.12),
('box-deep',  'knights-kite-shield',   0.12),
('box-deep',  'shade-wrapped-greaves', 0.12),
('box-tide',  'gaff-hook',             0.10),
('box-tide',  'kelp-woven-mail',       0.12),
('reliquary', 'crown-guard-pavise',    0.08),
('box-abyss', 'crown-guard-pavise',    0.08),
('box-abyss', 'abyssal-scale-coat',    0.08);
