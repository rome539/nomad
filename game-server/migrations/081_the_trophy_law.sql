-- 081: THE TROPHY LAW
--
-- The trophy table had no curve in it: non-boss drops ran 40-100% with no
-- relation to the fight, the prize, OR how hard the thing was to meet. The
-- scarcity belongs where the mob is scarce.
--
-- The law, from here:
--
--   COMMON BASES (a rat, a skeleton, a warden — the things you trip over every
--   run) drop LESS. They are the floor of the world and they were paying like
--   elites.
--
--   RARE VARIANTS (a warden-captain rides a warden's spawn 7% of the time; an
--   albino rat arrives on 3% of rat spawns) drop MORE. Meeting one is already
--   the lottery — the trophy is the payoff for the luck, not a second roll
--   against you.
--
--   BOSSES are untouched (epics 50%, the Signet 20%).
--
--   THE GAUNT is untouched at 100%. It is not a spawn: it is the escape event,
--   loose for an hour, announced to the whole zone. The pelt IS the prize.

-- ---- COMMON BASES: everywhere, so worth less ----
UPDATE mob_templates SET loot_chance = 0.40 WHERE id = 'rat';             -- 60 -> 40  rat tail (0.1)
UPDATE mob_templates SET loot_chance = 0.30 WHERE id = 'cutpurse';        -- 40 -> 30  fistful of teeth (2)
UPDATE mob_templates SET loot_chance = 0.35 WHERE id = 'skeleton';        -- 50 -> 35  finger-bone (1)
UPDATE mob_templates SET loot_chance = 0.35 WHERE id = 'twice-dead';      -- 50 -> 35  finger-bone (1)
UPDATE mob_templates SET loot_chance = 0.35 WHERE id = 'pale-crawler';    -- 50 -> 35  pale claw (1)
UPDATE mob_templates SET loot_chance = 0.30 WHERE id = 'grave-hyena';     -- 40 -> 30  hyena's fang (2)
UPDATE mob_templates SET loot_chance = 0.30 WHERE id = 'warden';          -- 60 -> 30  hollow lantern (4)
UPDATE mob_templates SET loot_chance = 0.25 WHERE id = 'the-drowned';     -- 40 -> 25  grave-pearl (10) — a rich pearl off a common body
UPDATE mob_templates SET loot_chance = 0.55 WHERE id = 'three-hound';     -- 90 -> 55  hound's fang (8) — 68hp is a real fight; still the best common earner

-- ---- STANDALONES: their own spawns, no variant riding them ----
UPDATE mob_templates SET loot_chance = 0.35 WHERE id = 'verdigris-thing'; -- 50 -> 35  verdigris scale (2)
UPDATE mob_templates SET loot_chance = 0.35 WHERE id = 'marrow-cantor';   -- 50 -> 35  knucklebone rosary (3)
-- last-watchman stays at 50%: one of a kind, and it only dies once.

-- ---- RARE VARIANTS: you were lucky to see it — pay out ----
UPDATE mob_templates SET loot_chance = 0.70 WHERE id = 'two-hound';       -- 60 -> 70  hound's fang (8)   | 10% of three-hound spawns
UPDATE mob_templates SET loot_chance = 0.70 WHERE id = 'warden-captain';  -- 60 -> 70  captain's seal (6) |  7% of warden spawns
UPDATE mob_templates SET loot_chance = 0.65 WHERE id = 'cutthroat';       -- 60 -> 65  fistful of teeth   | 10% of cutpurse spawns
UPDATE mob_templates SET loot_chance = 0.65 WHERE id = 'pale-stalker';    -- 60 -> 65  pale claw          |  8% of pale-crawler spawns
UPDATE mob_templates SET loot_chance = 0.65 WHERE id = 'thrice-dead';     -- 60 -> 65  finger-bone        |  6% of twice-dead spawns
UPDATE mob_templates SET loot_chance = 0.65 WHERE id = 'brood-rat';       -- 60 -> 65  knot of rat-sinew  |  5% of rat spawns
UPDATE mob_templates SET loot_chance = 0.60 WHERE id = 'bone-knight';     -- 50 -> 60  corroded war-medal |  8% of skeleton spawns
UPDATE mob_templates SET loot_chance = 0.60 WHERE id = 'dire-hyena';      -- 50 -> 60  hyena's fang       | 10% of grave-hyena spawns
UPDATE mob_templates SET loot_chance = 0.60 WHERE id = 'drowned-hulk';    -- 50 -> 60  grave-pearl (10)   |  8% of the-drowned spawns
UPDATE mob_templates SET loot_chance = 0.85 WHERE id = 'albino-rat';      -- 80 -> 85  pale pelt (0)      |  3% of rat spawns — the rarest thing on four legs

-- ---- and the pale pelt stops being a joke ----
-- 3% spawn x 85% drop is roughly one pelt per 39 rats — rarer in practice than
-- the Signet — and the keeper was offering NOTHING for it: no price, no recipe.
-- 12 sets it above the grave-pearl (10) and below the Gaunt's pelt (20): an
-- albino hide is a curiosity, not a legend.
UPDATE item_templates SET barter = 12 WHERE id = 'pale-pelt';             -- 0 -> 12
