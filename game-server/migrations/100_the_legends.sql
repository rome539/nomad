-- 100 THE LEGENDS (rome, 2026-07-20): the "templates for legends" half of the
-- trait lottery (099). The lottery gives BREADTH — one small catalog becomes a
-- whole loot table of one-trait rolls. These give DEPTH: nine hand-authored,
-- named pieces, each carrying something the lottery can NEVER hand out — a trait
-- PAIR (it rolls one, from a slot pool, never two), a value above common
-- (pierce:3), or an off-pool tag (mailward is deliberately kept out of the
-- lottery so a legend is the only way to pair it). Every row earns its name.
--
-- These are the first legendary WEARABLES in the world (legendaries were only
-- tokens before). Stats sit at the epic tier, not above it — the two traits ARE
-- the legendary value, so armor stays load-law honest (body/helm wt = armor-1,
-- cloak/feet light, weapon wt tracks its damage tier). Each hangs off one named
-- threat via mob_keys, at the same rare cadence as existing gear drops
-- (~0.05 bosses, 0.06-0.08 elites): seeing one is a story.
--
-- Legends never take a lottery roll on top — mob_keys drops don't pass through
-- rollTraits, so their traits stay exactly what's authored here. Data only; no
-- code. Run once.

INSERT INTO item_templates (id, name, description, rarity, slot, armor, weight, dmg, bleed, block, barter, traits) VALUES
  ('marrow-crown', 'the Marrow-Crown', 'The Marrow-King''s own crown, bone fused to boiled hide — it turns the wound and eats the ringing blow. What the shards were broken from.', 'legendary', 'helm', 3, 2, 0, 0, 0, 40, 'wardhide,padded'),
  ('still-water-shroud', 'the Still-Water Shroud', 'The Drowned God''s burial wrap, still wet, still silent. It says nothing to the dark and gives no hand a hold.', 'legendary', 'cloak', 2, 1, 0, 0, 0, 40, 'slick,quiet'),
  ('the-attainder', 'the Attainder', 'A thin bright execution-blade. It finds the seam in any plate and the gap in any guard — the Forgotten King''s last word, made steel.', 'legendary', 'weapon', 0, 2, 5, 1, 0, 40, 'pierce:3,piercing'),
  ('last-watch', 'the Last Watch', 'The last watchman''s harness, buckled to the body and never surrendered. It turns the low cut and cannot be stripped from a man who won''t lie down.', 'legendary', 'armor', 4, 3, 0, 0, 0, 40, 'wardhide,strapped'),
  ('captains-wall', 'the Captain''s Wall', 'A warden-captain''s tower shield, its rim honed to answer. Everything it turns, it bleeds back.', 'legendary', 'shield', 0, 2, 0, 0, 0.30, 40, 'wall,riposte:2'),
  ('houndsbane', 'Houndsbane', 'A long boar-spear ground to a needle. Reach enough to keep the three heads off you, point enough to find the throat they guard.', 'legendary', 'weapon', 0, 2, 5, 1, 0, 40, 'reach,two-handed,piercing'),
  ('long-hunger-shroud', 'the Long-Hunger Shroud', 'Skin off the Gaunt, tanned by famine — drawn tight, hard to grip, and it drinks a wound before it opens.', 'legendary', 'cloak', 2, 1, 0, 0, 0, 40, 'wardhide,slick'),
  ('hulks-iron', 'the Hulk''s Iron', 'A drowned-hulk''s riveted plate, quilted beneath. The rings skate the edge; the padding swallows the weight.', 'legendary', 'armor', 4, 3, 0, 0, 0, 40, 'mailward,padded'),
  ('pale-tread', 'the Pale Tread', 'The pale stalker left no mark in the silt. These are why — greased soft-soles that make no sound and take no grip.', 'legendary', 'feet', 2, 1, 0, 0, 0, 40, 'quiet,slick');

INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('marrow-king', 'marrow-crown', 0.05),
  ('drowned-god', 'still-water-shroud', 0.05),
  ('forgotten-king', 'the-attainder', 0.05),
  ('last-watchman', 'last-watch', 0.06),
  ('warden-captain', 'captains-wall', 0.06),
  ('three-hound', 'houndsbane', 0.08),
  ('the-gaunt', 'long-hunger-shroud', 0.06),
  ('drowned-hulk', 'hulks-iron', 0.06),
  ('pale-stalker', 'pale-tread', 0.08);
