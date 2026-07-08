-- The audit expansion (rome, 2026-07-08): sixteen pieces designed against the
-- fresh combat model so each lands in its tier on the first shot. NO raw-damage
-- creep anywhere — every piece buys a SITUATION, not a bigger number. Each one
-- carries a property that hooks a system the simulation already runs:
--
--   reach      -> creatureFirstStrike (a haft held at length blunts the ambush)
--   pierce     -> the armor subtraction (a pick punches plate)
--   parry      -> equippedBlock (the block column, on a weapon)
--   two-handed -> the equip rule (no shield with it)
--   padded     -> the mob-stun roll (stuns ring you half as often; best piece counts)
--   wardhide   -> openWound (claw-wounds open half as often)
--   quiet      -> LISTENER wake odds (halved)
--   slick      -> the SEIZE grip (takes hold half as often, breaks easier)
--   strapped   -> the cutpurse's snatch (everything lashed down)
--   thorns     -> the block branch (a blocked blow costs the attacker)
--
-- Traits live in code (zone-data.ts sets/maps, the FEARS_FIRE/HOLLOW pattern);
-- this file is pure stats + placement. Placement follows danger (043 doctrine):
-- commons/uncommons at the fence and shallows, rares in the deep coffers, and
-- the drowned tier guards its own counters (eel-skin, harpoon in the tide-vault).

-- cols: (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed)
INSERT OR REPLACE INTO item_templates
(id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed) VALUES

-- ---- weapons: reach, pierce, parry — the missing verbs ----
('quarterstaff', 'a quarterstaff', 'Six feet of ash, worn smooth where hands have gripped it for a hundred years. It will not cut anything, but a thing lunging at you meets the point of it first.',
 'common',   1, 'weapon', 0, 1, 1, 0, 0.00, 0,    0),
('pitted-spear', 'a pitted spear', 'A boar-spear gone grey with age, its lugs rusted to stubs. Held at length, whatever comes for you arrives on the point before it arrives on you.',
 'uncommon', 3, 'weapon', 0, 1, 1, 0, 0.00, 0,    0),
('horsemans-pick', 'a horseman''s pick', 'A hammer-backed spike made for opening riders like tins. Mail and bone plate mean very little to the narrow point.',
 'uncommon', 2, 'weapon', 0, 1, 1, 0, 0.00, 0,    0),
('sword-breaker', 'a sword-breaker', 'A heavy parrying blade, its spine cut into teeth for catching steel. It kills slowly and keeps you alive while it does — fought best behind a guard.',
 'rare',     2, 'weapon', 0, 2, 1, 0, 0.00, 0.10, 0),
('crow-beak-pick', 'a crow-beak pick', 'A war-pick with a beak like its namesake, forged for men who fought men in iron. Plate turns almost nothing of it; flesh was never what it was for.',
 'rare',     3, 'weapon', 0, 1, 1, 0, 0.00, 0,    0),
('war-pike', 'a war-pike', 'A full-length pike with a foot of steel at the end. It wants both hands and gives back distance — the first blow of most fights is yours by default.',
 'rare',     5, 'weapon', 0, 1, 1, 1, 0.00, 0,    0),
('abyssal-harpoon', 'an abyssal harpoon', 'A drowned whaler''s iron, barbed and black, hauled up from the very bottom. Two hands, all reach — the deep itself learned to keep its distance.',
 'epic',     6, 'weapon', 0, 1, 1, 1, 0.00, 0,    0),
('kings-guard-blade', 'a king''s-guard blade', 'The sword of a man paid to die second. Its wide forte catches blows a shield would miss; whoever carried it last did not die second.',
 'epic',     5, 'weapon', 0, 1, 1, 0, 0.00, 0.15, 0),

-- ---- armor: what it turns matters less than WHAT KIND of hurt it turns ----
('quilted-coif', 'a quilted coif', 'Layers of rag stitched into a thick hood. It will not stop a blade, but a blow that would ring your skull like a bell lands on wool instead.',
 'common',   0, 'helm',   1, 1, 1, 0, 0.00, 0,    0),
('thick-hide-jack', 'a thick-hide jack', 'A coat of boiled hide two fingers deep, heavy as guilt. Claws that would open a man to the rib drag through it and find less than they wanted.',
 'uncommon', 0, 'armor',  2, 1, 1, 1, 0.00, 0,    0),
('felt-soled-boots', 'felt-soled boots', 'Boots soled in dense felt, made by someone who needed very badly not to be heard. They turn nothing. Nothing hears them.',
 'uncommon', 0, 'feet',   0, 1, 1, 0, 0.00, 0,    0),
('strapped-baldric', 'a strapped baldric', 'A web of belts and buckles that lashes every carried thing tight to the body. Fingers that lift purses for a living slide off it, finding no purchase.',
 'uncommon', 0, 'cloak',  0, 1, 1, 0, 0.00, 0,    0),
('spiked-buckler', 'a spiked buckler', 'A fist of iron with a hand''s-length spike at the boss. What it catches, it answers.',
 'uncommon', 0, 'shield', 0, 1, 1, 0, 0.00, 0.15, 0),
('eel-skin-cloak', 'an eel-skin cloak', 'A cloak of cured eel hide, slick as the day it swam. Cold arms that close around you find nothing to hold.',
 'rare',     0, 'cloak',  1, 1, 1, 0, 0.00, 0,    0),
('riveted-cuirass', 'a riveted cuirass', 'A cuirass lined thick with horsehair under riveted plates. Heavy, and blunt dead fists land on it like they''re hitting a mattress stuffed with iron.',
 'rare',     0, 'armor',  3, 1, 1, 1, 0.00, 0,    0),
('grave-shroud', 'a grave-shroud', 'The winding-sheet of someone important, woven so fine it pours like smoke. The dead listen for footsteps; wearing their cloth, you sound like one of them.',
 'epic',     0, 'cloak',  2, 1, 1, 0, 0.00, 0,    0);

-- ---- the fence: commons and uncommons, honest prices (033 scale) ----
INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
('quarterstaff',     3),
('quilted-coif',     3),
('strapped-baldric', 6),
('spiked-buckler',   6),
('horsemans-pick',   8),
('felt-soled-boots', 8),
('thick-hide-jack',  8),
('pitted-spear',     9);

-- ---- the deep coffers: rares behind danger, the best at the bottom (043) ----
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-deep',  'riveted-cuirass',   0.15),
('box-deep',  'crow-beak-pick',    0.15),
('box-relic', 'sword-breaker',     0.15),
('box-relic', 'war-pike',          0.12),
('box-tide',  'eel-skin-cloak',    0.12), -- the drowned tier guards its own counter
('box-tide',  'abyssal-harpoon',   0.08),
('box-abyss', 'kings-guard-blade', 0.08),
('box-abyss', 'grave-shroud',      0.08);
