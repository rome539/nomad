-- Phase A — the hoard. The dungeon stops handing out steel off the floor and
-- starts making you earn it. Three new stat axes for the fair rock-paper-
-- scissors: blunt weapons can STUN (skip a foe's swing), fast weapons BLEED
-- (armor-ignoring damage over time — the duelist's answer to plate), and the
-- new shield slot BLOCKs (a flat chance to eat a hit whole, works even weighed
-- down). Behavior for all three lives in zone.ts; this is just the flesh.
--
-- Worn slots expand from one (body) to four — helm/body/feet/cloak — plus a
-- shield hand. Armor and weight both SUM across the kit, so defense is a build:
-- stack heavy for soak and lose your dodge, or go light and stay quick.

ALTER TABLE item_templates ADD COLUMN stun  REAL NOT NULL DEFAULT 0; -- blunt: chance to skip the foe's next swing
ALTER TABLE item_templates ADD COLUMN block REAL NOT NULL DEFAULT 0; -- shield: chance to negate a hit whole
ALTER TABLE item_templates ADD COLUMN bleed INTEGER NOT NULL DEFAULT 0; -- fast: armor-ignoring damage per tick

-- ============================ WEAPONS ============================
-- Four archetypes, each climbing the tiers. cols: dmg slot armor speed sweep weight stun block bleed
INSERT OR REPLACE INTO item_templates
(id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed) VALUES

-- Fast & light — low bite, extra swings, and they BLEED (the answer to armor).
('sharpened-rib',  'a sharpened rib',    'A splinter of somebody honed to a point on the stone. Quick, mean, and it opens a seam that keeps weeping.', 'common',   1, 'weapon', 0, 2, 1, 0, 0, 0, 1),
('bone-shiv',      'a bone shiv',        'A shard of long-bone ground to a wicked edge, wrapped in gut for a grip. Fast in the hand and it leaves you leaking.',                 'uncommon', 2, 'weapon', 0, 2, 1, 0, 0, 0, 1),
('fleshing-knife', 'a fleshing knife',   'A curved tanner''s blade meant for peeling hide from carcass. It does the same to the living, twice a breath.',                    'rare',     3, 'weapon', 0, 2, 1, 0, 0, 0, 2),
('widow-maker',    'a widow-maker',      'A whisper-thin stiletto, all point and no weight, that finds the gaps between things. It strikes three times before you feel the first.', 'epic',     4, 'weapon', 0, 3, 1, 0, 0, 0, 2),

-- Balanced blade — the honest middle, no downside, no trick.
('rusted-sword',        'a rusted sword',       'A soldier''s arming sword, its edge gone to orange lace. It still knows what it''s for.',                        'common',   2, 'weapon', 0, 1, 1, 0, 0, 0, 0),
('chipped-falchion',    'a chipped falchion',   'A heavy single-edged cleaver of a sword, notched from long use. It falls with more weight than its length promises.', 'uncommon', 3, 'weapon', 0, 1, 1, 0, 0, 0, 0),
('graveblade',          'a graveblade',         'A longsword pulled from a barrow, the fuller packed with grave-dirt that never quite shakes loose. Well-balanced still.', 'uncommon', 4, 'weapon', 0, 1, 1, 0, 0, 0, 0),
('notched-greatsword',  'a notched greatsword', 'A two-hander taller than a short man, its edge a saw of old chips. It takes both arms and gives no quarter.',      'rare',     5, 'weapon', 0, 1, 1, 1, 0, 0, 0),
('headsman-sword',      'the headsman''s sword','A broad, weighted blade ground for one clean stroke. The pommel is worn smooth by hands that never missed twice.', 'epic',     6, 'weapon', 0, 1, 1, 0, 0, 0, 0),

-- Sweep — drags through a crowd. The answer to numbers.
('rust-eaten-cleaver', 'a rust-eaten cleaver', 'A butcher''s cleaver the size of a spade, more rust than iron. It doesn''t swing so much as fall through whatever''s in front of it.', 'uncommon', 2, 'weapon', 0, 1, 2, 0, 0, 0, 0),
('headtaker-axe',      'a headtaker''s axe',   'A broad-bearded axe with a haft worn black. Its arc is wide enough to catch two throats at once.',                                    'rare',     3, 'weapon', 0, 1, 2, 0, 0, 0, 0),
('reaver-glaive',      'a reaver''s glaive',   'A pole-cleaver on a shaft of grey wood, meant for holding a doorway against a tide. It reaps a whole room in a sweep.',              'epic',     4, 'weapon', 0, 1, 3, 1, 0, 0, 0),

-- Blunt & heavy — big bite, weighs you down, and STUNS (skip the foe's swing).
('splintered-cudgel', 'a splintered cudgel',    'A knot of hardwood studded with old nails. Graceless, but a solid crack takes the fight out of a thing for a moment.',       'common', 2, 'weapon', 0, 1, 1, 1, 0.12, 0, 0),
('warden-maul',       'a warden''s maul',       'A long-hafted maul of the kind the dead wardens carried, its head a block of pitted iron. It rings skulls like bells.',      'rare',   4, 'weapon', 0, 1, 1, 2, 0.25, 0, 0),
('flanged-mace',      'a flanged mace',         'A flanged head on a steel haft, each flange a wedge for splitting helm and sense alike. Slow, and worth the wait.',         'epic',   5, 'weapon', 0, 1, 1, 2, 0.35, 0, 0),

-- Throwable openers (thrown before the fight; also swung, weakly).
('loose-rock',     'a loose rock',      'A fist of broken masonry. The people''s artillery — free, everywhere, and it hits about as hard as you''d think.', 'common',   1, 'weapon', 0, 1, 1, 0, 0, 0, 0),
('throwing-shard', 'a throwing shard',  'A flat wedge of slate knapped to an edge, balanced to fly. One good throw, then it''s a poor knife.',            'uncommon', 2, 'weapon', 0, 1, 1, 0, 0, 0, 0);

-- ============================ ARMOR ============================
-- Four worn slots (armor=body, helm, feet, cloak) that sum. Two body lines:
-- light (no weight, keeps dodge) and heavy (soak more, lose your feet).
INSERT OR REPLACE INTO item_templates
(id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, stun, block, bleed) VALUES

-- BODY — light line
('rag-vest',        'a rag-wrapped vest',      'Layers of filthy cloth bound with cord. It turns a claw, barely, and never slows you.',                     'common',   0, 'armor', 1, 1, 1, 0, 0, 0, 0),
('scavenger-coat',  'a scavenger''s coat',     'A long coat quilted with scavenged padding and scraps of boiled hide. Light enough to run in, thick enough to matter.', 'uncommon', 0, 'armor', 2, 1, 1, 0, 0, 0, 0),
('boiled-cuirass',  'a boiled-leather cuirass','A breastplate of leather boiled hard as wood and lacquered black. Plate''s protection at a runner''s weight.',  'rare',     0, 'armor', 3, 1, 1, 0, 0, 0, 0),
-- BODY — heavy line
('padded-jerkin',   'a padded jerkin',   'A gambeson of stitched and stuffed linen, sweat-stained by whoever wore it last. Soft armor, but armor.',       'common',   0, 'armor', 1, 1, 1, 0, 0, 0, 0),
('mail-hauberk',    'a mail hauberk',    'A shirt of riveted rings that hangs to the knee, heavy on the shoulders. It turns a blade into a bruise.',       'uncommon', 0, 'armor', 2, 1, 1, 1, 0, 0, 0),
('warden-plate',    'warden''s plate',   'The breast-and-back of a Door warden, dented iron over mail. It soaks a great deal and it costs you your feet.', 'rare',     0, 'armor', 3, 1, 1, 1, 0, 0, 0),
('deadplate-harness','a deadplate harness','A full harness scavenged from the deep dead, mismatched plate lashed over mail. It stops nearly everything and moves like a coffin.', 'epic', 0, 'armor', 4, 1, 1, 2, 0, 0, 0),

-- HELM
('leather-cap',      'a leather cap',        'A simple capped skull of boiled leather. Better than a bare head.',                          'common',   0, 'helm', 1, 1, 1, 0, 0, 0, 0),
('rusted-sallet',    'a rusted sallet',      'An old visored helm gone to rust, the eye-slit crusted. It rings when struck, and you keep your face.', 'uncommon', 0, 'helm', 1, 1, 1, 1, 0, 0, 0),
('warden-greathelm', 'a warden''s greathelm','A great barrel of a helm from the wardens'' ranks, sight narrow, protection total.',          'rare',     0, 'helm', 2, 1, 1, 1, 0, 0, 0),

-- FEET
('worn-boots',     'a pair of worn boots',     'Cracked leather boots, soles worn thin but whole. They keep the cold stone off you.',   'common',   0, 'feet', 1, 1, 1, 0, 0, 0, 0),
('ironshod-boots', 'a pair of ironshod boots', 'Heavy boots plated at toe and shin. They turn a low blow and land like hooves.',        'uncommon', 0, 'feet', 1, 1, 1, 1, 0, 0, 0),

-- CLOAK — the light-build layer
('tattered-cloak', 'a tattered cloak',       'A hooded cloak gone to rags at the hem. Weighs nothing, hides a little, turns less.', 'common', 0, 'cloak', 1, 1, 1, 0, 0, 0, 0),
('hyena-mantle',   'a hyena-hide mantle',    'A mantle of coarse spotted hide, still carrying the reek of the pack. Thick across the shoulders, and light as a whisper.', 'rare', 0, 'cloak', 2, 1, 1, 0, 0, 0, 0),

-- SHIELD — new slot, new mechanic: BLOCK (negate a hit whole), works weighed down.
('battered-buckler',   'a battered buckler',      'A small round shield of banded wood, split and re-nailed a dozen times. Quick to interpose.',            'common',   0, 'shield', 0, 1, 1, 0, 0, 0.15, 0),
('iron-bound-shield',  'an iron-bound shield',    'A kite of oak bound in iron strapping. Heavy on the arm, but little gets past it.',                       'uncommon', 0, 'shield', 0, 1, 1, 1, 0, 0.25, 0),
('warden-tower-shield','a warden''s tower shield','A slab of a shield tall as a child, faced in dented plate. A wall you carry, and it drags at every step.', 'rare',     0, 'shield', 0, 1, 1, 2, 0, 0.35, 0);

-- ======================= TROPHIES & CONSUMABLE =======================
-- Trophies: plentiful barter feedstock (Phase E). One per creature. (rat-tail,
-- bone-charm, warden-lantern already exist.) Poultice heals on use.
INSERT OR REPLACE INTO item_templates
(id, name, description, rarity, edible, heal, lure) VALUES
('rat-sinew',          'a knot of rat-sinew', 'A wad of gristle and tendon torn from a brood-swollen rat. Someone, somewhere, wants these.', 'common', 0, 0, 0),
('finger-bone',        'a finger-bone',       'A single yellowed finger-bone, joint still articulate. The catacombs are full of them; that''s rather the point.', 'common', 0, 0, 0),
('hyena-fang',         'a hyena''s fang',     'A long curved fang, cracked at the root. It still holds an edge of old blood.', 'common', 0, 0, 0),
('fistful-teeth',      'a fistful of teeth',  'A grubby handful of human teeth, knocked loose and pocketed. A cutpurse''s idea of savings.', 'common', 0, 0, 0),
('bloodroot-poultice', 'a bloodroot poultice','A wad of chewed bloodroot and moss bound in cloth. Pressed to a wound it draws the fire out — pack a few.', 'uncommon', 1, 15, 0);

-- ======================= MOB LOOT, RETUNED =======================
-- Every kill gives a TROPHY (barter feedstock, generous). GEAR drops are now
-- rare and thematic — one gear type per creature, single-digit %. The floor no
-- longer feeds you (see ground_spawns below); this and the loops to come do.
UPDATE mob_templates SET loot_item='rat-tail',       loot_chance=0.6,  gear_item=NULL,             gear_drop=0    WHERE id='rat';
UPDATE mob_templates SET loot_item='rat-meat',       loot_chance=0.8,  gear_item=NULL,             gear_drop=0    WHERE id='fleet-rat';
UPDATE mob_templates SET loot_item='rat-sinew',      loot_chance=0.6,  gear_item=NULL,             gear_drop=0    WHERE id='brood-rat';
UPDATE mob_templates SET loot_item='finger-bone',    loot_chance=0.5,  gear_item='rusted-sword',   gear_drop=0.06 WHERE id='skeleton';
UPDATE mob_templates SET loot_item='fistful-teeth',  loot_chance=0.4,  gear_item='leather-cap',    gear_drop=0.08 WHERE id='cutpurse';
UPDATE mob_templates SET loot_item='hyena-fang',     loot_chance=0.4,  gear_item='tattered-cloak', gear_drop=0.08 WHERE id='grave-hyena';
UPDATE mob_templates SET loot_item='hyena-fang',     loot_chance=0.5,  gear_item='hyena-mantle',   gear_drop=0.06 WHERE id='dire-hyena';
UPDATE mob_templates SET loot_item='warden-lantern', loot_chance=0.6,  gear_item='warden-plate',   gear_drop=0.08 WHERE id='warden';
UPDATE mob_templates SET loot_item='door-signet',    loot_chance=0.2,  gear_item='headsman-sword', gear_drop=0.15 WHERE id='forgotten-king';

-- ======================= SCARCITY: EMPTY THE ARMORY =======================
-- Gear no longer lies on the floor to be picked up (and regrown) forever. Keep
-- ONLY the loose rock (free starter, regrows at gates) and the tarnished key
-- (a door function that must never dead-end). Everything with real stats is
-- earned now.
DELETE FROM ground_spawns WHERE item_id NOT IN ('loose-rock', 'tarnished-key');
