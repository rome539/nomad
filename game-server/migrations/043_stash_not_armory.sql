-- Fix a scarcity leak (rome, 2026-07-07): the two upper hideaway chests were
-- rare-gear vending machines in the safest, most convenient rooms in the game.
--
-- bone-nook ("A Gap in the Bones") and hollow-crack ("A Crack in the Wall") are
-- is_safe=1 crawl-spaces — no mob enters, a short hop from a gate to bank — and
-- they refill the FASTEST (15 min). Yet box-bone/box-crack held mostly RARE gear
-- (boiled-cuirass, notched-greatsword, warden-greathelm, headtaker-axe, warden-
-- maul). That's the exact inverse of the design: best loot belongs at the BOTTOM,
-- in danger, far from banking. The 039 pass trimmed their odds but left the TIER
-- wrong for the place.
--
-- Re-stock them as what they should be: a lucky little stash. Common/uncommon
-- kit + provisions + a slim smoke/map chance — worth finding, worth a key, but a
-- clear tier below the deep coffers (box-deep/tide/relic/abyss), which keep the
-- rare and epic gear behind real danger. No rare GEAR up here; cigs (currency)
-- and the surveyor map (knowledge, not power) stay at a slim chance.

DELETE FROM cache_loot WHERE cache_id IN ('box-bone', 'box-crack');

-- box-bone — a stash tucked in the old bones: scavenger's kit, a bite to eat.
INSERT INTO cache_loot (cache_id, item_id, chance) VALUES
('box-bone', 'iron-bound-shield', 0.35),   -- uncommon
('box-bone', 'mail-hauberk',      0.30),   -- uncommon
('box-bone', 'bone-shiv',         0.35),   -- uncommon
('box-bone', 'leather-cap',       0.40),   -- common
('box-bone', 'worn-boots',        0.40),   -- common
('box-bone', 'smoked-haunch',     0.30),   -- uncommon provision
('box-bone', 'dry-cigarettes',    0.06),   -- slim smoke
('box-bone', 'surveyor-map',      0.08);   -- slim map (knowledge, not power)

-- box-crack — a hidden crack stash: someone's cached run, long abandoned.
INSERT INTO cache_loot (cache_id, item_id, chance) VALUES
('box-crack', 'chipped-falchion', 0.35),   -- uncommon
('box-crack', 'scavenger-coat',   0.35),   -- uncommon
('box-crack', 'hide-cloak',       0.30),   -- uncommon
('box-crack', 'rusted-sword',     0.40),   -- common
('box-crack', 'padded-jerkin',    0.40),   -- common
('box-crack', 'dried-meat',       0.40),   -- common provision
('box-crack', 'dry-cigarettes',   0.06),   -- slim smoke
('box-crack', 'surveyor-map',     0.08);   -- slim map
