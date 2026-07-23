-- 103 poleaxe parity (rome, 2026-07-22): the poleaxe (102) shipped at dmg 4,
-- two full points under headsman-sword (dmg 6, one-handed, same epic tier) —
-- under-compensated for giving up the shield, unlike its two-handed epic
-- siblings. abyssal-harpoon already sets the precedent for this tier: dmg 6
-- (matching a one-handed epic) PLUS its structural traits (reach, pierce:2)
-- on top, not instead of. Poleaxe to the same dmg 6 — it keeps reach and its
-- blunt armor-ignore (BLUNT_ARMOR_IGNORE, free from stun>0) as its own
-- addition, same shape as the harpoon's pierce riding alongside full damage.

UPDATE item_templates SET dmg = 6 WHERE id = 'poleaxe';
