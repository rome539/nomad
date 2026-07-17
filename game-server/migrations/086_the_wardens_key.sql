-- 086: the warden's key, and a word of the boxes (rome, 2026-07-17).
-- The chest survey found one cheap key opening six of seven boxes: the
-- 15-barter notched key unlocked the starter niche AND the abyssal coffer at
-- the well floor — the deep boxes' whole price was the walk. And the roam (a
-- looted box refills in a random room of its tier) was invisible: no hint
-- anywhere that a chest had moved, or where.
--
-- (1) THE KEY SPLITS. The notched iron key keeps the two SHALLOW boxes
--     (box-bone, box-crack); the four DEEP boxes (root, tide, bone-reliquary,
--     sunless-well) now take a warden's key — fence 35 vs 15, and carried by
--     the warden line + the deep's own dead (mob_keys re-pointed below, same
--     odds they always had). Shallow keys stay on the halls' people:
--     cutpurse/cutthroat/dire-hyena. Latches are still latches — a rock or the
--     hammerstone forces EITHER kind (code, this ship); only the reliquary
--     answers to nothing but the King's key.
-- (2) THE KEEPER SELLS WHAT HE'S HEARD. 'a word of the boxes' (6 barter) is
--     not goods: bought, the keeper SPEAKS the room where a roaming strongbox
--     sits right now (code intercepts delivery — nothing enters the pack).
--     Knowledge-as-loot, the maps' and journals' family.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('wardens-key', 'a warden''s key',
 'A long dark key on a rusted ring, a crest worn to a shadow on its bow. The wardens carried these when the deep vaults were theirs to walk — root, tide, bone, and the well''s black floor still answer to it.',
 'uncommon'),
('box-word', 'a word of the boxes',
 'The keeper''s other stock-in-trade: what he''s heard, sold once. Where a strongbox sits right now, said plain across the hatch — and worth exactly as long as nobody gets there first.',
 'common');

INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
('wardens-key', 35),
('box-word', 6);

UPDATE caches SET key_item = 'wardens-key'
 WHERE id IN ('box-deep', 'box-tide', 'box-relic', 'box-abyss');

-- The warden line + the deep's dead now carry the deep key (same odds as the
-- notched key they carried before); the halls' people keep the notched one.
UPDATE mob_keys SET key_item = 'wardens-key'
 WHERE key_item = 'strongbox-key'
   AND template_id IN ('warden', 'warden-captain', 'drowned-hulk', 'the-drowned', 'pale-crawler', 'twice-dead');

-- Apply + REDEPLOY (caches/templates/mob_keys cache at world init). No reseed.
