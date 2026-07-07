-- Phase 2 (population) — the +18 rooms of 036 get their dwellers. This is the
-- companion to 036 exactly as 022 was to 021: geography there, population here.
--
-- DESIGN, holding 022's line: NO new creatures. The deep's threat scales two
-- ways that need no new stat-block — DENSITY (more stock, placed thicker the
-- deeper you go) and the BLOODLINE system (every base dweller placed down here
-- is another roll at its rare cousin: a drowned thing that might be a hulk, a
-- crawler that might be a stalker, a wight that might be thrice-dead). Soft base
-- stats, tricks carry the threat, and the rare blood spikes it — the further
-- from the stair, the more rolls the dark makes against you.
--
-- The three base dwellers split by element, the way the map does:
--   • the-drowned  — WATER. The Drowned Reach only (drowners can't wall a dry
--     hall, and the Reach loops, so they never seal the one road out).
--   • pale-crawler — DARK. The Sunless Deep is lightless and dry; the crawlers
--     own it, unseen until they drop. Thickest toward the bottom.
--   • twice-dead   — BONE. The processions, the marrow-road, the dead court.
-- A handful of rooms are left deliberately EMPTY (the Undertow, the Lightless
-- March, the Death Cell): dread needs its silences, and empty rooms make the
-- occupied dark worse.
--
-- Loot: three coffers reward the descent, scarcer and richer the deeper they
-- sit, all opened by the strongbox-keys the deep-dwellers carry. The best
-- non-boss prize in the game is at the very bottom, the Sunless Well — a long,
-- guarded climb back from safe banking, which is the whole point.

-- ============================ SPAWNS ============================
-- Tier 1: the Drowned Reach (wet) — a wight in the barracks nest, drowned things
-- in the warm pools and the bottomless cistern. The tide-vault holds a coffer,
-- not a body.
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
('wight-5',    'twice-dead',   'drowned-barracks'),
('drowned-5',  'the-drowned',  'leech-pools'),
('drowned-6',  'the-drowned',  'the-cistern'),

-- Tier 2: the Sunless Deep (dry, lightless) — crawler country, thickening toward
-- the bottom. Upper loop light (Blackreach, Worm Cloister); the Sump and the
-- lower loop (Carrion Gallery, Marrow Road, Gasping Dark) heavy; the Sunless
-- Well at the very floor keeps one last crawler over its hoard.
('crawler-6',  'pale-crawler', 'blackreach'),
('crawler-7',  'pale-crawler', 'worm-cloister'),
('wight-6',    'twice-dead',   'the-sump'),
('crawler-8',  'pale-crawler', 'carrion-gallery'),
('wight-7',    'twice-dead',   'carrion-gallery'),
('wight-8',    'twice-dead',   'the-marrow-road'),
('crawler-9',  'pale-crawler', 'the-gasping-dark'),
('crawler-10', 'pale-crawler', 'sunless-well'),

-- Tier 3: the King's Demesne — the kneeling court that does not stay kneeling, a
-- crawler in the oratory dark, a wight over the relics, a crawler in the dead
-- hearth. The Death Cell is left empty on purpose; the drain has already run.
('wight-9',    'twice-dead',   'drowned-court'),
('crawler-11', 'pale-crawler', 'kings-oratory'),
('wight-10',   'twice-dead',   'bone-reliquary'),
('crawler-12', 'pale-crawler', 'the-cold-hearth');

-- The crawlers earn their keep on the door too, so the crawler-heavy deep can
-- open its own coffers without a run back to the surface elites.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
('pale-crawler', 'strongbox-key', 0.04);

-- ============================ CACHES ============================
-- A mid coffer in the Tide-Vault (Drowned Reach): solid rare kit, the same tier
-- as the root-vault's box-deep — a reason to loop the flooded level.
INSERT OR REPLACE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
('box-tide', 'tide-vault', 'a silt-choked strongbox', 'A strongbox the flood burst and then buried, its lid sprung and half-packed with grey silt. Whatever the pressure did not ruin is still in there, waiting.', 'strongbox-key', 1200);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-tide', 'warden-tower-shield', 0.35),
('box-tide', 'boiled-cuirass',      0.35),
('box-tide', 'plated-greaves',      0.35),
('box-tide', 'warden-greathelm',    0.30);

-- The relic-cache in the Bone Reliquary (King's Demesne): the King's dead kept
-- close, worth taking. Trophies and one epic shard, tighter than gear coffers.
INSERT OR REPLACE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
('box-relic', 'bone-reliquary', 'a silver relic-case', 'A case of tarnished silver behind a lock the roots have not yet reached, packed with the King''s hoarded dead. It has the still, watchful weight of a thing that does not want to be opened.', 'strongbox-key', 1500);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-relic', 'finger-bone',   0.50),
('box-relic', 'grave-pearl',   0.40),
('box-relic', 'captains-seal', 0.20),
('box-relic', 'marrow-shard',  0.10);

-- The Abyssal Coffer at the Sunless Well — the deepest room in the world, the
-- longest and most-guarded climb back from any bank. The best NON-boss prize in
-- the game: epic gear at deliberately LOW chances (scarce, not a faucet) and a
-- long refill. The reliquary behind the King stays the singular epic hoard; this
-- is the reward for going as deep as the deep goes and living to carry it out.
INSERT OR REPLACE INTO caches (id, room_id, name, description, key_item, refill_secs) VALUES
('box-abyss', 'sunless-well', 'an abyssal coffer', 'A black iron coffer at the very floor of the deep, beaded with cold and older than the flood above it. What settled into it over the long ages is the best of everything that ever fell — and the well has never once let it go easily.', 'strongbox-key', 1800);
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-abyss', 'warden-plate',       0.30),
('box-abyss', 'gravestone-shield',  0.15),
('box-abyss', 'deadplate-harness',  0.12),
('box-abyss', 'headsman-sword',     0.12),
('box-abyss', 'reaver-glaive',      0.12),
('box-abyss', 'widow-maker',        0.10);
