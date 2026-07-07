-- Rarer loot (rome, 2026-07-07). The scarcity decision landed on the EMERGENT
-- model, not a global supply cap: the dungeon is the extraction layer and death
-- already drains it, so we don't cap — we just tighten the faucets and let wear
-- (now that sealed gear ages too, see SEALED_WEAR_MULT) do the draining. This
-- turns down the two gear faucets so the good stuff is genuinely uncommon.
--
-- Deliberately LEFT ALONE:
--   • boss gear drops (drowned-god / marrow-king / forgotten-king) — a boss is a
--     rare, hard kill; its drop is the whole point of the descent.
--   • common starter gear (leather-cap, tattered-cloak, rusted-sword) — the
--     on-ramp; a fresh wanderer should always be able to arm up.
--   • the reliquary (the King's epic hoard) — singular prize behind the hardest
--     fight; it stays generous.
--   • cigarettes, maps, and trophies — not the gear-flood problem; economy/
--     knowledge loot, tuned elsewhere.

-- 1) Mob gear faucet: non-boss uncommon/rare drops down 40% (×0.6). Mobs respawn
--    forever, so even a 6% drop floods over a week; this makes elite gear a real
--    event, not an inevitability.
UPDATE mob_templates
SET gear_drop = ROUND(gear_drop * 0.6, 3)
WHERE is_boss = 0
  AND gear_item IN (SELECT id FROM item_templates WHERE rarity IN ('uncommon','rare','epic'));

-- 2) Cache faucet, rare gear: down 30% (×0.7), every coffer but the reliquary.
--    Only equippable gear (has a slot) — cigs/maps/trophies keep their odds.
UPDATE cache_loot
SET chance = ROUND(chance * 0.7, 3)
WHERE cache_id != 'reliquary'
  AND item_id IN (SELECT id FROM item_templates WHERE rarity = 'rare' AND slot IS NOT NULL AND slot != '');

-- 3) Cache faucet, epic gear: down 40% (×0.6), every coffer but the reliquary.
UPDATE cache_loot
SET chance = ROUND(chance * 0.6, 3)
WHERE cache_id != 'reliquary'
  AND item_id IN (SELECT id FROM item_templates WHERE rarity = 'epic' AND slot IS NOT NULL AND slot != '');
