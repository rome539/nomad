-- 245 the thing that chewed the bones (rome, 2026-08-19): a lion, as a mini-boss.
--
-- WHICH LION, because it matters on this mountain. Not a menagerie animal — the
-- world already did that trick and did it well, and the baited bear's whole point
-- is that it came back on a chain (mig 215) and can only ever be used once. This
-- is a CAVE LION, and it needs no explanation at all, because the ground it
-- stands on is ice-age ground and has been since the region shipped: the Glacier
-- Mouth, the Rock Glacier, the Moraine Bank, the Erratic, the Blue Ice, the
-- Crevasse Field, the Ice Plain. An animal out of that cold on a mountain that
-- never finished coming out of it is not a stranger here. Everything else did
-- leave. This did not.
--
-- IT WAS ALREADY IN THE REGION, twice, and neither hook was ever paid off:
--
--   THE DRY BONES (high ground) — "Something has still been chewing on the ends
--   of these, which is the only reason anything comes to this room." Written as
--   an open question in tier four and answered by nothing. This is the answer,
--   and it stands in that room.
--
--   THE RIB CAGE (high ground, SANCTUARY) — "The ribcage of something the size
--   of a horse... picked absolutely clean... Whatever cleaned this did it a very
--   long time ago and has not been back." That is its kill, and the one place on
--   the high ground a player can lie down out of the weather is inside it. The
--   sanctuary was always somebody's dinner. Nothing about that room changes; it
--   simply acquires an author.
--
-- THE STATLINE, against what the mountain already has:
--
--     lynx            lv5   52hp   5-9    armor 1
--     eyrie-holder    lv5   62hp   6-10   armor 1
--     the-baited-bear lv5   76hp   7-12   armor 2   (the world's elite model)
--     >>> cave lion   lv6   96hp   6-11   armor 2
--     the-drake       lv7  150hp   8-13   armor 3
--
-- Second-hardest thing on the mountain and a clear step under the summit, which
-- is what a mini-boss is. is_boss = 1 does three things here that all serve a
-- cat: it holds its ground instead of wandering off, it does not break and run,
-- and it climbs the boss phases as it drops (bossPhase, ai.ts) — so it gets MORE
-- dangerous the closer it is to dead, which is the only honest way to model an
-- animal that has been cornered in its own larder.
--
-- 90 MINUTES to come back, level with the bear and under the drake's two hours.
--
-- HOW IT ACTUALLY FIGHTS is in zone-data, not in this table, and it is the whole
-- design:
--   LURKERS  — it is not in the room description. It is not in the room. Then it
--              is on you. This is the single most cat thing available in the
--              engine and no large animal in the world has ever used it.
--   VITALS   — it goes for the throat, which is what these actually did. The
--              summit was ruled INTO this list; the animal that kills by closing
--              a jaw on a windpipe does not get to be gentler than the one that
--              kills by weight.
--   bleed 3  — level with the drake and the eyrie-holder, and through armor.
--
-- WHAT IT LEAVES. The pelt, at the bear's own rate. And a mail hauberk at 0.20,
-- which is NOT the lion's — the region's ruling stands, the animal has no hands
-- and no pockets. It is what is left of somebody it dragged up here, lying in
-- the bones with the rest of the ends that have been chewed.

INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed,
   sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('lion-pelt', 'a lion''s pelt',
   'Off an animal that would go ten feet nose to tail with the tail left out of it. The hair is short and dense and the colour of dry grass with no mane anywhere on it, and the hide underneath is thicker through the neck and shoulder than it is anywhere else, which tells you what came at it and from where. It is the wrong animal for this country by about ten thousand years and there is nobody left at the bottom of the hill who will believe you.',
   'epic', 0, 0, 0, 0, '', 0, 1, 1, 2, 0, 0, 0, 26, 0, '');

-- ---- the animal ------------------------------------------------------------

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('cave-lion', 'the cave lion',
   'It comes off the bone floor in one piece with no sound in front of it, and it is the size of a pony, and it is the colour of everything behind it. No mane — the head is flat and broad and mostly jaw, set low and already coming forward. It has been in this room the whole time. The chewed ends of the bones are its. It does not roar and it does not warn you and it has no interest in frightening you off, because frightening you off has never once been the point.',
   6, 96, 6, 11, 5400, 1, 'lion-pelt', 0.50, 2, 'mail-hauberk', 0.20, 3, 0.10);

-- ---- where it lies ---------------------------------------------------------
-- One body, in the room that has been describing it since tier four shipped.

INSERT INTO mob_spawns (room_id, template_id) VALUES
  ('the-dry-bones', 'cave-lion');
