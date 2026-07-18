-- 093: the shield hand (rome). Forge-exclusive OFF-HAND gear, so the second hand
-- has craft answers beyond the two plain shields — catch, bite back, or counter.
-- Builds on the forge overhaul (091 economy, 092 the smith's answers).
--
-- Three forge-only pieces (in NO drop table):
--   a bristling targe   — block + THORNS (bites the hand that hits you)
--   a forged main-gauche — block + PARRY_RIPOSTE (turns the blow and answers)
--   a smith's aegis      — MASTERWORK wall shield: best block in the game + thorns,
--                          gated on the-gaunt's pelt (the third boss/rare trophy).
--
-- Code side: THORNS / PARRY_RIPOSTE / SHIELD_WALL memberships in zone-data (the
-- block value is the column below; thorns & riposte live in code maps). Data-only.

INSERT OR REPLACE INTO item_templates (id, name, description, rarity, slot, block, weight, barter) VALUES
  ('bristling-targe', 'a bristling targe', 'A round shield studded with filed spikes — it catches a blow and gives the striker something back for the trouble. Light enough to carry all day.', 'uncommon', 'shield', 0.12, 1, 8),
  ('forged-main-gauche', 'a forged main-gauche', 'A heavy parrying blade for the off hand, notched to trap an edge. Turn the blow down its length and the point is already inside the opening it made.', 'uncommon', 'shield', 0.12, 0, 8),
  ('smiths-aegis', 'a smith''s aegis', 'A tower of riveted plate faced with a bed of spikes — it turns nearly anything and mauls whatever leans on it. You fight from behind it, not around it; the weight is the price of the wall.', 'epic', 'shield', 0.30, 2, 25);

INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('bristling-targe',    2, 'fistful-teeth', 2),
  ('forged-main-gauche', 2, 'pale-claw',     2),
  ('smiths-aegis',       5, 'gaunt-pelt',    1);
