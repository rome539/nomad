-- Phase 1: the deep gets teeth. Claws and teeth open WOUNDS — armor-ignoring
-- bleed that ticks until it clots (or you bind it). Gear turns a blow; it does
-- nothing for a wound, so a face-tanking geared wanderer still leaks. And the
-- answer to a wound: a dressing that auto-binds when you're bleeding low.

-- Which mobs cut (0 = a clean blow, no wound). The deep's blind claws bite
-- worst; the scavengers' teeth leave you leaking too. Everything else just hits.
ALTER TABLE mob_templates ADD COLUMN bleed INTEGER NOT NULL DEFAULT 0;
UPDATE mob_templates SET bleed = 3 WHERE id IN ('pale-crawler', 'pale-stalker');
UPDATE mob_templates SET bleed = 2 WHERE id IN ('dire-hyena', 'grave-hyena');

-- A dressing: `staunch` = the HP it binds back when applied, and it clots the
-- wound. Cheap, common, and once — you go through them in a bad run.
ALTER TABLE item_templates ADD COLUMN staunch INTEGER NOT NULL DEFAULT 0;
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, barter, staunch) VALUES
  ('linen-dressing', 'a linen dressing',
   'A roll of boiled linen, kept dry against the wet. Bound tight over a wound it slows the bleeding and steadies you — for a while, and only the once.',
   'common', 2, 10);

-- The keeper sells them; a wanderer heading down should stock up first.
INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES ('linen-dressing', 3);

-- ...but a fresh wanderer with nothing to trade needs a way to find one in the
-- world. The cutpurses work the first floor and would carry field dressings —
-- so they drop one often enough to matter, on top of their teeth. (mob_keys is
-- the engine's generic "extra chance-drop by template"; not just cache keys.)
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('cutpurse',  'linen-dressing', 0.35),
  ('cutthroat', 'linen-dressing', 0.45);

-- The people's artillery gets a little bite: a rock off the skull can ring a
-- thing senseless — thrown or swung. A modest chance (it's crude masonry, not a
-- warden's maul), but free and everywhere, so it's real crowd control on a budget.
UPDATE item_templates SET stun = 0.15 WHERE id = 'loose-rock';

-- Heavy dead things ring YOUR skull too: a mob `stun` chance makes you lose your
-- next swing. The barrow-wight's dead weight lands like a maul.
ALTER TABLE mob_templates ADD COLUMN stun REAL NOT NULL DEFAULT 0;
UPDATE mob_templates SET stun = 0.25 WHERE id = 'twice-dead';

-- The deep-dwellers are not the tutorial anymore. Off "soft-for-learning": more
-- body, a harder bite. The drowned stays a low-swinging grappler (its teeth are
-- the grip and the pull, below); the crawler's ambush and the wight's heavy dead
-- blows are meant to be felt now that armor is a curve, not a wall.
UPDATE mob_templates SET max_hp = 40, dmg_min = 4, dmg_max = 7  WHERE id = 'the-drowned';
UPDATE mob_templates SET max_hp = 30, dmg_min = 6, dmg_max = 10 WHERE id = 'pale-crawler';
UPDATE mob_templates SET max_hp = 32, dmg_min = 5, dmg_max = 8  WHERE id = 'twice-dead';
